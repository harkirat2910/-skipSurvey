interface RootCauseCandidate {
    component: string;
    score: number;
    why: string[];
}

interface AnalysisInput {
    sentryData: any;
    events: any[];
    triggerType: string;
}

export function calculateRootCause(input: AnalysisInput): RootCauseCandidate[] {
    const { sentryData, events, triggerType } = input;
    const candidates: Map<string, RootCauseCandidate> = new Map();

    const addScore = (component: string, points: number, reason: string) => {
        const existing = candidates.get(component) || { component, score: 0, why: [] };
        existing.score = Math.min(existing.score + points, 1.0); // Cap at 1.0
        if (!existing.why.includes(reason)) existing.why.push(reason);
        candidates.set(component, existing);
    };

    // 1. Analyze Trigger & Events (Client-Side Signals)
    if (triggerType === 'rage_click' || triggerType === 'dead_click') {
        // Find the friction event
        const frictionEvent = events.find(e => {
            const meta = typeof e.meta === 'string' ? JSON.parse(e.meta) : e.meta;
            return e.type === 'friction_detected' &&
                (meta.trigger_type === 'rage_click' || meta.trigger_type === 'dead_click');
        });

        if (frictionEvent) {
            const meta = typeof frictionEvent.meta === 'string' ? JSON.parse(frictionEvent.meta) : frictionEvent.meta;

            // Look for clicks preceding it
            const recentClicks = events.filter(e => e.type === 'click').slice(-5);
            recentClicks.forEach(e => {
                const clickMeta = typeof e.meta === 'string' ? JSON.parse(e.meta) : e.meta;
                if (clickMeta.testId) {
                    const reason = triggerType === 'rage_click'
                        ? 'Rage clicks detected on this element'
                        : 'Dead click - element not responding';
                    addScore(`${clickMeta.testId}.tsx`, 0.6, reason);
                } else if (clickMeta.text) {
                    // Heuristic: map button text to component name
                    const componentName = clickMeta.text.replace(/\s+/g, '') + 'Button.tsx';
                    const reason = triggerType === 'rage_click'
                        ? `Interaction with "${clickMeta.text}" caused friction`
                        : `"${clickMeta.text}" button not responding to clicks`;
                    addScore(componentName, 0.5, reason);
                }
            });

            if (triggerType === 'dead_click' && meta.selector) {
                addScore(meta.selector, 0.7, 'Element clicked but no response detected');
            }
        }
    }

    if (triggerType === 'error_loop') {
        // Find error events
        const errorEvents = events.filter(e => e.type === 'error_signal');

        if (errorEvents.length > 0) {
            // Group by error type
            const errorTypes = new Map<string, number>();
            errorEvents.forEach(e => {
                const meta = typeof e.meta === 'string' ? JSON.parse(e.meta) : e.meta;
                const errorMsg = meta.message || 'unknown';
                errorTypes.set(errorMsg, (errorTypes.get(errorMsg) || 0) + 1);
            });

            // Find most common error
            const [mostCommonError, count] = Array.from(errorTypes.entries())
                .sort((a, b) => b[1] - a[1])[0] || ['unknown', 0];

            addScore('ErrorHandling.ts', 0.8, `Repeated error: "${mostCommonError}" (${count} times)`);

            // Check if API-related
            if (mostCommonError.toLowerCase().includes('fetch') ||
                mostCommonError.toLowerCase().includes('network') ||
                mostCommonError.toLowerCase().includes('api')) {
                addScore('ApiClient.ts', 0.7, 'Network/API error loop detected');
            }
        }
    }

    if (triggerType === 'backtrack_loop') {
        // Find navigation events
        const navEvents = events.filter(e => e.type === 'nav');

        if (navEvents.length >= 4) {
            const recent = navEvents.slice(-4);
            const paths = recent.map(e => {
                const meta = typeof e.meta === 'string' ? JSON.parse(e.meta) : e.meta;
                return meta.path || e.page;
            });

            // Identify the pages involved in the loop
            const uniquePaths = Array.from(new Set(paths));
            uniquePaths.forEach(path => {
                const pageName = path.split('/').filter(Boolean).pop() || 'home';
                addScore(`${pageName}Page.tsx`, 0.6, `User confused between pages: ${uniquePaths.join(' ↔ ')}`);
            });

            addScore('Navigation.tsx', 0.7, 'User stuck in navigation loop - confusing UX flow');
        }
    }

    // 2. Analyze Sentry Data (Server-Side/Exception Signals)
    if (sentryData) {
        // If we have a title, usually it contains the error type or message
        if (sentryData.title) {
            // Heuristic: extract apparent component names from error messages
            // e.g. "Error in CouponService.apply"
            const words = sentryData.title.split(' ');
            words.forEach((w: string) => {
                if (w.includes('.tsx') || w.includes('.ts') || /^[A-Z]/.test(w)) {
                    // Very naive "it looks like a component class" check
                    addScore(w.replace(/[^a-zA-Z.]/g, ''), 0.4, 'Referenced in Sentry error title');
                }
            });
        }

        // If we had stack frames (mocking the extraction logic here as usually comes from deeper API)
        // Real implementation would iterate sentryData.entries.exception.values[0].stacktrace.frames
        // For demo, we assume the title might contain the file, or we add a generic "Backend" suspect
        if (sentryData.tags) {
            const flowTag = sentryData.tags.find((t: any) => t.key === 'flow');
            if (flowTag) {
                addScore(`${flowTag.value}Flow.ts`, 0.3, 'Active flow during error');
            }
        }
    }

    // 3. Fallback / Default Suspects
    if (candidates.size === 0) {
        if (triggerType === 'rage_click') {
            addScore('UnknownUIElement', 0.3, 'Repeated clicks without clear target');
        } else if (triggerType === 'dead_click') {
            addScore('EventHandler.ts', 0.3, 'Element not responding to user interaction');
        } else if (triggerType === 'error_loop') {
            addScore('ErrorHandling.ts', 0.3, 'Repeated errors without clear source');
        } else if (triggerType === 'backtrack_loop') {
            addScore('Navigation.tsx', 0.3, 'Confusing navigation flow');
        } else {
            addScore('NetworkLayer', 0.2, 'Potential connectivity issue');
        }
    }

    return Array.from(candidates.values()).sort((a, b) => b.score - a.score);
}
