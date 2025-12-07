import axios from 'axios';
import dotenv from 'dotenv';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Investment } from '../models/Investment';
import { Debt } from '../models/Debt';
import { SavingsGoal } from '../models/SavingsGoal';
import { User } from '../models/User';
import {
    generateEnhancedFinancialAdvice as generateGeminiAdvice,
    generateInvestmentRecommendations as generateGeminiInvestment,
    generateSpendingInsights as generateGeminiSpending,
    generateDebtPayoffStrategy as generateGeminiDebt
} from './enhancedGeminiService';

dotenv.config();

const INFLECTION_API_URL = process.env.INFLECTION_API_URL || "https://api.inflection.ai/external/api/inference";
const INFLECTION_API_KEY = process.env.INFLECTION_API_KEY;

if (!INFLECTION_API_KEY) {
    console.warn('⚠️  WARNING: INFLECTION_API_KEY not set - AI features will fallback to Gemini if available');
} else {
    console.log('✅ Inflection AI configured successfully');
}

interface UserFinancialContext {
    xp?: number;
    level?: number;
    streak?: number;
    monthlyIncome?: number;
    userId?: string;
}

interface FinancialRAGContext {
    user: any;
    transactions: any[];
    budgets: any[];
    investments: any[];
    debts: any[];
    goals: any[];
    monthlyMetrics: any;
    yearlyMetrics: any;
    trends: any;
}

/**
 * Retrieve comprehensive financial data for RAG context
 */
async function retrieveFinancialContext(userId: string): Promise<FinancialRAGContext> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Parallel data retrieval for better performance
    const [user, transactions, budgets, investments, debts, goals] = await Promise.all([
        User.findOne({ clerkId: userId }),
        Transaction.find({ userId }).sort({ date: -1 }).limit(50),
        Budget.find({ userId }),
        Investment.find({ userId }),
        Debt.find({ userId }),
        SavingsGoal.find({ userId })
    ]);

    // Calculate monthly metrics
    const currentMonthTransactions = transactions.filter(t => 
        new Date(t.date) >= currentMonth
    );
    const lastMonthTransactions = transactions.filter(t => 
        new Date(t.date) >= lastMonth && new Date(t.date) < currentMonth
    );

    const monthlyMetrics = {
        currentMonth: {
            income: currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expenses: currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            transactionCount: currentMonthTransactions.length,
            categoryBreakdown: currentMonthTransactions.reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>)
        },
        lastMonth: {
            income: lastMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            expenses: lastMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            transactionCount: lastMonthTransactions.length
        }
    };

    // Calculate yearly metrics
    const yearlyTransactions = transactions.filter(t => new Date(t.date) >= currentYear);
    const yearlyMetrics = {
        totalIncome: yearlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: yearlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        avgMonthlyIncome: yearlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) / (now.getMonth() + 1),
        avgMonthlyExpenses: yearlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) / (now.getMonth() + 1)
    };

    // Calculate trends
    const trends = {
        spendingTrend: monthlyMetrics.currentMonth.expenses > monthlyMetrics.lastMonth.expenses ? 'increasing' : 'decreasing',
        incomeTrend: monthlyMetrics.currentMonth.income > monthlyMetrics.lastMonth.income ? 'increasing' : 'decreasing',
        savingsRate: monthlyMetrics.currentMonth.income > 0 ? 
            ((monthlyMetrics.currentMonth.income - monthlyMetrics.currentMonth.expenses) / monthlyMetrics.currentMonth.income) * 100 : 0
    };

    return {
        user: user?.toObject() || {},
        transactions: transactions.slice(0, 20).map(t => t.toObject()),
        budgets: budgets.map(b => b.toObject()),
        investments: investments.map(i => i.toObject()),
        debts: debts.map(d => d.toObject()),
        goals: goals.map(g => g.toObject()),
        monthlyMetrics,
        yearlyMetrics,
        trends
    };
}

/**
 * Build comprehensive RAG context string
 */
