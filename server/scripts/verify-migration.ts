
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-app';

async function verifyMigration() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Test User with Legacy Data
        const testUserId = 'test-migration-user-' + Date.now();
        console.log(`Creating test user: ${testUserId}`);

        const user = new User({
            clerkId: testUserId,
            email: `test-${Date.now()}@example.com`,
            firstName: 'Test',
            lastName: 'User'
        });
        await user.save();

        // Create a "Legacy" Account (no accountCategory)
        const legacyAccount = new Account({
            userId: testUserId,
            name: 'My Old Bank',
            type: 'asset',
            balance: 5000,
            isMain: true // Old schema might have this
        });
        // Force remove accountCategory for simulation if possible, or just rely on default
        // Mongoose might add default 'main' because of schema default, 
        // but let's assume we are simulating a state where we need to ensure structure.
        await legacyAccount.save();

        // Create Legacy Transactions (no accountType)
        // Create Legacy Transactions (no accountType) - Use collection to bypass Mongoose defaults
        await Transaction.collection.insertOne({
            userId: testUserId,
            amount: 100,
            type: 'expense',
            category: 'Food',
            date: new Date(),
            description: 'Old Lunch',
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        });

        console.log('Legacy data created.');

        // 2. Run Migration Script
        console.log('Running migration script...');
        await mongoose.disconnect(); // Disconnect to allow script to run

        const { stdout, stderr } = await execPromise('npx ts-node server/scripts/migrateToAccountSeparation.ts');
        console.log(stdout);
        if (stderr) console.error(stderr);

        // 3. Verify Results
        await mongoose.connect(MONGODB_URI); // Reconnect

        const accounts = await Account.find({ userId: testUserId });
        const transactions = await Transaction.find({ userId: testUserId });

        const mainAccount = accounts.find(a => a.accountCategory === 'main');
        const currentAccount = accounts.find(a => a.accountCategory === 'current');

        console.log('\n--- Verification Results ---');

        if (mainAccount && currentAccount) {
            console.log('✅ Accounts Split: Success');
            console.log(`   Main: ${mainAccount.name} (${mainAccount.balance})`);
            console.log(`   Current: ${currentAccount.name} (${currentAccount.balance})`);
        } else {
            console.error('❌ Accounts Split: Failed');
        }

        const migratedTx = transactions.find(t => t.description === 'Old Lunch');
        if (migratedTx?.accountType === 'main') {
            console.log('✅ Transaction Migration: Success');
        } else {
            console.error(`❌ Transaction Migration: Failed (Type: ${migratedTx?.accountType})`);
        }

        // 4. Cleanup
        console.log('\nCleaning up...');
        await User.deleteOne({ _id: user._id });
        await Account.deleteMany({ userId: testUserId });
        await Transaction.deleteMany({ userId: testUserId });
        console.log('Cleanup complete');

    } catch (error) {
        console.error('Verification Failed:', error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

verifyMigration();
