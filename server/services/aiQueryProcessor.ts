import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Investment } from '../models/Investment';
import { Debt } from '../models/Debt';
import { SavingsGoal } from '../models/SavingsGoal';
import { User } from '../models/User';
import { generateEnhancedFinancialAdvice } from './inflectionAIService';
import { calculateInvestmentMetrics, calculatePortfolioMetrics } from './investmentCalculator';
import { calculateDebtMetrics, calculateDebtSummary } from './debtCalculator';

interface QueryIntent {
    type: 'spending' | 'budget' | 'investment' | 'debt' | 'savings' | 'general' | 'advice';
    entities: {
        categories?: string[];
        dateRange?: { start: Date; end: Date };
        amounts?: number[];
        timeframe?: string;
    };
}

interface AIQueryResponse {
    answer: string;
    contextualInsight?: any;
    supportingData?: any;
}

/**
 * Parse natural language query to extract intent and entities
 */
export function parseQuery(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    // Determine intent
    let type: QueryIntent['type'] = 'general';

    if (lowerQuery.includes('spend') || lowerQuery.includes('spent') || lowerQuery.includes('expense')) {
        type = 'spending';
    } else if (lowerQuery.includes('budget')) {
        type = 'budget';
    } else if (lowerQuery.includes('invest') || lowerQuery.includes('portfolio') || lowerQuery.includes('stock')) {
        type = 'investment';
    } else if (lowerQuery.includes('debt') || lowerQuery.includes('loan') || lowerQuery.includes('owe')) {
        type = 'debt';
    } else if (lowerQuery.includes('save') || lowerQuery.includes('saving') || lowerQuery.includes('goal')) {
        type = 'savings';
    } else if (lowerQuery.includes('advice') || lowerQuery.includes('recommend') || lowerQuery.includes('should i')) {
        type = 'advice';
    }

    // Extract entities
    const entities: QueryIntent['entities'] = {};

    // Extract categories
    const categories = ['housing', 'food', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'savings'];
    const foundCategories = categories.filter(cat => lowerQuery.includes(cat));
    if (foundCategories.length > 0) {
        entities.categories = foundCategories;
    }

    // Extract timeframe
    if (lowerQuery.includes('this month') || lowerQuery.includes('current month')) {
        entities.timeframe = 'current_month';
    } else if (lowerQuery.includes('last month') || lowerQuery.includes('previous month')) {
        entities.timeframe = 'last_month';
    } else if (lowerQuery.includes('this year') || lowerQuery.includes('current year')) {
        entities.timeframe = 'current_year';
    } else if (lowerQuery.includes('last year')) {
        entities.timeframe = 'last_year';
    } else if (lowerQuery.includes('week')) {
        entities.timeframe = 'week';
    }

    // Extract date range based on timeframe
    const now = new Date();
    if (entities.timeframe === 'current_month') {
        entities.dateRange = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
    } else if (entities.timeframe === 'last_month') {
        entities.dateRange = {
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            end: new Date(now.getFullYear(), now.getMonth(), 0)
        };
    } else if (entities.timeframe === 'current_year') {
        entities.dateRange = {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date(now.getFullYear(), 11, 31)
        };
    } else if (entities.timeframe === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        entities.dateRange = {
            start: weekAgo,
            end: now
        };
    }

    return { type, entities };
}

/**
 * Query relevant financial data based on intent
 */
