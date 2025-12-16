import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { Account } from '../../models/Account';
import { Transaction } from '../../models/Transaction';
import { Transfer } from '../../models/Transfer';
import { User } from '../../models/User';
import accountRoutes from '../../routes/accounts';
import transferRoutes from '../../routes/transfers';
import transactionRoutes from '../../routes/transactions';

describe('Account Separation Integration Tests', () => {
    let mongoServer: MongoMemoryServer;
    let app: express.Application;
    const testUserId = 'test-user-integration';

    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Setup Express app with routes
        app = express();
        app.use(express.json());
        app.use('/api/accounts', accountRoutes);
        app.use('/api/transfers', transferRoutes);
        app.use('/api/transactions', transactionRoutes);

        // Create test user
        await User.create({
            clerkId: testUserId,
            email: 'integration@test.com',
            firstName: 'Integration',
            lastName: 'Test'
        });
    });

    afterEach(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe('End-to-End Account Separation Flow', () => {
        it('should complete full account separation workflow', async () => {
            // Step 1: Get account summary (should create accounts)
            const summaryResponse = await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            expect(summaryResponse.body.mainAccount).toBeTruthy();
            expect(summaryResponse.body.currentAccount).toBeTruthy();
            expect(summaryResponse.body.mainAccount.accountCategory).toBe('main');
            expect(summaryResponse.body.currentAccount.accountCategory).toBe('current');

            // Step 2: Add some income to current account
            await request(app)
                .post('/api/transactions')
                .send({
                    userId: testUserId,
                    amount: 2000,
                    type: 'income',
                    description: 'Salary',
                    category: 'Income',
                    date: new Date().toISOString(),
                    accountType: 'current'
                })
                .expect(201);

            // Step 3: Add some expenses to current account
            await request(app)
                .post('/api/transactions')
                .send({
                    userId: testUserId,
                    amount: 500,
                    type: 'expense',
                    description: 'Groceries',
                    category: 'Food',
                    date: new Date().toISOString(),
                    accountType: 'current'
                })
                .expect(201);

            // Step 4: Check visible transactions (should show both)
            const visibleResponse = await request(app)
                .get(`/api/transactions/visible/${testUserId}`)
                .expect(200);

            expect(visibleResponse.body).toHaveLength(2);
            expect(visibleResponse.body.every((t: any) => t.isVisible !== false)).toBe(true);

            // Step 5: Get updated account summary
            const updatedSummary = await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            expect(updatedSummary.body.currentAccount.balance).toBe(1500); // 2000 - 500

            // Step 6: Borrow from main account
            await request(app)
                .post('/api/transfers/borrow')
                .send({
                    userId: testUserId,
                    amount: 300,
                    description: 'Emergency expense'
                })
                .expect(200);

            // Step 7: Check transfer history
            const transferHistory = await request(app)
                .get(`/api/transfers/${testUserId}`)
                .expect(200);

            expect(transferHistory.body).toHaveLength(1);
            expect(transferHistory.body[0].type).toBe('borrow');
            expect(transferHistory.body[0].amount).toBe(300);

            // Step 8: Check account balances after transfer
            const finalSummary = await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            expect(finalSummary.body.currentAccount.balance).toBe(1800); // 1500 + 300
            expect(finalSummary.body.mainAccount.balance).toBe(-300); // 0 - 300

            // Step 9: Repay to main account
            await request(app)
                .post('/api/transfers/repay')
                .send({
                    userId: testUserId,
                    amount: 200,
                    description: 'Partial repayment'
                })
                .expect(200);

            // Step 10: Verify final state
            const finalState = await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            expect(finalState.body.currentAccount.balance).toBe(1600); // 1800 - 200
            expect(finalState.body.mainAccount.balance).toBe(-100); // -300 + 200

            // Step 11: Perform rollover
            await request(app)
                .post('/api/accounts/rollover')
                .send({ userId: testUserId })
                .expect(200);

            // Step 12: Check final balances after rollover
            const postRollover = await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            expect(postRollover.body.currentAccount.balance).toBe(0); // Reset to 0
            expect(postRollover.body.mainAccount.balance).toBe(1500); // -100 + 1600 (surplus)
        });

        it('should handle special transactions correctly', async () => {
            // Create accounts first
            await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            // Add money to current account
            await request(app)
                .post('/api/transactions')
                .send({
                    userId: testUserId,
                    amount: 1000,
                    type: 'income',
                    description: 'Income',
                    category: 'Income',
                    date: new Date().toISOString(),
                    accountType: 'current'
                })
                .expect(201);

            // Create special transaction (should be hidden from day-to-day)
            await request(app)
                .post('/api/transactions/special')
                .send({
                    userId: testUserId,
                    type: 'expense',
                    amount: 200,
                    specialCategory: 'investment',
                    linkedEntityId: new mongoose.Types.ObjectId().toString(),
                    description: 'Investment contribution'
                })
                .expect(201);

            // Check visible transactions (should not include special)
            const visibleResponse = await request(app)
                .get(`/api/transactions/visible/${testUserId}`)
                .expect(200);

            expect(visibleResponse.body).toHaveLength(1); // Only the income
            expect(visibleResponse.body[0].description).toBe('Income');

            // Check special transactions
            const specialResponse = await request(app)
                .get(`/api/transactions/special/${testUserId}?category=investment`)
                .expect(200);

            expect(specialResponse.body).toHaveLength(1);
            expect(specialResponse.body[0].specialCategory).toBe('investment');
            expect(specialResponse.body[0].isVisible).toBe(false);
        });

        it('should handle insufficient funds errors correctly', async () => {
            // Create accounts
            await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            // Try to borrow more than available (main account has 0 balance)
            const borrowResponse = await request(app)
                .post('/api/transfers/borrow')
                .send({
                    userId: testUserId,
                    amount: 1000,
                    description: 'Too much'
                })
                .expect(400);

            expect(borrowResponse.body.error).toContain('Insufficient funds');

            // Try to repay more than available (current account has 0 balance)
            const repayResponse = await request(app)
                .post('/api/transfers/repay')
                .send({
                    userId: testUserId,
                    amount: 500,
                    description: 'Too much'
                })
                .expect(400);

            expect(repayResponse.body.error).toContain('Insufficient funds');
        });

        it('should maintain data consistency across operations', async () => {
            // Create accounts and add initial balance
            await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            // Add income
            await request(app)
                .post('/api/transactions')
                .send({
                    userId: testUserId,
                    amount: 1000,
                    type: 'income',
                    description: 'Salary',
                    category: 'Income',
                    date: new Date().toISOString(),
                    accountType: 'current'
                })
                .expect(201);

            // Perform multiple operations
            await request(app)
                .post('/api/transfers/borrow')
                .send({
                    userId: testUserId,
                    amount: 200,
                    description: 'Borrow 1'
                })
                .expect(200);

            await request(app)
                .post('/api/transfers/repay')
                .send({
                    userId: testUserId,
                    amount: 100,
                    description: 'Repay 1'
                })
                .expect(200);

            await request(app)
                .post('/api/transfers/borrow')
                .send({
                    userId: testUserId,
                    amount: 50,
                    description: 'Borrow 2'
                })
                .expect(200);

            // Check final consistency
            const summary = await request(app)
                .get(`/api/accounts/summary/${testUserId}`)
                .expect(200);

            const transfers = await request(app)
                .get(`/api/transfers/${testUserId}`)
                .expect(200);

            // Verify transfer history
            expect(transfers.body).toHaveLength(3);

            // Verify balances are consistent
            // Current: 1000 (income) + 200 (borrow) - 100 (repay) + 50 (borrow) = 1150
            // Main: 0 - 200 (lent) + 100 (repaid) - 50 (lent) = -150
            expect(summary.body.currentAccount.balance).toBe(1150);
            expect(summary.body.mainAccount.balance).toBe(-150);
        });
    });
});