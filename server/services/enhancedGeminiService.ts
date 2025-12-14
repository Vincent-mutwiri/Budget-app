import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini Client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || "";

if (!GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY not set - AI financial advisor will not work');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface UserFinancialContext {
    xp?: number;
    level?: number;
    streak?: number;
    monthlyIncome?: number;
    currency?: string;
}

/**
 * Generate enhanced financial advice with user context
 */
export async function generateEnhancedFinancialAdvice(
    user: UserFinancialContext,
    financialData: any,
    query: string
): Promise<string> {
    const currency = user.currency || 'USD';
    // Build comprehensive context
    let contextString = `User Profile:
- Level: ${user.level || 1}
- XP: ${user.xp || 0}
- Streak: ${user.streak || 0} days
- Monthly Income: ${currency} ${user.monthlyIncome || 0}

`;

    // Add spending context if available
    if (financialData?.totalSpent !== undefined) {
        contextString += `Spending Data:
- Total Spent: ${currency} ${financialData.totalSpent.toFixed(2)}
- Transaction Count: ${financialData.transactionCount || 0}
`;
        if (financialData.byCategory) {
            contextString += `- Top Categories:\n`;
            Object.entries(financialData.byCategory)
                .sort(([, a]: any, [, b]: any) => b - a)
                .slice(0, 3)
                .forEach(([category, amount]) => {
                    contextString += `  * ${category}: ${currency} ${(amount as number).toFixed(2)}\n`;
                });
        }
        contextString += '\n';
    }

    // Add budget context if available
    if (financialData?.budgets) {
        contextString += `Budget Status:
- Total Budget: ${currency} ${financialData.totalBudget?.toFixed(2) || 0}
- Total Spent: ${currency} ${financialData.totalSpent?.toFixed(2) || 0}
`;
        const overBudget = financialData.budgets.filter((b: any) => b.percentageUsed > 100);
        if (overBudget.length > 0) {
            contextString += `- Over Budget Categories: ${overBudget.map((b: any) => b.category).join(', ')}\n`;
        }
        contextString += '\n';
    }

    // Add investment context if available
    if (financialData?.portfolioMetrics) {
        contextString += `Investment Portfolio:
- Total Value: ${currency} ${financialData.portfolioMetrics.totalValue?.toFixed(2) || 0}
- Total Return: ${currency} ${financialData.portfolioMetrics.totalReturn?.toFixed(2) || 0} (${financialData.portfolioMetrics.totalReturnPercentage?.toFixed(2) || 0}%)
- Number of Investments: ${financialData.investments?.length || 0}
`;
        contextString += '\n';
    }

    // Add debt context if available
    if (financialData?.debtSummary) {
        contextString += `Debt Overview:
- Total Debt: ${currency} ${financialData.debtSummary.totalDebt?.toFixed(2) || 0}
- Monthly Payment: ${currency} ${financialData.debtSummary.totalMonthlyPayment?.toFixed(2) || 0}
- Number of Debts: ${financialData.debts?.length || 0}
`;
        contextString += '\n';
    }

    // Add savings goals context if available
    if (financialData?.goals) {
        contextString += `Savings Goals:
- Total Target: ${currency} ${financialData.totalTarget?.toFixed(2) || 0}
- Total Saved: ${currency} ${financialData.totalSaved?.toFixed(2) || 0}
- Progress: ${financialData.progress?.toFixed(1) || 0}%
`;
        contextString += '\n';
    }

    const prompt = `You are an expert financial advisor integrated into SmartWallet, a gamified personal finance app.

${contextString}

User Question: "${query}"

Instructions:
1. Provide personalized, actionable financial advice based on the user's actual data
2. Be encouraging and supportive, acknowledging their progress (level, streak, XP)
3. Give specific recommendations with numbers when possible
4. If discussing investments, ALWAYS include this disclaimer: "⚠️ This is general guidance, not professional financial advice. Consult a licensed financial advisor for investment decisions."
5. Use a friendly, conversational tone
6. Keep responses concise (2-3 paragraphs max)
7. Include emojis sparingly for emphasis (💰, 📊, 🎯, ✅, ⚠️)
8. Use "${currency}" for any currency values.
9. CRITICAL: Carefully distinguish between income and expenses. Do not count income as spending.

Response Format:
- Start with a direct answer to their question
- Provide 2-3 specific action items or insights
- End with encouragement or next steps

Generate your response:`;

    if (!GEMINI_API_KEY) {
        return "⚠️ AI Financial Advisor is not configured. Please add your GEMINI_API_KEY to the .env file.";
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || "I couldn't generate advice at this moment. Please try again later.";
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        if (error.message?.includes('API key')) {
            return "⚠️ Invalid API key. Please check your GEMINI_API_KEY in the .env file.";
        }
        return "Financial Advisor is currently offline. Please check your connection and try again.";
    }
}

/**
 * Generate investment recommendations with disclaimer
 */
