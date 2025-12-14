
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Define minimal schemas for query
const transactionSchema = new mongoose.Schema({ userId: String, amount: Number, type: String, category: String, date: Date });
const Transaction = mongoose.model('Transaction', transactionSchema);

const userSchema = new mongoose.Schema({ clerkId: String, currency: String, email: String });
const User = mongoose.model('User', userSchema);

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget');
        console.log('Connected to DB');

        const users = await User.find({});
        console.log(`Total Users: ${users.length}`);
        users.forEach(u => console.log(`- ID: ${u._id}, ClerkID: ${u.clerkId}, Email: ${u.email}`));

        const transactions = await Transaction.find({}).limit(5);
        console.log(`Total Transactions (sample 5):`);
        transactions.forEach(t => console.log(`- ID: ${t._id}, UserID: ${t.userId}, Amount: ${t.amount}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
