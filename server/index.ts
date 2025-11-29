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
import { RecurringTransaction } from './models/RecurringTransaction';
import { Notification } from './models/Notification';
import { Investment } from './models/Investment';
import { Debt } from './models/Debt';
import { BudgetRecommendation } from './models/BudgetRecommendation';
import { Receipt } from './models/Receipt';
import { UserPreferences } from './models/UserPreferences';
import { startRecurringTransactionScheduler } from './services/recurringTransactionScheduler';
import { startNotificationEngine } from './services/notificationEngine';

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

// Recurring Transactions Routes

// Get all recurring transactions for a user
app.get('/api/recurring-transactions', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const recurringTransactions = await RecurringTransaction.find({ userId }).sort({ createdAt: -1 });
        res.json(recurringTransactions);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create a new recurring transaction
app.post('/api/recurring-transactions', async (req, res) => {
    try {
        const { userId, amount, category, description, type, frequency, startDate, endDate, reminderEnabled, reminderDaysBefore } = req.body;

        // Validate required fields
        if (!userId || !amount || !category || !description || !type || !frequency || !startDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Calculate next occurrence based on start date and frequency
        const nextOccurrence = new Date(startDate);

        const newRecurringTransaction = new RecurringTransaction({
            userId,
            amount,
            category,
            description,
            type,
            frequency,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            nextOccurrence,
            isActive: true,
            reminderEnabled: reminderEnabled || false,
            reminderDaysBefore: reminderDaysBefore || 3,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newRecurringTransaction.save();
        res.status(201).json(newRecurringTransaction);
    } catch (error) {
        console.error('Error creating recurring transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update a recurring transaction
app.put('/api/recurring-transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, category, description, type, frequency, startDate, endDate, reminderEnabled, reminderDaysBefore } = req.body;

        const recurringTransaction = await RecurringTransaction.findById(id);
        if (!recurringTransaction) {
            return res.status(404).json({ error: 'Recurring transaction not found' });
        }

        // Update fields
        if (amount !== undefined) recurringTransaction.amount = amount;
        if (category !== undefined) recurringTransaction.category = category;
        if (description !== undefined) recurringTransaction.description = description;
        if (type !== undefined) recurringTransaction.type = type;
        if (frequency !== undefined) recurringTransaction.frequency = frequency;
        if (startDate !== undefined) recurringTransaction.startDate = new Date(startDate);
        if (endDate !== undefined) recurringTransaction.endDate = endDate ? new Date(endDate) : undefined;
        if (reminderEnabled !== undefined) recurringTransaction.reminderEnabled = reminderEnabled;
        if (reminderDaysBefore !== undefined) recurringTransaction.reminderDaysBefore = reminderDaysBefore;

        recurringTransaction.updatedAt = new Date();

        await recurringTransaction.save();
        res.json(recurringTransaction);
    } catch (error) {
        console.error('Error updating recurring transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a recurring transaction
app.delete('/api/recurring-transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const recurringTransaction = await RecurringTransaction.findByIdAndDelete(id);
        if (!recurringTransaction) {
            return res.status(404).json({ error: 'Recurring transaction not found' });
        }

        res.json({ message: 'Recurring transaction deleted successfully', id });
    } catch (error) {
        console.error('Error deleting recurring transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle active/inactive status
app.patch('/api/recurring-transactions/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({ error: 'isActive field required' });
        }

        const recurringTransaction = await RecurringTransaction.findById(id);
        if (!recurringTransaction) {
            return res.status(404).json({ error: 'Recurring transaction not found' });
        }

        recurringTransaction.isActive = isActive;
        recurringTransaction.updatedAt = new Date();

        await recurringTransaction.save();
        res.json(recurringTransaction);
    } catch (error) {
        console.error('Error toggling recurring transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Notification Routes

// Get notifications with filters
app.get('/api/notifications', async (req, res) => {
    const { userId, type, isRead, limit = '50' } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const query: any = { userId };

        // Apply filters
        if (type) {
            query.type = type;
        }
        if (isRead !== undefined) {
            query.isRead = isRead === 'true';
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string));

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        notification.isRead = true;
        await notification.save();

        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark all notifications as read
app.patch('/api/notifications/read-all', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const result = await Notification.updateMany(
            { userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get notification preferences
app.get('/api/notifications/preferences', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        let preferences = await UserPreferences.findOne({ userId });

        // Create default preferences if they don't exist
        if (!preferences) {
            preferences = new UserPreferences({ userId });
            await preferences.save();
        }

        res.json(preferences.notifications);
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update notification preferences
app.put('/api/notifications/preferences', async (req, res) => {
    const { userId, preferences } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    if (!preferences) {
        return res.status(400).json({ error: 'Preferences object required' });
    }

    try {
        let userPreferences = await UserPreferences.findOne({ userId });

        // Create new preferences if they don't exist
        if (!userPreferences) {
            userPreferences = new UserPreferences({ userId });
        }

        // Update notification preferences
        userPreferences.notifications = {
            ...userPreferences.notifications,
            ...preferences
        };
        userPreferences.updatedAt = new Date();

        await userPreferences.save();

        res.json(userPreferences.notifications);
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start the recurring transaction scheduler
    startRecurringTransactionScheduler();

    // Start the notification engine
    startNotificationEngine();
});
