import express from 'express';
import { performMonthEndAutomation } from '../services/monthEndAutomationService';
import { processUserRecurringTransactions } from '../services/recurringTransactionProcessor';
import { copyBudgetsToNewMonth, getCurrentMonthBudgets } from '../services/budgetPersistenceService';

const router = express.Router();

// Trigger month-end automation for a specific user (manual trigger)
router.post('/month-end/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const results = await performMonthEndAutomation(userId);
        res.json(results);
    } catch (error) {
        console.error('Month-end automation error:', error);
        res.status(500).json({ error: 'Failed to perform month-end automation' });
    }
});

// Process recurring transactions for a specific user
router.post('/recurring-transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const results = await processUserRecurringTransactions(userId);
        res.json({ success: true, processed: results.length, results });
    } catch (error) {
        console.error('Recurring transactions error:', error);
        res.status(500).json({ error: 'Failed to process recurring transactions' });
    }
});

// Get current month budgets (auto-creates from previous month if needed)
router.get('/budgets/current/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const budgets = await getCurrentMonthBudgets(userId);
        res.json(budgets);
    } catch (error) {
        console.error('Get current budgets error:', error);
        res.status(500).json({ error: 'Failed to get current month budgets' });
    }
});

// Copy budgets to a specific month
router.post('/budgets/copy', async (req, res) => {
    try {
        const { userId, month, year } = req.body;
        const budgets = await copyBudgetsToNewMonth(userId, month, year);
        res.json({ success: true, count: budgets.length, budgets });
    } catch (error) {
        console.error('Copy budgets error:', error);
        res.status(500).json({ error: 'Failed to copy budgets' });
    }
});

export default router;
