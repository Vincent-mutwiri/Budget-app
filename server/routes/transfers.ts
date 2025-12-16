import express from 'express';
import { borrowFromMain, repayToMain, withdrawFromSpecial, getTransferHistory } from '../services/transferService';

const router = express.Router();

// Borrow from Main Account
router.post('/borrow', async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        const transfer = await borrowFromMain(userId, amount, description);
        res.json(transfer);
    } catch (error) {
        console.error('Error borrowing from main:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Server error' });
    }
});

// Repay to Main Account
router.post('/repay', async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        const transfer = await repayToMain(userId, amount, description);
        res.json(transfer);
    } catch (error) {
        console.error('Error repaying to main:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Server error' });
    }
});

// Withdraw from Special Account
router.post('/withdraw', async (req, res) => {
    try {
        const { userId, entityType, entityId, amount, description } = req.body;
        const result = await withdrawFromSpecial(userId, entityType, entityId, amount, description);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Contribute to Special Account (Debt/Investment/Goal)
router.post('/contribute', async (req, res) => {
    try {
        const { userId, entityType, entityId, amount, description } = req.body;
        const { processSpecialContribution } = await import('../services/transferService');
        const result = await processSpecialContribution(userId, entityType, entityId, amount, description);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get Transfer History
router.get('/:userId', async (req, res) => {
    try {
        const history = await getTransferHistory(req.params.userId);
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
