
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const userId = 'user_36A0fVH5XsEsl2znQOnyZMdXg5L';

const transactionSchema = new mongoose.Schema({ userId: String, amount: Number, type: String, category: String, date: Date, description: String });
const Transaction = mongoose.model('Transaction', transactionSchema);

const userSchema = new mongoose.Schema({ clerkId: String, currency: String, email: String, fullName: String, totalBalance: Number });
const User = mongoose.model('User', userSchema);

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget');
        console.log('Connected to DB');

        // Check if user exists
        let user = await User.findOne({ clerkId: userId });
        if (!user) {
            console.log('Creating user...');
            user = await User.create({
                clerkId: userId,
                currency: 'KES',
                email: 'vincentmutwiri9@gmail.com',
                fullName: 'Vincent Mutwiri',
                totalBalance: 50000
            });
        } else {
            console.log('User already exists');
        }

        // Add sample transactions
        const count = await Transaction.countDocuments({ userId });
        if (count === 0) {
            console.log('Seeding transactions...');
            await Transaction.create([
                { userId, amount: 5000, type: 'expense', category: 'Food', date: new Date(), description: 'Groceries' },
                { userId, amount: 2000, type: 'expense', category: 'Transport', date: new Date(), description: 'Uber' },
                { userId, amount: 100000, type: 'income', category: 'Salary', date: new Date(), description: 'Monthly Salary' },
                { userId, amount: 1500, type: 'expense', category: 'Entertainment', date: new Date(Date.now() - 86400000), description: 'Movies' }
            ]);
            console.log('Transactions seeded');
        } else {
            console.log('Transactions already exist');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seedData();
