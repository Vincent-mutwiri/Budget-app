import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { User } from '../models/User';

export interface FinancialMetrics {
    // Income
    currentMonthIncome: number;
    overallTotalIncome: number; // Includes previous months' remainders
    previousMonthsRemainder: number;

    // Spending
    currentMonthSpending: number;

    // Savings
    monthlySavings: number; // currentMonthIncome - currentMonthSpending

    // Budget
    totalPlannedBudget: number; // Sum of all budget limits
    remainingBudget: number; // totalPlannedBudget - currentMonthSpending
    budgetUtilization: number; // (currentMonthSpending / totalPlannedBudget) * 100

    // Trend
    trendPositive: boolean; // currentMonthSpending <= totalPlannedBudget
    trendPercentage: number;
}

/**
 * Calculate current month income from transactions
 */
export async function calculateCurrentMonthIncome(
    userId: string,
    month: Date = new Date()
): Promise<number> {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    const incomeTransactions = await Transaction.find({
        userId,
        type: 'income',
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    return incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate overall total income including previous months' remainders
 */
export async function calculateOverallTotalIncome(
    userId: string,
    month: Date = new Date()
): Promise<{ overallTotalIncome: number; previousMonthsRemainder: number }> {
    const currentMonthIncome = await calculateCurrentMonthIncome(userId, month);

    // Get user's previous months balance
    const user = await User.findOne({ clerkId: userId });
    const previousMonthsRemainder = user?.previousMonthsBalance || 0;

    const overallTotalIncome = currentMonthIncome + previousMonthsRemainder;

    return {
        overallTotalIncome,
        previousMonthsRemainder
    };
}

/**
 * Calculate current month spending from transactions
 */
export async function calculateCurrentMonthSpending(
    userId: string,
    month: Date = new Date()
): Promise<number> {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    const expenseTransactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    return expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate monthly savings (income - spending)
 */
export async function calculateMonthlySavings(
    userId: string,
    month: Date = new Date()
): Promise<number> {
    const currentMonthIncome = await calculateCurrentMonthIncome(userId, month);
    const currentMonthSpending = await calculateCurrentMonthSpending(userId, month);

    return currentMonthIncome - currentMonthSpending;
}

/**
 * Calculate total planned budget (sum of all budget limits)
 */
export async function calculateTotalPlannedBudget(userId: string): Promise<number> {
    const budgets = await Budget.find({ userId });

    return budgets.reduce((sum, b) => sum + b.limit, 0);
}

/**
 * Calculate remaining budget (total planned - current spending)
 */
export async function calculateRemainingBudget(
    userId: string,
    month: Date = new Date()
): Promise<number> {
    const totalPlannedBudget = await calculateTotalPlannedBudget(userId);
    const currentMonthSpending = await calculateCurrentMonthSpending(userId, month);

    return totalPlannedBudget - currentMonthSpending;
}

/**
 * Determine budget trend (positive if within budget)
 */
export async function calculateBudgetTrend(
    userId: string,
    month: Date = new Date()
): Promise<{ trendPositive: boolean; trendPercentage: number }> {
    const totalPlannedBudget = await calculateTotalPlannedBudget(userId);
    const currentMonthSpending = await calculateCurrentMonthSpending(userId, month);

    const trendPositive = currentMonthSpending <= totalPlannedBudget;

    // Calculate percentage of budget used
    const trendPercentage = totalPlannedBudget > 0
        ? (currentMonthSpending / totalPlannedBudget) * 100
        : 0;

    return {
        trendPositive,
        trendPercentage: Math.round(trendPercentage * 10) / 10 // Round to 1 decimal
    };
}

/**
 * Calculate all financial metrics for a user
 */
export async function calculateFinancialMetrics(
    userId: string,
    month: Date = new Date()
): Promise<FinancialMetrics> {
    // Run calculations in parallel for better performance
    const [
        currentMonthIncome,
        overallIncomeData,
        currentMonthSpending,
        totalPlannedBudget,
        trendData
    ] = await Promise.all([
        calculateCurrentMonthIncome(userId, month),
        calculateOverallTotalIncome(userId, month),
        calculateCurrentMonthSpending(userId, month),
        calculateTotalPlannedBudget(userId),
        calculateBudgetTrend(userId, month)
    ]);

    const monthlySavings = currentMonthIncome - currentMonthSpending;
    const remainingBudget = totalPlannedBudget - currentMonthSpending;
    const budgetUtilization = totalPlannedBudget > 0
        ? (currentMonthSpending / totalPlannedBudget) * 100
        : 0;

    return {
        currentMonthIncome,
        overallTotalIncome: overallIncomeData.overallTotalIncome,
        previousMonthsRemainder: overallIncomeData.previousMonthsRemainder,
        currentMonthSpending,
        monthlySavings,
        totalPlannedBudget,
        remainingBudget,
        budgetUtilization: Math.round(budgetUtilization * 10) / 10,
        trendPositive: trendData.trendPositive,
        trendPercentage: trendData.trendPercentage
    };
}
