import { getSessionId } from './session';

// Submit survey answer directly (creates response with answer in one call)
export async function submitSurveyAnswer(questionId: string, answer: 'yes' | 'no'): Promise<boolean> {
    try {
        console.log(`[SurveyMonkey] Submitting answer for question ${questionId}: ${answer}`);

        const response = await fetch('/api/survey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'submit',
                questionId,
                answer
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[SurveyMonkey] Failed to submit:', response.status, errorBody);
            return false;
        }

        const data = await response.json();
        console.log('[SurveyMonkey] Success! Response ID:', data.responseId);
        return true;

    } catch (error) {
        console.error('[SurveyMonkey] Error submitting:', error);
        return false;
    }
}

// Submit cart revisit answer (Q2)
export async function submitCartRevisitAnswer(answer: 'yes' | 'no'): Promise<void> {
    const questionId = '275389672'; // Q2
    await submitSurveyAnswer(questionId, answer);
}

// Submit shipping cost answer (Q3)
export async function submitShippingCostAnswer(answer: 'yes' | 'no'): Promise<void> {
    const questionId = '275389675'; // Q3
    await submitSurveyAnswer(questionId, answer);
}
