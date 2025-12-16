
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Transaction } from '../models/Transaction';
import { CurrentTransaction } from '../models/CurrentTransaction';
import { MainTransaction } from '../models/MainTransaction';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrateTransactions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget');
        console.log('Connected to DB');

        const allTransactions = await Transaction.find({});
        console.log(`Found ${allTransactions.length} transactions to migrate.`);

        let currentCount = 0;
        let mainCount = 0;

        for (const txDoc of allTransactions) {
            const tx = txDoc as any;
            if (tx.accountType === 'current') {
                // Migrate to CurrentTransaction
                const newTx = new CurrentTransaction({
                    userId: tx.userId,
                    amount: tx.amount,
                    type: tx.type,
                    category: tx.category,
                    description: tx.description,
                    date: tx.date,
                    isRecurring: tx.isRecurring,
                    recurringId: tx.recurringId,
                    // If it was a transfer, we might want to link it, but for now just migrate
                });
                await newTx.save();
                currentCount++;
            } else if (tx.accountType === 'main') {
                // Migrate to MainTransaction
                const newTx = new MainTransaction({
                    userId: tx.userId,
                    amount: tx.amount,
                    type: tx.type,
                    category: tx.category,
                    description: tx.description,
                    date: tx.date,
                    relatedEntityId: tx.linkedEntityId
                });
                await newTx.save();
                mainCount++;
            } else {
                console.warn(`Skipping transaction ${tx._id} with unknown accountType: ${tx.accountType}`);
            }
        }

        console.log(`Migration Complete.`);
        console.log(`Migrated ${currentCount} to CurrentTransaction.`);
        console.log(`Migrated ${mainCount} to MainTransaction.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrateTransactions();
