import { CurrentTransaction } from '../models/CurrentTransaction';
import { MainTransaction } from '../models/MainTransaction';
import { Account } from '../models/Account';

/**
 * Creates a special transaction (Debt, Investment, Goal) that is tagged with 'main' account
 * These are big expenses that should be tracked separately from daily transactions
 */
export async function createSpecialTransaction(
    userId: string,
    type: 'income' | 'expense',
    amount: number,
    specialCategory: 'debt' | 'investment' | 'goal',
    linkedEntityId: string,
    description: string
) {
    // Special transactions are strictly Main Account business
    const transaction = new MainTransaction({
        userId,
        amount,
        type,
        description,
        category: specialCategory === 'debt' ? 'Debt Repayment' :
            specialCategory === 'investment' ? 'Investment' : 'Savings Goal',
        date: new Date(),
        relatedEntityId: linkedEntityId
    });

    await transaction.save();
    return transaction;
}

/**
 * Creates a transaction representing a transfer between accounts
 * Implements Double Entry Bookkeeping where applicable
 */
export async function createTransferTransaction(
    userId: string,
    fromAccountType: 'main' | 'current' | 'special',
    toAccountType: 'main' | 'current' | 'special',
    amount: number,
    transferType: 'borrow' | 'repay' | 'withdraw' | 'deposit',
    description: string,
    isVisible: boolean = true
) {
    // Case 1: Borrow from Main (Main -> Current)
    if (transferType === 'borrow') {
        // 1. Expense in Main (Transfer Out) - Optional, but good for tracking
        const mainTx = new MainTransaction({
            userId,
            amount,
            type: 'expense',
            description: `Transfer to Current: ${description}`,
            category: 'Transfer',
            date: new Date()
        });
        await mainTx.save();

        // 2. Income in Current (Transfer In)
        const currentTx = new CurrentTransaction({
            userId,
            amount,
            type: 'income',
            description: `Borrowed: ${description}`,
            category: 'Transfer',
            date: new Date(),
            relatedTransferId: mainTx._id.toString() // Link them
        });
        await currentTx.save();
        return currentTx;
    }

    // Case 2: Repay to Main (Current -> Main)
    if (transferType === 'repay') {
        // 1. Expense in Current (Transfer Out)
        const currentTx = new CurrentTransaction({
            userId,
            amount,
            type: 'expense',
            description: `Repayment: ${description}`,
            category: 'Transfer',
            date: new Date()
        });
        await currentTx.save();

        // 2. Income in Main (Transfer In)
        const mainTx = new MainTransaction({
            userId,
            amount,
            type: 'income',
            description: `Repayment from Current: ${description}`,
            category: 'Transfer',
            date: new Date(),
            relatedTransferId: currentTx._id.toString()
        });
        await mainTx.save();
        return currentTx;
    }

    // Case 3: Withdraw from Special (Special -> Main)
    if (transferType === 'withdraw') {
        // Income in Main
        const mainTx = new MainTransaction({
            userId,
            amount,
            type: 'income',
            description: `Withdrawal: ${description}`,
            category: 'Transfer',
            date: new Date()
        });
        await mainTx.save();
        return mainTx;
    }

    // Case 4: Deposit to Special (Current -> Special)
    // This flow should ideally be Current -> Main -> Special
    // But if we allow direct, we treat it as Expense in Current
    if (transferType === 'deposit') {
        const currentTx = new CurrentTransaction({
            userId,
            amount,
            type: 'expense',
            description: `Deposit: ${description}`,
            category: 'Transfer',
            date: new Date()
        });
        await currentTx.save();
        return currentTx;
    }
}

/**
 * Get visible transactions for Current Account view
 */
export async function getVisibleTransactions(userId: string, limit: number = 50) {
    return await CurrentTransaction.find({ userId })
        .sort({ date: -1 })
        .limit(limit);
}

/**
 * Get special transactions by category (Main Account)
 */
export async function getSpecialTransactions(userId: string, category: 'debt' | 'investment' | 'goal') {
    // Map category to MainTransaction category string if needed, or query by regex
    // For now, we stored them as 'Savings Goal', 'Investment', 'Debt Repayment'
    let categoryName = '';
    if (category === 'goal') categoryName = 'Savings Goal';
    if (category === 'investment') categoryName = 'Investment';
    if (category === 'debt') categoryName = 'Debt Repayment';

    return await MainTransaction.find({
        userId,
        category: categoryName
    })
        .sort({ date: -1 });
}
