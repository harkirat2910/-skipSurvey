export function getSessionId(): string {
    if (typeof window === 'undefined') {
        return 'server-side';
    }

    const STORAGE_KEY = 'silent_session_id';
    let sessionId = localStorage.getItem(STORAGE_KEY);

    if (!sessionId) {
        // robust-ish random session generator
        sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(STORAGE_KEY, sessionId);

        // A/B Variant Assignment
        const variant = Math.random() > 0.5 ? 'A' : 'B';
        localStorage.setItem('silent_variant', variant);
        console.log(`[Silent Survey] Session started (${sessionId}). Variant assigned: ${variant}`);
    }

    return sessionId;
}

export function getVariant(): string {
    if (typeof window === 'undefined') return 'A';
    return localStorage.getItem('silent_variant') || 'A';
}
