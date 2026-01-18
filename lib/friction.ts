import { tracker } from './tracker';
import * as Sentry from '@sentry/browser';
import { getSessionId } from './session';

type FrictionTrigger = 'rage_click' | 'dead_click' | 'error_loop' | 'backtrack_loop';

interface FrictionEvent {
    trigger_type: FrictionTrigger;
    confidence: number;
    selector?: string;
    x?: number;
    y?: number;
}

export class FrictionDetector {
    private lastClicks: { x: number; y: number; ts: number; target: EventTarget | null }[] = [];
    private lastErrors: { type: string; ts: number }[] = [];
    private navigationHistory: { path: string; ts: number }[] = [];
    private pendingClicks: Map<Element, { ts: number; timerID: NodeJS.Timeout }> = new Map();
    private onFrictionCallback: ((event: FrictionEvent) => void) | null = null;
    private mutationObserver: MutationObserver | null = null;

    // Tuning Params - Rage Click
    private RAGE_CLICK_THRESHOLD = 5;
    private RAGE_TIME_WINDOW = 2000; // ms
    private RAGE_DISTANCE_LIMIT = 20; // px

    // Tuning Params - Dead Click
    private DEAD_CLICK_TIMEOUT = 3000; // ms

    // Tuning Params - Error Loop
    private ERROR_LOOP_THRESHOLD = 3;
    private ERROR_LOOP_WINDOW = 30000; // ms

    // Tuning Params - Backtrack Loop
    private BACKTRACK_LOOP_THRESHOLD = 2; // A->B->A->B = 2 cycles
    private BACKTRACK_LOOP_WINDOW = 120000; // 2 minutes

    constructor(onFriction?: (event: FrictionEvent) => void) {
        if (typeof window === 'undefined') return;

        this.onFrictionCallback = onFriction || null;
        this.init();
    }

