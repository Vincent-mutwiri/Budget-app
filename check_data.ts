
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Transaction } from './server/models/Transaction';
import { User } from './server/models/User';

dotenv.config();

const userId = 'user_36A0fVH5XsEsl2znQOnyZMdXg5L';

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget');
        console.log('Connected to DB');

        const user = await User.findOne({ clerkId: userId });
        console.log('User found:', user ? 'Yes' : 'No');
        if (user) {
            console.log('User Currency:', user.currency);
        }

        const transactions = await Transaction.find({ userId });
        console.log(`Found ${transactions.length} transactions for user ${userId}`);

        if (transactions.length > 0) {
            console.log('Sample transaction:', transactions[0]);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