function buildRAGContext(context: FinancialRAGContext, query: string): string {
    let ragContext = `FINANCIAL DATA CONTEXT:\n\n`;

    // User Profile
    ragContext += `USER PROFILE:\n`;
    ragContext += `- Name: ${context.user.fullName || 'User'}\n`;
    ragContext += `- Level: ${context.user.level || 1}\n`;
    ragContext += `- XP: ${context.user.xp || 0}\n`;
    ragContext += `- Streak: ${context.user.streak || 0} days\n`;
    ragContext += `- Total Balance: $${(context.user.totalBalance || 0).toFixed(2)}\n\n`;

    // Monthly Performance
    ragContext += `CURRENT MONTH PERFORMANCE:\n`;
    ragContext += `- Income: $${context.monthlyMetrics.currentMonth.income.toFixed(2)}\n`;
    ragContext += `- Expenses: $${context.monthlyMetrics.currentMonth.expenses.toFixed(2)}\n`;
    ragContext += `- Net: $${(context.monthlyMetrics.currentMonth.income - context.monthlyMetrics.currentMonth.expenses).toFixed(2)}\n`;
    ragContext += `- Transactions: ${context.monthlyMetrics.currentMonth.transactionCount}\n`;
    ragContext += `- Savings Rate: ${context.trends.savingsRate.toFixed(1)}%\n\n`;

    // Spending by Category
    if (Object.keys(context.monthlyMetrics.currentMonth.categoryBreakdown).length > 0) {
        ragContext += `SPENDING BY CATEGORY (This Month):\n`;
        Object.entries(context.monthlyMetrics.currentMonth.categoryBreakdown)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5)
            .forEach(([category, amount]) => {
                ragContext += `- ${category}: $${(amount as number).toFixed(2)}\n`;
            });
        ragContext += `\n`;
    }

    // Budget Status
    if (context.budgets.length > 0) {
        ragContext += `BUDGET STATUS:\n`;
        const totalBudget = context.budgets.reduce((sum, b) => sum + b.limit, 0);
        ragContext += `- Total Budget: $${totalBudget.toFixed(2)}\n`;
        ragContext += `- Total Spent: $${context.monthlyMetrics.currentMonth.expenses.toFixed(2)}\n`;
        ragContext += `- Budget Utilization: ${totalBudget > 0 ? ((context.monthlyMetrics.currentMonth.expenses / totalBudget) * 100).toFixed(1) : 0}%\n`;
        
        const overBudgetCategories = context.budgets.filter(b => {
            const spent = context.monthlyMetrics.currentMonth.categoryBreakdown[b.category] || 0;
            return spent > b.limit;
        });
        if (overBudgetCategories.length > 0) {
            ragContext += `- Over Budget: ${overBudgetCategories.map(b => b.category).join(', ')}\n`;
        }
        ragContext += `\n`;
    }

    // Investment Portfolio
    if (context.investments.length > 0) {
        const totalValue = context.investments.reduce((sum, i) => sum + i.currentValue, 0);
        const totalCost = context.investments.reduce((sum, i) => sum + i.initialAmount, 0);
        const totalReturn = totalValue - totalCost;
        const returnPercentage = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
        
        ragContext += `INVESTMENT PORTFOLIO:\n`;
        ragContext += `- Total Value: $${totalValue.toFixed(2)}\n`;
        ragContext += `- Total Return: $${totalReturn.toFixed(2)} (${returnPercentage.toFixed(2)}%)\n`;
        ragContext += `- Number of Investments: ${context.investments.length}\n`;
        
        const bestPerformer = context.investments.reduce((best, inv) => {
            const invReturn = ((inv.currentValue - inv.initialAmount) / inv.initialAmount) * 100;
            const bestReturn = ((best.currentValue - best.initialAmount) / best.initialAmount) * 100;
            return invReturn > bestReturn ? inv : best;
        });
        if (bestPerformer) {
            const bestReturn = ((bestPerformer.currentValue - bestPerformer.initialAmount) / bestPerformer.initialAmount) * 100;
            ragContext += `- Best Performer: ${bestPerformer.name} (${bestReturn.toFixed(2)}%)\n`;
        }
        ragContext += `\n`;
    }

    // Debt Overview
    if (context.debts.length > 0) {
        const totalDebt = context.debts.reduce((sum, d) => sum + d.currentBalance, 0);
        const totalMinPayment = context.debts.reduce((sum, d) => sum + d.minimumPayment, 0);
        const highestInterest = Math.max(...context.debts.map(d => d.interestRate));
        
        ragContext += `DEBT OVERVIEW:\n`;
        ragContext += `- Total Debt: $${totalDebt.toFixed(2)}\n`;
        ragContext += `- Monthly Payments: $${totalMinPayment.toFixed(2)}\n`;
        ragContext += `- Highest Interest Rate: ${highestInterest.toFixed(2)}%\n`;
        ragContext += `- Number of Debts: ${context.debts.length}\n\n`;
    }

    // Savings Goals
    if (context.goals.length > 0) {
        const totalTarget = context.goals.reduce((sum, g) => sum + g.targetAmount, 0);
        const totalSaved = context.goals.reduce((sum, g) => sum + g.currentAmount, 0);
        const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
        
        ragContext += `SAVINGS GOALS:\n`;
        ragContext += `- Total Target: $${totalTarget.toFixed(2)}\n`;
        ragContext += `- Total Saved: $${totalSaved.toFixed(2)}\n`;
        ragContext += `- Overall Progress: ${progress.toFixed(1)}%\n`;
        ragContext += `- Active Goals: ${context.goals.filter(g => g.status === 'in-progress').length}\n\n`;
    }

    // Recent Transactions with Daily Breakdown
    if (context.transactions.length > 0) {
        ragContext += `RECENT TRANSACTIONS (Last 20):\n`;
        
        // Group transactions by date
        const transactionsByDate: Record<string, any[]> = {};
        context.transactions.slice(0, 20).forEach(t => {
            const dateKey = new Date(t.date).toLocaleDateString();
            if (!transactionsByDate[dateKey]) {
                transactionsByDate[dateKey] = [];
            }
            transactionsByDate[dateKey].push(t);
        });
        
        // Display grouped by date
        Object.entries(transactionsByDate).forEach(([date, txs]) => {
            const dailyTotal = txs.reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);
            ragContext += `\n${date} (Daily Net: ${dailyTotal >= 0 ? '+' : ''}$${dailyTotal.toFixed(2)}):\n`;
            txs.forEach(t => {
                ragContext += `  • ${t.type === 'expense' ? '-' : '+'}$${t.amount.toFixed(2)} - ${t.category} - ${t.description}\n`;
            });
        });
        ragContext += `\n`;
    }

    // Daily Spending Patterns
    if (context.transactions.length > 0) {
        const currentDate = new Date();
        const last7Days = context.transactions.filter(t => {
            const daysDiff = (currentDate.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        });
        
        if (last7Days.length > 0) {
            const dailyAvg = last7Days
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0) / 7;
            
            ragContext += `DAILY SPENDING PATTERNS (Last 7 Days):\n`;
            ragContext += `- Average Daily Spending: $${dailyAvg.toFixed(2)}\n`;
            ragContext += `- Transaction Frequency: ${last7Days.length} transactions in 7 days\n`;
            ragContext += `- Most Active Day: ${getMostActiveDay(last7Days)}\n\n`;
        }
    }

    // Trends
    ragContext += `FINANCIAL TRENDS:\n`;
    ragContext += `- Spending Trend: ${context.trends.spendingTrend}\n`;
    ragContext += `- Income Trend: ${context.trends.incomeTrend}\n`;
    ragContext += `- Current Savings Rate: ${context.trends.savingsRate.toFixed(1)}%\n\n`;

    // Query Context
    ragContext += `USER QUERY: "${query}"\n\n`;

    return ragContext;
}

