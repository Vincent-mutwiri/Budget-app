import { performMonthEndRollover } from './rolloverService';
import { copyBudgetsToNewMonth } from './budgetPersistenceService';
import { processDueRecurringTransactions } from './recurringTransactionProcessor';
import { User } from '../models/User';

/**
 * Performs complete month-end automation for a user
 */
export async function performMonthEndAutomation(userId: string) {
    console.log(`Starting month-end automation for user: ${userId}`);

    const results = {
        rollover: null as any,
        budgets: null as any,
        recurringTransactions: null as any,
        errors: [] as string[]
    };

    try {
        // Step 1: Rollover current account balance to main account
        console.log('Step 1: Performing balance rollover...');
        results.rollover = await performMonthEndRollover(userId);
    } catch (error) {
        const message = `Rollover failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(message);
        results.errors.push(message);
    }

    try {
        // Step 2: Copy budgets from previous month
        console.log('Step 2: Copying budgets...');
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        results.budgets = await copyBudgetsToNewMonth(userId, currentMonth, currentYear);
    } catch (error) {
        const message = `Budget copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(message);
        results.errors.push(message);
    }

    try {
        // Step 3: Process recurring transactions for the new month
        console.log('Step 3: Processing recurring transactions...');
        results.recurringTransactions = await processDueRecurringTransactions();
    } catch (error) {
        const message = `Recurring transactions failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(message);
        results.errors.push(message);
    }

    console.log(`Month-end automation completed for user: ${userId}`);
    return results;
}

/**
 * Performs month-end automation for all users
 */
export async function performMonthEndAutomationForAllUsers() {
    console.log('Starting month-end automation for all users...');

    // Get all unique user IDs (you might want to add pagination for large user bases)
    const users = await User.find({}).select('clerkId').lean();

    const results = [];

    for (const user of users) {
        try {
            const result = await performMonthEndAutomation(user.clerkId);
            results.push({
                userId: user.clerkId,
                success: result.errors.length === 0,
                ...result
            });
        } catch (error) {
            console.error(`Failed to process user ${user.clerkId}:`, error);
            results.push({
                userId: user.clerkId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    console.log(`Month-end automation completed for ${results.length} users`);
    return results;
}
