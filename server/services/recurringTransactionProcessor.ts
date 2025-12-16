import { RecurringTransaction } from '../models/RecurringTransaction';
import { Transaction } from '../models/Transaction';
import { syncCurrentAccountBalance } from './accountService';

/**
 * Calculate next occurrence date based on frequency
 */
function calculateNextOccurrence(currentDate: Date, frequency: string): Date {
    const next = new Date(currentDate);

    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'bi-weekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
    }

    return next;
}

/**
 * Process all due recurring transactions
 */
export async function processDueRecurringTransactions() {
    const now = new Date();

    // Find all active recurring transactions that are due
    const dueTransactions = await RecurringTransaction.find({
        isActive: true,
        nextOccurrence: { $lte: now }
    });

    console.log(`Found ${dueTransactions.length} due recurring transactions`);

    const results = [];

    for (const recurring of dueTransactions) {
        try {
            // Create actual transaction
            const transaction = new Transaction({
                userId: recurring.userId,
                amount: recurring.amount,
                category: recurring.category,
                description: `${recurring.description} (Recurring)`,
                type: recurring.type,
                date: now,
                accountType: 'current', // All recurring transactions go to current account
                isVisible: true
            });

            await transaction.save();

            // Update next occurrence
            recurring.nextOccurrence = calculateNextOccurrence(recurring.nextOccurrence, recurring.frequency);
            recurring.updatedAt = now;
            await recurring.save();

            // Sync current account balance
            await syncCurrentAccountBalance(recurring.userId);

            results.push({
                success: true,
                recurringId: recurring.id,
                transactionId: transaction.id,
                amount: recurring.amount,
                type: recurring.type
            });

            console.log(`Processed recurring transaction: ${recurring.description}`);
        } catch (error) {
            console.error(`Error processing recurring transaction ${recurring.id}:`, error);
            results.push({
                success: false,
                recurringId: recurring.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return results;
}

/**
 * Process recurring transactions for a specific user (useful for testing)
 */
export async function processUserRecurringTransactions(userId: string) {
    const now = new Date();

    const dueTransactions = await RecurringTransaction.find({
        userId,
        isActive: true,
        nextOccurrence: { $lte: now }
    });

    const results = [];

    for (const recurring of dueTransactions) {
        const transaction = new Transaction({
            userId: recurring.userId,
            amount: recurring.amount,
            category: recurring.category,
            description: `${recurring.description} (Recurring)`,
            type: recurring.type,
            date: now,
            accountType: 'current',
            isVisible: true
        });

        await transaction.save();

        recurring.nextOccurrence = calculateNextOccurrence(recurring.nextOccurrence, recurring.frequency);
        recurring.updatedAt = now;
        await recurring.save();

        await syncCurrentAccountBalance(recurring.userId);

        results.push({ transactionId: transaction.id, amount: recurring.amount });
    }

    return results;
}
