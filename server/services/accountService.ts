import { Account } from '../models/Account';
import { User } from '../models/User';

/**
 * Ensures a user has a main account, creates one if none exists
 */
export async function ensureMainAccount(userId: string): Promise<string> {
    // Check if user has a main account
    let mainAccount = await Account.findOne({ userId, isMain: true });
    
    if (!mainAccount) {
        // Create default main account
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