async function queryFinancialData(userId: string, intent: QueryIntent): Promise<any> {
    const { type, entities } = intent;

    switch (type) {
        case 'spending': {
            const query: any = { userId, type: 'expense' };

            if (entities.categories && entities.categories.length > 0) {
                query.category = { $in: entities.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)) };
            }

            if (entities.dateRange) {
                query.date = {
                    $gte: entities.dateRange.start.toISOString(),
                    $lte: entities.dateRange.end.toISOString()
                };
            }

            const transactions = await Transaction.find(query).sort({ date: -1 });
            const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

            // Group by category
            const byCategory: Record<string, number> = {};
            transactions.forEach(t => {
                byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
            });

            return {
                totalSpent,
                transactionCount: transactions.length,
                byCategory,
                transactions: transactions.slice(0, 10)
            };
        }

        case 'budget': {
            const budgets = await Budget.find({ userId });
            const transactions = await Transaction.find({
                userId,
                type: 'expense',
                date: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
                }
            });

            // Calculate spending per category
            const spendingByCategory: Record<string, number> = {};
            transactions.forEach(t => {
                spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
            });

            // Match with budgets
            const budgetStatus = budgets.map(budget => ({
                category: budget.category,
                limit: budget.limit,
                spent: spendingByCategory[budget.category] || 0,
                remaining: budget.limit - (spendingByCategory[budget.category] || 0),
                percentageUsed: ((spendingByCategory[budget.category] || 0) / budget.limit) * 100
            }));

            return {
                budgets: budgetStatus,
                totalBudget: budgets.reduce((sum, b) => sum + b.limit, 0),
                totalSpent: Object.values(spendingByCategory).reduce((sum, val) => sum + val, 0)
            };
        }

        case 'investment': {
            const investments = await Investment.find({ userId });
            const investmentsWithMetrics = investments.map(inv => ({
                ...inv.toObject(),
                calculatedMetrics: calculateInvestmentMetrics(inv.toObject())
            }));

            const portfolioMetrics = calculatePortfolioMetrics(investments.map(inv => inv.toObject()));

            return {
                investments: investmentsWithMetrics,
                portfolioMetrics
            };
        }

        case 'debt': {
            const debts = await Debt.find({ userId });
            const debtsWithMetrics = debts.map(debt => ({
                ...debt.toObject(),
                calculatedMetrics: calculateDebtMetrics(debt.toObject())
            }));

            const debtSummary = calculateDebtSummary(debts.map(d => d.toObject()));

            return {
                debts: debtsWithMetrics,
                debtSummary
            };
        }

        case 'savings': {
            const goals = await SavingsGoal.find({ userId });
            const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
            const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

            return {
                goals,
                totalTarget,
                totalSaved,
                progress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0
            };
        }

        default:
            return null;
    }
}

/**
 * Generate contextual insights based on query type
 */
function generateContextualInsights(intent: QueryIntent, data: any): any {
    const { type } = intent;

    switch (type) {
        case 'spending':
            return {
                type: 'spending_summary',
                data: {
                    totalSpent: data.totalSpent,
                    transactionCount: data.transactionCount,
                    topCategories: Object.entries(data.byCategory)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 5)
                        .map(([category, amount]) => ({ category, amount }))
                },
                visualizations: [
                    {
                        type: 'pie',
                        data: {
                            labels: Object.keys(data.byCategory),
                            datasets: [{
                                data: Object.values(data.byCategory),
                                backgroundColor: [
                                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                                    '#FF9F40', '#FF6384', '#C9CBCF'
                                ]
                            }]
                        }
                    }
                ]
            };

        case 'budget':
            return {
                type: 'budget_status',
                data: {
                    budgets: data.budgets,
                    totalBudget: data.totalBudget,
                    totalSpent: data.totalSpent,
                    overBudgetCategories: data.budgets.filter((b: any) => b.percentageUsed > 100)
                },
                visualizations: [
                    {
                        type: 'bar',
                        data: {
                            labels: data.budgets.map((b: any) => b.category),
                            datasets: [
                                {
                                    label: 'Spent',
                                    data: data.budgets.map((b: any) => b.spent),
                                    backgroundColor: '#FF6384'
                                },
                                {
                                    label: 'Budget',
                                    data: data.budgets.map((b: any) => b.limit),
                                    backgroundColor: '#36A2EB'
                                }
                            ]
                        }
                    }
                ]
            };

        case 'investment':
            return {
                type: 'investment_performance',
                data: {
                    totalValue: data.portfolioMetrics.totalValue,
                    totalReturn: data.portfolioMetrics.totalReturn,
                    totalReturnPercentage: data.portfolioMetrics.totalReturnPercentage,
                    topPerformers: data.investments
                        .sort((a: any, b: any) => b.calculatedMetrics.totalReturnPercentage - a.calculatedMetrics.totalReturnPercentage)
                        .slice(0, 3)
                },
                visualizations: [
                    {
                        type: 'pie',
                        data: {
                            labels: data.investments.map((inv: any) => inv.name),
                            datasets: [{
                                data: data.investments.map((inv: any) => inv.currentValue),
                                backgroundColor: [
                                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                                ]
                            }]
                        }
                    }
                ]
            };

        case 'debt':
            return {
                type: 'debt_overview',
                data: {
                    totalDebt: data.debtSummary.totalDebt,
                    monthlyPayment: data.debtSummary.totalMonthlyPayment,
                    highestInterestDebt: data.debts
                        .sort((a: any, b: any) => b.interestRate - a.interestRate)[0]
                },
                visualizations: [
                    {
                        type: 'bar',
                        data: {
                            labels: data.debts.map((d: any) => d.name),
                            datasets: [{
                                label: 'Current Balance',
                                data: data.debts.map((d: any) => d.currentBalance),
                                backgroundColor: '#FF6384'
                            }]
                        }
                    }
                ]
            };

        default:
            return null;
    }
}

/**
 * Format response with supporting data
 */
