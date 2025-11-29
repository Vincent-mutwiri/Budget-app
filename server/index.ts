import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
