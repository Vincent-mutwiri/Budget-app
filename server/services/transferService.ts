import { Transfer } from '../models/Transfer';
import { Account } from '../models/Account';
import { createTransferTransaction, createSpecialTransaction } from './transactionService';
import { ensureMainAccount, ensureCurrentAccount, getCurrentAccount, getMainAccount, syncCurrentAccountBalance, syncMainAccountBalance } from './accountService';

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

    // 2. Create Transaction Records (Double Entry)
    await createTransferTransaction(userId, 'main', 'current', amount, 'borrow', description, false);

    // 3. Sync Balances
    await syncMainAccountBalance(userId);
    await syncCurrentAccountBalance(userId);

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

    // 2. Create Transaction Records (Double Entry)
    await createTransferTransaction(userId, 'current', 'main', amount, 'repay', description, false);

    // 3. Sync Balances
    await syncMainAccountBalance(userId);
    await syncCurrentAccountBalance(userId);

    return transfer;
}

/**
 * Withdraw from a Special Account (Debt/Investment/Goal) to Main Account
 * Special accounts only interact with Main Account, not Current Account
 */
export async function withdrawFromSpecial(
    userId: string,
    entityType: 'debt' | 'investment' | 'goal',
    entityId: string,
    amount: number,
    description: string
) {
    const mainAccount = await getMainAccount(userId);
    if (!mainAccount) throw new Error('Main Account not found');

    // 1. Create Transfer Record
    const transfer = new Transfer({
        userId,
        fromAccount: entityType,
        toAccount: 'main',
        amount,
        type: 'withdraw',
        linkedEntityId: entityId,
        description,
        status: 'completed'
    });
    await transfer.save();

    // 2. Update the specific entity
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

    // 3. Create Transaction Record (Income in Main)
    await createTransferTransaction(userId, 'special', 'main', amount, 'withdraw', description, false);

    // 4. Sync Main Account Balance
    await syncMainAccountBalance(userId);

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

    // 1. Create Special Transaction (Expense in Main)
    const transaction = await createSpecialTransaction(userId, 'expense', amount, type, entityId, description);

    // Make debt payments visible in transaction history? 
    // MainTransaction doesn't have isVisible flag, but we can query by category.
    // If we want to show it in Main Account history, it's there.

    // 2. Update the specific entity
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

    // 3. Sync Main Account Balance
    await syncMainAccountBalance(userId);

    return { success: true, message: 'Contribution processed successfully' };
}

/**
 * Get transfer history
 */
export async function getTransferHistory(userId: string) {
    return await Transfer.find({ userId }).sort({ date: -1 });
}