function formatResponse(query: string, intent: QueryIntent, data: any, aiAdvice?: string): AIQueryResponse {
    const contextualInsight = generateContextualInsights(intent, data);

    let answer = '';

    if (aiAdvice) {
        answer = aiAdvice;
    } else {
        // Generate basic answer based on data
        switch (intent.type) {
            case 'spending':
                answer = `You've spent $${data.totalSpent.toFixed(2)} across ${data.transactionCount} transactions`;
                if (intent.entities.timeframe) {
                    answer += ` ${intent.entities.timeframe.replace('_', ' ')}`;
                }
                answer += '. ';

                if (Object.keys(data.byCategory).length > 0) {
                    const topCategory = Object.entries(data.byCategory)
                        .sort(([, a]: any, [, b]: any) => b - a)[0];
                    answer += `Your highest spending category is ${topCategory[0]} at $${(topCategory[1] as number).toFixed(2)}.`;
                }
                break;

            case 'budget':
                answer = `You have ${data.budgets.length} budgets set up with a total limit of $${data.totalBudget.toFixed(2)}. `;
                answer += `You've spent $${data.totalSpent.toFixed(2)} so far this month. `;

                const overBudget = data.budgets.filter((b: any) => b.percentageUsed > 100);
                if (overBudget.length > 0) {
                    answer += `⚠️ You're over budget in ${overBudget.length} ${overBudget.length === 1 ? 'category' : 'categories'}: ${overBudget.map((b: any) => b.category).join(', ')}.`;
                } else {
                    answer += `✅ You're staying within your budgets!`;
                }
                break;

            case 'investment':
                answer = `Your investment portfolio is worth $${data.portfolioMetrics.totalValue.toFixed(2)} `;
                answer += `with a total return of $${data.portfolioMetrics.totalReturn.toFixed(2)} `;
                answer += `(${data.portfolioMetrics.totalReturnPercentage.toFixed(2)}%). `;

                if (data.investments.length > 0) {
                    const best = data.investments
                        .sort((a: any, b: any) => b.calculatedMetrics.totalReturnPercentage - a.calculatedMetrics.totalReturnPercentage)[0];
                    answer += `Your best performer is ${best.name} with a ${best.calculatedMetrics.totalReturnPercentage.toFixed(2)}% return.`;
                }
                break;

            case 'debt':
                answer = `You have a total debt of $${data.debtSummary.totalDebt.toFixed(2)} `;
                answer += `with monthly payments of $${data.debtSummary.totalMonthlyPayment.toFixed(2)}. `;

                if (data.debts.length > 0) {
                    const highestInterest = data.debts
                        .sort((a: any, b: any) => b.interestRate - a.interestRate)[0];
                    answer += `Your highest interest debt is ${highestInterest.name} at ${highestInterest.interestRate}% APR.`;
                }
                break;

            case 'savings':
                answer = `You have ${data.goals.length} savings ${data.goals.length === 1 ? 'goal' : 'goals'} `;
                answer += `with a total target of $${data.totalTarget.toFixed(2)}. `;
                answer += `You've saved $${data.totalSaved.toFixed(2)} so far (${data.progress.toFixed(1)}% of your goal).`;
                break;

            default:
                answer = 'I can help you with questions about your spending, budgets, investments, debts, and savings goals. What would you like to know?';
        }
    }

    return {
        answer,
        contextualInsight,
        supportingData: data
    };
}

/**
 * Main function to process AI query
 */
export async function processAIQuery(userId: string, query: string): Promise<AIQueryResponse> {
    // Parse the query
    const intent = parseQuery(query);

    // Query relevant financial data
    const data = await queryFinancialData(userId, intent);

    // For advice queries, use enhanced Gemini AI
    let aiAdvice: string | undefined;
    if (intent.type === 'advice' || query.toLowerCase().includes('should') || query.toLowerCase().includes('recommend')) {
        const user = await User.findOne({ clerkId: userId });
        if (user && data) {
            aiAdvice = await generateEnhancedFinancialAdvice(user.toObject(), data, query);
        }
    }

    // Format and return response
    return formatResponse(query, intent, data, aiAdvice);
}

/**
 * Get contextual data for specific type
 */
export async function getContextualData(userId: string, type?: string): Promise<any> {
    if (!type) {
        // Return general overview
        const [transactions, budgets, investments, debts, goals] = await Promise.all([
            Transaction.find({ userId }).sort({ date: -1 }).limit(10),
            Budget.find({ userId }),
            Investment.find({ userId }),
            Debt.find({ userId }),
            SavingsGoal.find({ userId })
        ]);

        return {
            recentTransactions: transactions,
            budgetCount: budgets.length,
            investmentCount: investments.length,
            debtCount: debts.length,
            goalCount: goals.length
        };
    }

    // Return specific contextual data
    const intent: QueryIntent = { type: type as any, entities: {} };
    return await queryFinancialData(userId, intent);
}
