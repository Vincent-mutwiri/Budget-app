import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { Transfer } from '../models/Transfer';
import { getMainAccount, getCurrentAccount } from './accountService';
import { createTransferTransaction } from './transactionService';

/**
 * Performs the month-end rollover process for a user.
 * 1. Calculates the Current Account balance.
 * 2. If positive, transfers the surplus to the Main Account.
 * 3. If negative, records a "Rollover Deficit" (effectively resetting to 0 for the new month, 
 *    but keeping track of the debt - or we could carry it over. For now, we'll transfer 
 *    the deficit to Main Account as a "loan" to clear Current Account).
 * 4. Updates the lastRolloverDate.
 */
export async function performMonthEndRollover(userId: string) {
    const mainAccount = await getMainAccount(userId);
    const currentAccount = await getCurrentAccount(userId);

    if (!mainAccount || !currentAccount) {
        throw new Error('Accounts not found');
    }

    const currentBalance = currentAccount.balance;
    const now = new Date();

    // If balance is 0, just update the date
    if (currentBalance === 0) {
        currentAccount.lastRolloverDate = now;
        await currentAccount.save();
        return { status: 'success', message: 'Balance was 0, no transfer needed.', amount: 0 };
    }

    if (currentBalance > 0) {
        // Surplus: Transfer to Main
        const amount = currentBalance;

        // 1. Create Transfer Record
        const transfer = new Transfer({
            userId,
            fromAccount: 'current',
            toAccount: 'main',
            amount,
            type: 'deposit', // Using 'deposit' to signify surplus transfer
            description: `Month-end Rollover: Surplus from ${now.toLocaleString('default', { month: 'long' })}`,
            status: 'completed',
            date: now
        });
        await transfer.save();

        // 2. Update Balances
        mainAccount.balance += amount;
        currentAccount.balance = 0; // Reset to 0
        currentAccount.lastRolloverDate = now;

        await mainAccount.save();
        await currentAccount.save();

        // 3. Create Transaction for History
        await createTransferTransaction(
            userId,
            'current',
            'main',
            amount,
            'repay', // Reusing 'repay' type as it moves money to Main
            `Rollover Surplus: ${now.toLocaleString('default', { month: 'long' })}`
        );

        return { status: 'success', message: 'Surplus transferred to Main Account.', amount };
    } else {
        // Deficit: Borrow from Main to cover it (or just record it)
        // Let's treat it as "Borrowing from Main" to zero out the Current Account
        const amount = Math.abs(currentBalance);

        // 1. Create Transfer Record
        const transfer = new Transfer({
            userId,
            fromAccount: 'main',
            toAccount: 'current',
            amount,
            type: 'borrow',
            description: `Month-end Rollover: Deficit coverage for ${now.toLocaleString('default', { month: 'long' })}`,
            status: 'completed',
            date: now
        });
        await transfer.save();

        // 2. Update Balances
        mainAccount.balance -= amount; // Main takes the hit
        currentAccount.balance = 0; // Reset to 0
        currentAccount.lastRolloverDate = now;

        await mainAccount.save();
        await currentAccount.save();

        // 3. Create Transaction for History
        await createTransferTransaction(
            userId,
            'main',
            'current',
            amount,
            'borrow',
            `Rollover Deficit Coverage: ${now.toLocaleString('default', { month: 'long' })}`
        );

        return { status: 'success', message: 'Deficit covered by Main Account.', amount: -amount };
    }
}
