
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { performMonthEndRollover } from '../services/rolloverService';
import { Account } from '../models/Account';
import { User } from '../models/User';
import { Transfer } from '../models/Transfer';
import { Transaction } from '../models/Transaction';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-app';

async function runTest() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Test User
        const testUserId = 'test-rollover-user-' + Date.now();
        console.log(`Creating test user: ${testUserId}`);

        // Create accounts directly
        const mainAccount = new Account({
            userId: testUserId,
            name: 'Main Account',
            type: 'asset',
            accountCategory: 'main',
            balance: 10000, // Initial Main Balance
            isMain: true
        });
        await mainAccount.save();

        const currentAccount = new Account({
            userId: testUserId,
            name: 'Current Account',
            type: 'asset',
            accountCategory: 'current',
            balance: 5000, // Surplus of 5000
            isMain: false
        });
        await currentAccount.save();

        console.log('Initial State:');
        console.log(`Main Balance: ${mainAccount.balance}`);
        console.log(`Current Balance: ${currentAccount.balance}`);

        // 2. Test Surplus Rollover
        console.log('\n--- Testing Surplus Rollover ---');
        await performMonthEndRollover(testUserId);

        const mainAfterSurplus = await Account.findById(mainAccount._id);
        const currentAfterSurplus = await Account.findById(currentAccount._id);

        console.log(`Main Balance: ${mainAfterSurplus?.balance} (Expected: 15000)`);
        console.log(`Current Balance: ${currentAfterSurplus?.balance} (Expected: 0)`);

        if (mainAfterSurplus?.balance === 15000 && currentAfterSurplus?.balance === 0) {
            console.log('✅ Surplus Rollover Passed');
        } else {
            console.error('❌ Surplus Rollover Failed');
        }

        // 3. Test Deficit Rollover
        console.log('\n--- Testing Deficit Rollover ---');
        // Reset Current to -2000
        await Account.findByIdAndUpdate(currentAccount._id, { balance: -2000 });
        // Main is 15000

        await performMonthEndRollover(testUserId);

        const mainAfterDeficit = await Account.findById(mainAccount._id);
        const currentAfterDeficit = await Account.findById(currentAccount._id);

        console.log(`Main Balance: ${mainAfterDeficit?.balance} (Expected: 13000)`);
        console.log(`Current Balance: ${currentAfterDeficit?.balance} (Expected: 0)`);

        if (mainAfterDeficit?.balance === 13000 && currentAfterDeficit?.balance === 0) {
            console.log('✅ Deficit Rollover Passed');
        } else {
            console.error('❌ Deficit Rollover Failed');
        }

        // 4. Cleanup
        console.log('\nCleaning up...');
        await Account.deleteMany({ userId: testUserId });
        await Transfer.deleteMany({ userId: testUserId });
        await Transaction.deleteMany({ userId: testUserId });
        console.log('Cleanup complete');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
