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
 * Syncs main account balance by aggregating 'main' transactions
 */
export async function syncMainAccountBalance(userId: string): Promise<void> {
    const { MainTransaction } = await import('../models/MainTransaction');
    const mainAccount = await getMainAccount(userId);

    if (!mainAccount) return;

    // Sum MainTransactions (Income - Expense)
    const txAgg = await MainTransaction.aggregate([
        { $match: { userId } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    const income = txAgg.find(t => t._id === 'income')?.total || 0;
    const expenses = txAgg.find(t => t._id === 'expense')?.total || 0;
    const balance = income - expenses;

    mainAccount.balance = balance;
    await mainAccount.save();
}

/**
 * Syncs current account balance by aggregating 'current' transactions
 */
export async function syncCurrentAccountBalance(userId: string): Promise<void> {
    const { CurrentTransaction } = await import('../models/CurrentTransaction');
    const currentAccount = await getCurrentAccount(userId);

    if (!currentAccount) return;

    // Sum CurrentTransactions (Income - Expense)
    const txAgg = await CurrentTransaction.aggregate([
        { $match: { userId } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    const income = txAgg.find(t => t._id === 'income')?.total || 0;
    const expenses = txAgg.find(t => t._id === 'expense')?.total || 0;
    const balance = income - expenses;

    currentAccount.balance = balance;
    await currentAccount.save();
}