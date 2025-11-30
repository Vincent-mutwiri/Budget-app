import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Debt } from '../models/Debt';
import { Investment } from '../models/Investment';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { Category, CategoryTrend, SpendingAnomaly, FinancialInsights } from '../types';

/**
 * Calculate financial health score with component breakdown
 */
export async function calculateHealthScore(userId: string): Promise<{
    healthScore: number;
    healthScoreComponents: {
        savingsRate: number;
        debtToIncome: number;
        budgetAdherence: number;
        emergencyFund: number;
    };
}> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get current month transactions
    const transactions = await Transaction.find({
        userId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Calculate income and expenses
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate savings rate (0-100)
    const savingsAmount = income - expenses;
    const savingsRate = income > 0 ? Math.min(100, Math.max(0, (savingsAmount / income) * 100)) : 0;

    // Calculate debt-to-income ratio (0-100, inverted so higher is better)
    const debts = await Debt.find({ userId });
    const totalMonthlyDebtPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const debtToIncomeRatio = income > 0 ? (totalMonthlyDebtPayment / income) * 100 : 0;
    const debtToIncome = Math.max(0, 100 - debtToIncomeRatio);

    // Calculate budget adherence (0-100)
    const budgets = await Budget.find({ userId });
    let budgetAdherence = 100;

    if (budgets.length > 0) {
        const adherenceScores = budgets.map(budget => {
            if (budget.limit === 0) return 100;
            const utilizationRate = budget.spent / budget.limit;
            // Perfect score at 80-90% utilization, penalty for over/under
            if (utilizationRate <= 0.9) {
                return Math.min(100, utilizationRate * 111); // 90% usage = 100 score
            } else {
                return Math.max(0, 100 - ((utilizationRate - 0.9) * 200)); // Penalty for overspending
            }
        });
        budgetAdherence = adherenceScores.reduce((sum, score) => sum + score, 0) / budgets.length;
    }

    // Calculate emergency fund score (0-100)
    // Assuming 3-6 months of expenses is ideal
    const monthlyExpenses = expenses || 1000; // Default minimum if no expenses
    const emergencyFundTarget = monthlyExpenses * 3;

    // Get total savings from investments and positive balance
    const investments = await Investment.find({ userId });
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    
    // Also consider savings (income - expenses over time)
    const totalSavings = Math.max(0, savingsAmount);
    const liquidAssets = totalInvestments + totalSavings;

    const emergencyFund = emergencyFundTarget > 0
        ? Math.min(100, (liquidAssets / emergencyFundTarget) * 100)
        : totalInvestments > 0 ? 75 : 25; // Give credit for having investments

    // Calculate overall health score (weighted average)
    const healthScore = Math.min(100, Math.round(
        (savingsRate * 0.35) +
        (debtToIncome * 0.25) +
        (budgetAdherence * 0.20) +
        (emergencyFund * 0.20)
    ));

    return {
        healthScore,
        healthScoreComponents: {
            savingsRate: Math.round(savingsRate),
            debtToIncome: Math.round(debtToIncome),
            budgetAdherence: Math.round(budgetAdherence),
            emergencyFund: Math.round(emergencyFund)
        }
    };
}

/**
 * Analyze spending trends with month-over-month changes
 */
export async function calculateSpendingTrends(userId: string): Promise<CategoryTrend[]> {
    const now = new Date();

    // Current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Previous month
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get transactions for both months
    const currentMonthTransactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });

    const previousMonthTransactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: previousMonthStart, $lte: previousMonthEnd }
    });

    // Group by category
    const currentMonthByCategory = new Map<Category, number>();
    const previousMonthByCategory = new Map<Category, number>();

    currentMonthTransactions.forEach(t => {
        const current = currentMonthByCategory.get(t.category as Category) || 0;
        currentMonthByCategory.set(t.category as Category, current + t.amount);
    });

    previousMonthTransactions.forEach(t => {
        const current = previousMonthByCategory.get(t.category as Category) || 0;
        previousMonthByCategory.set(t.category as Category, current + t.amount);
    });

    // Calculate trends
    const allCategories = new Set([
        ...currentMonthByCategory.keys(),
        ...previousMonthByCategory.keys()
    ]);

    const trends: CategoryTrend[] = [];

    allCategories.forEach(category => {
        const currentMonth = currentMonthByCategory.get(category) || 0;
        const previousMonth = previousMonthByCategory.get(category) || 0;

        let percentageChange = 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';

        if (previousMonth > 0) {
            percentageChange = ((currentMonth - previousMonth) / previousMonth) * 100;
        } else if (currentMonth > 0) {
            percentageChange = 100;
        }

        if (Math.abs(percentageChange) < 10) {
            trend = 'stable';
        } else if (percentageChange > 0) {
            trend = 'up';
        } else {
            trend = 'down';
        }

        trends.push({
            category,
            currentMonth,
            previousMonth,
            percentageChange: Math.round(percentageChange * 10) / 10,
            trend
        });
    });

    return trends.sort((a, b) => b.currentMonth - a.currentMonth);
}

