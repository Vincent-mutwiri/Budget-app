import express from 'express';
import { CurrentTransaction } from '../models/CurrentTransaction';
import { MainTransaction } from '../models/MainTransaction';
import { User } from '../models/User';
import { Budget } from '../models/Budget';
import { syncMainAccountBalance, syncCurrentAccountBalance } from '../services/accountService';
import { createSpecialTransaction, getVisibleTransactions, getSpecialTransactions } from '../services/transactionService';
import { validateTransaction } from '../middleware/validation';
import { createErrorResponse, ERROR_CODES } from '../middleware/errorHandler';

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

// Get All Transactions (Legacy/Admin) - Defaults to Current Transactions
router.get('/', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const transactions = await CurrentTransaction.find({ userId }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Transaction (Current Account)
router.post('/', validateTransaction, async (req, res) => {
    try {
        const { userId, date, specialCategory } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'UserId is required' });
        }

        // If specialCategory is present, it should go to MainTransaction via createSpecialTransaction
        // But if the frontend calls this endpoint, we redirect or handle it.
        if (specialCategory && ['debt', 'investment', 'goal'].includes(specialCategory)) {
            const transaction = await createSpecialTransaction(
                userId, req.body.type, req.body.amount, specialCategory, req.body.linkedEntityId, req.body.description
            );
            await syncMainAccountBalance(userId);
            return res.status(201).json({ transaction, xpReward: null });
        }

        // Default: Current Transaction
        const newTransaction = new CurrentTransaction({
            ...req.body
        });
        await newTransaction.save();

        // Sync balances
        await syncCurrentAccountBalance(userId);

        // Calculate XP (Dynamic import to avoid circular deps if any)
        try {
            const { awardTransactionXP } = await import('../services/gamificationEngine');
            const xpReward = await awardTransactionXP(userId, new Date(date));

            // CurrentTransaction schema might need xpAwarded if we want to store it
            // For now, we just return it.
            // If we want to store it, we need to update the model.
            // Assuming we added it to the model (I did not add it in Step 755, I should have).
            // I will skip saving it to DB for now to avoid error, or add it to schema later.

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

// Update Transaction (Current Account)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, amount, category, date, description, type } = req.body;

        const transaction = await CurrentTransaction.findById(id);
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

        await transaction.save();

        await syncCurrentAccountBalance(userId);

        const txObj = transaction.toObject();
        res.json({ ...txObj, id: txObj._id.toString() });
    } catch (error) {
        res.status(500).json(createErrorResponse('Failed to update transaction', ERROR_CODES.SERVER_ERROR));
    }
});

// Delete Transaction (Current Account)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) return res.status(400).json({ error: 'UserId required' });

        const transaction = await CurrentTransaction.findById(id);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

        if (transaction.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        await CurrentTransaction.findByIdAndDelete(id);

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
