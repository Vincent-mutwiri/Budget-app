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

    // 3. Create Transaction Record (for Current Account history) - hidden from day-to-day view
    await createTransferTransaction(userId, 'main', 'current', amount, 'borrow', description, false);

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

    // 3. Create Transaction Record - hidden from day-to-day view
    await createTransferTransaction(userId, 'current', 'main', amount, 'repay', description, false);

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

    // 3. Update the specific entity
    if (entityType === 'investment') {
        const { Investment } = await import('../models/Investment');
        const investment = await Investment.findById(entityId);
        if (investment) {
            if (investment.currentValue < amount) {
                throw new Error('Insufficient funds in Investment');
            }
            investment.currentValue -= amount;
            await investment.save();
        }
    } else if (entityType === 'debt') {
        const { Debt } = await import('../models/Debt');
        const debt = await Debt.findById(entityId);
        if (debt) {
            // Withdrawing from a debt (e.g. Line of Credit) increases the debt balance
            debt.currentBalance += amount;
            await debt.save();
        }
    } else if (entityType === 'goal') {
        const { SavingsGoal } = await import('../models/SavingsGoal');
        const goal = await SavingsGoal.findById(entityId);
        if (goal) {
            if (goal.currentAmount < amount) {
                throw new Error('Insufficient funds in Goal');
            }
            goal.currentAmount -= amount;
            await goal.save();
        }
    }

    // 4. Create Transaction Record - visible for debt withdrawals, hidden for others
    const isVisible = entityType === 'debt'; // Make debt withdrawals visible
    await createTransferTransaction(userId, 'special', 'current', amount, 'withdraw', description, isVisible);

    return transfer;
}

/**
 * Process a contribution to a Special Account (Debt/Investment/Goal) from Main Account
 */
export async function processSpecialContribution(
    userId: string,
    type: 'debt' | 'investment' | 'goal',
    entityId: string,
    amount: number,
    description: string
) {
    const mainAccount = await getMainAccount(userId);
    if (!mainAccount) throw new Error('Main Account not found');

    if (mainAccount.balance < amount) {
        throw new Error('Insufficient funds in Main Account');
    }

    // 1. Deduct from Main Account
    mainAccount.balance -= amount;
    await mainAccount.save();

    // 2. Create Special Transaction (Visible for debt payments, hidden for others)
    // We use 'expense' because money leaves the Main Account context
    const transaction = await createSpecialTransaction(userId, 'expense', amount, type, entityId, description);
    
    // Make debt payments visible in transaction history
    if (type === 'debt') {
        transaction.isVisible = true;
        await transaction.save();
    }

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
