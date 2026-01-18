"use client";

import { useEffect } from "react";

export default function SentryInitializer() {
    useEffect(() => {
        // Disabled for debugging
        /*
        // Dynamically import Sentry to ensure it NEVER runs on the server
        import("@sentry/nextjs").then(({ init, replayIntegration }) => {
            console.log('✅ [Sentry] Manual Client Init (Dynamic)...');

            init({
                dsn: "https://536a15a09014e3e2ffa2cace94cb4819@o4510727042498560.ingest.us.sentry.io/4510727043612672",

                // Add optional integrations for additional features
                integrations: [replayIntegration()],

                // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
                tracesSampleRate: 1,
                // Enable logs to be sent to Sentry
                enableLogs: true,
                debug: true, // Enable debug mode for verbose console output

                // Define how likely Replay events are sampled.
                // This sets the sample rate to be 100% for the hackathon demo
                replaysSessionSampleRate: 1.0,

                // Define how likely Replay events are sampled when an error occurs.
                replaysOnErrorSampleRate: 1.0,

                // Enable sending user PII
                sendDefaultPii: true,
            });
        });
        */
    }, []);

    return null;
}
