import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Account } from '../models/Account';
import { Transfer } from '../models/Transfer';
import { Transaction } from '../models/Transaction';
import { SavingsGoal } from '../models/SavingsGoal';
import {
    borrowFromMain,
    repayToMain,
    withdrawFromSpecial,
    processSpecialContribution,
    getTransferHistory
} from '../services/transferService';

describe('Transfer Service', () => {
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
            balance: 1000,
            isMain: false,
            accountCategory: 'current'
        });
    });

    afterEach(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe('borrowFromMain', () => {
        it('should successfully transfer money from main to current account', async () => {
            const amount = 500;
            const description = 'Emergency expense';

            const transfer = await borrowFromMain(testUserId, amount, description);

            expect(transfer).toBeTruthy();
            expect(transfer.fromAccount).toBe('main');
            expect(transfer.toAccount).toBe('current');
            expect(transfer.amount).toBe(amount);
            expect(transfer.type).toBe('borrow');
            expect(transfer.status).toBe('completed');

            // Check account balances
            const updatedMain = await Account.findById(mainAccount._id);
            const updatedCurrent = await Account.findById(currentAccount._id);

            expect(updatedMain?.balance).toBe(4500); // 5000 - 500
            expect(updatedCurrent?.balance).toBe(1500); // 1000 + 500

            // Check transaction was created
            const transaction = await Transaction.findOne({
                userId: testUserId,
                specialCategory: 'transfer',
                transferType: 'borrow'
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.amount).toBe(amount);
            expect(transaction?.type).toBe('income');
        });

        it('should throw error when insufficient funds in main account', async () => {
            const amount = 6000; // More than main account balance

            await expect(borrowFromMain(testUserId, amount, 'Test'))
                .rejects.toThrow('Insufficient funds in Main Account');
        });

        it('should throw error when accounts not found', async () => {
            await expect(borrowFromMain('non-existent-user', 100, 'Test'))
                .rejects.toThrow('Accounts not found');
        });
    });

    describe('repayToMain', () => {
        it('should successfully transfer money from current to main account', async () => {
            const amount = 300;
            const description = 'Monthly repayment';

            const transfer = await repayToMain(testUserId, amount, description);

            expect(transfer).toBeTruthy();
            expect(transfer.fromAccount).toBe('current');
            expect(transfer.toAccount).toBe('main');
            expect(transfer.amount).toBe(amount);
            expect(transfer.type).toBe('repay');

            // Check account balances
            const updatedMain = await Account.findById(mainAccount._id);
            const updatedCurrent = await Account.findById(currentAccount._id);

            expect(updatedMain?.balance).toBe(5300); // 5000 + 300
            expect(updatedCurrent?.balance).toBe(700); // 1000 - 300

            // Check transaction was created
            const transaction = await Transaction.findOne({
                userId: testUserId,
                specialCategory: 'transfer',
                transferType: 'repay'
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.amount).toBe(amount);
            expect(transaction?.type).toBe('expense');
        });

        it('should throw error when insufficient funds in current account', async () => {
            const amount = 1500; // More than current account balance

            await expect(repayToMain(testUserId, amount, 'Test'))
                .rejects.toThrow('Insufficient funds in Current Account');
        });
    });

    describe('withdrawFromSpecial', () => {
        it('should successfully withdraw from special account to current', async () => {
            const amount = 200;
            const entityId = new mongoose.Types.ObjectId().toString();
            const description = 'Goal withdrawal';

            const transfer = await withdrawFromSpecial(
                testUserId,
                'goal',
                entityId,
                amount,
                description
            );

            expect(transfer).toBeTruthy();
            expect(transfer.fromAccount).toBe('goal');
            expect(transfer.toAccount).toBe('current');
            expect(transfer.linkedEntityId).toBe(entityId);

            // Check current account balance increased
            const updatedCurrent = await Account.findById(currentAccount._id);
            expect(updatedCurrent?.balance).toBe(1200); // 1000 + 200

            // Check transaction was created
            const transaction = await Transaction.findOne({
                userId: testUserId,
                specialCategory: 'transfer',
                transferType: 'withdraw'
            });
            expect(transaction).toBeTruthy();
        });

        it('should throw error when current account not found', async () => {
            await expect(withdrawFromSpecial(
                'non-existent-user',
                'goal',
                'entity-id',
                100,
                'Test'
            )).rejects.toThrow('Current Account not found');
        });
    });

    describe('processSpecialContribution', () => {
        it('should successfully process goal contribution', async () => {
            // Create a test goal
            const goal = await SavingsGoal.create({
                userId: testUserId,
                name: 'Vacation Fund',
                targetAmount: 2000,
                currentAmount: 500,
                targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                contributions: []
            });

            const amount = 300;
            const description = 'Monthly contribution';

            const result = await processSpecialContribution(
                testUserId,
                'goal',
                goal._id.toString(),
                amount,
                description
            );

            expect(result.success).toBe(true);

            // Check current account balance decreased
            const updatedCurrent = await Account.findById(currentAccount._id);
            expect(updatedCurrent?.balance).toBe(700); // 1000 - 300

            // Check goal was updated
            const updatedGoal = await SavingsGoal.findById(goal._id);
            expect(updatedGoal?.currentAmount).toBe(800); // 500 + 300
            expect(updatedGoal?.contributions).toHaveLength(1);

            // Check special transaction was created
            const transaction = await Transaction.findOne({
                userId: testUserId,
                specialCategory: 'goal',
                linkedEntityId: goal._id.toString()
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.type).toBe('expense');
            expect(transaction?.isVisible).toBe(false);
        });

        it('should throw error when insufficient funds in current account', async () => {
            const goalId = new mongoose.Types.ObjectId().toString();
            const amount = 1500; // More than current account balance

            await expect(processSpecialContribution(
                testUserId,
                'goal',
                goalId,
                amount,
                'Test'
            )).rejects.toThrow('Insufficient funds in Current Account');
        });
    });

    describe('getTransferHistory', () => {
        it('should return transfer history for user', async () => {
            // Create some transfers
            await Transfer.create({
                userId: testUserId,
                fromAccount: 'main',
                toAccount: 'current',
                amount: 100,
                type: 'borrow',
                status: 'completed'
            });

            await Transfer.create({
                userId: testUserId,
                fromAccount: 'current',
                toAccount: 'main',
                amount: 50,
                type: 'repay',
                status: 'completed'
            });

            const history = await getTransferHistory(testUserId);

            expect(history).toHaveLength(2);
            expect(history[0].amount).toBe(50); // Most recent first
            expect(history[1].amount).toBe(100);
        });

        it('should return empty array for user with no transfers', async () => {
            const history = await getTransferHistory('no-transfers-user');
            expect(history).toHaveLength(0);
        });
    });
});