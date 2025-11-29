import { RecurringTransaction } from '../models/RecurringTransaction';
import { Transaction } from '../models/Transaction';

/**
 * Calculate the next occurrence date based on frequency
 */
export function calculateNextOccurrence(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'bi-weekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            throw new Error(`Unknown frequency: ${frequency}`);
    }

    return nextDate;
}

/**
 * Process due recurring transactions and create actual transactions
 */
export async function processRecurringTransactions(): Promise<void> {
    try {
        const now = new Date();

        // Find all active recurring transactions that are due
        const dueRecurringTransactions = await RecurringTransaction.find({
            isActive: true,
            nextOccurrence: { $lte: now }
        });

        console.log(`Found ${dueRecurringTransactions.length} due recurring transactions to process`);

        for (const recurringTx of dueRecurringTransactions) {
            try {
                // Check if end date has passed
                if (recurringTx.endDate && new Date(recurringTx.endDate) < now) {
                    // Deactivate the recurring transaction
                    recurringTx.isActive = false;
                    await recurringTx.save();
                    console.log(`Deactivated recurring transaction ${recurringTx._id} - end date reached`);
                    continue;
                }

                // Create a new transaction from the template
                const newTransaction = new Transaction({
                    userId: recurringTx.userId,
                    amount: recurringTx.amount,
                    description: recurringTx.description,
                    category: recurringTx.category,
                    date: recurringTx.nextOccurrence,
                    type: recurringTx.type,
                    createdAt: new Date()
                });

                await newTransaction.save();
                console.log(`Created transaction from recurring template ${recurringTx._id}`);

                // Update next occurrence date
                recurringTx.nextOccurrence = calculateNextOccurrence(
                    recurringTx.nextOccurrence,
                    recurringTx.frequency
                );
                recurringTx.updatedAt = new Date();
                await recurringTx.save();

                console.log(`Updated next occurrence for ${recurringTx._id} to ${recurringTx.nextOccurrence}`);
            } catch (error) {
                console.error(`Error processing recurring transaction ${recurringTx._id}:`, error);
                // Continue processing other transactions even if one fails
            }
        }

        console.log('Recurring transaction processing completed');
    } catch (error) {
        console.error('Error in processRecurringTransactions:', error);
        throw error;
    }
}

/**
 * Start the recurring transaction scheduler
 * Runs daily at midnight
 */
export function startRecurringTransactionScheduler(): void {
    // Run immediately on startup
    processRecurringTransactions().catch(console.error);

    // Schedule to run daily at midnight
    const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    // Schedule first run at midnight
    setTimeout(() => {
        processRecurringTransactions().catch(console.error);

        // Then run every 24 hours
        setInterval(() => {
            processRecurringTransactions().catch(console.error);
        }, MILLISECONDS_IN_DAY);
    }, timeUntilMidnight);

    console.log('Recurring transaction scheduler started');
    console.log(`Next run scheduled for: ${tomorrow.toISOString()}`);
}
