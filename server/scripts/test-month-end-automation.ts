import mongoose from 'mongoose';
import { performMonthEndAutomation } from '../services/monthEndAutomationService';
import { Account } from '../models/Account';
import { Budget } from '../models/Budget';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { Transfer } from '../models/Transfer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testMonthEndAutomation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to MongoDB');

        const userId = 'test_user_automation_' + Date.now();
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Setup Test Data

        // 1. Accounts (Main and Current)
        const mainAccount = new Account({
            userId,
            name: 'Main Account',
            type: 'main',
            balance: 50000,
            isMain: true,
            accountCategory: 'main'
        });
        await mainAccount.save();

        const currentAccount = new Account({
            userId,
            name: 'Current Account',
            type: 'checking',
            balance: 5000, // Surplus to be rolled over
            accountCategory: 'current'
        });
        await currentAccount.save();

        // 2. Budgets (Previous Month)
        let prevMonth = currentMonth - 1;
        let prevYear = currentYear;
        if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

        const prevBudget = new Budget({
            userId,
            category: 'Automation Test',
            limit: 2000,
            spent: 1000,
            month: prevMonth,
            year: prevYear
        });
        await prevBudget.save();

        // 3. Recurring Transaction (Due)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const recurring = new RecurringTransaction({
            userId,
            amount: 1500,
            category: 'Rent',
            description: 'Monthly Rent',
            type: 'expense',
            frequency: 'monthly',
            startDate: yesterday,
            nextOccurrence: yesterday,
            isActive: true
        });
        await recurring.save();

        console.log('Test data setup complete');

        // Execute Automation
        console.log('Running month-end automation...');
        const results = await performMonthEndAutomation(userId);
        console.log('Automation results:', JSON.stringify(results, null, 2));

        // Verify Results

        // 1. Rollover
        const updatedMain = await Account.findById(mainAccount._id);
        const updatedCurrent = await Account.findById(currentAccount._id);

        if (updatedMain?.balance === 55000 && updatedCurrent?.balance === 0) {
            console.log('✅ Rollover verification PASSED');
        } else {
            console.log('❌ Rollover verification FAILED');
            console.log('Main Balance (Expected 55000):', updatedMain?.balance);
            console.log('Current Balance (Expected 0):', updatedCurrent?.balance);
        }

        // 2. Budgets
        const newBudgets = await Budget.find({ userId, month: currentMonth, year: currentYear });
        if (newBudgets.length === 1 && newBudgets[0].category === 'Automation Test') {
            console.log('✅ Budget copy verification PASSED');
        } else {
            console.log('❌ Budget copy verification FAILED');
            console.log('New budgets found:', newBudgets.length);
        }

        // 3. Recurring Transactions
        const updatedRecurring = await RecurringTransaction.findById(recurring._id);
        // Check if next occurrence is next month
        const expectedNext = new Date(yesterday);
        expectedNext.setMonth(expectedNext.getMonth() + 1);

        if (updatedRecurring?.nextOccurrence.toISOString() === expectedNext.toISOString()) {
            console.log('✅ Recurring transaction verification PASSED');
        } else {
            console.log('❌ Recurring transaction verification FAILED');
        }

        // Cleanup
        await Account.deleteMany({ userId });
        await Budget.deleteMany({ userId });
        await RecurringTransaction.deleteMany({ userId });
        await Transfer.deleteMany({ userId });
        console.log('Cleaned up test data');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testMonthEndAutomation();