    private init() {
        window.addEventListener('click', this.handleClick.bind(this), true);

        // Dead click detection: monitor DOM changes
        this.mutationObserver = new MutationObserver(() => this.registerActivity());
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });

        // Dead click detection: monitor navigation
        window.addEventListener('popstate', () => this.registerActivity());

        // Error loop detection
        window.addEventListener('error', this.handleError.bind(this));
        window.addEventListener('unhandledrejection', this.handleError.bind(this));

        // Backtrack loop detection
        window.addEventListener('popstate', this.handleNavigation.bind(this));

        // Also track programmatic navigation
        const originalPushState = history.pushState;
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.handleNavigation();
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.handleNavigation();
        };

        // Initial navigation entry
        this.handleNavigation();
    }

    private handleClick(e: MouseEvent) {
        const now = Date.now();
        const click = { x: e.clientX, y: e.clientY, ts: now, target: e.target };

        // Prune old clicks for rage detection
        this.lastClicks = this.lastClicks.filter(c => now - c.ts < this.RAGE_TIME_WINDOW);
        this.lastClicks.push(click);

        // Rage click detection
        this.detectRageClick(click);

        // Dead click detection
        this.scheduleDeadClickCheck(e);
    }

    private async detectRageClick(currentClick: { x: number; y: number; ts: number; target: EventTarget | null }) {
        // Find clicks near this location
        const nearClicks = this.lastClicks.filter(c => {
            const dist = Math.sqrt(Math.pow(c.x - currentClick.x, 2) + Math.pow(c.y - currentClick.y, 2));
            return dist < this.RAGE_DISTANCE_LIMIT;
        });

        if (nearClicks.length >= this.RAGE_CLICK_THRESHOLD) {
            const event: FrictionEvent = {
                trigger_type: 'rage_click',
                confidence: 0.9,
                x: currentClick.x,
                y: currentClick.y,
                selector: this.getSimpleSelector(currentClick.target as Element)
            };

            await this.fireFrictionEvent(event);

            // Clear history to prevent rapid-fire triggering
            this.lastClicks = [];
        }
    }

    private scheduleDeadClickCheck(e: MouseEvent) {
        const target = e.target as Element;

        // Don't check disabled elements or already pending ones
        if (target.hasAttribute && target.hasAttribute('disabled')) return;

        // Clear any existing timer for this element
        if (this.pendingClicks.has(target)) {
            clearTimeout(this.pendingClicks.get(target)!.timerID);
        }

        // Schedule check
        const timerID = setTimeout(() => {
            this.checkForDeadClick(target, e.clientX, e.clientY);
        }, this.DEAD_CLICK_TIMEOUT);

        this.pendingClicks.set(target, { ts: Date.now(), timerID });
    }

    private registerActivity() {
        // Cancel all pending dead click checks (something happened!)
        this.pendingClicks.forEach(({ timerID }) => clearTimeout(timerID));
        this.pendingClicks.clear();
    }

    private async checkForDeadClick(target: Element, x: number, y: number) {
        // If we got here, no activity was detected after click
        const event: FrictionEvent = {
            trigger_type: 'dead_click',
            confidence: 0.75,
            x,
            y,
            selector: this.getSimpleSelector(target)
        };

        await this.fireFrictionEvent(event);
        this.pendingClicks.delete(target);
    }

    private handleError(e: ErrorEvent | PromiseRejectionEvent) {
        const errorType = e instanceof ErrorEvent
            ? e.message
            : (e.reason?.message || String(e.reason) || 'unknown');

        const now = Date.now();

        // Prune old errors
        this.lastErrors = this.lastErrors.filter(err => now - err.ts < this.ERROR_LOOP_WINDOW);
        this.lastErrors.push({ type: errorType, ts: now });

        this.detectErrorLoop(errorType);
    }

    private async detectErrorLoop(currentErrorType: string) {
        // Count similar errors
        const similarErrors = this.lastErrors.filter(e =>
            e.type.toLowerCase().includes(currentErrorType.toLowerCase()) ||
            currentErrorType.toLowerCase().includes(e.type.toLowerCase())
        );

        if (similarErrors.length >= this.ERROR_LOOP_THRESHOLD) {
            const event: FrictionEvent = {
                trigger_type: 'error_loop',
                confidence: 0.85,
                selector: currentErrorType.slice(0, 100) // Truncate long error messages
            };

            await this.fireFrictionEvent(event);
            this.lastErrors = []; // Clear to prevent repeated triggers
        }
    }

    private handleNavigation() {
        const now = Date.now();
        const currentPath = window.location.pathname;

        // Prune old navigation
        this.navigationHistory = this.navigationHistory.filter(
            nav => now - nav.ts < this.BACKTRACK_LOOP_WINDOW
        );

        this.navigationHistory.push({ path: currentPath, ts: now });

        this.detectBacktrackLoop();
    }

    private async detectBacktrackLoop() {
        if (this.navigationHistory.length < 4) return; // Need at least A->B->A->B

        // Look for A->B->A->B pattern
        const recent = this.navigationHistory.slice(-4);

        if (recent[0].path === recent[2].path &&
            recent[1].path === recent[3].path &&
            recent[0].path !== recent[1].path) {

            const event: FrictionEvent = {
                trigger_type: 'backtrack_loop',
                confidence: 0.8,
                selector: `${recent[0].path} ↔ ${recent[1].path}`
            };

            await this.fireFrictionEvent(event);
            this.navigationHistory = []; // Clear
        }
    }

    private async fireFrictionEvent(event: FrictionEvent) {
        // Wait for Sentry to be initialized before capturing
        if (typeof window !== 'undefined' && (window as any).__SENTRY_READY__) {
            try {
                await (window as any).__SENTRY_READY__;
                console.log('✅ [Friction] Sentry is ready, capturing event...');
            } catch (e) {
                console.warn('[Friction] Waiting for Sentry failed, proceeding anyway:', e);
            }
        }

        // Capture in Sentry - This creates a Sentry Issue
        const sentryEventId = Sentry.captureMessage(`Friction Detected: ${event.trigger_type}`, {
            level: 'warning',
            tags: {
                friction_type: event.trigger_type,
                confidence: event.confidence.toString(),
                silent_session_id: getSessionId()
            },
            extra: {
                selector: event.selector,
                x: event.x,
                y: event.y,
                timestamp: new Date().toISOString()
            }
        });

        // Add Sentry ID to the event payload for the backend
        (event as any).sentry_event_id = sentryEventId;

        console.log(`🔥 Friction Detected [${event.trigger_type}]:`, event);
        console.log('📊 Sentry Event ID:', sentryEventId);

        // Track the event
        tracker.track('friction_detected', event as any);

        // Force send immediately to Sentry
        Sentry.flush(2000).then(() => console.log(`✅ [Sentry] Flushed ${event.trigger_type} event`));

        if (this.onFrictionCallback) {
            this.onFrictionCallback(event);
        }
    }

    private getSimpleSelector(el: Element | null): string {
        if (!el) return '';
        if (el.id) return `#${el.id}`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        return el.tagName.toLowerCase();
    }

    // Cleanup method
    public destroy() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        this.pendingClicks.forEach(({ timerID }) => clearTimeout(timerID));
        this.pendingClicks.clear();
    }
}