/**
 * Helper function to find most active transaction day
 */
function getMostActiveDay(transactions: any[]): string {
    const dayCount: Record<string, number> = {};
    transactions.forEach(t => {
        const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' });
        dayCount[day] = (dayCount[day] || 0) + 1;
    });
    
    const mostActive = Object.entries(dayCount)
        .sort(([,a], [,b]) => b - a)[0];
    
    return mostActive ? `${mostActive[0]} (${mostActive[1]} transactions)` : 'N/A';
}

async function callInflectionAI(prompt: string): Promise<string> {
    if (!INFLECTION_API_KEY) {
        throw new Error("Inflection AI API key not configured");
    }

    try {
        const response = await axios.post(
            INFLECTION_API_URL,
            {
                context: [
                    { text: prompt, type: "Human" }
                ],
                config: "Pi-3.1"
            },
            {
                headers: {
                    'Authorization': `Bearer ${INFLECTION_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.text || response.data.choices?.[0]?.message?.content || "No response generated";
    } catch (error: any) {
        console.error("Inflection AI API Error:", error.response?.data || error.message);
        throw error; // Re-throw to trigger fallback
    }
}

/**
 * Generate enhanced financial advice with RAG context
 */
export async function generateEnhancedFinancialAdvice(
    user: UserFinancialContext,
    financialData: any,
    query: string
): Promise<string> {
    if (!user.userId) {
        throw new Error('User ID is required for RAG context');
    }

    // Retrieve comprehensive financial context
    const ragContext = await retrieveFinancialContext(user.userId);
    const contextString = buildRAGContext(ragContext, query);
    // Use RAG context instead of basic context

    const prompt = `You are Pi, an expert financial advisor integrated into SmartWallet, a gamified personal finance app. You have access to comprehensive financial data through retrieval augmented generation.

${contextString}

INSTRUCTIONS:
1. Analyze the provided financial data thoroughly to give personalized advice
2. Reference specific numbers, trends, and patterns from the user's actual data
3. Acknowledge their gamification progress (level, XP, streak) when relevant
4. Provide actionable recommendations with concrete steps
5. For investments: Include disclaimer "⚠️ This is general guidance, not professional financial advice. Consult a licensed financial advisor for investment decisions."
6. Use a supportive, encouraging tone
7. Keep responses focused and actionable (2-3 paragraphs)
8. Use relevant emojis sparingly (💰, 📊, 🎯, ✅, ⚠️)

RESPONSE FORMAT:
- Direct answer based on their data
- 2-3 specific, data-driven recommendations
- Encouraging next steps

Generate your response:`;

    try {
        return await callInflectionAI(prompt);
    } catch (error) {
        console.log("Falling back to Gemini AI...");
        return await generateGeminiAdvice(user, financialData, query);
    }
}

/**
 * Generate investment recommendations with disclaimer
 */
export async function generateInvestmentRecommendations(
    user: UserFinancialContext,
    portfolioData: any
): Promise<string> {
    const contextString = `User Profile:
- Monthly Income: $${user.monthlyIncome || 0}
- Level: ${user.level || 1}

Current Portfolio:
- Total Value: $${portfolioData.portfolioMetrics?.totalValue?.toFixed(2) || 0}
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

Generate your response:`;

    try {
        return await callInflectionAI(prompt);
    } catch (error) {
        console.log("Falling back to Gemini AI...");
        return await generateGeminiInvestment(user, portfolioData);
    }
}

/**
 * Generate contextual spending insights
 */
export async function generateSpendingInsights(
    spendingData: any,
    budgetData?: any
): Promise<string> {
    let contextString = `Spending Analysis:
- Total Spent: $${spendingData.totalSpent?.toFixed(2) || 0}
- Transaction Count: ${spendingData.transactionCount || 0}
`;

    if (spendingData.byCategory) {
        contextString += `- Category Breakdown:\n`;
        Object.entries(spendingData.byCategory)
            .sort(([, a]: any, [, b]: any) => b - a)
            .forEach(([category, amount]) => {
                contextString += `  * ${category}: $${(amount as number).toFixed(2)}\n`;
            });
    }

    if (budgetData?.budgets) {
        contextString += `\nBudget Comparison:\n`;
        budgetData.budgets.forEach((b: any) => {
            contextString += `- ${b.category}: $${b.spent.toFixed(2)} / $${b.limit.toFixed(2)} (${b.percentageUsed.toFixed(1)}%)\n`;
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

Generate your insights:`;

    try {
        return await callInflectionAI(prompt);
    } catch (error) {
        console.log("Falling back to Gemini AI...");
        return await generateGeminiSpending(spendingData, budgetData);
    }
}

/**
 * Generate debt payoff strategy
 */
export async function generateDebtPayoffStrategy(
    debtData: any
): Promise<string> {
    let contextString = `Debt Overview:
- Total Debt: $${debtData.debtSummary?.totalDebt?.toFixed(2) || 0}
- Monthly Payment: $${debtData.debtSummary?.totalMonthlyPayment?.toFixed(2) || 0}

Individual Debts:
`;

    if (debtData.debts) {
        debtData.debts.forEach((debt: any) => {
            contextString += `- ${debt.name}: $${debt.currentBalance?.toFixed(2)} at ${debt.interestRate}% APR (Min Payment: $${debt.minimumPayment?.toFixed(2)})\n`;
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

Generate your strategy:`;

    try {
        return await callInflectionAI(prompt);
    } catch (error) {
        console.log("Falling back to Gemini AI...");
        return await generateGeminiDebt(debtData);
    }
}
