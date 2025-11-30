import mongoose from 'mongoose';
import { Budget } from '../models/Budget';
import { SavingsGoal } from '../models/SavingsGoal';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

/**
 * Migration: Add new fields to existing models
 * - Budget: updatedAt
 * - SavingsGoal: contributions, updatedAt
 * - User: totalBalance, lastTransactionDate, previousMonthsBalance, monthlyBalanceHistory
 * - Transaction: xpAwarded
 */

export async function up() {
    console.log('Running migration: Add schema fields...');

    try {
        // Update Budget documents - add updatedAt field
        const budgetResult = await Budget.updateMany(
            { updatedAt: { $exists: false } },
            { $set: { updatedAt: new Date() } }
        );
        console.log(`Updated ${budgetResult.modifiedCount} Budget documents with updatedAt field`);

        // Update SavingsGoal documents - add contributions array and updatedAt
        const goalResult = await SavingsGoal.updateMany(
            { $or: [{ contributions: { $exists: false } }, { updatedAt: { $exists: false } }] },
            {
                $set: {
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    contributions: []
                }
            }
        );
        console.log(`Updated ${goalResult.modifiedCount} SavingsGoal documents with contributions and updatedAt fields`);

        // Update User documents - add new balance tracking fields
        const userResult = await User.updateMany(
            {
                $or: [
                    { totalBalance: { $exists: false } },
                    { previousMonthsBalance: { $exists: false } },
                    { monthlyBalanceHistory: { $exists: false } }
                ]
            },
            {
                $set: {
                    totalBalance: 0,
                    previousMonthsBalance: 0,
                    monthlyBalanceHistory: []
                }
            }
        );
        console.log(`Updated ${userResult.modifiedCount} User documents with balance tracking fields`);

        // Update Transaction documents - add xpAwarded field
        const transactionResult = await Transaction.updateMany(
            { xpAwarded: { $exists: false } },
            { $set: { xpAwarded: 0 } }
        );
        console.log(`Updated ${transactionResult.modifiedCount} Transaction documents with xpAwarded field`);

        // Create indexes for performance optimization
        console.log('Creating database indexes...');

        // Transaction indexes
        await Transaction.collection.createIndex({ userId: 1, date: -1 });
        console.log('Created compound index on Transaction: { userId: 1, date: -1 }');

        // Budget indexes
        await Budget.collection.createIndex({ userId: 1, category: 1 });
        console.log('Created compound index on Budget: { userId: 1, category: 1 }');

        // SavingsGoal indexes
        await SavingsGoal.collection.createIndex({ userId: 1, status: 1 });
        console.log('Created compound index on SavingsGoal: { userId: 1, status: 1 }');

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

export async function down() {
    console.log('Rolling back migration: Remove schema fields...');

    try {
        // Remove added fields from Budget
        await Budget.updateMany(
            {},
            { $unset: { updatedAt: '' } }
        );
        console.log('Removed updatedAt field from Budget documents');

        // Remove added fields from SavingsGoal
        await SavingsGoal.updateMany(
            {},
            { $unset: { contributions: '', updatedAt: '' } }
        );
        console.log('Removed contributions and updatedAt fields from SavingsGoal documents');

        // Remove added fields from User
        await User.updateMany(
            {},
            {
                $unset: {
                    totalBalance: '',
                    lastTransactionDate: '',
                    previousMonthsBalance: '',
                    monthlyBalanceHistory: ''
                }
            }
        );
        console.log('Removed balance tracking fields from User documents');

        // Remove added field from Transaction
        await Transaction.updateMany(
            {},
            { $unset: { xpAwarded: '' } }
        );
        console.log('Removed xpAwarded field from Transaction documents');

        // Drop indexes
        await Transaction.collection.dropIndex({ userId: 1, date: -1 });
        await Budget.collection.dropIndex({ userId: 1, category: 1 });
        await SavingsGoal.collection.dropIndex({ userId: 1, status: 1 });
        console.log('Dropped created indexes');

        console.log('Rollback completed successfully!');
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}
