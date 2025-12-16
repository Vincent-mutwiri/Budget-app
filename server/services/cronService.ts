import cron from 'node-cron';
import { performMonthEndAutomationForAllUsers } from './monthEndAutomationService';
import { processDueRecurringTransactions } from './recurringTransactionProcessor';

/**
 * Initialize all scheduled jobs
 */
export function initializeCronJobs() {
    console.log('Initializing cron jobs...');

    // Job 1: Process recurring transactions daily at 12:01 AM
    cron.schedule('1 0 * * *', async () => {
        console.log('Running daily recurring transactions processor...');
        try {
            const results = await processDueRecurringTransactions();
            console.log(`Processed ${results.length} recurring transactions`);
        } catch (error) {
            console.error('Error processing recurring transactions:', error);
        }
    });

    // Job 2: Month-end automation on the 1st of every month at 12:05 AM
    cron.schedule('5 0 1 * *', async () => {
        console.log('Running month-end automation for all users...');
        try {
            const results = await performMonthEndAutomationForAllUsers();
            console.log(`Month-end automation completed for ${results.length} users`);
        } catch (error) {
            console.error('Error running month-end automation:', error);
        }
    });

    console.log('Cron jobs initialized successfully');
    console.log('- Recurring transactions: Daily at 12:01 AM');
    console.log('- Month-end automation: 1st of month at 12:05 AM');
}
