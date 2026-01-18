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
    if (triggerType === 'rage_click') {
        // Find the element that was rage clicked
        const rageClickEvent = events.find(e => {
            const meta = typeof e.meta === 'string' ? JSON.parse(e.meta) : e.meta;
            return e.type === 'friction_detected' && meta.trigger_type === 'rage_click';
        });

        if (rageClickEvent) {
            // Look for clicks preceding it
            const recentClicks = events.filter(e => e.type === 'click').slice(-5);
            recentClicks.forEach(e => {
                const meta = typeof e.meta === 'string' ? JSON.parse(e.meta) : e.meta;
                if (meta.testId) {
                    addScore(`${meta.testId}.tsx`, 0.6, 'Rage clicks detected on this element');
                } else if (meta.text) {
                    // Heuristic: map button text to component name
                    const componentName = meta.text.replace(/\s+/g, '') + 'Button.tsx';
                    addScore(componentName, 0.5, `Interaction with "${meta.text}" caused friction`);
                }
            });
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
        } else {
            addScore('NetworkLayer', 0.2, 'Potential connectivity issue');
        }
    }

    return Array.from(candidates.values()).sort((a, b) => b.score - a.score);
}
