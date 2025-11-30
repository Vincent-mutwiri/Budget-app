const axios = require('axios');

// Test Inflection AI API directly
async function testInflectionAPI() {
    try {
        console.log('Testing Inflection AI API...');
        
        const response = await axios.post(
            'https://api.inflection.ai/external/api/inference',
            {
                context: [
                    { text: 'Hello, can you help me with my budget?', type: 'Human' }
                ],
                config: 'Pi-3.1'
            },
            {
                headers: {
                    'Authorization': 'Bearer dQ7nIYhuMxnYWsnLSt635pOWyqA31oWyPleNJoUJM',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Inflection AI API Response:');
        console.log(response.data.text);
        
        return true;
    } catch (error) {
        console.error('❌ Inflection AI API Error:');
        console.error(error.response?.data || error.message);
        return false;
    }
}

// Test local server AI endpoint
async function testLocalAI() {
    try {
        console.log('\nTesting local AI endpoint...');
        
        const response = await axios.post(
            'http://localhost:5000/api/ai/advice',
            {
                userId: 'test-user',
                query: 'How can I improve my spending habits?'
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Local AI Response:');
        console.log(response.data.advice);
        
        return true;
    } catch (error) {
        console.error('❌ Local AI Error:');
        console.error(error.response?.data || error.message);
        return false;
    }
}

async function runTests() {
    console.log('🧪 Testing Inflection AI Integration\n');
    
    const apiTest = await testInflectionAPI();
    
    if (apiTest) {
        console.log('\n⏳ Waiting 2 seconds before testing local server...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await testLocalAI();
    }
    
    console.log('\n🏁 Tests completed');
}

runTests();