
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Transaction } from '../models/Transaction';
import { calculateCurrentMonthSpending } from '../services/metricsService';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function debugMetricsQuery() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget');
        console.log('Connected to DB');

        // Find the user with the 14000 transaction
        const tx = await Transaction.findOne({ amount: 14000, accountType: 'current' });
        if (!tx) {
            console.log('Could not find the 14000 current transaction.');
            return;
        }
        const userId = tx.userId;
        console.log(`Debugging for User ID: ${userId}`);

        const month = new Date();
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        console.log(`Date Range: ${startOfMonth.toISOString()} - ${endOfMonth.toISOString()}`);

        const query = {
            userId,
            type: 'expense',
            accountType: 'current',
            date: { $gte: startOfMonth, $lte: endOfMonth }
        };

        console.log('Running Query:', JSON.stringify(query, null, 2));

        const transactions = await Transaction.find(query);
        console.log(`Found ${transactions.length} transactions.`);

        let total = 0;
        let found14k = false;
        transactions.forEach(t => {
            total += t.amount;
            console.log(`- ${t.amount} (${t.description}) [${t.date.toISOString()}]`);
            if (t.amount === 14000) found14k = true;
        });

        console.log(`Total Spending: ${total}`);
        console.log(`Found 14k transaction? ${found14k ? 'YES' : 'NO'}`);

        const serviceTotal = await calculateCurrentMonthSpending(userId);
        console.log(`Service Total: ${serviceTotal}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugMetricsQuery();