/**
 * Generate income vs expense forecast using historical data
 */
export async function calculateForecast(userId: string): Promise<{
    projectedIncome: number;
    projectedExpenses: number;
    confidence: number;
}> {
    const now = new Date();

    // Get last 3 months of data
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const transactions = await Transaction.find({
        userId,
        date: { $gte: threeMonthsAgo }
    });

    // Group by month
    const monthlyData = new Map<string, { income: number; expenses: number }>();

    transactions.forEach(t => {
        const monthKey = `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
        const data = monthlyData.get(monthKey) || { income: 0, expenses: 0 };

        if (t.type === 'income') {
            data.income += t.amount;
        } else {
            data.expenses += t.amount;
        }

        monthlyData.set(monthKey, data);
    });

    // Calculate averages
    const months = Array.from(monthlyData.values());
    const avgIncome = months.length > 0
        ? months.reduce((sum, m) => sum + m.income, 0) / months.length
        : 0;
    const avgExpenses = months.length > 0
        ? months.reduce((sum, m) => sum + m.expenses, 0) / months.length
        : 0;

    // Get recurring transactions for next month
    const recurringTransactions = await RecurringTransaction.find({
        userId,
        isActive: true
    });

    let recurringIncome = 0;
    let recurringExpenses = 0;

    recurringTransactions.forEach(rt => {
        if (rt.type === 'income') {
            recurringIncome += rt.amount;
        } else {
            recurringExpenses += rt.amount;
        }
    });

    // Combine historical average with recurring transactions
    // Weight recurring more heavily if we have them
    const hasRecurring = recurringIncome > 0 || recurringExpenses > 0;
    const projectedIncome = hasRecurring 
        ? Math.round((avgIncome * 0.5) + (recurringIncome * 0.5))
        : Math.round(avgIncome);
    const projectedExpenses = hasRecurring
        ? Math.round((avgExpenses * 0.5) + (recurringExpenses * 0.5))
        : Math.round(avgExpenses);

    // Calculate confidence based on data consistency and recurring transactions
    let confidence = months.length >= 3 ? 85 : months.length >= 2 ? 70 : 50;
    if (hasRecurring) confidence = Math.min(95, confidence + 10);

    return {
        projectedIncome,
        projectedExpenses,
        confidence
    };
}

/**
 * Detect spending anomalies (transactions exceeding 150% of average)
 */
export async function detectAnomalies(userId: string): Promise<SpendingAnomaly[]> {
    const now = new Date();

    // Get last 3 months of data for baseline
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Historical data (2-3 months ago)
    const historicalTransactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: threeMonthsAgo, $lt: oneMonthAgo }
    });

    // Recent data (last month)
    const recentTransactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: oneMonthAgo }
    });

    // Calculate average spending by category
    const categoryAverages = new Map<Category, number>();
    const categoryCounts = new Map<Category, number>();

    historicalTransactions.forEach(t => {
        const sum = categoryAverages.get(t.category as Category) || 0;
        const count = categoryCounts.get(t.category as Category) || 0;
        categoryAverages.set(t.category as Category, sum + t.amount);
        categoryCounts.set(t.category as Category, count + 1);
    });

    // Calculate final averages
    categoryAverages.forEach((sum, category) => {
        const count = categoryCounts.get(category) || 1;
        categoryAverages.set(category, sum / count);
    });

    // Detect anomalies in recent transactions
    const anomalies: SpendingAnomaly[] = [];

    recentTransactions.forEach(t => {
        const avgAmount = categoryAverages.get(t.category as Category);

        if (avgAmount && avgAmount > 0) {
            const deviationPercentage = ((t.amount - avgAmount) / avgAmount) * 100;

            // Flag if transaction exceeds 200% of average (more reasonable threshold)
            if (deviationPercentage >= 200 || (t.amount > avgAmount * 2.5)) {
                anomalies.push({
                    transactionId: t._id.toString(),
                    category: t.category as Category,
                    amount: t.amount,
                    averageAmount: Math.round(avgAmount),
                    deviationPercentage: Math.round(deviationPercentage),
                    detectedAt: new Date().toISOString()
                });
            }
        }
    });

    return anomalies.sort((a, b) => b.deviationPercentage - a.deviationPercentage);
}

/**
 * Get all insights for dashboard
 */
export async function calculateAllInsights(userId: string): Promise<FinancialInsights> {
    const [healthData, trends, forecast, anomalies] = await Promise.all([
        calculateHealthScore(userId),
        calculateSpendingTrends(userId),
        calculateForecast(userId),
        detectAnomalies(userId)
    ]);

    return {
        userId,
        healthScore: healthData.healthScore,
        healthScoreComponents: healthData.healthScoreComponents,
        spendingTrends: trends,
        forecast,
        anomalies,
        generatedAt: new Date().toISOString()
    };
}
