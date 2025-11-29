import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import uploadRoutes from './routes/upload';
import { User } from './models/User';
import { Transaction } from './models/Transaction';
import { Budget } from './models/Budget';
import { SavingsGoal } from './models/SavingsGoal';
import { Account } from './models/Account';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/upload', uploadRoutes);

// Basic CRUD Routes (Examples)

// Get User Data
app.get('/api/user/:clerkId', async (req, res) => {
    try {
        const user = await User.findOne({ clerkId: req.params.clerkId });
        if (!user) {
            // Create new user if not exists (first login)
            const newUser = new User({
                clerkId: req.params.clerkId,
                email: req.query.email || '',
                fullName: req.query.fullName || ''
            });
            await newUser.save();
            return res.json(newUser);
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Transactions
app.get('/api/transactions', async (req, res) => {
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
app.post('/api/transactions', async (req, res) => {
    try {
        const newTransaction = new Transaction(req.body);
        await newTransaction.save();
        res.status(201).json(newTransaction);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Budgets
app.get('/api/budgets', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const budgets = await Budget.find({ userId });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Budget
app.post('/api/budgets', async (req, res) => {
    try {
        const newBudget = new Budget(req.body);
        await newBudget.save();
        res.status(201).json(newBudget);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Savings Goals
app.get('/api/goals', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const goals = await SavingsGoal.find({ userId });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Savings Goal
app.post('/api/goals', async (req, res) => {
    try {
        const newGoal = new SavingsGoal(req.body);
        await newGoal.save();
        res.status(201).json(newGoal);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
