const axios = require('axios');
require('dotenv').config();

async function verifyInflectionSetup() {
    console.log('🔍 Verifying Inflection AI Setup\n');
    
    // Check environment variables
    console.log('1. Environment Variables:');
    console.log(`   INFLECTION_API_URL: ${process.env.INFLECTION_API_URL || 'Not set (will use default)'}`);
    console.log(`   INFLECTION_API_KEY: ${process.env.INFLECTION_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set (fallback available)' : '⚠️  Not set (no fallback)'}\n`);
    
    if (!process.env.INFLECTION_API_KEY) {
        console.log('❌ INFLECTION_API_KEY is not set in .env file');
        return;
    }
    
    // Test API connection
    console.log('2. Testing Inflection AI API Connection:');
    try {
        const response = await axios.post(
            process.env.INFLECTION_API_URL || 'https://api.inflection.ai/external/api/inference',
            {
                context: [
                    { text: 'Hello, can you help me with budgeting?', type: 'Human' }
                ],
                config: 'Pi-3.1'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.INFLECTION_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('   ✅ API Connection: SUCCESS');
        console.log(`   Response: ${response.data.text.substring(0, 100)}...\n`);
        
        // Test with financial context
        console.log('3. Testing with Financial Context:');
        const financialResponse = await axios.post(
            process.env.INFLECTION_API_URL || 'https://api.inflection.ai/external/api/inference',
            {
                context: [
                    { 
                        text: `User Profile:
- Monthly Income: $5000
- Monthly Expenses: $4200
- Savings Rate: 16%

Recent Transactions:
- Groceries: $450
- Rent: $1500
- Entertainment: $200

Question: How can I improve my savings rate?`, 
                        type: 'Human' 
                    }
                ],
                config: 'Pi-3.1'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.INFLECTION_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('   ✅ Financial Context Test: SUCCESS');
        console.log(`   Response: ${financialResponse.data.text.substring(0, 150)}...\n`);
        
        console.log('✅ All checks passed! Inflection AI is properly configured.\n');
        console.log('📝 Summary:');
        console.log('   - API Key: Valid');
        console.log('   - Endpoint: Correct');
        console.log('   - Request Format: Correct');
        console.log('   - Response Format: Valid');
        
    } catch (error) {
        console.log('   ❌ API Connection: FAILED');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

verifyInflectionSetup();
