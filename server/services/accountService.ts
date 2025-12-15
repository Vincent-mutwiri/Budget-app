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
            institution: 'SmartWallet',
            logoUrl: 'https://via.placeholder.com/48'
        });
        await mainAccount.save();
        
        // Update user reference
        await User.updateOne(
            { clerkId: userId },
            { $set: { mainAccountId: mainAccount._id.toString() } }
        );
    }
    
    return mainAccount._id.toString();
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
 * Syncs main account balance using aggregation for performance
 */
export async function syncMainAccountBalance(userId: string): Promise<void> {
    const { Transaction } = await import('../models/Transaction');
    const { Investment } = await import('../models/Investment');
    const { Debt } = await import('../models/Debt');
    const { SavingsGoal } = await import('../models/SavingsGoal');
    const mainAccount = await getMainAccount(userId);
    
    if (!mainAccount) return;
    
    // Aggregate transactions by type
    const txAgg = await Transaction.aggregate([
        { $match: { userId } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);
    
    const income = txAgg.find(t => t._id === 'income')?.total || 0;
    const expenses = txAgg.find(t => t._id === 'expense')?.total || 0;
    let balance = income - expenses;
    
    // Aggregate investments
    const invAgg = await Investment.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$initialAmount' } } }
    ]);
    balance -= invAgg[0]?.total || 0;
    
    // Aggregate debt payments
    const debtAgg = await Debt.aggregate([
        { $match: { userId } },
        { $unwind: { path: '$paymentHistory', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, total: { $sum: '$paymentHistory.amount' } } }
    ]);
    balance -= debtAgg[0]?.total || 0;
    
    // Aggregate goal contributions
    const goalAgg = await SavingsGoal.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$currentAmount' } } }
    ]);
    balance -= goalAgg[0]?.total || 0;
    
    mainAccount.balance = balance;
    await mainAccount.save();
}