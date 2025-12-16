import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Account } from '../models/Account';
import { Transfer } from '../models/Transfer';
import { Transaction } from '../models/Transaction';
import { performMonthEndRollover } from '../services/rolloverService';

describe('Rollover Service', () => {
    let mongoServer: MongoMemoryServer;
    const testUserId = 'test-user-123';
    let mainAccount: any;
    let currentAccount: any;

    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create test accounts
        mainAccount = await Account.create({
            userId: testUserId,
            name: 'Main Account',
            type: 'asset',
            balance: 5000,
            isMain: true,
            accountCategory: 'main'
        });

        currentAccount = await Account.create({
            userId: testUserId,
            name: 'Current Account',
            type: 'asset',
            balance: 0, // Will be set in individual tests
            isMain: false,
            accountCategory: 'current'
        });
    });

    afterEach(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe('performMonthEndRollover', () => {
        it('should handle zero balance rollover', async () => {
            // Current account has 0 balance
            const result = await performMonthEndRollover(testUserId);

            expect(result.status).toBe('success');
            expect(result.amount).toBe(0);
            expect(result.message).toContain('Balance was 0');

            // Check that lastRolloverDate was updated
            const updatedCurrent = await Account.findById(currentAccount._id);
            expect(updatedCurrent?.lastRolloverDate).toBeTruthy();

            // Balances should remain unchanged
            const updatedMain = await Account.findById(mainAccount._id);
            expect(updatedMain?.balance).toBe(5000);
            expect(updatedCurrent?.balance).toBe(0);
        });

        it('should transfer surplus to main account', async () => {
            // Set current account to have surplus
            currentAccount.balance = 800;
            await currentAccount.save();

            const result = await performMonthEndRollover(testUserId);

            expect(result.status).toBe('success');
            expect(result.amount).toBe(800);
            expect(result.message).toContain('Surplus transferred');

            // Check account balances
            const updatedMain = await Account.findById(mainAccount._id);
            const updatedCurrent = await Account.findById(currentAccount._id);

            expect(updatedMain?.balance).toBe(5800); // 5000 + 800
            expect(updatedCurrent?.balance).toBe(0); // Reset to 0
            expect(updatedCurrent?.lastRolloverDate).toBeTruthy();

            // Check transfer record was created
            const transfer = await Transfer.findOne({
                userId: testUserId,
                fromAccount: 'current',
                toAccount: 'main',
                type: 'deposit'
            });
            expect(transfer).toBeTruthy();
            expect(transfer?.amount).toBe(800);
            expect(transfer?.status).toBe('completed');
            expect(transfer?.description).toContain('Month-end Rollover: Surplus');

            // Check transaction was created
            const transaction = await Transaction.findOne({
                userId: testUserId,
                specialCategory: 'transfer',
                transferType: 'repay'
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.amount).toBe(800);
        });

        it('should handle deficit by borrowing from main account', async () => {
            // Set current account to have deficit
            currentAccount.balance = -300;
            await currentAccount.save();

            const result = await performMonthEndRollover(testUserId);

            expect(result.status).toBe('success');
            expect(result.amount).toBe(-300); // Negative indicates deficit
            expect(result.message).toContain('Deficit covered');

            // Check account balances
            const updatedMain = await Account.findById(mainAccount._id);
            const updatedCurrent = await Account.findById(currentAccount._id);

            expect(updatedMain?.balance).toBe(4700); // 5000 - 300
            expect(updatedCurrent?.balance).toBe(0); // Reset to 0
            expect(updatedCurrent?.lastRolloverDate).toBeTruthy();

            // Check transfer record was created
            const transfer = await Transfer.findOne({
                userId: testUserId,
                fromAccount: 'main',
                toAccount: 'current',
                type: 'borrow'
            });
            expect(transfer).toBeTruthy();
            expect(transfer?.amount).toBe(300);
            expect(transfer?.description).toContain('Month-end Rollover: Deficit coverage');

            // Check transaction was created
            const transaction = await Transaction.findOne({
                userId: testUserId,
                specialCategory: 'transfer',
                transferType: 'borrow'
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.amount).toBe(300);
        });

        it('should throw error when accounts not found', async () => {
            await expect(performMonthEndRollover('non-existent-user'))
                .rejects.toThrow('Accounts not found');
        });

        it('should handle large surplus correctly', async () => {
            // Set current account to have large surplus
            currentAccount.balance = 2500;
            await currentAccount.save();

            const result = await performMonthEndRollover(testUserId);

            expect(result.status).toBe('success');
            expect(result.amount).toBe(2500);

            // Check final balances
            const updatedMain = await Account.findById(mainAccount._id);
            const updatedCurrent = await Account.findById(currentAccount._id);

            expect(updatedMain?.balance).toBe(7500); // 5000 + 2500
            expect(updatedCurrent?.balance).toBe(0);
        });

        it('should handle large deficit correctly', async () => {
            // Set current account to have large deficit
            currentAccount.balance = -1200;
            await currentAccount.save();

            const result = await performMonthEndRollover(testUserId);

            expect(result.status).toBe('success');
            expect(result.amount).toBe(-1200);

            // Check final balances
            const updatedMain = await Account.findById(mainAccount._id);
            const updatedCurrent = await Account.findById(currentAccount._id);

            expect(updatedMain?.balance).toBe(3800); // 5000 - 1200
            expect(updatedCurrent?.balance).toBe(0);
        });

        it('should update rollover date correctly', async () => {
            const beforeRollover = new Date();

            currentAccount.balance = 100;
            await currentAccount.save();

            await performMonthEndRollover(testUserId);

            const updatedCurrent = await Account.findById(currentAccount._id);
            const rolloverDate = updatedCurrent?.lastRolloverDate;

            expect(rolloverDate).toBeTruthy();
            expect(rolloverDate!.getTime()).toBeGreaterThanOrEqual(beforeRollover.getTime());
        });
    });
});