import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API client
// Note: User must set GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateGeminiReport(context: {
    incidentId: string;
    triggerType: string;
    sentryData?: any;
    rootCause?: any;
    events: any[];
}) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('Skipping Gemini report: GEMINI_API_KEY not set');
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        // 1. Construct the Context
        const eventSummary = context.events.map(e => {
            const meta = typeof e.meta === 'string' ? JSON.parse(e.meta) : e.meta;
            return `- [${new Date(Number(e.ts)).toISOString().split('T')[1]}] ${e.type} on ${meta.tag || 'page'} ${meta.testId ? `(id: ${meta.testId})` : ''}`;
        }).join('\n');

        const prompt = `
        You are an expert SRE and UX Engineer analyzing a user friction incident.
        Analyze the following data and verify exactly what went wrong.
        
        CONTEXT:
        - Trigger: ${context.triggerType}
        - Incident ID: ${context.incidentId}
        
        SENTRY DATA:
        ${context.sentryData ? JSON.stringify(context.sentryData, null, 2) : 'No Sentry error correlated.'}
        
        ROOT CAUSE HINTS:
        ${context.rootCause ? JSON.stringify(context.rootCause, null, 2) : 'No root cause candidates.'}
        
        USER ACTION LOG (Last 20 events):
        ${eventSummary}
        
        TASK:
        Generate a structured analysis report.
        
        OUTPUT FORMAT:
        You must output ONLY valid JSON.
        Do not include markdown code blocks (no \`\`\`json).
        The JSON object must have this exact schema:
        {
            "intent": "What was the user trying to do?",
            "category": "One of: 'Bug', 'UX Friction', 'Performance', 'User Error'",
            "severity": "One of: 'Critical', 'High', 'Medium', 'Low'",
            "issue_title": "Concise technical title",
            "repro_steps": ["Step 1", "Step 2", ...],
            "suggested_fix": "Technical recommendation for the developer",
            "confidence": 0.0 to 1.0 (number)
        }
        `;

        // 2. Call Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 3. Parse JSON
        // 3. Parse JSON
        // Robust cleaning in case model ignores "no markdown" rule
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log('[GEMINI] Raw Response:', text);

        if (!jsonStr) {
            console.error('[GEMINI] Empty response received.');
            return null;
        }

        try {
            return JSON.parse(jsonStr);
        } catch (parseErr) {
            console.error('[GEMINI] JSON Parse Failed. Raw:', jsonStr);
            return null;
        }

    } catch (error) {
        console.error('Gemini Report Failed:', error);
        return null;
    }
}
