import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { findRelatedSentryEvent } from '@/lib/sentryApi';
import { generateReproScript } from '@/lib/repro';
import { calculateRootCause } from '@/lib/rootCause';
import { generateGeminiReport } from '@/lib/gemini';
import { pushToSurveyMonkey } from '@/lib/surveymonkey';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { session_id, incident_id } = body;

        console.log(`[ANALYZE] Starting analysis for Session: ${session_id}, Incident: ${incident_id}`);

        if (!session_id) {
            return NextResponse.json({ success: false, error: 'Missing session_id' }, { status: 400 });
        }

        // 0. Resolve Incident ID with Retry Logic (Race Condition Fix)
        let targetIncidentId = incident_id;
        let sentryData = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            let currentIncident = null;

            // Try to find incident if missing
            if (targetIncidentId) {
                currentIncident = await prisma.incident.findUnique({ where: { id: targetIncidentId } });
            } else {
                currentIncident = await prisma.incident.findFirst({
                    where: { sessionId: session_id },
                    orderBy: { createdAt: 'desc' }
                });
                if (currentIncident) targetIncidentId = currentIncident.id;
            }

            // Try to find Sentry Data
            if (!sentryData) {
                try {
                    // Pass the ID from DB if we have it
                    const knownId = currentIncident?.sentryEventId;
                    sentryData = await findRelatedSentryEvent(session_id, knownId || undefined);
                } catch (e) {
                    console.error('Failed to fetch Sentry data', e);
                }
            }

            // If we have both (or at least sentry data + incident), break
            if (targetIncidentId && sentryData) break;

            // ... wait and retry ...
            console.log(`[ANALYZE] Attempt ${attempts + 1}/${maxAttempts} - Waiting for data... (IncidentID: ${targetIncidentId}, KnownSentryID: ${currentIncident?.sentryEventId})`);
            await new Promise(r => setTimeout(r, 4000));
            attempts++;
        }

        console.log(`[ANALYZE] Target Incident ID: ${targetIncidentId}`);

        if (!targetIncidentId) {
            console.warn('[ANALYZE] No incident found after Retries. Proceeding with limited context.');
        }

        // 2. Repro Script Generation
        // Shared Event Data
        let events: any[] = [];
        try {
            events = await prisma.event.findMany({
                where: { sessionId: session_id },
                orderBy: { ts: 'asc' },
                take: 50
            });
        } catch (e) {
            console.error('Failed to fetch events', e);
        }

        // 2. Repro Script Generation
        let reproScript = null;
        try {
            if (events.length > 0) {
                reproScript = generateReproScript(events);
                console.log('[ANALYZE] Generated Repro Script');
            }
        } catch (e) {
            console.error('Failed to generate repro script', e);
        }

        // 3. Root Cause Analysis
        let rootCauseRanking = null;
        try {
            // reusing events from above
            rootCauseRanking = calculateRootCause({
                sentryData,
                events: events,
                triggerType: 'unknown'
            });
            console.log('[ANALYZE] Generated Root Cause Ranking');
        } catch (e) {
            console.error('Failed to generate root cause', e);
        }

        // 4. Gemini Analysis
        let geminiReport = null;
        try {
            geminiReport = await generateGeminiReport({
                incidentId: targetIncidentId || 'unknown',
                triggerType: 'friction_detected', // Should fetch real type if avail
                sentryData,
                rootCause: rootCauseRanking,
                events: events || []
            });
            console.log('[ANALYZE] Generated Gemini Report');
        } catch (e) {
            console.error('Failed to generate Gemini report', e);
        }

        // 5. Update Incident Record (if incident_id provided)
        if (targetIncidentId) {
            await prisma.incident.update({
                where: { id: targetIncidentId },
                data: {
                    sentryEventId: sentryData?.sentry_event_id,
                    sentryIssueId: sentryData?.sentry_issue_id,
                    reproScript: reproScript,
                    rootCauseRanking: rootCauseRanking ? JSON.stringify(rootCauseRanking) : null,
                    geminiReport: geminiReport ? JSON.stringify(geminiReport) : null
                }
            });
            console.log('[ANALYZE] Updated Incident with Sentry, Repro, Root Cause & Gemini data');
            console.log('[ANALYZE] Updated Incident with Sentry, Repro, Root Cause & Gemini data');

            // 6. Push to SurveyMonkey
            const incidentPayload = {
                sessionId: session_id,
                triggerType: 'friction_detected', // Should match incident record
                sentryEventId: sentryData?.sentry_event_id,
                reproScript: reproScript,
                geminiReport: geminiReport ? JSON.stringify(geminiReport) : null,
                ...rootCauseRanking
            };

            await pushToSurveyMonkey({
                ...incidentPayload,
                id: targetIncidentId,
                page: 'unknown'
            }, 'incident');
        }

        return NextResponse.json({
            success: true,
            sentry: sentryData,
            repro: reproScript,
            rootCause: rootCauseRanking,
            gemini: geminiReport
        });

    } catch (error) {
        console.error('Error in /api/analyze:', error);
        return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 });
    }
}
