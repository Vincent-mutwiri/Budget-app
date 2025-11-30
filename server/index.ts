import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from Budget-app/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import uploadRoutes from './routes/upload';
import receiptRoutes from './routes/receipts';
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
import { rateLimit } from './middleware/rateLimit';
import { validateTransaction, validateBudget } from './middleware/validation';

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173'
        ];

        if (process.env.FRONTEND_URL) {
            allowedOrigins.push(process.env.FRONTEND_URL);
        }

        // Check if origin is allowed
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(rateLimit(100, 60000));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
        console.log('Database:', mongoose.connection.name);
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Health check endpoint
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'ok',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/receipts', receiptRoutes);

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
                fullName: req.query.fullName || '',
                customCategories: []
            });
            await newUser.save();
            return res.json(newUser);
        }
        res.json(user);
    } catch (error) {
        console.error('Error in /api/user/:clerkId:', error);
        res.status(500).json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// Get Custom Categories
app.get('/api/categories/custom', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const user = await User.findOne({ clerkId: userId });
        res.json(user?.customCategories || []);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Custom Category
app.post('/api/categories/custom', async (req, res) => {
    const { userId, category, type } = req.body;
    if (!userId || !category || !type) return res.status(400).json({ error: 'UserId, category, and type required' });

    try {
        const user = await User.findOne({ clerkId: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.customCategories) user.customCategories = [] as any;
        if (!user.customCategories.find((c: any) => c.name === category)) {
            user.customCategories.push({ name: category, type });
            await user.save();
        }
        res.json(user.customCategories);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Custom Category
app.delete('/api/categories/custom/:category', async (req, res) => {
    const { userId } = req.query;
    const { category } = req.params;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const user = await User.findOne({ clerkId: userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.customCategories = (user.customCategories || []).filter((c: any) => c.name !== category) as any;
        await user.save();
        res.json(user.customCategories);
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
app.post('/api/transactions', validateTransaction, async (req, res) => {
    try {
        const { userId, date } = req.body;

        // Create and save the transaction
        const newTransaction = new Transaction(req.body);
        await newTransaction.save();

        // Calculate same-day XP bonus
        const transactionDate = new Date(date);
        const currentDate = new Date();

        // Check if transaction date is the same as current date (ignoring time)
        const isSameDay =
            transactionDate.getFullYear() === currentDate.getFullYear() &&
            transactionDate.getMonth() === currentDate.getMonth() &&
            transactionDate.getDate() === currentDate.getDate();

        // Get user for streak and XP calculation
        const user = await User.findOne({ clerkId: userId });

        if (user) {
            const baseXP = 10;
            const sameDayBonus = isSameDay ? 15 : 0;

            // Calculate streak bonus
            let streakBonus = 0;
            let newStreak = user.streak || 0;

            if (isSameDay) {
                // Check if this continues the streak
                const lastTransactionDate = user.lastTransactionDate;

                if (lastTransactionDate) {
                    const lastDate = new Date(lastTransactionDate);
                    const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysDiff === 1) {
                        // Consecutive day - increment streak
                        newStreak = (user.streak || 0) + 1;
                    } else if (daysDiff === 0) {
                        // Same day - maintain streak
                        newStreak = user.streak || 0;
                    } else {
                        // Streak broken - reset to 1
                        newStreak = 1;
                    }
                } else {
                    // First transaction - start streak
                    newStreak = 1;
                }

                streakBonus = newStreak * 2;

                // Update user streak and last transaction date
                user.streak = newStreak;
                user.lastTransactionDate = currentDate;
            }

            const totalXP = baseXP + sameDayBonus + streakBonus;

            // Update user XP
            user.xp = (user.xp || 0) + totalXP;

            // Calculate new level (simple level calculation)
            const newLevel = Math.floor(user.xp / 100) + 1;
            user.level = newLevel;

            await user.save();

            // Store XP awarded in transaction
            newTransaction.xpAwarded = totalXP;
            await newTransaction.save();

            // Return transaction with XP reward details
            res.status(201).json({
                transaction: newTransaction.toObject(),
                xpReward: {
                    baseXP,
                    sameDayBonus,
                    streakBonus,
                    totalXP,
                    newStreak: isSameDay ? newStreak : user.streak || 0,
                    isSameDay
                }
            });
        } else {
            // User not found, return transaction without XP
            res.status(201).json({
                transaction: newTransaction.toObject(),
                xpReward: null
            });
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Transaction
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'UserId required' });
        }

        // Find the transaction by unique ID
        const transaction = await Transaction.findById(id);

        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction not found',
                code: 'TRANSACTION_NOT_FOUND'
            });
        }

        // Validate user ownership
        if (transaction.userId !== userId) {
            return res.status(403).json({
                error: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }

        // Delete the transaction
        await Transaction.findByIdAndDelete(id);

        // Update related budgets if it's an expense
        if (transaction.type === 'expense') {
            const budget = await Budget.findOne({
                userId: transaction.userId,
                category: transaction.category
            });

            if (budget) {
                budget.spent = Math.max(0, budget.spent - transaction.amount);
                budget.updatedAt = new Date();
                await budget.save();
            }
        }

        // Calculate updated metrics
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Get current month transactions
        const transactions = await Transaction.find({
            userId: userId as string,
            date: { $gte: currentMonth, $lt: nextMonth }
        });

        // Calculate monthly spending
        const monthlySpending = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        // Calculate total income
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        // Get all budgets for remaining budget calculation
        const budgets = await Budget.find({ userId: userId as string });

        res.json({
            success: true,
            message: 'Transaction deleted successfully',
            updatedMetrics: {
                budgets: budgets,
                monthlySpending,
                totalIncome
            }
        });
    } catch (error) {
        console.error('Error deleting transaction:', error);
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
app.post('/api/budgets', validateBudget, async (req, res) => {
    try {
        const newBudget = new Budget(req.body);
        await newBudget.save();
        res.status(201).json(newBudget);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Budget
app.put('/api/budgets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit, category, icon, userId } = req.body;

        // Find the budget
        const budget = await Budget.findById(id);
        if (!budget) {
            return res.status(404).json({ error: 'Budget not found', code: 'BUDGET_NOT_FOUND' });
        }

        // Validate user ownership
        if (userId && budget.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        // Validate limit is positive if provided
        if (limit !== undefined) {
            if (typeof limit !== 'number' || limit <= 0) {
                return res.status(400).json({ error: 'Budget limit must be a positive number', code: 'INVALID_AMOUNT' });
            }
            budget.limit = limit;
        }

        // Update other fields if provided
        if (category !== undefined) budget.category = category;
        if (icon !== undefined) budget.icon = icon;

        // Update timestamp
        budget.updatedAt = new Date();

        await budget.save();

        // Calculate utilization percentage
        const utilizationPercentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;

        // Calculate total planned budget for this user
        const allBudgets = await Budget.find({ userId: budget.userId });
        const totalPlannedBudget = allBudgets.reduce((sum, b) => sum + b.limit, 0);

        res.json({
            budget: budget.toObject(),
            totalPlannedBudget,
            utilizationPercentage
        });
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Total Planned Budget
app.get('/api/budgets/total', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const budgets = await Budget.find({ userId });
        const totalPlannedBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);

        res.json({
            totalPlannedBudget,
            budgetCount: budgets.length
        });
    } catch (error) {
        console.error('Error calculating total planned budget:', error);
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

// Update Savings Goal
app.put('/api/goals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, title, targetAmount, deadline, imageUrl, status } = req.body;

        // Find the goal
        const goal = await SavingsGoal.findById(id);
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found', code: 'GOAL_NOT_FOUND' });
        }

        // Validate user ownership
        if (userId && goal.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        // Update fields if provided
        if (title !== undefined) goal.title = title;
        if (targetAmount !== undefined) {
            if (typeof targetAmount !== 'number' || targetAmount <= 0) {
                return res.status(400).json({ error: 'Target amount must be a positive number', code: 'INVALID_AMOUNT' });
            }
            goal.targetAmount = targetAmount;
        }
        if (deadline !== undefined) goal.deadline = new Date(deadline);
        if (imageUrl !== undefined) goal.imageUrl = imageUrl;
        if (status !== undefined) goal.status = status;

        // Update timestamp
        goal.updatedAt = new Date();

        await goal.save();

        res.json(goal.toObject());
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove Goal Image
app.delete('/api/goals/:id/image', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'UserId required' });
        }

        // Find the goal
        const goal = await SavingsGoal.findById(id);
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found', code: 'GOAL_NOT_FOUND' });
        }

        // Validate user ownership
        if (goal.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        // Extract S3 key from image URL if it exists
        if (goal.imageUrl && goal.imageUrl.includes('amazonaws.com')) {
            try {
                const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
                const { S3Client } = await import('@aws-sdk/client-s3');

                const s3 = new S3Client({
                    region: process.env.AWS_S3_REGION,
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                    },
                });

                // Extract key from URL (format: https://bucket.s3.region.amazonaws.com/key)
                const url = new URL(goal.imageUrl);
                const key = url.pathname.substring(1); // Remove leading slash

                const deleteCommand = new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME || '',
                    Key: key,
                });

                await s3.send(deleteCommand);
            } catch (s3Error) {
                console.error('Error deleting image from S3:', s3Error);
                // Continue even if S3 deletion fails
            }
        }

        // Set to default image URL (empty string or a default placeholder)
        const defaultImageUrl = '';
        goal.imageUrl = defaultImageUrl;
        goal.updatedAt = new Date();

        await goal.save();

        res.json({
            success: true,
            message: 'Image removed successfully',
            defaultImageUrl,
            goal: goal.toObject()
        });
    } catch (error) {
        console.error('Error removing goal image:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Contribute to Goal
app.post('/api/goals/:id/contribute', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, amount, note } = req.body;

        if (!userId || amount === undefined) {
            return res.status(400).json({ error: 'UserId and amount required' });
        }

        // Validate amount is positive
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Contribution amount must be a positive number', code: 'INVALID_AMOUNT' });
        }

        // Find the goal
        const goal = await SavingsGoal.findById(id);
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found', code: 'GOAL_NOT_FOUND' });
        }

        // Validate user ownership
        if (goal.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        // Check goal status
        if (goal.status !== 'in-progress') {
            return res.status(400).json({ error: 'Cannot contribute to a goal that is not in progress', code: 'INVALID_GOAL_STATUS' });
        }

        // Get user and validate balance
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }

        // Check if user has sufficient balance
        if (user.totalBalance < amount) {
            return res.status(400).json({
                error: 'Insufficient balance',
                code: 'INSUFFICIENT_BALANCE',
                availableBalance: user.totalBalance,
                requestedAmount: amount
            });
        }

        // Deduct from user's total balance
        user.totalBalance -= amount;

        // Add to goal's current amount
        goal.currentAmount += amount;

        // Record contribution in contributions array
        goal.contributions.push({
            amount,
            date: new Date(),
            note: note || ''
        });

        // Check if goal is completed
        if (goal.currentAmount >= goal.targetAmount) {
            goal.status = 'completed';
        }

        // Update timestamp
        goal.updatedAt = new Date();

        // Award XP for contribution (25 XP base)
        const contributionXP = 25;
        user.xp = (user.xp || 0) + contributionXP;

        // Calculate new level
        const newLevel = Math.floor(user.xp / 100) + 1;
        user.level = newLevel;

        // Save both user and goal
        await user.save();
        await goal.save();

        // Create notification for contribution
        try {
            const notification = new Notification({
                userId,
                type: 'gamification',
                title: 'Goal Contribution',
                message: `You contributed $${amount.toFixed(2)} to "${goal.title}" and earned ${contributionXP} XP!`,
                priority: 'medium',
                isRead: false,
                createdAt: new Date()
            });
            await notification.save();
        } catch (notifError) {
            console.error('Error creating notification:', notifError);
            // Continue even if notification fails
        }

        res.json({
            success: true,
            message: 'Contribution successful',
            goal: goal.toObject(),
            newBalance: user.totalBalance,
            contribution: {
                amount,
                date: new Date(),
                note: note || ''
            },
            xpReward: {
                amount: contributionXP,
                newXP: user.xp,
                newLevel: user.level
            }
        });
    } catch (error) {
        console.error('Error contributing to goal:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Accounts
app.get('/api/accounts', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    try {
        const accounts = await Account.find({ userId });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Account
app.post('/api/accounts', async (req, res) => {
    try {
        const newAccount = new Account(req.body);
        await newAccount.save();
        res.status(201).json(newAccount);
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

// Send test notification
app.post('/api/notifications/test', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const { createNotification } = await import('./services/notificationEngine');

        await createNotification(
            userId,
            'system',
            'Test Notification',
            'This is a test notification from SmartWallet. If you received this, your notifications are working correctly!',
            'low',
            '/settings'
        );

        res.json({ success: true, message: 'Test notification sent' });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Budget Recommendation Routes
import { generateBudgetRecommendations } from './services/budgetRecommendationEngine';

// Insights Routes
import {
    calculateAllInsights,
    calculateHealthScore,
    calculateSpendingTrends,
    calculateForecast,
    detectAnomalies
} from './services/insightsCalculator';

// Investment calculation service
import { calculateInvestmentMetrics, calculatePortfolioMetrics } from './services/investmentCalculator';

// Debt calculation service
import {
    calculateDebtMetrics,
    calculateAcceleratedPayoff,
    processDebtPayment,
    calculateDebtSummary
} from './services/debtCalculator';

// Generate budget recommendations
app.post('/api/budget-recommendations/generate', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        // Delete existing pending recommendations for this user
        await BudgetRecommendation.deleteMany({ userId, status: 'pending' });

        // Generate new recommendations
        const recommendations = await generateBudgetRecommendations(userId);

        // Save recommendations to database
        const savedRecommendations = await BudgetRecommendation.insertMany(recommendations);

        res.status(201).json(savedRecommendations);
    } catch (error) {
        console.error('Error generating budget recommendations:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Accept a budget recommendation
app.post('/api/budget-recommendations/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;

        const recommendation = await BudgetRecommendation.findById(id);
        if (!recommendation) {
            return res.status(404).json({ error: 'Recommendation not found' });
        }

        if (recommendation.status !== 'pending') {
            return res.status(400).json({ error: 'Recommendation has already been processed' });
        }

        // Update recommendation status
        recommendation.status = 'accepted';
        await recommendation.save();

        // Create or update budget
        const existingBudget = await Budget.findOne({
            userId: recommendation.userId,
            category: recommendation.category
        });

        if (existingBudget) {
            existingBudget.limit = recommendation.suggestedLimit;
            await existingBudget.save();
        } else {
            const newBudget = new Budget({
                userId: recommendation.userId,
                category: recommendation.category,
                limit: recommendation.suggestedLimit,
                spent: recommendation.currentSpending,
                icon: 'tag'
            });
            await newBudget.save();
        }

        res.json({
            recommendation,
            message: 'Budget recommendation accepted and budget updated'
        });
    } catch (error) {
        console.error('Error accepting budget recommendation:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dismiss a budget recommendation
app.delete('/api/budget-recommendations/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const recommendation = await BudgetRecommendation.findById(id);
        if (!recommendation) {
            return res.status(404).json({ error: 'Recommendation not found' });
        }

        // Update status to dismissed
        recommendation.status = 'dismissed';
        await recommendation.save();

        res.json({
            message: 'Budget recommendation dismissed',
            recommendation
        });
    } catch (error) {
        console.error('Error dismissing budget recommendation:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get budget recommendations for a user
app.get('/api/budget-recommendations', async (req, res) => {
    const { userId, status } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const query: any = { userId };
        if (status) {
            query.status = status;
        }

        const recommendations = await BudgetRecommendation.find(query).sort({ createdAt: -1 });
        res.json(recommendations);
    } catch (error) {
        console.error('Error fetching budget recommendations:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Insights Routes

// Get all insights for dashboard
app.get('/api/insights/dashboard', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const insights = await calculateAllInsights(userId as string);
        res.json(insights);
    } catch (error) {
        console.error('Error calculating insights:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get financial health score
app.get('/api/insights/health-score', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const healthData = await calculateHealthScore(userId as string);
        res.json(healthData);
    } catch (error) {
        console.error('Error calculating health score:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get spending trends
app.get('/api/insights/trends', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const trends = await calculateSpendingTrends(userId as string);
        res.json(trends);
    } catch (error) {
        console.error('Error calculating spending trends:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get income/expense forecast
app.get('/api/insights/forecast', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const forecast = await calculateForecast(userId as string);
        res.json(forecast);
    } catch (error) {
        console.error('Error calculating forecast:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get spending anomalies
app.get('/api/insights/anomalies', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const anomalies = await detectAnomalies(userId as string);
        res.json(anomalies);
    } catch (error) {
        console.error('Error detecting anomalies:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Metrics Routes
import { calculateFinancialMetrics } from './services/metricsService';

// In-memory cache for metrics
const metricsCache = new Map<string, { data: any; timestamp: number }>();
const METRICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get financial metrics for a user
app.get('/api/metrics/:userId', async (req, res) => {
    const { userId } = req.params;
    const { month } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        // Parse month parameter or use current month
        const targetMonth = month ? new Date(month as string) : new Date();

        // Create cache key
        const cacheKey = `${userId}:${targetMonth.getFullYear()}-${targetMonth.getMonth()}`;

        // Check cache
        const cached = metricsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < METRICS_CACHE_TTL) {
            return res.json({
                metrics: cached.data,
                calculatedAt: new Date(cached.timestamp).toISOString(),
                cached: true
            });
        }

        // Calculate metrics
        const metrics = await calculateFinancialMetrics(userId, targetMonth);

        // Store in cache
        metricsCache.set(cacheKey, {
            data: metrics,
            timestamp: Date.now()
        });

        res.json({
            metrics,
            calculatedAt: new Date().toISOString(),
            cached: false
        });
    } catch (error) {
        console.error('Error calculating financial metrics:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Investment Routes

// Get all investments for a user
app.get('/api/investments', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const investments = await Investment.find({ userId }).sort({ createdAt: -1 });

        // Calculate metrics for each investment
        const investmentsWithMetrics = investments.map(investment => {
            const metrics = calculateInvestmentMetrics(investment.toObject());
            return {
                ...investment.toObject(),
                calculatedMetrics: metrics
            };
        });

        res.json(investmentsWithMetrics);
    } catch (error) {
        console.error('Error fetching investments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create a new investment
app.post('/api/investments', async (req, res) => {
    try {
        const { userId, name, type, symbol, initialAmount, currentValue, ratePerAnnum, purchaseDate, notes } = req.body;

        // Validate required fields
        if (!userId || !name || !type || !initialAmount || !currentValue || ratePerAnnum === undefined || !purchaseDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newInvestment = new Investment({
            userId,
            name,
            type,
            symbol,
            initialAmount,
            currentValue,
            ratePerAnnum,
            purchaseDate: new Date(purchaseDate),
            notes,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newInvestment.save();

        // Calculate metrics for the new investment
        const metrics = calculateInvestmentMetrics(newInvestment.toObject());

        res.status(201).json({
            ...newInvestment.toObject(),
            calculatedMetrics: metrics
        });
    } catch (error) {
        console.error('Error creating investment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update an investment
app.put('/api/investments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, symbol, initialAmount, currentValue, ratePerAnnum, purchaseDate, notes } = req.body;

        const investment = await Investment.findById(id);
        if (!investment) {
            return res.status(404).json({ error: 'Investment not found' });
        }

        // Update fields
        if (name !== undefined) investment.name = name;
        if (type !== undefined) investment.type = type;
        if (symbol !== undefined) investment.symbol = symbol;
        if (initialAmount !== undefined) investment.initialAmount = initialAmount;
        if (currentValue !== undefined) investment.currentValue = currentValue;
        if (ratePerAnnum !== undefined) investment.ratePerAnnum = ratePerAnnum;
        if (purchaseDate !== undefined) investment.purchaseDate = new Date(purchaseDate);
        if (notes !== undefined) investment.notes = notes;

        investment.updatedAt = new Date();

        await investment.save();

        // Calculate metrics for the updated investment
        const metrics = calculateInvestmentMetrics(investment.toObject());

        res.json({
            ...investment.toObject(),
            calculatedMetrics: metrics
        });
    } catch (error) {
        console.error('Error updating investment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update current value of an investment
app.patch('/api/investments/:id/value', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentValue } = req.body;

        if (currentValue === undefined) {
            return res.status(400).json({ error: 'currentValue field required' });
        }

        const investment = await Investment.findById(id);
        if (!investment) {
            return res.status(404).json({ error: 'Investment not found' });
        }

        investment.currentValue = currentValue;
        investment.updatedAt = new Date();

        await investment.save();

        // Calculate metrics for the updated investment
        const metrics = calculateInvestmentMetrics(investment.toObject());

        res.json({
            ...investment.toObject(),
            calculatedMetrics: metrics
        });
    } catch (error) {
        console.error('Error updating investment value:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete an investment
app.delete('/api/investments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const investment = await Investment.findByIdAndDelete(id);
        if (!investment) {
            return res.status(404).json({ error: 'Investment not found' });
        }

        res.json({ message: 'Investment deleted successfully', id });
    } catch (error) {
        console.error('Error deleting investment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get portfolio metrics
app.get('/api/investments/portfolio/metrics', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const investments = await Investment.find({ userId });
        const portfolioMetrics = calculatePortfolioMetrics(investments.map(inv => inv.toObject()));

        res.json(portfolioMetrics);
    } catch (error) {
        console.error('Error calculating portfolio metrics:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Debt Routes

// Get all debts for a user
app.get('/api/debts', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const debts = await Debt.find({ userId }).sort({ createdAt: -1 });

        // Calculate metrics for each debt
        const debtsWithMetrics = debts.map(debt => {
            const metrics = calculateDebtMetrics(debt.toObject());
            return {
                ...debt.toObject(),
                calculatedMetrics: metrics
            };
        });

        res.json(debtsWithMetrics);
    } catch (error) {
        console.error('Error fetching debts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create a new debt
app.post('/api/debts', async (req, res) => {
    try {
        const { userId, name, type, originalAmount, currentBalance, interestRate, minimumPayment, dueDate } = req.body;

        // Validate required fields
        if (!userId || !name || !type || originalAmount === undefined || currentBalance === undefined ||
            interestRate === undefined || !minimumPayment || !dueDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newDebt = new Debt({
            userId,
            name,
            type,
            originalAmount,
            currentBalance,
            interestRate,
            minimumPayment,
            dueDate: new Date(dueDate),
            paymentHistory: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newDebt.save();

        // Calculate metrics for the new debt
        const metrics = calculateDebtMetrics(newDebt.toObject());

        res.status(201).json({
            ...newDebt.toObject(),
            calculatedMetrics: metrics
        });
    } catch (error) {
        console.error('Error creating debt:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update a debt
app.put('/api/debts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, originalAmount, currentBalance, interestRate, minimumPayment, dueDate } = req.body;

        const debt = await Debt.findById(id);
        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        // Update fields
        if (name !== undefined) debt.name = name;
        if (type !== undefined) debt.type = type;
        if (originalAmount !== undefined) debt.originalAmount = originalAmount;
        if (currentBalance !== undefined) debt.currentBalance = currentBalance;
        if (interestRate !== undefined) debt.interestRate = interestRate;
        if (minimumPayment !== undefined) debt.minimumPayment = minimumPayment;
        if (dueDate !== undefined) debt.dueDate = new Date(dueDate);

        debt.updatedAt = new Date();

        await debt.save();

        // Calculate metrics for the updated debt
        const metrics = calculateDebtMetrics(debt.toObject());

        res.json({
            ...debt.toObject(),
            calculatedMetrics: metrics
        });
    } catch (error) {
        console.error('Error updating debt:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Record a debt payment
app.post('/api/debts/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date } = req.body;

        if (amount === undefined || !date) {
            return res.status(400).json({ error: 'Payment amount and date required' });
        }

        const debt = await Debt.findById(id);
        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        // Process the payment
        const paymentDate = new Date(date);
        const paymentResult = processDebtPayment(debt.toObject(), amount, paymentDate);

        // Create payment record
        const payment = {
            amount,
            date: paymentDate,
            principalPaid: paymentResult.principalPaid,
            interestPaid: paymentResult.interestPaid
        };

        // Update debt
        debt.currentBalance = paymentResult.newBalance;
        debt.paymentHistory.push(payment as any);
        debt.updatedAt = new Date();

        await debt.save();

        // Calculate metrics for the updated debt
        const metrics = calculateDebtMetrics(debt.toObject());

        res.json({
            ...debt.toObject(),
            calculatedMetrics: metrics,
            payment
        });
    } catch (error) {
        console.error('Error recording debt payment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a debt
app.delete('/api/debts/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const debt = await Debt.findByIdAndDelete(id);
        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        res.json({ message: 'Debt deleted successfully', id });
    } catch (error) {
        console.error('Error deleting debt:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get debt summary for a user
app.get('/api/debts/summary', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const debts = await Debt.find({ userId });
        const summary = calculateDebtSummary(debts.map(d => d.toObject()));

        res.json(summary);
    } catch (error) {
        console.error('Error calculating debt summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Calculate accelerated payoff scenario
app.post('/api/debts/:id/accelerated-payoff', async (req, res) => {
    try {
        const { id } = req.params;
        const { extraPayment } = req.body;

        if (extraPayment === undefined) {
            return res.status(400).json({ error: 'Extra payment amount required' });
        }

        const debt = await Debt.findById(id);
        if (!debt) {
            return res.status(404).json({ error: 'Debt not found' });
        }

        const acceleratedMetrics = calculateAcceleratedPayoff(debt.toObject(), extraPayment);

        res.json(acceleratedMetrics);
    } catch (error) {
        console.error('Error calculating accelerated payoff:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Gamification Routes
import { Challenge } from './models/Challenge';
import { Badge, UserBadge } from './models/Badge';
import {
    claimChallengeReward,
    getLeaderboard,
    generateChallenges,
    calculateLevel,
    calculateLevelProgress,
    BADGE_DEFINITIONS,
    initializeBadges
} from './services/gamificationEngine';

// Get challenges for a user
app.get('/api/gamification/challenges', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const now = new Date();

        // Get active challenges
        let challenges = await Challenge.find({
            userId,
            resetTime: { $gt: now }
        }).sort({ type: 1, createdAt: 1 });

        // If no challenges exist, generate them
        if (challenges.length === 0) {
            await generateChallenges(userId as string);
            challenges = await Challenge.find({
                userId,
                resetTime: { $gt: now }
            }).sort({ type: 1, createdAt: 1 });
        }

        res.json(challenges);
    } catch (error) {
        console.error('Error fetching challenges:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Claim challenge reward
app.post('/api/gamification/challenges/:id/claim', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'UserId required' });
        }

        await claimChallengeReward(userId, id);

        res.json({
            message: 'Challenge reward claimed successfully'
        });
    } catch (error: any) {
        console.error('Error claiming challenge reward:', error);
        res.status(400).json({ error: error.message || 'Server error' });
    }
});

// Get user badges
app.get('/api/gamification/badges', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        // Get user's unlocked badges
        const userBadges = await UserBadge.find({ userId });
        const unlockedBadgeIds = userBadges.map(ub => ub.badgeId);

        // Return all badge definitions with unlock status
        const badges = BADGE_DEFINITIONS.map(badge => ({
            ...badge,
            isUnlocked: unlockedBadgeIds.includes(badge.id),
            unlockedAt: userBadges.find(ub => ub.badgeId === badge.id)?.unlockedAt
        }));

        res.json(badges);
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get leaderboard
app.get('/api/gamification/leaderboard', async (req, res) => {
    const { limit = '100' } = req.query;

    try {
        const leaderboard = await getLeaderboard(parseInt(limit as string));
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user gamification state
app.get('/api/gamification/state', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const xp = user.xp || 0;
        const level = user.level || 1;
        const levelProgress = calculateLevelProgress(xp);

        // Get user's badges
        const userBadges = await UserBadge.find({ userId });

        // Get user's rank
        const usersAbove = await User.countDocuments({ xp: { $gt: xp } });
        const rank = usersAbove + 1;

        res.json({
            xp,
            level,
            levelProgress,
            streak: user.streak || 0,
            badges: userBadges.map(ub => ub.badgeId),
            rank
        });
    } catch (error) {
        console.error('Error fetching gamification state:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// AI Assistant Routes
import { processAIQuery, getContextualData } from './services/aiQueryProcessor';

// Process natural language query
app.post('/api/ai-assistant/query', async (req, res) => {
    const { userId, query } = req.body;

    if (!userId || !query) {
        return res.status(400).json({ error: 'UserId and query required' });
    }

    try {
        const response = await processAIQuery(userId, query);
        res.json(response);
    } catch (error) {
        console.error('Error processing AI query:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get contextual data for query
app.get('/api/ai-assistant/context', async (req, res) => {
    const { userId, type } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const contextData = await getContextualData(userId as string, type as string);
        res.json(contextData);
    } catch (error) {
        console.error('Error fetching contextual data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Security Routes
import {
    generateTOTPSecret,
    generateQRCode,
    verifyTOTPCode,
    generateBackupCodes,
    hashBackupCode,
    verifyBackupCode,
    generateVerificationCode,
    sendEmailVerificationCode
} from './services/mfaService';
import { hashPassword, verifyPassword, validatePasswordStrength } from './services/encryptionService';
import {
    createSession,
    getUserSessions,
    logoutSession,
    logoutAllSessions,
    parseDeviceInfo
} from './services/sessionService';

// Initiate MFA setup
app.post('/api/security/mfa/setup', async (req, res) => {
    const { userId, method = 'app' } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (method === 'app') {
            // Generate TOTP secret
            const { secret, otpauthUrl } = generateTOTPSecret(user.email);

            // Generate QR code
            const qrCodeUrl = await generateQRCode(otpauthUrl);

            // Generate backup codes
            const backupCodes = generateBackupCodes();

            // Store hashed backup codes (don't save secret yet - wait for verification)
            const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

            res.json({
                secret,
                qrCodeUrl,
                backupCodes,
                method: 'app'
            });
        } else if (method === 'email') {
            // Generate and send email verification code
            const code = generateVerificationCode();

            // Store code temporarily (in production, use Redis or similar)
            // For now, we'll send it in response (not secure for production)
            await sendEmailVerificationCode(user.email, code);

            res.json({
                message: 'Verification code sent to email',
                method: 'email'
            });
        } else {
            res.status(400).json({ error: 'Invalid MFA method' });
        }
    } catch (error) {
        console.error('Error setting up MFA:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify MFA code and enable MFA
app.post('/api/security/mfa/verify', async (req, res) => {
    const { userId, code, secret, backupCodes } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'UserId and code required' });
    }

    try {
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let isValid = false;

        // Verify TOTP code for app-based MFA
        if (secret) {
            isValid = verifyTOTPCode(secret, code);

            if (isValid) {
                // Save MFA settings
                user.mfaEnabled = true;
                user.mfaSecret = secret;
                user.mfaMethod = 'app';

                if (backupCodes && Array.isArray(backupCodes)) {
                    user.backupCodes = backupCodes.map(c => hashBackupCode(c));
                }

                await user.save();
            }
        } else if (user.mfaSecret) {
            // Verify against existing secret
            isValid = verifyTOTPCode(user.mfaSecret, code);
        } else if (user.backupCodes && user.backupCodes.length > 0) {
            // Verify backup code
            isValid = verifyBackupCode(code, user.backupCodes);

            if (isValid) {
                // Remove used backup code
                const hashedCode = hashBackupCode(code);
                user.backupCodes = user.backupCodes.filter(c => c !== hashedCode);
                await user.save();
            }
        }

        if (isValid) {
            res.json({
                success: true,
                message: 'MFA verification successful'
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid verification code'
            });
        }
    } catch (error) {
        console.error('Error verifying MFA:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Disable MFA
app.post('/api/security/mfa/disable', async (req, res) => {
    const { userId, password } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify password if set
        if (user.passwordHash && password) {
            const isValidPassword = verifyPassword(password, user.passwordHash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid password' });
            }
        }

        // Disable MFA
        user.mfaEnabled = false;
        user.mfaSecret = undefined;
        user.backupCodes = [];

        await user.save();

        res.json({
            success: true,
            message: 'MFA disabled successfully'
        });
    } catch (error) {
        console.error('Error disabling MFA:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Change password
app.post('/api/security/password/change', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !newPassword) {
        return res.status(400).json({ error: 'UserId and newPassword required' });
    }

    try {
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password if one exists
        if (user.passwordHash && currentPassword) {
            const isValidPassword = verifyPassword(currentPassword, user.passwordHash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }

        // Validate new password strength
        const validation = validatePasswordStrength(newPassword);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet requirements',
                details: validation.errors
            });
        }

        // Hash and save new password
        user.passwordHash = hashPassword(newPassword);
        user.lastPasswordChange = new Date();

        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get active sessions
app.get('/api/security/sessions', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const sessions = await getUserSessions(userId as string);
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout specific session
app.delete('/api/security/sessions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const success = await logoutSession(id);

        if (success) {
            res.json({
                success: true,
                message: 'Session logged out successfully'
            });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        console.error('Error logging out session:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout all sessions
app.post('/api/security/sessions/logout-all', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'UserId required' });
    }

    try {
        const count = await logoutAllSessions(userId);

        res.json({
            success: true,
            message: `Logged out ${count} session(s)`,
            count
        });
    } catch (error) {
        console.error('Error logging out all sessions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export Routes
import {
    generateTransactionsCSV,
    generateInvestmentsCSV,
    generateDebtsCSV,
    generateBudgetsCSV
} from './services/csvExportService';
import {
    generateBudgetReportHTML,
    generateFinancialSummaryHTML
} from './services/pdfExportService';

// Generate transaction export
app.post('/api/export/transactions', async (req, res) => {
    const { userId, format, dateRange, filters } = req.body;

    if (!userId || !format) {
        return res.status(400).json({ error: 'UserId and format required' });
    }

    try {
        // Get transactions
        let query: any = { userId };

        // Apply date range filter
        if (dateRange?.start && dateRange?.end) {
            query.date = {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            };
        }

        // Apply category filter
        if (filters?.categories && filters.categories.length > 0) {
            query.category = { $in: filters.categories };
        }

        const transactions = await Transaction.find(query).sort({ date: -1 });

        if (format === 'csv') {
            const csv = generateTransactionsCSV(transactions.map(t => t.toObject()));
            const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        } else {
            res.status(400).json({ error: 'Only CSV format is supported for transactions' });
        }
    } catch (error) {
        console.error('Error exporting transactions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate budget report export
app.post('/api/export/budgets', async (req, res) => {
    const { userId, format, dateRange } = req.body;

    if (!userId || !format) {
        return res.status(400).json({ error: 'UserId and format required' });
    }

    try {
        // Get budgets
        const budgets = await Budget.find({ userId });

        // Get transactions for the date range
        let transactionQuery: any = { userId };
        if (dateRange?.start && dateRange?.end) {
            transactionQuery.date = {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            };
        }
        const transactions = await Transaction.find(transactionQuery);

        // Get user info
        const user = await User.findOne({ clerkId: userId });
        const userName = user?.fullName || 'User';

        if (format === 'csv') {
            const csv = generateBudgetsCSV(
                budgets.map(b => b.toObject()),
                transactions.map(t => t.toObject())
            );
            const filename = `budgets_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        } else if (format === 'pdf') {
            const html = generateBudgetReportHTML(
                budgets.map(b => b.toObject()),
                transactions.map(t => t.toObject()),
                dateRange || {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                },
                userName
            );
            const filename = `budget_report_${new Date().toISOString().split('T')[0]}.html`;

            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(html);
        } else {
            res.status(400).json({ error: 'Unsupported format' });
        }
    } catch (error) {
        console.error('Error exporting budgets:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate investment export
app.post('/api/export/investments', async (req, res) => {
    const { userId, format } = req.body;

    if (!userId || !format) {
        return res.status(400).json({ error: 'UserId and format required' });
    }

    try {
        const investments = await Investment.find({ userId }).sort({ createdAt: -1 });

        // Calculate metrics for each investment
        const investmentsWithMetrics = investments.map(investment => {
            const metrics = calculateInvestmentMetrics(investment.toObject());
            return {
                ...investment.toObject(),
                calculatedMetrics: metrics
            };
        });

        if (format === 'csv') {
            const csv = generateInvestmentsCSV(investmentsWithMetrics);
            const filename = `investments_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        } else {
            res.status(400).json({ error: 'Only CSV format is supported for investments' });
        }
    } catch (error) {
        console.error('Error exporting investments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate financial summary export
app.post('/api/export/summary', async (req, res) => {
    const { userId, format, dateRange } = req.body;

    if (!userId || !format) {
        return res.status(400).json({ error: 'UserId and format required' });
    }

    try {
        // Get all financial data
        let transactionQuery: any = { userId };
        if (dateRange?.start && dateRange?.end) {
            transactionQuery.date = {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            };
        }

        const transactions = await Transaction.find(transactionQuery);
        const budgets = await Budget.find({ userId });
        const investments = await Investment.find({ userId });
        const debts = await Debt.find({ userId });

        // Calculate metrics for investments
        const investmentsWithMetrics = investments.map(investment => {
            const metrics = calculateInvestmentMetrics(investment.toObject());
            return {
                ...investment.toObject(),
                calculatedMetrics: metrics
            };
        });

        // Calculate metrics for debts
        const debtsWithMetrics = debts.map(debt => {
            const metrics = calculateDebtMetrics(debt.toObject());
            return {
                ...debt.toObject(),
                calculatedMetrics: metrics
            };
        });

        // Get user info
        const user = await User.findOne({ clerkId: userId });
        const userName = user?.fullName || 'User';

        if (format === 'pdf') {
            const html = generateFinancialSummaryHTML(
                transactions.map(t => t.toObject()),
                budgets.map(b => b.toObject()),
                investmentsWithMetrics,
                debtsWithMetrics,
                dateRange || {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                },
                userName
            );
            const filename = `financial_summary_${new Date().toISOString().split('T')[0]}.html`;

            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(html);
        } else {
            res.status(400).json({ error: 'Only PDF format is supported for financial summary' });
        }
    } catch (error) {
        console.error('Error exporting financial summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Error handling
import { errorHandler, notFound } from './middleware/errorHandler';
app.use(notFound);
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Initialize badge definitions
    initializeBadges();

    // Start the recurring transaction scheduler
    startRecurringTransactionScheduler();

    // Start the notification engine
    startNotificationEngine();
});
