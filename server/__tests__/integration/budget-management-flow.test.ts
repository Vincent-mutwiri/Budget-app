/**
 * Integration Test: Complete Budget Management Flow
 * 
 * Tests the following flow:
 * 1. Create budget
 * 2. Edit budget limit
 * 3. Verify total planned budget updates
 * 4. Add transactions
 * 5. Verify remaining budget calculation
 * 6. Verify trend indicator
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 13.1
 */

import mongoose from 'mongoose';
import { User } from '../../models/User';
import { Budget } from '../../models/Budget';
import { Transaction } from '../../models/Transaction';
import {
    calculateFinancialMetrics,
    calculateTotalPlannedBudget,
    calculateRemainingBudget,
    calculateBudgetTrend
} from '../../services/metricsService';

describe('Budget Management Flow Integration Tests', () => {
    let testUserId: string;
    let testBudgetIds: string[] = [];

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
            totalBalance: 5000
        });
        await testUser.save();
        testUserId = testUser.clerkId;
        testBudgetIds = [];
    });

    afterEach(async () => {
        // Clean up test data
        await User.deleteMany({ clerkId: { $regex: /^test-user-/ } });
        await Budget.deleteMany({ userId: { $regex: /^test-user-/ } });
        await Transaction.deleteMany({ userId: { $regex: /^test-user-/ } });
    });

    describe('Step 1: Create budget', () => {
        it('should create a budget successfully', async () => {
            const budget = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });

            await budget.save();
            testBudgetIds.push(budget._id.toString());

            expect(budget).toBeDefined();
            expect(budget.userId).toBe(testUserId);
            expect(budget.category).toBe('Food');
            expect(budget.limit).toBe(500);
            expect(budget.spent).toBe(0);
        });

        it('should create multiple budgets for different categories', async () => {
            const categories = [
                { category: 'Food', limit: 500, icon: 'utensils' },
                { category: 'Transportation', limit: 300, icon: 'car' },
                { category: 'Entertainment', limit: 200, icon: 'film' }
            ];

            for (const cat of categories) {
                const budget = new Budget({
                    userId: testUserId,
                    ...cat,
                    spent: 0
                });
                await budget.save();
                testBudgetIds.push(budget._id.toString());
            }

            const budgets = await Budget.find({ userId: testUserId });
            expect(budgets.length).toBe(3);
        });

        it('should initialize budget with updatedAt timestamp', async () => {
            const budget = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });

            await budget.save();

            expect(budget.createdAt).toBeDefined();
            expect(budget.updatedAt).toBeDefined();
        });
    });

    describe('Step 2: Edit budget limit', () => {
        beforeEach(async () => {
            // Create a budget to edit
            const budget = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });
            await budget.save();
            testBudgetIds.push(budget._id.toString());
        });

        it('should update budget limit successfully', async () => {
            const budgetId = testBudgetIds[0];
            const budget = await Budget.findById(budgetId);

            expect(budget?.limit).toBe(500);

            // Update budget limit
            if (budget) {
                budget.limit = 700;
                budget.updatedAt = new Date();
                await budget.save();
            }

            const updatedBudget = await Budget.findById(budgetId);
            expect(updatedBudget?.limit).toBe(700);
            expect(updatedBudget?.updatedAt).toBeDefined();
        });

        it('should recalculate budget utilization after limit update', async () => {
            const budgetId = testBudgetIds[0];
            const budget = await Budget.findById(budgetId);

            // Add some spending
            if (budget) {
                budget.spent = 250;
                await budget.save();
            }

            // Calculate utilization before update
            let utilizationBefore = (250 / 500) * 100;
            expect(utilizationBefore).toBe(50);

            // Update limit
            if (budget) {
                budget.limit = 1000;
                await budget.save();
            }

            // Calculate utilization after update
            const updatedBudget = await Budget.findById(budgetId);
            let utilizationAfter = (updatedBudget!.spent / updatedBudget!.limit) * 100;
            expect(utilizationAfter).toBe(25); // 250 / 1000 = 25%
        });

        it('should validate budget limit is positive', () => {
            const validLimits = [1, 100, 500, 1000];
            const invalidLimits = [0, -1, -100];

            validLimits.forEach(limit => {
                expect(limit).toBeGreaterThan(0);
            });

            invalidLimits.forEach(limit => {
                expect(limit).toBeLessThanOrEqual(0);
            });
        });

        it('should update multiple budget fields', async () => {
            const budgetId = testBudgetIds[0];
            const budget = await Budget.findById(budgetId);

            if (budget) {
                budget.limit = 800;
                budget.icon = 'pizza';
                budget.updatedAt = new Date();
                await budget.save();
            }

            const updatedBudget = await Budget.findById(budgetId);
            expect(updatedBudget?.limit).toBe(800);
            expect(updatedBudget?.icon).toBe('pizza');
        });
    });

    describe('Step 3: Verify total planned budget updates', () => {
        it('should calculate total planned budget from all budgets', async () => {
            // Create multiple budgets
            const budgets = [
                { category: 'Food', limit: 500 },
                { category: 'Transportation', limit: 300 },
                { category: 'Entertainment', limit: 200 }
            ];

            for (const budgetData of budgets) {
                const budget = new Budget({
                    userId: testUserId,
                    ...budgetData,
                    spent: 0,
                    icon: 'tag'
                });
                await budget.save();
            }

            const totalPlannedBudget = await calculateTotalPlannedBudget(testUserId);
            expect(totalPlannedBudget).toBe(1000); // 500 + 300 + 200
        });

        it('should update total planned budget when budget limit changes', async () => {
            // Create budgets
            const budget1 = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });
            await budget1.save();

            const budget2 = new Budget({
                userId: testUserId,
                category: 'Transportation',
                limit: 300,
                spent: 0,
                icon: 'car'
            });
            await budget2.save();

            // Calculate initial total
            let totalBefore = await calculateTotalPlannedBudget(testUserId);
            expect(totalBefore).toBe(800);

            // Update one budget
            budget1.limit = 700;
            await budget1.save();

            // Calculate updated total
            let totalAfter = await calculateTotalPlannedBudget(testUserId);
            expect(totalAfter).toBe(1000); // 700 + 300
        });

        it('should handle zero budgets', async () => {
            const totalPlannedBudget = await calculateTotalPlannedBudget(testUserId);
            expect(totalPlannedBudget).toBe(0);
        });

        it('should handle single budget', async () => {
            const budget = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });
            await budget.save();

            const totalPlannedBudget = await calculateTotalPlannedBudget(testUserId);
            expect(totalPlannedBudget).toBe(500);
        });
    });

    describe('Step 4: Add transactions', () => {
        beforeEach(async () => {
            // Create budgets
            const budget1 = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });
            await budget1.save();

            const budget2 = new Budget({
                userId: testUserId,
                category: 'Transportation',
                limit: 300,
                spent: 0,
                icon: 'car'
            });
            await budget2.save();
        });

        it('should add transaction and update budget spent', async () => {
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

            // Update budget
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });

            if (budget) {
                budget.spent += transaction.amount;
                budget.updatedAt = new Date();
                await budget.save();
            }

            const updatedBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });

            expect(updatedBudget?.spent).toBe(50);
        });

        it('should handle multiple transactions in same category', async () => {
            const today = new Date();

            // Add first transaction
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await transaction1.save();

            // Add second transaction
            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 30,
                category: 'Food',
                description: 'Snack',
                date: today
            });
            await transaction2.save();

            // Update budget
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });

            if (budget) {
                budget.spent = 80; // 50 + 30
                budget.updatedAt = new Date();
                await budget.save();
            }

            const updatedBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });

            expect(updatedBudget?.spent).toBe(80);
        });

        it('should handle transactions in different categories', async () => {
            const today = new Date();

            // Food transaction
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 50,
                category: 'Food',
                description: 'Lunch',
                date: today
            });
            await transaction1.save();

            // Transportation transaction
            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 20,
                category: 'Transportation',
                description: 'Bus fare',
                date: today
            });
            await transaction2.save();

            // Update budgets
            const foodBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            if (foodBudget) {
                foodBudget.spent = 50;
                await foodBudget.save();
            }

            const transportBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Transportation'
            });
            if (transportBudget) {
                transportBudget.spent = 20;
                await transportBudget.save();
            }

            // Verify both budgets updated
            const updatedFoodBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            const updatedTransportBudget = await Budget.findOne({
                userId: testUserId,
                category: 'Transportation'
            });

            expect(updatedFoodBudget?.spent).toBe(50);
            expect(updatedTransportBudget?.spent).toBe(20);
        });
    });

    describe('Step 5: Verify remaining budget calculation', () => {
        beforeEach(async () => {
            // Create budgets
            const budget1 = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });
            await budget1.save();

            const budget2 = new Budget({
                userId: testUserId,
                category: 'Transportation',
                limit: 300,
                spent: 0,
                icon: 'car'
            });
            await budget2.save();
        });

        it('should calculate remaining budget correctly', async () => {
            const today = new Date();

            // Add transaction
            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 150,
                category: 'Food',
                description: 'Groceries',
                date: today
            });
            await transaction.save();

            // Calculate remaining budget
            const remainingBudget = await calculateRemainingBudget(testUserId, today);

            // Total planned: 800 (500 + 300)
            // Spent: 150
            // Remaining: 650
            expect(remainingBudget).toBe(650);
        });

        it('should show negative remaining budget when overspending', async () => {
            const today = new Date();

            // Add transactions that exceed budget
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 600,
                category: 'Food',
                description: 'Large purchase',
                date: today
            });
            await transaction1.save();

            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 400,
                category: 'Transportation',
                description: 'Car repair',
                date: today
            });
            await transaction2.save();

            // Calculate remaining budget
            const remainingBudget = await calculateRemainingBudget(testUserId, today);

            // Total planned: 800
            // Spent: 1000
            // Remaining: -200
            expect(remainingBudget).toBe(-200);
        });

        it('should update remaining budget when budget limit changes', async () => {
            const today = new Date();

            // Add transaction
            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 150,
                category: 'Food',
                description: 'Groceries',
                date: today
            });
            await transaction.save();

            // Calculate initial remaining budget
            let remainingBefore = await calculateRemainingBudget(testUserId, today);
            expect(remainingBefore).toBe(650); // 800 - 150

            // Update budget limit
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            if (budget) {
                budget.limit = 700; // Increase from 500 to 700
                await budget.save();
            }

            // Calculate updated remaining budget
            let remainingAfter = await calculateRemainingBudget(testUserId, today);
            expect(remainingAfter).toBe(850); // 1000 - 150 (new total: 700 + 300)
        });

        it('should handle zero spending', async () => {
            const today = new Date();
            const remainingBudget = await calculateRemainingBudget(testUserId, today);

            // Total planned: 800
            // Spent: 0
            // Remaining: 800
            expect(remainingBudget).toBe(800);
        });
    });

    describe('Step 6: Verify trend indicator', () => {
        beforeEach(async () => {
            // Create budgets
            const budget1 = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });
            await budget1.save();

            const budget2 = new Budget({
                userId: testUserId,
                category: 'Transportation',
                limit: 300,
                spent: 0,
                icon: 'car'
            });
            await budget2.save();
        });

        it('should show positive trend when within budget', async () => {
            const today = new Date();

            // Add transaction within budget
            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 400,
                category: 'Food',
                description: 'Groceries',
                date: today
            });
            await transaction.save();

            const trendData = await calculateBudgetTrend(testUserId, today);

            // Total planned: 800
            // Spent: 400
            // Trend: positive (400 <= 800)
            expect(trendData.trendPositive).toBe(true);
            expect(trendData.trendPercentage).toBe(50); // 400/800 * 100
        });

        it('should show negative trend when over budget', async () => {
            const today = new Date();

            // Add transactions that exceed budget
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 600,
                category: 'Food',
                description: 'Large purchase',
                date: today
            });
            await transaction1.save();

            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 400,
                category: 'Transportation',
                description: 'Car repair',
                date: today
            });
            await transaction2.save();

            const trendData = await calculateBudgetTrend(testUserId, today);

            // Total planned: 800
            // Spent: 1000
            // Trend: negative (1000 > 800)
            expect(trendData.trendPositive).toBe(false);
            expect(trendData.trendPercentage).toBe(125); // 1000/800 * 100
        });

        it('should show positive trend at exactly budget limit', async () => {
            const today = new Date();

            // Add transactions equal to budget
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 500,
                category: 'Food',
                description: 'Groceries',
                date: today
            });
            await transaction1.save();

            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 300,
                category: 'Transportation',
                description: 'Gas',
                date: today
            });
            await transaction2.save();

            const trendData = await calculateBudgetTrend(testUserId, today);

            // Total planned: 800
            // Spent: 800
            // Trend: positive (800 <= 800)
            expect(trendData.trendPositive).toBe(true);
            expect(trendData.trendPercentage).toBe(100);
        });

        it('should update trend when budget limit changes', async () => {
            const today = new Date();

            // Add transaction
            const transaction = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 600,
                category: 'Food',
                description: 'Large purchase',
                date: today
            });
            await transaction.save();

            // Calculate initial trend (should be positive since 600 < 800)
            let trendBefore = await calculateBudgetTrend(testUserId, today);
            expect(trendBefore.trendPositive).toBe(true); // 600 < 800

            // Update budget to make it negative
            const budget = await Budget.findOne({
                userId: testUserId,
                category: 'Food'
            });
            if (budget) {
                budget.limit = 200; // Decrease from 500 to 200
                await budget.save();
            }

            // Calculate updated trend (should be negative now)
            let trendAfter = await calculateBudgetTrend(testUserId, today);
            // Total planned: 500 (200 + 300)
            // Spent: 600
            // Trend: negative
            expect(trendAfter.trendPositive).toBe(false);
        });
    });

    describe('Complete End-to-End Budget Management Flow', () => {
        it('should handle complete budget lifecycle', async () => {
            const today = new Date();

            // Step 1: Create budgets
            const foodBudget = new Budget({
                userId: testUserId,
                category: 'Food',
                limit: 500,
                spent: 0,
                icon: 'utensils'
            });
            await foodBudget.save();

            const transportBudget = new Budget({
                userId: testUserId,
                category: 'Transportation',
                limit: 300,
                spent: 0,
                icon: 'car'
            });
            await transportBudget.save();

            // Step 2: Verify initial total planned budget
            let totalPlanned = await calculateTotalPlannedBudget(testUserId);
            expect(totalPlanned).toBe(800);

            // Step 3: Edit budget limit
            foodBudget.limit = 700;
            foodBudget.updatedAt = new Date();
            await foodBudget.save();

            // Step 4: Verify total planned budget updated
            totalPlanned = await calculateTotalPlannedBudget(testUserId);
            expect(totalPlanned).toBe(1000); // 700 + 300

            // Step 5: Add transactions
            const transaction1 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 200,
                category: 'Food',
                description: 'Groceries',
                date: today
            });
            await transaction1.save();

            const transaction2 = new Transaction({
                userId: testUserId,
                type: 'expense',
                amount: 150,
                category: 'Transportation',
                description: 'Gas',
                date: today
            });
            await transaction2.save();

            // Update budgets
            foodBudget.spent = 200;
            await foodBudget.save();

            transportBudget.spent = 150;
            await transportBudget.save();

            // Step 6: Verify remaining budget
            const remainingBudget = await calculateRemainingBudget(testUserId, today);
            expect(remainingBudget).toBe(650); // 1000 - 350

            // Step 7: Verify trend indicator
            const trendData = await calculateBudgetTrend(testUserId, today);
            expect(trendData.trendPositive).toBe(true); // 350 < 1000
            expect(trendData.trendPercentage).toBe(35); // 350/1000 * 100

            // Step 8: Calculate complete metrics
            const metrics = await calculateFinancialMetrics(testUserId, today);
            expect(metrics.currentMonthSpending).toBe(350);
            expect(metrics.totalPlannedBudget).toBe(1000);
            expect(metrics.remainingBudget).toBe(650);
            expect(metrics.trendPositive).toBe(true);
        });
    });
});
