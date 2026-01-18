import { getSessionId, getVariant } from './session';

type EventType =
    | 'click'
    | 'scroll'
    | 'nav'
    | 'error_signal'
    | 'goal_complete'
    | 'feedback_opened'
    | 'feedback_submitted'
    | 'feedback_dismissed'
    | 'friction_detected';

interface EventData {
    type: EventType;
    ts: number;
    session_id: string;
    page: string;
    meta: Record<string, any>;
}

class Tracker {
    private buffer: EventData[] = [];
    private flushInterval: number = 2000; // 2 seconds
    private maxBufferSize: number = 20;
    private timer: NodeJS.Timeout | null = null;
    private isProcessing = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.startTimer();
            window.addEventListener('beforeunload', () => this.flush());
            // Auto-capture clicks
            window.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                // Capture useful selector info
                const meta = {
                    tag: target.tagName.toLowerCase(),
                    id: target.id,
                    testId: target.getAttribute('data-testid'),
                    text: target.innerText?.slice(0, 50), // Truncate
                    x: e.clientX,
                    y: e.clientY
                };
                this.track('click', meta);
            });
        }
    }

    public track(type: EventType, meta: Record<string, any> = {}) {
        if (typeof window === 'undefined') return;

        const event: EventData = {
            type,
            ts: Date.now(),
            session_id: getSessionId(),
            page: window.location.pathname,
            meta: { ...meta, variant: getVariant() },
        };

        this.buffer.push(event);

        if (this.buffer.length >= this.maxBufferSize) {
            this.flush();
        }
    }

    public async forceFlush() {
        return this.flush();
    }

    private startTimer() {
        this.timer = setInterval(() => this.flush(), this.flushInterval);
    }

    public async flush(): Promise<any> {
        if (this.buffer.length === 0 || this.isProcessing) return null;

        this.isProcessing = true;
        const batch = [...this.buffer];
        this.buffer = [];

        try {
            // Use fetch to get response
            const res = await fetch('/api/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: batch })
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('Tracker: Flush failed', e);
            return null;
        } finally {
            this.isProcessing = false;
        }
    }
}

export const tracker = new Tracker();
