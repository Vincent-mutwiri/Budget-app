import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { BudgetRecommendation } from '../models/BudgetRecommendation';
import { Category } from '../types';

interface CategorySpending {
    category: string;
    total: number;
    count: number;
    average: number;
}

interface SeasonalPattern {
    category: string;
    monthlyAverages: Map<number, number>;
    hasSeasonalPattern: boolean;
}

/**
 * Calculate historical spending averages by category
 */
export async function calculateHistoricalAverages(
    userId: string,
    months: number = 3
): Promise<Map<string, CategorySpending>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: startDate }
    });

    const categoryMap = new Map<string, CategorySpending>();

    transactions.forEach(transaction => {
        const category = transaction.category;
        const existing = categoryMap.get(category);

        if (existing) {
            existing.total += transaction.amount;
            existing.count += 1;
            existing.average = existing.total / existing.count;
        } else {
            categoryMap.set(category, {
                category,
                total: transaction.amount,
                count: 1,
                average: transaction.amount
            });
        }
    });

    return categoryMap;
}

/**
 * Analyze spending patterns and trends
 */
export async function analyzeSpendingTrends(
    userId: string,
    category: string
): Promise<{ trend: 'increasing' | 'decreasing' | 'stable'; changePercentage: number }> {
    const now = new Date();

    // Get last month's spending
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get previous month's spending
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

    const lastMonthTransactions = await Transaction.find({
        userId,
        category,
        type: 'expense',
        date: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });

    const prevMonthTransactions = await Transaction.find({
        userId,
        category,
        type: 'expense',
        date: { $gte: prevMonthStart, $lte: prevMonthEnd }
    });

    const lastMonthTotal = lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const prevMonthTotal = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0);

    if (prevMonthTotal === 0) {
        return { trend: 'stable', changePercentage: 0 };
    }

    const changePercentage = ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (changePercentage > 10) {
        trend = 'increasing';
    } else if (changePercentage < -10) {
        trend = 'decreasing';
    } else {
        trend = 'stable';
    }

    return { trend, changePercentage };
}

/**
 * Detect seasonal spending patterns
 */
export async function detectSeasonalPatterns(
    userId: string,
    months: number = 12
): Promise<Map<string, SeasonalPattern>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await Transaction.find({
        userId,
        type: 'expense',
        date: { $gte: startDate }
    });

    const categoryMonthlyMap = new Map<string, Map<number, number[]>>();

    transactions.forEach(transaction => {
        const category = transaction.category;
        const month = new Date(transaction.date).getMonth();

        if (!categoryMonthlyMap.has(category)) {
            categoryMonthlyMap.set(category, new Map());
        }

        const monthlyData = categoryMonthlyMap.get(category)!;
        if (!monthlyData.has(month)) {
            monthlyData.set(month, []);
        }

        monthlyData.get(month)!.push(transaction.amount);
    });

    const seasonalPatterns = new Map<string, SeasonalPattern>();

    categoryMonthlyMap.forEach((monthlyData, category) => {
        const monthlyAverages = new Map<number, number>();

        monthlyData.forEach((amounts, month) => {
            const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
            monthlyAverages.set(month, average);
        });

        // Check if there's significant variation (>30% difference between highest and lowest)
        const averages = Array.from(monthlyAverages.values());
        if (averages.length > 0) {
            const max = Math.max(...averages);
            const min = Math.min(...averages);
            const variation = ((max - min) / min) * 100;
            const hasSeasonalPattern = variation > 30;

            seasonalPatterns.set(category, {
                category,
                monthlyAverages,
                hasSeasonalPattern
            });
        }
    });

    return seasonalPatterns;
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(
    transactionCount: number,
    dataMonths: number,
    trendStability: number
): number {
    // Base confidence on transaction count (more data = higher confidence)
    let confidence = Math.min(transactionCount / 30, 1) * 0.4;

    // Add confidence based on data duration
    confidence += Math.min(dataMonths / 6, 1) * 0.3;

    // Add confidence based on trend stability (lower variation = higher confidence)
    confidence += (1 - Math.min(trendStability / 100, 1)) * 0.3;

    return Math.max(0, Math.min(1, confidence));
}

