"use client";

import { useEffect } from "react";
import { getSessionId } from "@/lib/session";

// Global promise to track Sentry initialization
let sentryReadyPromise: Promise<void> | null = null;

export function getSentryReady(): Promise<void> {
    return sentryReadyPromise || Promise.resolve();
}

// Global flag to track if Sentry has been initialized
let sentryInitialized = false;

export default function SentryManualLoader() {
    useEffect(() => {
        // Skip if already initialized
        if (sentryInitialized) {
            console.log("[Sentry] Already initialized, skipping...");
            return;
        }
        sentryInitialized = true;

        // Create the initialization promise
        sentryReadyPromise = new Promise((resolve) => {
            // Manually load Sentry Browser SDK to bypass Next.js build integration issues
            import("@sentry/browser").then(({ init, replayIntegration, setTag, getClient }) => {
                // Double-check: if Sentry client already exists, skip
                if (getClient()) {
                    console.log("[Sentry] Client already exists, skipping init");
                    if (typeof window !== 'undefined') {
                        (window as any).__SENTRY_READY__ = Promise.resolve();
                    }
                    resolve();
                    return;
                }

                console.log("✅ [Sentry] Manual Browser SDK Init...");

                init({
                    dsn: "https://536a15a09014e3e2ffa2cace94cb4819@o4510727042498560.ingest.us.sentry.io/4510727043612672",

                    integrations: [
                        replayIntegration({
                            maskAllText: false,
                            blockAllMedia: false,
                        }),
                    ],

                    // Performance Monitoring
                    tracesSampleRate: 1.0,

                    // Session Replay
                    replaysSessionSampleRate: 1.0,
                    replaysOnErrorSampleRate: 1.0,

                    debug: true,
                });

                // Add tag to ensure we can verify it works
                setTag("integration_mode", "manual_browser");
                setTag("silent_session_id", getSessionId());
                console.log("✅ [Sentry] Session Tagged:", getSessionId());

                // Mark as ready globally
                if (typeof window !== 'undefined') {
                    (window as any).__SENTRY_READY__ = Promise.resolve();
                }

                resolve();
                console.log("✅ [Sentry] Initialization Complete");

            }).catch(err => {
                console.error("Failed to load Sentry Browser SDK", err);
                resolve(); // Resolve anyway to not block the app
            });
        });
    }, []);

    return null;
}