export async function generateInvestmentRecommendations(
    user: UserFinancialContext,
    portfolioData: any
): Promise<string> {
    const currency = user.currency || 'USD';
    const contextString = `User Profile:
- Monthly Income: ${currency} ${user.monthlyIncome || 0}
- Level: ${user.level || 1}

Current Portfolio:
- Total Value: ${currency} ${portfolioData.portfolioMetrics?.totalValue?.toFixed(2) || 0}
- Total Return: ${portfolioData.portfolioMetrics?.totalReturnPercentage?.toFixed(2) || 0}%
- Asset Allocation: ${portfolioData.portfolioMetrics?.assetAllocation ? JSON.stringify(portfolioData.portfolioMetrics.assetAllocation) : 'N/A'}
`;

    const prompt = `You are a financial advisor providing general investment guidance.

${contextString}

Task: Provide general investment recommendations for portfolio diversification and risk management.

CRITICAL: You MUST include this exact disclaimer at the start of your response:
"⚠️ DISCLAIMER: This is general educational information, not professional financial advice. Always consult a licensed financial advisor before making investment decisions."

Guidelines:
1. Discuss general principles of diversification
2. Mention common asset allocation strategies
3. Discuss risk tolerance considerations
4. Suggest areas for potential research (not specific stocks)
5. Keep it educational and general
6. Use 2-3 paragraphs maximum
7. Use "${currency}" for any currency values.

Generate your response:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || "I couldn't generate recommendations at this moment. Please try again later.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "⚠️ DISCLAIMER: This is general educational information, not professional financial advice. Always consult a licensed financial advisor before making investment decisions.\n\nInvestment recommendations are currently unavailable. Please try again later.";
    }
}

/**
 * Generate contextual spending insights
 */
export async function generateSpendingInsights(
    spendingData: any,
    budgetData?: any
): Promise<string> {
    const currency = budgetData?.currency || 'USD';
    let contextString = `Spending Analysis:
- Total Spent: ${currency} ${spendingData.totalSpent?.toFixed(2) || 0}
- Transaction Count: ${spendingData.transactionCount || 0}
`;

    if (spendingData.byCategory) {
        contextString += `- Category Breakdown:\n`;
        Object.entries(spendingData.byCategory)
            .sort(([, a]: any, [, b]: any) => b - a)
            .forEach(([category, amount]) => {
                contextString += `  * ${category}: ${currency} ${(amount as number).toFixed(2)}\n`;
            });
    }

    if (budgetData?.budgets) {
        contextString += `\nBudget Comparison:\n`;
        budgetData.budgets.forEach((b: any) => {
            contextString += `- ${b.category}: ${currency} ${b.spent.toFixed(2)} / ${currency} ${b.limit.toFixed(2)} (${b.percentageUsed.toFixed(1)}%)\n`;
        });
    }

    const prompt = `You are a financial advisor analyzing spending patterns.

${contextString}

Task: Provide insights and recommendations to optimize spending.

Guidelines:
1. Identify the top spending categories
2. Highlight any concerning patterns
3. Suggest 2-3 specific ways to reduce spending
4. Be encouraging and practical
5. Use 2-3 paragraphs maximum
6. Include relevant emojis (💰, 📊, 🎯)
7. Use "${currency}" for any currency values.

Generate your insights:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || "I couldn't analyze your spending at this moment. Please try again later.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Spending analysis is currently unavailable. Please try again later.";
    }
}

/**
 * Generate debt payoff strategy
 */
export async function generateDebtPayoffStrategy(
    debtData: any
): Promise<string> {
    const currency = debtData?.currency || 'USD';
    let contextString = `Debt Overview:
- Total Debt: ${currency} ${debtData.debtSummary?.totalDebt?.toFixed(2) || 0}
- Monthly Payment: ${currency} ${debtData.debtSummary?.totalMonthlyPayment?.toFixed(2) || 0}

Individual Debts:
`;

    if (debtData.debts) {
        debtData.debts.forEach((debt: any) => {
            contextString += `- ${debt.name}: ${currency} ${debt.currentBalance?.toFixed(2)} at ${debt.interestRate}% APR (Min Payment: ${currency} ${debt.minimumPayment?.toFixed(2)})\n`;
        });
    }

    const prompt = `You are a financial advisor specializing in debt management.

${contextString}

Task: Provide a strategic debt payoff plan.

Guidelines:
1. Recommend either avalanche (highest interest first) or snowball (smallest balance first) method
2. Explain the reasoning for your recommendation
3. Suggest ways to accelerate debt payoff
4. Provide encouragement and realistic expectations
5. Use 2-3 paragraphs maximum
6. Include relevant emojis (💪, 🎯, ✅)
7. Use "${currency}" for any currency values.

Generate your strategy:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || "I couldn't generate a debt strategy at this moment. Please try again later.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Debt strategy generation is currently unavailable. Please try again later.";
    }
}
