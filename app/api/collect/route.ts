import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { pushToSurveyMonkey } from '@/lib/surveymonkey';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { session_id, page, events, client_state } = body;

        // 1. Write Events
        if (Array.isArray(events) && events.length > 0) {
            await prisma.event.createMany({
                data: events.map((e: any) => ({
                    sessionId: session_id || e.session_id,
                    page: page || e.page,
                    type: e.type,
                    ts: BigInt(e.ts),
                    meta: JSON.stringify(e.meta || {})
                }))
            });
        }

        let responseData: any = { success: true };

        // 2. Incident Creation Logic
        // 2. Incident Creation Logic
        // Scan events for friction triggers since tracker sends them as events
        const frictionEvent = events?.find((e: any) => e.type === 'friction_detected');

        if (frictionEvent || (client_state && client_state.trigger)) {
            const triggerData = frictionEvent ? (typeof frictionEvent.meta === 'string' ? JSON.parse(frictionEvent.meta) : frictionEvent.meta) : client_state;

            // Check if this is a high confidence friction event
            if (triggerData.confidence && triggerData.confidence > 0.7) {

                // Create Incident
                const incident = await prisma.incident.create({
                    data: {
                        sessionId: session_id || frictionEvent?.session_id || 'unknown',
                        page: page || frictionEvent?.page || '/unknown',
                        triggerType: triggerData.trigger_type || triggerData.trigger,
                        confidence: triggerData.confidence,
                        frictionScore: triggerData.friction_score || 50,
                        sentryEventId: triggerData.sentry_event_id // Save the ID from client
                    }
                });

                console.log(`[INCIDENT CREATED] ID: ${incident.id} | Trigger: ${triggerData.trigger_type}`);

                responseData = {
                    ...responseData,
                    shouldPrompt: true,
                    incident_id: incident.id,
                    prompt_variant: 'empathy_first'
                };
            }
        }

        // 3. Success Signal Logic
        const completionEvent = events?.find((e: any) => e.type === 'goal_complete');
        if (completionEvent) {
            const meta = typeof completionEvent.meta === 'string' ? JSON.parse(completionEvent.meta) : completionEvent.meta;

            // Calculate time to complete
            // Find the first event for this session in this batch, or use now if missing
            const firstEventTs = events[0]?.ts || Date.now();
            const msToComplete = Number(completionEvent.ts) - Number(meta.startedAt || firstEventTs - 30000); // Fallback to 30s estimate

            // Check for recent friction
            const frictionCount = events.filter((e: any) => e.type === 'friction_detected').length;
            const frictionScore = frictionCount * 20; // 20 pts per friction event in this batch

            // Check for recent errors
            const errorCount = events.filter((e: any) => e.type === 'error_signal').length;

            console.log(`[GOAL COMPLETE] Time: ${msToComplete}ms | Friction: ${frictionScore} | Errors: ${errorCount}`);

            // Always record success signals when users complete goals
            // The friction/error scores indicate the quality of the experience
            await prisma.successSignal.create({
                data: {
                    sessionId: session_id || 'unknown',
                    flowName: meta.flow_name || 'unknown_flow',
                    timeToCompleteMs: msToComplete > 0 ? msToComplete : 0,
                    frictionScore: frictionScore,
                    errorCount: errorCount,
                    performanceScore: Math.max(0, 100 - frictionScore - (errorCount * 10)) // Deduct based on friction & errors
                }
            });
            console.log(`[SUCCESS SIGNAL] Recorded! Time: ${msToComplete}ms | Quality: ${100 - frictionScore - (errorCount * 10)}%`);

            // Note: SurveyMonkey push disabled here to avoid duplicate API calls
            // The analyze route already pushes incident data
            // await pushToSurveyMonkey({
            //     flowName: meta.flow_name || 'unknown_flow',
            //     timeToCompleteMs: msToComplete,
            //     frictionScore,
            //     errorCount
            // }, 'success_signal');
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error in /api/collect:', error);
        return NextResponse.json({ success: false, error: 'Ingestion failed' }, { status: 500 });
    }
}
