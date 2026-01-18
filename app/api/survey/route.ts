import { NextResponse } from 'next/server';

const SM_API_BASE = 'https://api.surveymonkey.com/v3';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { questionId, answer, action } = body;

        const token = process.env.SURVEYMONKEY_ACCESS_TOKEN;
        const collectorId = process.env.SURVEYMONKEY_COLLECTOR_ID;
        const pageId = process.env.SURVEYMONKEY_PAGE_ID || '72826105';

        console.log('[SurveyMonkey API] Config:', { collectorId, pageId, hasToken: !!token, action });

        if (!token || !collectorId) {
            console.error('[SurveyMonkey API] Missing credentials');
            return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
        }

        if (action === 'submit') {
            // Create response WITH the answer included (like rage click code does)
            // This is the correct way - include question and answer in the create request
            if (!questionId || !answer) {
                return NextResponse.json({ error: 'Missing questionId or answer' }, { status: 400 });
            }

            const answerText = answer === 'yes' ? 'Yes' : 'No';

            console.log('[SurveyMonkey API] Submitting answer:', { questionId, answer: answerText });

            const createRes = await fetch(`${SM_API_BASE}/collectors/${collectorId}/responses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pages: [{
                        id: pageId,
                        questions: [{
                            id: questionId,
                            answers: [{ text: answerText }]
                        }]
                    }]
                })
            });

            if (!createRes.ok) {
                const errorBody = await createRes.text();
                console.error('[SurveyMonkey API] Failed to submit:', createRes.status, errorBody);
                return NextResponse.json({ error: errorBody }, { status: createRes.status });
            }

            const data = await createRes.json();
            console.log('[SurveyMonkey API] Successfully submitted answer! Response ID:', data.id);

            return NextResponse.json({ responseId: data.id, success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[SurveyMonkey API] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
