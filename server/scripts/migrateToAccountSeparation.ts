import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

/**
 * Migration script to convert existing single-account users to dual-account system
 * 
 * This script:
 * 1. Creates Current Account for all users who don't have one
 * 2. Classifies existing transactions as 'main' or 'current' based on date
 * 3. Calculates initial Main Account balance from historical data
 * 4. Sets lastRolloverDate for proper month-end processing
 * 5. Validates data integrity
 */

interface MigrationStats {
    usersProcessed: number;
    currentAccountsCreated: number;
    transactionsClassified: number;
    errors: string[];
}

async function connectToDatabase() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
}

async function migrateUser(userId: string, stats: MigrationStats): Promise<void> {
    try {
        console.log(`\n🔄 Processing user: ${userId}`);

        // 1. Ensure Main Account has proper category
        const mainAccount = await Account.findOne({ userId, isMain: true });
        if (mainAccount && !mainAccount.accountCategory) {
            mainAccount.accountCategory = 'main';
            await mainAccount.save();
            console.log(`  ✅ Updated main account category`);
        }

        // 2. Check if Current Account already exists
        let currentAccount = await Account.findOne({ userId, accountCategory: 'current' });
        if (!currentAccount) {
            // Create Current Account
            currentAccount = new Account({
                userId,
                name: 'Current Account',
                type: 'asset',
                balance: 0,
                isMain: false,
                accountCategory: 'current',
                institution: 'SmartWallet',
                logoUrl: 'https://via.placeholder.com/48',
                monthlyBudget: 0,
                lastRolloverDate: new Date() // Set to now for initial setup
            });
            await currentAccount.save();
            stats.currentAccountsCreated++;
            console.log(`  ✅ Created current account`);
        }

        // 3. Classify existing transactions
        const cutoffDate = new Date();
        cutoffDate.setDate(1); // First day of current month
        cutoffDate.setHours(0, 0, 0, 0);

        // Get all transactions for this user
        const transactions = await Transaction.find({ userId });
        let classifiedCount = 0;

        for (const transaction of transactions) {
            // Skip if already classified
            if (transaction.accountType) continue;

            const transactionDate = new Date(transaction.date);

            // Classify based on date and type
            if (transactionDate >= cutoffDate) {
                // Current month transactions go to Current Account
                transaction.accountType = 'current';
                transaction.isVisible = true; // Visible in day-to-day view
            } else {
                // Historical transactions go to Main Account
                transaction.accountType = 'main';
                transaction.isVisible = false; // Hidden from day-to-day view
            }

            await transaction.save();
            classifiedCount++;
        }

        stats.transactionsClassified += classifiedCount;
        console.log(`  ✅ Classified ${classifiedCount} transactions`);

        // 4. Calculate and set Main Account balance
        if (mainAccount) {
            const mainTransactions = await Transaction.find({
                userId,
                accountType: 'main'
            });

            let balance = 0;
            for (const tx of mainTransactions) {
                if (tx.type === 'income') {
                    balance += tx.amount;
                } else {
                    balance -= tx.amount;
                }
            }

            mainAccount.balance = balance;
            await mainAccount.save();
            console.log(`  ✅ Set main account balance: ${balance}`);
        }

        // 5. Calculate and set Current Account balance
        const currentTransactions = await Transaction.find({
            userId,
            accountType: 'current'
        });

        let currentBalance = 0;
        for (const tx of currentTransactions) {
            if (tx.type === 'income') {
                currentBalance += tx.amount;
            } else {
                currentBalance -= tx.amount;
            }
        }

        currentAccount.balance = currentBalance;
        await currentAccount.save();
        console.log(`  ✅ Set current account balance: ${currentBalance}`);

        stats.usersProcessed++;
        console.log(`  ✅ User migration completed`);

    } catch (error) {
        const errorMsg = `Error migrating user ${userId}: ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
    }
}

async function validateMigration(): Promise<boolean> {
    console.log('\n🔍 Validating migration...');

    try {
        // Check that all users have both account types
        const users = await User.find({});
        let validationErrors = 0;

        for (const user of users) {
            const mainAccount = await Account.findOne({
                userId: user.clerkId,
                accountCategory: 'main'
            });
            const currentAccount = await Account.findOne({
                userId: user.clerkId,
                accountCategory: 'current'
            });

            if (!mainAccount) {
                console.error(`❌ User ${user.clerkId} missing main account`);
                validationErrors++;
            }
            if (!currentAccount) {
                console.error(`❌ User ${user.clerkId} missing current account`);
                validationErrors++;
            }

            // Check transaction classification
            const unclassifiedTx = await Transaction.countDocuments({
                userId: user.clerkId,
                accountType: { $exists: false }
            });

            if (unclassifiedTx > 0) {
                console.error(`❌ User ${user.clerkId} has ${unclassifiedTx} unclassified transactions`);
                validationErrors++;
            }
        }

        if (validationErrors === 0) {
            console.log('✅ Migration validation passed');
            return true;
        } else {
            console.error(`❌ Migration validation failed with ${validationErrors} errors`);
            return false;
        }

    } catch (error) {
        console.error('❌ Validation error:', error);
        return false;
    }
}

async function runMigration() {
    console.log('🚀 Starting Account Separation Migration...\n');

    const stats: MigrationStats = {
        usersProcessed: 0,
        currentAccountsCreated: 0,
        transactionsClassified: 0,
        errors: []
    };

    try {
        await connectToDatabase();

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to migrate`);

        // Process each user
        for (const user of users) {
            await migrateUser(user.clerkId, stats);
        }

        // Validate migration
        const isValid = await validateMigration();

        // Print summary
        console.log('\n📊 Migration Summary:');
        console.log(`  Users processed: ${stats.usersProcessed}`);
        console.log(`  Current accounts created: ${stats.currentAccountsCreated}`);
        console.log(`  Transactions classified: ${stats.transactionsClassified}`);
        console.log(`  Errors: ${stats.errors.length}`);

        if (stats.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            stats.errors.forEach(error => console.log(`  - ${error}`));
        }

        if (isValid && stats.errors.length === 0) {
            console.log('\n🎉 Migration completed successfully!');
        } else {
            console.log('\n⚠️  Migration completed with issues. Please review errors above.');
        }

    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration().catch(console.error);
}

export { runMigration, validateMigration };