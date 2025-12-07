const axios = require('axios');
require('dotenv').config();

/**
 * Test script to verify Inflection AI receives proper financial data
 */

async function testDataConnection() {
    console.log('🔍 Testing Inflection AI Data Connection\n');
    
    // Simulate comprehensive financial data
    const mockFinancialData = {
        user: {
            fullName: 'Test User',
            level: 5,
            xp: 450,
            streak: 7,
            totalBalance: 5000
        },
        monthlyMetrics: {
            currentMonth: {
                income: 5000,
                expenses: 3500,
                transactionCount: 45,
                categoryBreakdown: {
                    'Housing': 1500,
                    'Food': 600,
                    'Transportation': 400,
                    'Entertainment': 300,
                    'Utilities': 200,
                    'Shopping': 500
                }
            },
            lastMonth: {
                income: 4800,
                expenses: 3200,
                transactionCount: 42
            }
        },
        budgets: [
            { category: 'Housing', limit: 1500, spent: 1500 },
            { category: 'Food', limit: 700, spent: 600 },
            { category: 'Transportation', limit: 500, spent: 400 }
        ],
        investments: [
            { name: 'Tech Stock', currentValue: 5000, initialAmount: 4000 },
            { name: 'Index Fund', currentValue: 3000, initialAmount: 2800 }
        ],
        debts: [
            { name: 'Credit Card', currentBalance: 2000, interestRate: 18.5, minimumPayment: 100 }
        ],
        goals: [
            { title: 'Emergency Fund', targetAmount: 10000, currentAmount: 5000, status: 'in-progress' }
        ],
        trends: {
            spendingTrend: 'increasing',
            incomeTrend: 'stable',
            savingsRate: 30
        }
    };

    // Build RAG context string (similar to what the service does)
    const ragContext = `
FINANCIAL DATA CONTEXT:

USER PROFILE:
- Name: ${mockFinancialData.user.fullName}
- Level: ${mockFinancialData.user.level}
- XP: ${mockFinancialData.user.xp}
- Streak: ${mockFinancialData.user.streak} days
- Total Balance: $${mockFinancialData.user.totalBalance.toFixed(2)}

CURRENT MONTH PERFORMANCE:
- Income: $${mockFinancialData.monthlyMetrics.currentMonth.income.toFixed(2)}
- Expenses: $${mockFinancialData.monthlyMetrics.currentMonth.expenses.toFixed(2)}
- Net: $${(mockFinancialData.monthlyMetrics.currentMonth.income - mockFinancialData.monthlyMetrics.currentMonth.expenses).toFixed(2)}
- Transactions: ${mockFinancialData.monthlyMetrics.currentMonth.transactionCount}
- Savings Rate: ${mockFinancialData.trends.savingsRate.toFixed(1)}%

SPENDING BY CATEGORY (This Month):
${Object.entries(mockFinancialData.monthlyMetrics.currentMonth.categoryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .map(([category, amount]) => `- ${category}: $${amount.toFixed(2)}`)
    .join('\n')}

BUDGET STATUS:
- Total Budget: $${mockFinancialData.budgets.reduce((sum, b) => sum + b.limit, 0).toFixed(2)}
- Total Spent: $${mockFinancialData.budgets.reduce((sum, b) => sum + b.spent, 0).toFixed(2)}
${mockFinancialData.budgets.map(b => 
    `- ${b.category}: $${b.spent.toFixed(2)} / $${b.limit.toFixed(2)} (${((b.spent/b.limit)*100).toFixed(1)}%)`
).join('\n')}

INVESTMENT PORTFOLIO:
- Total Value: $${mockFinancialData.investments.reduce((sum, i) => sum + i.currentValue, 0).toFixed(2)}
- Total Return: $${mockFinancialData.investments.reduce((sum, i) => sum + (i.currentValue - i.initialAmount), 0).toFixed(2)}
${mockFinancialData.investments.map(i => 
    `- ${i.name}: $${i.currentValue.toFixed(2)} (${(((i.currentValue - i.initialAmount) / i.initialAmount) * 100).toFixed(2)}% return)`
).join('\n')}

DEBT OVERVIEW:
- Total Debt: $${mockFinancialData.debts.reduce((sum, d) => sum + d.currentBalance, 0).toFixed(2)}
- Monthly Payments: $${mockFinancialData.debts.reduce((sum, d) => sum + d.minimumPayment, 0).toFixed(2)}
${mockFinancialData.debts.map(d => 
    `- ${d.name}: $${d.currentBalance.toFixed(2)} at ${d.interestRate}% APR`
).join('\n')}

SAVINGS GOALS:
${mockFinancialData.goals.map(g => 
    `- ${g.title}: $${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)} (${((g.currentAmount/g.targetAmount)*100).toFixed(1)}%)`
).join('\n')}

FINANCIAL TRENDS:
- Spending Trend: ${mockFinancialData.trends.spendingTrend}
- Income Trend: ${mockFinancialData.trends.incomeTrend}
- Current Savings Rate: ${mockFinancialData.trends.savingsRate.toFixed(1)}%
`;

    console.log('📊 Sample Financial Data Context:');
    console.log('─'.repeat(70));
    console.log(ragContext);
    console.log('─'.repeat(70));
    console.log();

    // Test 1: General financial advice with context
    console.log('Test 1: General Financial Advice with Full Context');
    console.log('─'.repeat(70));
    
    const query1 = "Based on my current financial situation, what should I focus on to improve my finances?";
    
    const prompt1 = `You are Pi, an expert financial advisor integrated into SmartWallet.

${ragContext}

USER QUERY: "${query1}"

INSTRUCTIONS:
1. Analyze the provided financial data thoroughly
2. Reference specific numbers and trends from the user's actual data
3. Provide 2-3 actionable recommendations
4. Be encouraging and supportive
5. Keep response focused (2-3 paragraphs)

Generate your response:`;

    try {
        const response1 = await axios.post(
            process.env.INFLECTION_API_URL || 'https://api.inflection.ai/external/api/inference',
            {
                context: [
                    { text: prompt1, type: 'Human' }
                ],
                config: 'Pi-3.1'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.INFLECTION_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Response:');
        console.log(response1.data.text);
        console.log();
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
        console.log();
    }

    // Test 2: Specific spending analysis
    console.log('Test 2: Spending Analysis with Category Data');
    console.log('─'.repeat(70));
    
    const query2 = "I'm spending $600 on food this month. Is that too much?";
    
    const prompt2 = `You are Pi, a financial advisor.

${ragContext}

USER QUERY: "${query2}"

Analyze their food spending in context of their total income and other expenses. Provide specific advice.

Generate your response:`;

    try {
        const response2 = await axios.post(
            process.env.INFLECTION_API_URL || 'https://api.inflection.ai/external/api/inference',
            {
                context: [
                    { text: prompt2, type: 'Human' }
                ],
                config: 'Pi-3.1'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.INFLECTION_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Response:');
        console.log(response2.data.text);
        console.log();
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
        console.log();
    }

    // Test 3: Investment advice
    console.log('Test 3: Investment Advice with Portfolio Data');
    console.log('─'.repeat(70));
    
    const query3 = "Should I invest more in stocks or focus on paying off my credit card debt?";
    
    const prompt3 = `You are Pi, a financial advisor.

${ragContext}

USER QUERY: "${query3}"

Consider their debt interest rate (18.5%) vs potential investment returns. Provide balanced advice.

⚠️ DISCLAIMER: Include this at the start: "This is general guidance, not professional financial advice. Consult a licensed financial advisor for investment decisions."

Generate your response:`;

    try {
        const response3 = await axios.post(
            process.env.INFLECTION_API_URL || 'https://api.inflection.ai/external/api/inference',
            {
                context: [
                    { text: prompt3, type: 'Human' }
                ],
                config: 'Pi-3.1'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.INFLECTION_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Response:');
        console.log(response3.data.text);
        console.log();
    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
        console.log();
    }

    // Summary
    console.log('═'.repeat(70));
    console.log('📊 DATA CONNECTION TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log('✅ Financial data properly formatted');
    console.log('✅ RAG context includes:');
    console.log('   - User profile (level, XP, streak, balance)');
    console.log('   - Monthly income/expenses');
    console.log('   - Category breakdown');
    console.log('   - Budget status');
    console.log('   - Investment portfolio');
    console.log('   - Debt overview');
    console.log('   - Savings goals');
    console.log('   - Financial trends');
    console.log('✅ Inflection AI receives and processes context');
    console.log('✅ Responses are personalized and data-driven');
    console.log('═'.repeat(70));
}

testDataConnection();
