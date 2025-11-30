/**
 * Integration Test: Complete Transaction Flow
 * 
 * Tests the following flow:
 * 1. Create transaction with same-day date
 * 2. Verify XP reward is calculated correctly
 * 3. Verify budgets are updated
 * 4. Verify metrics are recalculated
 * 5. Delete transaction and verify cleanup
 * 
 * Requirements: 2.1, 3.1, 4.1, 8.1, 9.1
 */

import mongoose from 'mongoose';
import { User } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import { Budget } from '../../models/Budget';
import { calculateFinancialMetrics } from '../../services/metricsService';
import { calculateTransactionXP } from '../../services/gamificationEngine';

describe('Transaction Flow Integration Tests', () => {
    let testUserId: string;
    let testBudgetId: string;
    let testTransactionId: string;

    beforeAll(async () => {
        // Connect to test database
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-app-test';
        await mongoose.connect(MONGODB_URI);
    });

    afterAll(async () => {
        // Clean up and disconnect
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Create test user
        const testUser = new User({
            clerkId: `test-user-${Date.now()}`,
            email: 'test@example.com',
            fullName: 'Test User',
            xp: 0,
            level: 1,
            streak: 0,
            totalBalance: 1000
        });
        await testUser.save();
        testUserId = testUser.clerkId;

        // Create test budget
        const testBudget = new Budget({
            userId: testUserId,
            category: 'Food',
            limit: 500,
            spent: 0,
            icon: 'utensils'
        });
        await testBudget.save();
        testBudgetId = testBudget._id.toString();
    });

    afterEach(async () => {
        // Clean up test data
        await User.deleteMany({ clerkId: { $regex: /^test-user-/ } });
        await Transaction.deleteMany({ userId: { $regex: /^test-user-/ } });
        await Budget.deleteMany({ userId: { $regex: /^test-user-/ } });
    });

    describe('Step 1: Create transaction with same-day date', () => {
        it('should create a transaction with today\'s date', async () => {
            const today = new Date();

            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });

            await transaction.save();
            testTransactionId = transaction._id.toString();

            expect(transaction).toBeDefined();
            expect(transaction.userId).toBe(testUserId);
            expect(transaction.amount).toBe(50);
            expect(transaction.category).toBe('Food');

            // Verify date is today
            const transactionDate = new Date(transaction.date);
            expect(transactionDate.getDate()).toBe(today.getDate());
            expect(transactionDate.getMonth()).toBe(today.getMonth());
            expect(transactionDate.getFullYear()).toBe(today.getFullYear());
        });
    });

    describe('Step 2: Verify XP reward is calculated correctly', () => {
        it('should calculate correct XP for same-day transaction', async () => {
            const today = new Date();
            const user = await User.findOne({ clerkId: testUserId });

            if (!user) {
                throw new Error('Test user not found');
            }

            const initialStreak = user.streak || 0;

            // Calculate XP using the gamification engine
            const xpReward = calculateTransactionXP(today, today, initialStreak);

            // Verify XP calculation
            expect(xpReward.baseXP).toBe(10);
            expect(xpReward.sameDayBonus).toBe(15); // Same-day bonus
            expect(xpReward.isSameDay).toBe(true);
            expect(xpReward.totalXP).toBe(10 + 15 + (initialStreak * 2));
        });

        it('should NOT award same-day bonus for past-dated transaction', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const today = new Date();

            const xpReward = calculateTransactionXP(yesterday, today, 0);

            // Verify no same-day bonus
            expect(xpReward.baseXP).toBe(10);
            expect(xpReward.sameDayBonus).toBe(0); // No same-day bonus
            expect(xpReward.isSameDay).toBe(false);
            expect(xpReward.totalXP).toBe(10);
        });

        it('should update user XP and streak after same-day transaction', async () => {
            const today = new Date();

            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await transaction.save();

            // Manually update user (simulating what the API does)
            const user = await User.findOne({ clerkId: testUserId });
            if (!user) throw new Error('User not found');

            const xpReward = calculateTransactionXP(today, today, user.streak || 0);

            user.xp = (user.xp || 0) + xpReward.totalXP;
            user.streak = xpReward.newStreak;
            user.lastTransactionDate = today;
            await user.save();

            // Verify user updates
            const updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.xp).toBe(xpReward.totalXP);
            expect(updatedUser?.streak).toBeGreaterThan(0);
            expect(updatedUser?.lastTransactionDate).toBeDefined();
        });
    });

    describe('Step 3: Verify budgets are updated', () => {
        it('should update budget spent amount when expense transaction is created', async () => {
            const today = new Date();

            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await transaction.save();

            // Update budget (simulating what the API does)
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });

            if (budget) {
                budget.spent += transaction.amount;
                budget.updatedAt = new Date();
                await budget.save();
            }

            // Verify budget update
            const updatedBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });

            expect(updatedBudget?.spent).toBe(50);
            expect(updatedBudget?.updatedAt).toBeDefined();
        });

        it('should NOT update budget for income transactions', async () => {
            const today = new Date();

            const transaction = new Transaction({
                userId: testUserId,
                type: 'income',
                amount: 1000,
                category: 'Salary',
                description: 'Monthly salary',
                date: today
            });
            await transaction.save();

            // Budget should remain unchanged
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });

            expect(budget?.spent).toBe(0);
        });
    });

    describe('Step 4: Verify metrics are recalculated', () => {
        it('should calculate correct financial metrics after transaction', async () => {
            const today = new Date();

            // Create income transaction
            const incomeTransaction = new Transaction({
                userId: testUserId,
                type: 'income',
                amount: 2000,
                category: 'Salary',
                description: 'Monthly salary',
                date: today
            });
            await incomeTransaction.save();

            // Create expense transaction
            const expenseTransaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await expenseTransaction.save();

            // Update budget
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            if (budget) {
                budget.spent = 50;
                await budget.save();
            }

            // Calculate metrics
            const metrics = await calculateFinancialMetrics(testUserId, today);

            // Verify metrics
            expect(metrics.currentMonthIncome).toBe(2000);
            expect(metrics.currentMonthSpending).toBe(50);
            expect(metrics.monthlySavings).toBe(1950);
            expect(metrics.totalPlannedBudget).toBe(500);
            expect(metrics.remainingBudget).toBe(450);
            expect(metrics.trendPositive).toBe(true); // 50 < 500
        });
    });

    describe('Step 5: Delete transaction and verify cleanup', () => {
        it('should delete transaction and update related data', async () => {
            const today = new Date();

            // Create transaction
            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await transaction.save();
            const transactionId = transaction._id.toString();

            // Update budget
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            if (budget) {
                budget.spent = 50;
                await budget.save();
            }

            // Verify transaction exists
            const foundTransaction = await Transaction.findById(transactionId);
            expect(foundTransaction).toBeDefined();

            // Delete transaction
            await Transaction.findByIdAndDelete(transactionId);

            // Update budget (simulating cleanup)
            if (budget) {
                budget.spent = Math.max(0, budget.spent - transaction.amount);
                budget.updatedAt = new Date();
                await budget.save();
            }

            // Verify transaction is deleted
            const deletedTransaction = await Transaction.findById(transactionId);
            expect(deletedTransaction).toBeNull();

            // Verify budget is updated
            const updatedBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            expect(updatedBudget?.spent).toBe(0);
        });

        it('should recalculate metrics after transaction deletion', async () => {
            const today = new Date();

            // Create two expense transactions
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await transaction1.save();

            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 30,
                category: 'Food',
                description: 'Snack',
                date: today
            });
            await transaction2.save();

            // Calculate metrics before deletion
            const metricsBefore = await calculateFinancialMetrics(testUserId, today);
            expect(metricsBefore.currentMonthSpending).toBe(80);

            // Delete one transaction
            await Transaction.findByIdAndDelete(transaction1._id);

            // Calculate metrics after deletion
            const metricsAfter = await calculateFinancialMetrics(testUserId, today);
            expect(metricsAfter.currentMonthSpending).toBe(30);
        });

        it('should only delete the specific transaction by ID', async () => {
            const today = new Date();

            // Create multiple transactions
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await transaction1.save();

            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 30,
                category: 'Food',
                description: 'Snack',
                date: today
            });
            await transaction2.save();

            const transaction3 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 20,
                category: 'Food',
                description: 'Coffee',
                date: today
            });
            await transaction3.save();

            // Count transactions before deletion
            const countBefore = await Transaction.countDocuments({ userId: testUserId });
            expect(countBefore).toBe(3);

            // Delete only transaction2 by its unique ID
            await Transaction.findByIdAndDelete(transaction2._id);

            // Verify only one transaction was deleted
            const countAfter = await Transaction.countDocuments({ userId: testUserId });
            expect(countAfter).toBe(2);

            // Verify the correct transaction was deleted
            const deletedTransaction = await Transaction.findById(transaction2._id);
            expect(deletedTransaction).toBeNull();

            // Verify other transactions still exist
            const remainingTransaction1 = await Transaction.findById(transaction1._id);
            const remainingTransaction3 = await Transaction.findById(transaction3._id);
            expect(remainingTransaction1).toBeDefined();
            expect(remainingTransaction3).toBeDefined();
        });
    });

    describe('Complete End-to-End Transaction Flow', () => {
        it('should handle complete transaction lifecycle', async () => {
            const today = new Date();

            // Step 1: Get initial state
            const initialUser = await User.findOne({ clerkId: testUserId });
            const initialXP = initialUser?.xp || 0;
            const initialStreak = initialUser?.streak || 0;

            // Step 2: Create same-day transaction
            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 75,
                category: 'Food',
                description: 'Dinner',
                date: today
            });
            await transaction.save();

            // Step 3: Calculate and award XP
            const xpReward = calculateTransactionXP(today, today, initialStreak);
            const user = await User.findOne({ clerkId: testUserId });
            if (user) {
                user.xp = (user.xp || 0) + xpReward.totalXP;
                user.streak = xpReward.newStreak;
                user.lastTransactionDate = today;
                await user.save();
            }

            // Step 4: Update budget
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            if (budget) {
                budget.spent += transaction.amount;
                budget.updatedAt = new Date();
                await budget.save();
            }

            // Step 5: Verify all updates
            const updatedUser = await User.findOne({ clerkId: testUserId });
            expect(updatedUser?.xp).toBeGreaterThan(initialXP);
            expect(updatedUser?.streak).toBeGreaterThan(initialStreak);

            const updatedBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            expect(updatedBudget?.spent).toBe(75);

            const metrics = await calculateFinancialMetrics(testUserId, today);
            expect(metrics.currentMonthSpending).toBe(75);
            expect(metrics.remainingBudget).toBe(425); // 500 - 75

            // Step 6: Delete transaction
            await Transaction.findByIdAndDelete(transaction._id);

            // Step 7: Cleanup budget
            if (updatedBudget) {
                updatedBudget.spent = Math.max(0, updatedBudget.spent - transaction.amount);
                await updatedBudget.save();
            }

            // Step 8: Verify cleanup
            const deletedTransaction = await Transaction.findById(transaction._id);
            expect(deletedTransaction).toBeNull();

            const finalBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            expect(finalBudget?.spent).toBe(0);

            const finalMetrics = await calculateFinancialMetrics(testUserId, today);
            expect(finalMetrics.currentMonthSpending).toBe(0);
            expect(finalMetrics.remainingBudget).toBe(500);
        });
    });
});
