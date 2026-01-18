import { tracker } from './tracker';
import * as Sentry from '@sentry/browser';
import { getSessionId } from './session';

type FrictionTrigger = 'rage_click' | 'dead_click' | 'backtrack_loop';

interface FrictionEvent {
    trigger_type: FrictionTrigger;
    confidence: number;
    selector?: string;
    x?: number;
    y?: number;
}

export class FrictionDetector {
    private lastClicks: { x: number; y: number; ts: number; target: EventTarget | null }[] = [];
    private onFrictionCallback: ((event: FrictionEvent) => void) | null = null;

    // Tuning Params
    private RAGE_CLICK_THRESHOLD = 5;
    private RAGE_TIME_WINDOW = 2000; // ms
    private RAGE_DISTANCE_LIMIT = 20; // px

    constructor(onFriction?: (event: FrictionEvent) => void) {
        if (typeof window === 'undefined') return;

        this.onFrictionCallback = onFriction || null;
        this.init();
    }

    private init() {
        window.addEventListener('click', this.handleClick.bind(this), true); // Capture phase preferred
    }

    private handleClick(e: MouseEvent) {
        const now = Date.now();
        const click = { x: e.clientX, y: e.clientY, ts: now, target: e.target };

        // Prune old clicks
        this.lastClicks = this.lastClicks.filter(c => now - c.ts < this.RAGE_TIME_WINDOW);
        this.lastClicks.push(click);

        this.detectRageClick(click);
    }

    private async detectRageClick(currentClick: { x: number; y: number; ts: number; target: EventTarget | null }) {
        // Find clicks near this location
        const nearClicks = this.lastClicks.filter(c => {
            const dist = Math.sqrt(Math.pow(c.x - currentClick.x, 2) + Math.pow(c.y - currentClick.y, 2));
            return dist < this.RAGE_DISTANCE_LIMIT;
        });

        if (nearClicks.length >= this.RAGE_CLICK_THRESHOLD) {
            // Debounce: check if we just triggered? 
            // For simplicity, just fire. The UI should gate multiple popups.

            const event: FrictionEvent = {
                trigger_type: 'rage_click',
                confidence: 0.9,
                x: currentClick.x,
                y: currentClick.y,
                selector: this.getSimpleSelector(currentClick.target as Element)
            };

            // Wait for Sentry to be initialized before capturing
            if (typeof window !== 'undefined' && (window as any).__SENTRY_READY__) {
                try {
                    await (window as any).__SENTRY_READY__;
                    console.log('✅ [Friction] Sentry is ready, capturing event...');
                } catch (e) {
                    console.warn('[Friction] Waiting for Sentry failed, proceeding anyway:', e);
                }
            }

            // Explicitly tell Sentry about this friction
            // We explicitly add the session_id here to ensure it's searchable, 
            // bypassing any potential React Context/Scope issues.
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
                    y: event.y
                }
            });

            // Add Sentry ID to the event payload for the backend
            (event as any).sentry_event_id = sentryEventId;

            console.log('Friction Detected:', event);
            console.log('Sentry Event ID:', sentryEventId);
            tracker.track('friction_detected', event as any);

            // Force send immediately
            Sentry.flush(2000).then(() => console.log('✅ [Sentry] Flushed friction event'));

            if (this.onFrictionCallback) {
                this.onFrictionCallback(event);
            }

            // Clear history to prevent rapid-fire triggering on the 6th, 7th click
            this.lastClicks = [];
        }
    }

    private getSimpleSelector(el: Element | null): string {
        if (!el) return '';
        if (el.id) return `#${el.id}`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        return el.tagName.toLowerCase();
    }
}
