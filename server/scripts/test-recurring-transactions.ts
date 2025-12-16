import mongoose from 'mongoose';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { Transaction } from '../models/Transaction';
import { processDueRecurringTransactions } from '../services/recurringTransactionProcessor';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testRecurringTransactions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to MongoDB');

        const userId = 'test_user_recurring_' + Date.now();
        const now = new Date();

        // 1. Create a recurring transaction that is due (yesterday)
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const recurring = new RecurringTransaction({
            userId,
            amount: 1000,
            category: 'Test Recurring',
            description: 'Monthly Test',
            type: 'expense',
            frequency: 'monthly',
            startDate: yesterday,
            nextOccurrence: yesterday,
            isActive: true
        });
        await recurring.save();
        console.log('Created recurring transaction:', recurring._id);

        // 2. Process recurring transactions
        console.log('Processing recurring transactions...');
        const results = await processDueRecurringTransactions();
        console.log('Processing results:', results);

        // 3. Verify transaction was created
        const transaction = await Transaction.findOne({
            userId,
            description: 'Monthly Test (Recurring)'
        });

        if (transaction) {
            console.log('✅ Created transaction:', transaction._id);
            console.log('Amount:', transaction.amount);
            console.log('Date:', transaction.date);
        } else {
            console.log('❌ Recurring transaction test FAILED: No transaction created');
        }

        // 4. Verify next occurrence was updated
        const updatedRecurring = await RecurringTransaction.findById(recurring._id);
        if (updatedRecurring) {
            const expectedNext = new Date(yesterday);
            expectedNext.setMonth(expectedNext.getMonth() + 1);

            console.log('Next occurrence:', updatedRecurring.nextOccurrence);
            console.log('Expected:', expectedNext);

            // Compare dates (ignoring time slightly if needed, but should be exact)
            if (updatedRecurring.nextOccurrence.toISOString() === expectedNext.toISOString()) {
                console.log('✅ Next occurrence updated correctly');
            } else {
                console.log('❌ Recurring transaction test FAILED: Incorrect next occurrence');
            }
        }

        // Cleanup
        await RecurringTransaction.deleteMany({ userId });
        await Transaction.deleteMany({ userId });
        console.log('Cleaned up test data');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testRecurringTransactions();
