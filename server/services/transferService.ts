import { Transfer } from '../models/Transfer';
import { Account } from '../models/Account';
import { createTransferTransaction, createSpecialTransaction } from './transactionService';
import { ensureMainAccount, ensureCurrentAccount, getCurrentAccount, getMainAccount } from './accountService';

/**
 * Borrow money from Main Account to Current Account
 */
export async function borrowFromMain(userId: string, amount: number, description: string) {
    const mainAccount = await getMainAccount(userId);
    const currentAccount = await getCurrentAccount(userId);

    if (!mainAccount || !currentAccount) {
        throw new Error('Accounts not found');
    }

    if (mainAccount.balance < amount) {
        throw new Error('Insufficient funds in Main Account');
    }

    // 1. Create Transfer Record
    const transfer = new Transfer({
        userId,
        fromAccount: 'main',
        toAccount: 'current',
        amount,
        type: 'borrow',
        description,
        status: 'completed'
    });
    await transfer.save();

    // 2. Update Account Balances
    mainAccount.balance -= amount;
    currentAccount.balance += amount;
    await mainAccount.save();
    await currentAccount.save();

    // 3. Create Transaction Record (for Current Account history)
    await createTransferTransaction(userId, 'main', 'current', amount, 'borrow', description);

    return transfer;
}

/**
 * Repay money from Current Account to Main Account
 */
export async function repayToMain(userId: string, amount: number, description: string) {
    const mainAccount = await getMainAccount(userId);
    const currentAccount = await getCurrentAccount(userId);

    if (!mainAccount || !currentAccount) {
        throw new Error('Accounts not found');
    }

    if (currentAccount.balance < amount) {
        throw new Error('Insufficient funds in Current Account');
    }

    // 1. Create Transfer Record
    const transfer = new Transfer({
        userId,
        fromAccount: 'current',
        toAccount: 'main',
        amount,
        type: 'repay',
        description,
        status: 'completed'
    });
    await transfer.save();

    // 2. Update Account Balances
    currentAccount.balance -= amount;
    mainAccount.balance += amount;
    await currentAccount.save();
    await mainAccount.save();

    // 3. Create Transaction Record
    await createTransferTransaction(userId, 'current', 'main', amount, 'repay', description);

    return transfer;
}

/**
 * Withdraw from a Special Account (Debt/Investment/Goal) to Current Account
 * Note: This assumes the Special Account Entity (e.g. Goal) balance is updated separately 
 * or passed in here. For now, we just handle the money movement to Current.
 */
export async function withdrawFromSpecial(
    userId: string,
    entityType: 'debt' | 'investment' | 'goal',
    entityId: string,
    amount: number,
    description: string
) {
    const currentAccount = await getCurrentAccount(userId);
    if (!currentAccount) throw new Error('Current Account not found');

    // 1. Create Transfer Record
    const transfer = new Transfer({
        userId,
        fromAccount: entityType,
        toAccount: 'current',
        amount,
        type: 'withdraw',
        linkedEntityId: entityId,
        description,
        status: 'completed'
    });
    await transfer.save();

    // 2. Update Current Account Balance
    currentAccount.balance += amount;
    await currentAccount.save();

    // 3. Create Transaction Record
    await createTransferTransaction(userId, 'special', 'current', amount, 'withdraw', description);

    return transfer;
}

/**
 * Process a contribution to a Special Account (Debt/Investment/Goal) from Current Account
 */
export async function processSpecialContribution(
    userId: string,
    type: 'debt' | 'investment' | 'goal',
    entityId: string,
    amount: number,
    description: string
) {
    const currentAccount = await getCurrentAccount(userId);
    if (!currentAccount) throw new Error('Current Account not found');

    if (currentAccount.balance < amount) {
        throw new Error('Insufficient funds in Current Account');
    }

    // 1. Deduct from Current Account
    currentAccount.balance -= amount;
    await currentAccount.save();

    // 2. Create Special Transaction (Hidden from daily view)
    // We use 'expense' because money leaves the Current Account context
    await createSpecialTransaction(userId, 'expense', amount, type, entityId, description);

    // 3. Update the specific entity
    if (type === 'debt') {
        const { Debt } = await import('../models/Debt');
        const debt = await Debt.findById(entityId);
        if (debt) {
            debt.currentBalance -= amount; // Reduce debt
            debt.paymentHistory.push({
                amount,
                date: new Date(),
                principalPaid: amount, // Simplified: assuming all principal for now
                interestPaid: 0
            });
            await debt.save();
        }
    } else if (type === 'investment') {
        const { Investment } = await import('../models/Investment');
        const investment = await Investment.findById(entityId);
        if (investment) {
            investment.currentValue += amount; // Increase value
            // Ideally track contributions history too, but Investment model might need update
            await investment.save();
        }
    } else if (type === 'goal') {
        const { SavingsGoal } = await import('../models/SavingsGoal');
        const goal = await SavingsGoal.findById(entityId);
        if (goal) {
            goal.currentAmount += amount;
            goal.contributions.push({
                amount,
                date: new Date(),
                note: description
            });
            await goal.save();
        }
    }

    return { success: true, message: 'Contribution processed successfully' };
}

/**
 * Get transfer history
 */
export async function getTransferHistory(userId: string) {
    return await Transfer.find({ userId }).sort({ date: -1 });
}
