import express from 'express';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Budget } from '../models/Budget';
import { syncMainAccountBalance, syncCurrentAccountBalance } from '../services/accountService';
import { createSpecialTransaction, getVisibleTransactions, getSpecialTransactions } from '../services/transactionService';
import { validateTransaction } from '../middleware/validation';
import { createErrorResponse, ERROR_CODES } from '../middleware/errorHandler';
// import { awardTransactionXP } from '../services/gamificationEngine'; // Need to handle circular dependency or import dynamically

const router = express.Router();

// Get Visible Transactions (Day-to-Day)
router.get('/visible/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit } = req.query;
        const transactions = await getVisibleTransactions(userId, Number(limit) || 50);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Special Transactions
router.get('/special/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { category } = req.query;
        if (!category || typeof category !== 'string') {
            return res.status(400).json({ error: 'Category required (debt, investment, goal)' });
        }
        const transactions = await getSpecialTransactions(userId, category as any);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Special Transaction
router.post('/special', async (req, res) => {
    try {
        const { userId, type, amount, specialCategory, linkedEntityId, description } = req.body;
        const transaction = await createSpecialTransaction(
            userId, type, amount, specialCategory, linkedEntityId, description
        );

        // Sync Main Account (since special transactions affect main balance via aggregation)
        await syncMainAccountBalance(userId);

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Existing Routes (Migrated from index.ts) ---

// Get All Transactions (Legacy/Admin)
router.get('/', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const transactions = await Transaction.find({ userId }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Transaction
router.post('/', validateTransaction, async (req, res) => {
    try {
        const { userId, date, specialCategory } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'UserId is required' });
        }

        // Create and save the transaction
        const newTransaction = new Transaction({
            ...req.body,
            accountType: req.body.specialCategory ? 'main' : 'current'
        });
        await newTransaction.save();

        // Sync balances
        await syncMainAccountBalance(userId);
        await syncCurrentAccountBalance(userId);

        // Calculate XP (Dynamic import to avoid circular deps if any)
        try {
            const { awardTransactionXP } = await import('../services/gamificationEngine');
            const xpReward = await awardTransactionXP(userId, new Date(date));

            newTransaction.xpAwarded = xpReward.totalXP;
            await newTransaction.save();

            const txObj = newTransaction.toObject();
            return res.status(201).json({
                transaction: { ...txObj, id: txObj._id.toString() },
                xpReward: xpReward
            });
        } catch (xpError) {
            console.error('Error calculating XP:', xpError);
            const txObj = newTransaction.toObject();
            return res.status(201).json({
                transaction: { ...txObj, id: txObj._id.toString() },
                xpReward: null
            });
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Transaction
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, amount, category, date, description, type } = req.body;

        const transaction = await Transaction.findById(id);
        if (!transaction) {
            return res.status(404).json(createErrorResponse('Transaction not found', ERROR_CODES.TRANSACTION_NOT_FOUND));
        }

        if (userId && transaction.userId !== userId) {
            return res.status(403).json(createErrorResponse('Unauthorized', ERROR_CODES.UNAUTHORIZED));
        }

        if (amount !== undefined) transaction.amount = amount;
        if (category !== undefined) transaction.category = category;
        if (date !== undefined) transaction.date = new Date(date);
        if (description !== undefined) transaction.description = description;
        if (type !== undefined) transaction.type = type;
        transaction.updatedAt = new Date();

        await transaction.save();

        await syncMainAccountBalance(userId);
        await syncCurrentAccountBalance(userId);

        const txObj = transaction.toObject();
        res.json({ ...txObj, id: txObj._id.toString() });
    } catch (error) {
        res.status(500).json(createErrorResponse('Failed to update transaction', ERROR_CODES.SERVER_ERROR));
    }
});

// Delete Transaction
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) return res.status(400).json({ error: 'UserId required' });

        const transaction = await Transaction.findById(id);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

        if (transaction.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        // Deduct XP logic here if needed (omitted for brevity, can be imported)

        await Transaction.findByIdAndDelete(id);

        await syncMainAccountBalance(userId as string);
        await syncCurrentAccountBalance(userId as string);

        // Update budget if expense
        if (transaction.type === 'expense') {
            const budget = await Budget.findOne({ userId: transaction.userId, category: transaction.category });
            if (budget) {
                budget.spent = Math.max(0, budget.spent - transaction.amount);
                await budget.save();
            }
        }

        res.json({ success: true, message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
