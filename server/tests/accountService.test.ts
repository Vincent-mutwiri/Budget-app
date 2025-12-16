import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { Transfer } from '../models/Transfer';
import { User } from '../models/User';
import {
    ensureMainAccount,
    ensureCurrentAccount,
    getCurrentAccount,
    getMainAccount,
    syncMainAccountBalance,
    syncCurrentAccountBalance
} from '../services/accountService';

describe('Account Service', () => {
    let mongoServer: MongoMemoryServer;
    const testUserId = 'test-user-123';

    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create test user
        await User.create({
            clerkId: testUserId,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User'
        });
    });

    afterEach(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe('ensureMainAccount', () => {
        it('should create a main account if none exists', async () => {
            const accountId = await ensureMainAccount(testUserId);

            expect(accountId).toBeDefined();

            const account = await Account.findById(accountId);
            expect(account).toBeTruthy();
            expect(account?.userId).toBe(testUserId);
            expect(account?.isMain).toBe(true);
            expect(account?.accountCategory).toBe('main');
            expect(account?.name).toBe('Main Account');
        });

        it('should return existing main account if one exists', async () => {
            // Create existing main account
            const existingAccount = await Account.create({
                userId: testUserId,
                name: 'Existing Main',
                type: 'asset',
                isMain: true,
                accountCategory: 'main'
            });

            const accountId = await ensureMainAccount(testUserId);

            expect(accountId).toBe(existingAccount._id.toString());
        });

        it('should migrate existing main account without category', async () => {
            // Create main account without category
            const existingAccount = await Account.create({
                userId: testUserId,
                name: 'Old Main',
                type: 'asset',
                isMain: true
                // No accountCategory
            });

            await ensureMainAccount(testUserId);

            const updatedAccount = await Account.findById(existingAccount._id);
            expect(updatedAccount?.accountCategory).toBe('main');
        });
    });

    describe('ensureCurrentAccount', () => {
        it('should create a current account if none exists', async () => {
            const accountId = await ensureCurrentAccount(testUserId);

            expect(accountId).toBeDefined();

            const account = await Account.findById(accountId);
            expect(account).toBeTruthy();
            expect(account?.userId).toBe(testUserId);
            expect(account?.isMain).toBe(false);
            expect(account?.accountCategory).toBe('current');
            expect(account?.name).toBe('Current Account');
            expect(account?.monthlyBudget).toBe(0);
        });

        it('should return existing current account if one exists', async () => {
            const existingAccount = await Account.create({
                userId: testUserId,
                name: 'Existing Current',
                type: 'asset',
                isMain: false,
                accountCategory: 'current'
            });

            const accountId = await ensureCurrentAccount(testUserId);

            expect(accountId).toBe(existingAccount._id.toString());
        });
    });

    describe('syncMainAccountBalance', () => {
        it('should calculate main account balance from transactions and transfers', async () => {
            // Create main account
            const mainAccount = await Account.create({
                userId: testUserId,
                name: 'Main Account',
                type: 'asset',
                isMain: true,
                accountCategory: 'main',
                balance: 0
            });

            // Create main account transactions
            await Transaction.create({
                userId: testUserId,
                amount: 1000,
                type: 'income',
                description: 'Salary',
                category: 'Income',
                date: new Date(),
                accountType: 'main'
            });

            await Transaction.create({
                userId: testUserId,
                amount: 200,
                type: 'expense',
                description: 'Investment',
                category: 'Investment',
                date: new Date(),
                accountType: 'main'
            });

            // Create transfers
            await Transfer.create({
                userId: testUserId,
                fromAccount: 'current',
                toAccount: 'main',
                amount: 300,
                type: 'repay',
                status: 'completed'
            });

            await Transfer.create({
                userId: testUserId,
                fromAccount: 'main',
                toAccount: 'current',
                amount: 100,
                type: 'borrow',
                status: 'completed'
            });

            await syncMainAccountBalance(testUserId);

            const updatedAccount = await Account.findById(mainAccount._id);
            // Expected: 1000 (income) - 200 (expense) + 300 (transfer in) - 100 (transfer out) = 1000
            expect(updatedAccount?.balance).toBe(1000);
        });

        it('should handle account with no transactions', async () => {
            const mainAccount = await Account.create({
                userId: testUserId,
                name: 'Main Account',
                type: 'asset',
                isMain: true,
                accountCategory: 'main',
                balance: 500 // Initial balance
            });

            await syncMainAccountBalance(testUserId);

            const updatedAccount = await Account.findById(mainAccount._id);
            expect(updatedAccount?.balance).toBe(0); // Should be 0 with no transactions
        });
    });

    describe('syncCurrentAccountBalance', () => {
        it('should calculate current account balance from current transactions', async () => {
            // Create current account
            const currentAccount = await Account.create({
                userId: testUserId,
                name: 'Current Account',
                type: 'asset',
                isMain: false,
                accountCategory: 'current',
                balance: 0
            });

            // Create current account transactions
            await Transaction.create({
                userId: testUserId,
                amount: 500,
                type: 'income',
                description: 'Freelance',
                category: 'Income',
                date: new Date(),
                accountType: 'current'
            });

            await Transaction.create({
                userId: testUserId,
                amount: 150,
                type: 'expense',
                description: 'Groceries',
                category: 'Food',
                date: new Date(),
                accountType: 'current'
            });

            await syncCurrentAccountBalance(testUserId);

            const updatedAccount = await Account.findById(currentAccount._id);
            // Expected: 500 (income) - 150 (expense) = 350
            expect(updatedAccount?.balance).toBe(350);
        });
    });

    describe('getCurrentAccount and getMainAccount', () => {
        it('should retrieve the correct accounts', async () => {
            const mainAccount = await Account.create({
                userId: testUserId,
                name: 'Main Account',
                type: 'asset',
                isMain: true,
                accountCategory: 'main'
            });

            const currentAccount = await Account.create({
                userId: testUserId,
                name: 'Current Account',
                type: 'asset',
                isMain: false,
                accountCategory: 'current'
            });

            const retrievedMain = await getMainAccount(testUserId);
            const retrievedCurrent = await getCurrentAccount(testUserId);

            expect(retrievedMain?._id.toString()).toBe(mainAccount._id.toString());
            expect(retrievedCurrent?._id.toString()).toBe(currentAccount._id.toString());
        });

        it('should return null for non-existent accounts', async () => {
            const main = await getMainAccount('non-existent-user');
            const current = await getCurrentAccount('non-existent-user');

            expect(main).toBeNull();
            expect(current).toBeNull();
        });
    });
});