
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { calculateFinancialMetrics } from '../services/metricsService';
import { CurrentTransaction } from '../models/CurrentTransaction';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testMetrics() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget');
        console.log('Connected to DB');

        // Find a user with transactions
        const txs = await CurrentTransaction.find({}).limit(5);
        if (txs.length === 0) {
            console.log('No CurrentTransactions found.');
            return;
        }
        const userId = txs[0].userId;
        console.log(`Testing metrics for User ID: ${userId}`);

        // Log some transaction dates
        console.log('Sample Transactions:');
        txs.forEach(t => {
            console.log(`- ${t.type} ${t.amount} on ${t.date} (Is Date? ${t.date instanceof Date})`);
        });

        const metrics = await calculateFinancialMetrics(userId);
        console.log('Metrics Result:', JSON.stringify(metrics, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testMetrics();