/**
 * Generate budget recommendations for a user
 */
export async function generateBudgetRecommendations(userId: string): Promise<any[]> {
    // Get historical spending data (last 3 months)
    const categorySpending = await calculateHistoricalAverages(userId, 3);

    // Get seasonal patterns (last 12 months if available)
    const seasonalPatterns = await detectSeasonalPatterns(userId, 12);

    // Get existing budgets
    const existingBudgets = await Budget.find({ userId });
    const budgetMap = new Map(existingBudgets.map(b => [b.category, b]));

    // Get user's income (approximate from income transactions)
    const incomeTransactions = await Transaction.find({
        userId,
        type: 'income',
        date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    });
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyIncome = totalIncome / 3;

    const recommendations: any[] = [];

    // Generate recommendations for each category with spending
    for (const [category, spending] of categorySpending.entries()) {
        // Skip if category is Income or Savings
        if (category === Category.Income || category === Category.Savings) {
            continue;
        }

        // Analyze trend
        const { trend, changePercentage } = await analyzeSpendingTrends(userId, category);

        // Get seasonal pattern
        const seasonalPattern = seasonalPatterns.get(category);
        const currentMonth = new Date().getMonth();
        const seasonalAdjustment = seasonalPattern?.hasSeasonalPattern
            ? (seasonalPattern.monthlyAverages.get(currentMonth) || spending.average) / spending.average
            : 1;

        // Calculate suggested limit
        let suggestedLimit = spending.average;

        // Adjust based on trend
        if (trend === 'increasing') {
            suggestedLimit = spending.average * 0.9; // Suggest 10% reduction
        } else if (trend === 'decreasing') {
            suggestedLimit = spending.average * 1.05; // Allow slight increase
        }

        // Apply seasonal adjustment
        suggestedLimit *= seasonalAdjustment;

        // Round to nearest 10
        suggestedLimit = Math.round(suggestedLimit / 10) * 10;

        // Calculate current month spending
        const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const currentMonthTransactions = await Transaction.find({
            userId,
            category,
            type: 'expense',
            date: { $gte: currentMonthStart }
        });
        const currentSpending = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Calculate potential savings
        const potentialSavings = Math.max(0, spending.average - suggestedLimit);

        // Calculate confidence
        const confidence = calculateConfidence(
            spending.count,
            3,
            Math.abs(changePercentage)
        );

        // Generate reasoning
        let reasoning = `Based on your ${spending.count} transactions over the past 3 months, `;

        if (trend === 'increasing') {
            reasoning += `your spending in ${category} has been increasing by ${Math.abs(changePercentage).toFixed(1)}%. `;
            reasoning += `We recommend reducing your budget to ${suggestedLimit.toFixed(2)} to control costs.`;
        } else if (trend === 'decreasing') {
            reasoning += `your spending in ${category} has been decreasing by ${Math.abs(changePercentage).toFixed(1)}%. `;
            reasoning += `You're doing great! We suggest a budget of ${suggestedLimit.toFixed(2)}.`;
        } else {
            reasoning += `your spending in ${category} has been stable. `;
            reasoning += `We recommend a budget of ${suggestedLimit.toFixed(2)} based on your average spending.`;
        }

        if (seasonalPattern?.hasSeasonalPattern) {
            reasoning += ` We've detected seasonal patterns in this category and adjusted accordingly.`;
        }

        // Only recommend if there's a meaningful difference from current budget or no budget exists
        const existingBudget = budgetMap.get(category);
        const shouldRecommend = !existingBudget ||
            Math.abs(existingBudget.limit - suggestedLimit) > existingBudget.limit * 0.1;

        if (shouldRecommend) {
            recommendations.push({
                userId,
                category,
                suggestedLimit,
                currentSpending,
                historicalAverage: spending.average,
                potentialSavings,
                confidence,
                reasoning,
                status: 'pending'
            });
        }
    }

    return recommendations;
}
