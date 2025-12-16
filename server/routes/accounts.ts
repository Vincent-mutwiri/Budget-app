import express from 'express';
import { Account } from '../models/Account';
import { ensureMainAccount, ensureCurrentAccount, getMainAccount, getCurrentAccount, syncMainAccountBalance, syncCurrentAccountBalance } from '../services/accountService';

const router = express.Router();

// Get Main Account details
router.get('/main/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await ensureMainAccount(userId);
        await syncMainAccountBalance(userId);
        const account = await getMainAccount(userId);
        res.json(account);
    } catch (error) {
        console.error('Error fetching main account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Current Account details
router.get('/current/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await ensureCurrentAccount(userId);
        await syncCurrentAccountBalance(userId);
        const account = await getCurrentAccount(userId);
        res.json(account);
    } catch (error) {
        console.error('Error fetching current account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Account Summary (Both)
router.get('/summary/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Ensure accounts exist
        await ensureMainAccount(userId);
        await ensureCurrentAccount(userId);

        // Sync balances
        await syncMainAccountBalance(userId);
        await syncCurrentAccountBalance(userId);

        const mainAccount = await getMainAccount(userId);
        const currentAccount = await getCurrentAccount(userId);

        res.json({
            mainAccount,
            currentAccount
        });
    } catch (error) {
        console.error('Error fetching account summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Trigger month-end rollover
router.post('/rollover', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        const { performMonthEndRollover } = await import('../services/rolloverService');
        const result = await performMonthEndRollover(userId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
