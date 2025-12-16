import mongoose from 'mongoose';
import { Budget } from '../models/Budget';
import { copyBudgetsToNewMonth, getCurrentMonthBudgets } from '../services/budgetPersistenceService';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testBudgetPersistence() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to MongoDB');

        const userId = 'test_user_persistence_' + Date.now();
        const currentMonth = 12;
        const currentYear = 2024;

        // 1. Create a budget for the "previous" month
        const prevBudget = new Budget({
            userId,
            category: 'Test Category',
            limit: 1000,
            spent: 500,
            month: currentMonth - 1,
            year: currentYear
        });
        await prevBudget.save();
        console.log('Created previous month budget:', prevBudget._id);

        // 2. Verify no budget exists for current month yet
        let currentBudgets = await Budget.find({ userId, month: currentMonth, year: currentYear });
        console.log('Current budgets before copy:', currentBudgets.length);

        // 3. Trigger copy (simulating new month access)
        // We can use copyBudgetsToNewMonth directly or getCurrentMonthBudgets
        // Let's use getCurrentMonthBudgets as it's what the frontend calls
        // But wait, getCurrentMonthBudgets uses "now" date.
        // So for this test with specific dates, we should use copyBudgetsToNewMonth

        await copyBudgetsToNewMonth(userId, currentMonth, currentYear);

        // 4. Verify budget was copied
        currentBudgets = await Budget.find({ userId, month: currentMonth, year: currentYear });
        console.log('Current budgets after copy:', currentBudgets.length);

        if (currentBudgets.length === 1) {
            const copied = currentBudgets[0];
            console.log('Copied budget:', copied._id);
            console.log('Category:', copied.category);
            console.log('Limit:', copied.limit);
            console.log('Spent (should be 0):', copied.spent);
            console.log('Month:', copied.month);

            if (copied.spent === 0 && copied.category === 'Test Category') {
                console.log('✅ Budget persistence test PASSED');
            } else {
                console.log('❌ Budget persistence test FAILED: Incorrect data');
            }
        } else {
            console.log('❌ Budget persistence test FAILED: No budget copied');
        }

        // Cleanup
        await Budget.deleteMany({ userId });
        console.log('Cleaned up test data');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testBudgetPersistence();
