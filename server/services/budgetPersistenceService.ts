import { Budget } from '../models/Budget';

/**
 * Copies budgets from previous month to current month
 */
export async function copyBudgetsToNewMonth(userId: string, targetMonth: number, targetYear: number) {
    // Calculate previous month
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }

    // Get previous month's budgets
    const previousBudgets = await Budget.find({
        userId,
        month: prevMonth,
        year: prevYear
    });

    if (previousBudgets.length === 0) {
        console.log(`No budgets found for ${prevMonth}/${prevYear}`);
        return [];
    }

    // Check if budgets already exist for target month
    const existingBudgets = await Budget.find({
        userId,
        month: targetMonth,
        year: targetYear
    });

    if (existingBudgets.length > 0) {
        console.log(`Budgets already exist for ${targetMonth}/${targetYear}`);
        return existingBudgets;
    }

    // Create new budgets for current month
    const newBudgets = previousBudgets.map(budget => ({
        userId: budget.userId,
        category: budget.category,
        limit: budget.limit,
        spent: 0, // Reset spent to 0
        icon: budget.icon,
        month: targetMonth,
        year: targetYear,
        isTemplate: false
    }));

    const created = await Budget.insertMany(newBudgets);
    console.log(`Created ${created.length} budgets for ${targetMonth}/${targetYear}`);
    return created;
}

/**
 * Get budgets for a specific month/year
 */
export async function getBudgetsForMonth(userId: string, month: number, year: number) {
    return await Budget.find({ userId, month, year });
}

/**
 * Get current month's budgets (or create from previous month if none exist)
 */
export async function getCurrentMonthBudgets(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    let budgets = await getBudgetsForMonth(userId, currentMonth, currentYear);

    // If no budgets exist for current month, copy from previous month
    if (budgets.length === 0) {
        budgets = await copyBudgetsToNewMonth(userId, currentMonth, currentYear);
    }

    return budgets;
}
