
interface SurveyPayload {
    collection_mode: string;
    pages: {
        id: string; // Page ID
        questions: {
            id: string; // Question ID
            answers: { text: string }[]
        }[]
    }[];
}

export async function pushToSurveyMonkey(
    data: any,
    type: 'incident' | 'success_signal'
) {
    const SURVEY_API_URL = 'https://api.surveymonkey.com/v3/collectors';
    const ACCESS_TOKEN = process.env.SURVEYMONKEY_ACCESS_TOKEN;
    const COLLECTOR_ID = process.env.SURVEYMONKEY_COLLECTOR_ID;

    // Mapping fields to standard "Log" format implies we construct text responses
    // In a real generic implementation without known IDs, we might just dump KV pairs 
    // or assume specific IDs. For this demo, we'll format a text payload.

    // Construct rich text summary
    let summary = '';

    if (type === 'incident') {
        const gemini = data.geminiReport ? JSON.parse(data.geminiReport) : {};
        summary = `[TRIGGER] ${data.triggerType} [INTENT] ${gemini.intent || 'Unknown'} [SEVERITY] ${gemini.severity || 'Medium'} [CATEGORY] ${gemini.category || 'UX Friction'} [SUMMARY] ${gemini.issue_title || 'Friction Detected'} [SUGGESTED FIX] ${gemini.suggested_fix || 'N/A'}`;
    } else {
        summary = `
        [TYPE] Success Signal
        [FLOW] ${data.flowName}
        [METRICS] Time: ${data.timeToCompleteMs}ms | Friction Score: ${data.frictionScore}
        [ERRORS] ${data.errorCount}
        `.trim();
    }

    // 1. Check Config
    if (!ACCESS_TOKEN || !COLLECTOR_ID) {
        console.warn('[SurveyMonkey] Skipping Push: Missing SURVEYMONKEY_ACCESS_TOKEN or COLLECTOR_ID');
        console.log('[SurveyMonkey] Dry Run Payload:', summary);
        return;
    }

    try {
        // 2. Push to API
        // Note: Real SurveyMonkey API requires knowing Page/Question IDs.
        // For hackathon velocity, we often just hit a webhook or generic collector.
        // We will assume a "Text Box" question ID is provided or just log it.

        console.log(`[SurveyMonkey] Pushing ${type}...`);

        const response = await fetch(`${SURVEY_API_URL}/${COLLECTOR_ID}/responses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pages: [{
                    id: (process.env.SURVEYMONKEY_PAGE_ID || '72826105').toString(),
                    questions: [{
                        id: (process.env.SURVEYMONKEY_QUESTION_ID_1 || '275387771').toString(),
                        answers: [{ text: summary }]
                    }]
                }]
            })
        });

        if (!response.ok) {
            console.error('[SurveyMonkey] API Error:', await response.text());
        } else {
            console.log('[SurveyMonkey] Successfully pushed feedback record.');
        }

    } catch (e) {
        console.error('[SurveyMonkey] Implementation Error:', e);
    }
}
