import { Account } from '../models/Account';
import { User } from '../models/User';

/**
 * Ensures a user has a main account, creates one if none exists
 */
export async function ensureMainAccount(userId: string): Promise<string> {
    // Check if user has a main account
    let mainAccount = await Account.findOne({ userId, isMain: true });

    if (!mainAccount) {
        // Always create a new separate main account
        mainAccount = new Account({
            userId,
            name: 'Main Account',
            type: 'asset',
            balance: 0,
            isMain: true,
            accountCategory: 'main', // Explicitly set category
            institution: 'SmartWallet',
            logoUrl: 'https://via.placeholder.com/48'
        });
        await mainAccount.save();

        // Update user reference
        await User.updateOne(
            { clerkId: userId },
            { $set: { mainAccountId: mainAccount._id.toString() } }
        );
    } else if (!mainAccount.accountCategory) {
        // Migration: Ensure existing main account has category
        mainAccount.accountCategory = 'main';
        await mainAccount.save();
    }

    return mainAccount._id.toString();
}

/**
 * Ensures a user has a current account, creates one if none exists
 */
export async function ensureCurrentAccount(userId: string): Promise<string> {
    // Check if user has a current account
    let currentAccount = await Account.findOne({ userId, accountCategory: 'current' });

    if (!currentAccount) {
        currentAccount = new Account({
            userId,
            name: 'Current Account',
            type: 'asset',
            balance: 0,
            isMain: false,
            accountCategory: 'current',
            institution: 'SmartWallet',
            logoUrl: 'https://via.placeholder.com/48',
            monthlyBudget: 0
        });
        await currentAccount.save();
    }

    return currentAccount._id.toString();
}

/**
 * Gets the current account for a user
 */
export async function getCurrentAccount(userId: string) {
    return await Account.findOne({ userId, accountCategory: 'current' });
}

/**
 * Transfers balance from one account to the main account
 */
export async function transferToMainAccount(userId: string, amount: number): Promise<void> {
    const mainAccount = await Account.findOne({ userId, isMain: true });
    if (mainAccount) {
        mainAccount.balance += amount;
        await mainAccount.save();
    }
}

/**
 * Gets the main account for a user
 */
export async function getMainAccount(userId: string) {
    return await Account.findOne({ userId, isMain: true });
}

/**
 * Syncs main account balance by aggregating 'main' transactions and transfers
 */
export async function syncMainAccountBalance(userId: string): Promise<void> {
    const { Transaction } = await import('../models/Transaction');
    const { Transfer } = await import('../models/Transfer');
    const mainAccount = await getMainAccount(userId);

    if (!mainAccount) return;

    // 1. Sum 'main' transactions (Income - Expense)
    const txAgg = await Transaction.aggregate([
        { $match: { userId, accountType: 'main' } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    const income = txAgg.find(t => t._id === 'income')?.total || 0;
    const expenses = txAgg.find(t => t._id === 'expense')?.total || 0;
    let balance = income - expenses;

    // 2. Add Transfers TO Main (Repayments, Surplus Rollovers)
    const transfersIn = await Transfer.aggregate([
        { $match: { userId, toAccount: 'main', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    balance += transfersIn[0]?.total || 0;

    // 3. Subtract Transfers FROM Main (Loans to Current)
    const transfersOut = await Transfer.aggregate([
        { $match: { userId, fromAccount: 'main', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    balance -= transfersOut[0]?.total || 0;

    mainAccount.balance = balance;
    await mainAccount.save();
}

/**
 * Syncs current account balance by aggregating 'current' transactions
 * (Transfers to/from Current are already recorded as 'current' transactions)
 */
export async function syncCurrentAccountBalance(userId: string): Promise<void> {
    const { Transaction } = await import('../models/Transaction');
    const currentAccount = await getCurrentAccount(userId);

    if (!currentAccount) return;

    // Sum 'current' transactions (Income - Expense)
    const txAgg = await Transaction.aggregate([
        { $match: { userId, accountType: 'current' } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    const income = txAgg.find(t => t._id === 'income')?.total || 0;
    const expenses = txAgg.find(t => t._id === 'expense')?.total || 0;

    // Current Account Balance = Income - Expenses
    // (Includes transfers because they are recorded as transactions)
    currentAccount.balance = income - expenses;
    await currentAccount.save();
}