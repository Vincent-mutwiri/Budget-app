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
 * Syncs main account balance from all transactions, investments, and debt payments
 */
export async function syncMainAccountBalance(userId: string): Promise<void> {
    const { Transaction } = await import('../models/Transaction');
    const { Investment } = await import('../models/Investment');
    const { Debt } = await import('../models/Debt');
    const { SavingsGoal } = await import('../models/SavingsGoal');
    const mainAccount = await getMainAccount(userId);
    
    if (!mainAccount) return;
    
    // Calculate balance from transactions
    const transactions = await Transaction.find({ userId });
    let balance = transactions.reduce((sum, tx) => {
        return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
    }, 0);
    
    // Deduct investments
    const investments = await Investment.find({ userId });
    const totalInvested = investments.reduce((sum, inv) => sum + inv.initialAmount, 0);
    balance -= totalInvested;
    
    // Deduct debt payments
    const debts = await Debt.find({ userId });
    const totalPaid = debts.reduce((sum, debt) => {
        const paidAmount = debt.paymentHistory?.reduce((s: number, p: any) => s + p.amount, 0) || 0;
        return sum + paidAmount;
    }, 0);
    balance -= totalPaid;
    
    // Deduct goal contributions
    const goals = await SavingsGoal.find({ userId });
    const totalContributed = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    balance -= totalContributed;
    
    mainAccount.balance = balance;
    await mainAccount.save();
}