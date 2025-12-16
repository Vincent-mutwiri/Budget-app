import { Transaction } from '../models/Transaction';
import { Account } from '../models/Account';

/**
 * Creates a special transaction (Debt, Investment, Goal) that is hidden from day-to-day view
 */
export async function createSpecialTransaction(
    userId: string,
    type: 'income' | 'expense',
    amount: number,
    specialCategory: 'debt' | 'investment' | 'goal',
    linkedEntityId: string,
    description: string
) {
    const transaction = new Transaction({
        userId,
        amount,
        type,
        description,
        category: specialCategory === 'debt' ? 'Debt Repayment' :
            specialCategory === 'investment' ? 'Investment' : 'Savings Goal',
        date: new Date(),
        accountType: 'special',
        specialCategory,
        linkedEntityId,
        isVisible: false // Hidden from day-to-day
    });

    await transaction.save();
    return transaction;
}

/**
 * Creates a transaction representing a transfer between accounts
 */
export async function createTransferTransaction(
    userId: string,
    fromAccountType: 'main' | 'current' | 'special',
    toAccountType: 'main' | 'current' | 'special',
    amount: number,
    transferType: 'borrow' | 'repay' | 'withdraw' | 'deposit',
    description: string
) {
    // Create two transactions: one for outflow, one for inflow? 
    // Or just one representing the movement?
    // Usually, for double-entry, we might want two, but here we are tracking "Transactions" as a list.
    // If we want it to show up in "Current Account" history, we need a transaction there.

    // Case 1: Borrow from Main (Main -> Current)
    // Current Account gets Income (visible? maybe special color)
    if (transferType === 'borrow') {
        const incomeTx = new Transaction({
            userId,
            amount,
            type: 'income',
            description: `Borrowed: ${description}`,
            category: 'Transfer',
            date: new Date(),
            accountType: 'current',
            specialCategory: 'transfer',
            transferType: 'borrow',
            isVisible: true // Visible in Current Account so user sees money coming in
        });
        await incomeTx.save();
        return incomeTx;
    }

    // Case 2: Repay to Main (Current -> Main)
    // Current Account gets Expense
    if (transferType === 'repay') {
        const expenseTx = new Transaction({
            userId,
            amount,
            type: 'expense',
            description: `Repayment: ${description}`,
            category: 'Transfer',
            date: new Date(),
            accountType: 'current',
            specialCategory: 'transfer',
            transferType: 'repay',
            isVisible: true // Visible in Current Account
        });
        await expenseTx.save();
        return expenseTx;
    }

    // Case 3: Withdraw from Special (Special -> Current)
    if (transferType === 'withdraw') {
        const incomeTx = new Transaction({
            userId,
            amount,
            type: 'income',
            description: `Withdrawal: ${description}`,
            category: 'Transfer',
            date: new Date(),
            accountType: 'current',
            specialCategory: 'transfer',
            transferType: 'withdraw',
            isVisible: true
        });
        await incomeTx.save();
        return incomeTx;
    }

    // Case 4: Deposit to Special (Current -> Special)
    // This is usually handled by createSpecialTransaction as an expense, but if we treat it as transfer:
    if (transferType === 'deposit') {
        const expenseTx = new Transaction({
            userId,
            amount,
            type: 'expense',
            description: `Deposit: ${description}`,
            category: 'Transfer',
            date: new Date(),
            accountType: 'current',
            specialCategory: 'transfer',
            transferType: 'deposit', // We might need to add this to enum if not present
            isVisible: true
        });
        await expenseTx.save();
        return expenseTx;
    }
}

/**
 * Get visible transactions for Current Account view
 */
export async function getVisibleTransactions(userId: string, limit: number = 50) {
    return await Transaction.find({
        userId,
        isVisible: true,
        accountType: { $ne: 'special' } // Exclude purely special transactions just in case
    })
        .sort({ date: -1 })
        .limit(limit);
}

/**
 * Get special transactions by category
 */
export async function getSpecialTransactions(userId: string, category: 'debt' | 'investment' | 'goal') {
    return await Transaction.find({
        userId,
        specialCategory: category
    })
        .sort({ date: -1 });
}
