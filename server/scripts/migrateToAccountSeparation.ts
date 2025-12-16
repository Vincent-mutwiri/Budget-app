// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-app';

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users to migrate.`);

        for (const user of users) {
            console.log(`\nProcessing user: ${user.clerkId} (${user.email || 'No Email'})`);

            // 1. Get existing accounts
            const accounts = await Account.find({ userId: user.clerkId });
            console.log(`  Found ${accounts.length} existing accounts.`);

            let mainAccount = accounts.find(a => a.isMain || a.type === 'asset');

            // If no accounts, create both
            if (!mainAccount && accounts.length === 0) {
                console.log('  No accounts found. Creating default Main and Current accounts.');
                mainAccount = new Account({
                    userId: user.clerkId,
                    name: 'Main Account',
                    type: 'asset',
                    accountCategory: 'main',
                    balance: 0,
                    isMain: true
                });
                await mainAccount.save();
            } else if (!mainAccount) {
                // Fallback: use the first account as main
                mainAccount = accounts[0];
                console.log(`  No explicit main account. Using first account: ${mainAccount.name}`);
            }

            // 2. Update Main Account
            if (mainAccount) {
                (mainAccount as any).accountCategory = 'main';
                mainAccount.isMain = true;
                // Optional: Rename if it's generic, but safer to keep user's name preference
                // mainAccount.name = 'Main Account'; 
                await mainAccount.save();
                console.log(`  Updated Main Account: ${mainAccount._id}`);
            }

            // 3. Check for or Create Current Account
            let currentAccount = accounts.find(a => (a as any).accountCategory === 'current');
            if (!currentAccount) {
                console.log('  Creating Current Account...');
                currentAccount = new Account({
                    userId: user.clerkId,
                    name: 'Current Account',
                    type: 'asset',
                    accountCategory: 'current',
                    balance: 0, // Start fresh
                    isMain: false
                });
                await currentAccount.save();
                console.log(`  Created Current Account: ${currentAccount._id}`);
            } else {
                console.log(`  Current Account already exists: ${currentAccount._id}`);
            }

            // 4. Migrate Transactions
            // Move all existing transactions to Main Account history
            // Logic: Historical data belongs to the "reserve" (Main). 
            // Current Account starts fresh for the new month's operations.

            if (mainAccount) {
                const result = await Transaction.updateMany(
                    {
                        userId: user.clerkId,
                        // Update transactions that don't have an accountType yet or are generic
                        $or: [
                            { accountType: { $exists: false } },
                            { accountType: null }
                        ]
                    },
                    {
                        $set: {
                            accountType: 'main',
                            accountId: mainAccount._id // Link to main account if we have an accountId field (we might not, but good practice)
                        }
                    }
                );
                console.log(`  Migrated ${result.modifiedCount} transactions to Main Account.`);
            }
        }

        console.log('\nMigration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
