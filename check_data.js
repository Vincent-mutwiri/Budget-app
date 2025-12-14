
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const userId = 'user_36A0fVH5XsEsl2znQOnyZMdXg5L';

// Define minimal schemas for query
const transactionSchema = new mongoose.Schema({ userId: String, amount: Number, type: String, category: String, date: Date });
const Transaction = mongoose.model('Transaction', transactionSchema);

const userSchema = new mongoose.Schema({ clerkId: String, currency: String });
const User = mongoose.model('User', userSchema);

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
