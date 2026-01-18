// Test script to verify Sentry AI monitoring instrumentation
// This will trigger a Gemini AI call and we can verify it appears in Sentry

// Import fetch for Node.js compatibility
import fetch from 'node-fetch';

async function testGeminiMonitoring() {
    console.log('🧪 Testing Sentry AI Monitoring...\n');

    // First, create a test session and incident
    const sessionId = `test-session-${Date.now()}`;
    const incidentId = `test-incident-${Date.now()}`;

    console.log(`📝 Session ID: ${sessionId}`);
    console.log(`📝 Incident ID: ${incidentId}\n`);

    // Create some test events first
    console.log('1️⃣ Creating test events...');
    const testEvents = [
        {
            session_id: sessionId,
            type: 'click',
            ts: Date.now() - 10000,
            meta: JSON.stringify({ tag: 'button', testId: 'submit-btn' })
        },
        {
            session_id: sessionId,
            type: 'rage_click',
            ts: Date.now() - 5000,
            meta: JSON.stringify({ tag: 'button', testId: 'submit-btn' })
        }
    ];

    for (const event of testEvents) {
        await fetch('http://localhost:3000/api/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
    }
    console.log('✅ Events created\n');

    // Wait a moment
    await new Promise(r => setTimeout(r, 1000));

    // Now trigger the analysis which will call Gemini
    console.log('2️⃣ Triggering Gemini analysis...');
    const analyzeResponse = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sessionId,
            incident_id: incidentId
        })
    });

    const result = await analyzeResponse.json();

    console.log('\n📊 Analysis Result:');
    console.log('Status:', analyzeResponse.status);
    console.log('Success:', result.success);

    if (result.gemini) {
        console.log('\n✅ Gemini Report Generated:');
        console.log(JSON.stringify(result.gemini, null, 2));
    } else {
        console.log('\n⚠️ No Gemini report in response');
        console.log('Full response:', JSON.stringify(result, null, 2));
    }

    console.log('\n🔍 Next Steps:');
    console.log('1. Go to Sentry: https://sentry.io/');
    console.log('2. Navigate to: Performance → Traces');
    console.log('3. Look for traces containing "gen_ai.request" spans');
    console.log('4. Click on the trace to see:');
    console.log('   - Input prompt (in span data)');
    console.log('   - Output response (in span data)');
    console.log('   - Token usage metrics');
    console.log('\n✅ Test complete!');
}

// Run the test
testGeminiMonitoring().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
