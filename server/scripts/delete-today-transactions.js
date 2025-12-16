require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    description: String,
    category: String,
    date: Date,
    type: String,
    accountType: String,
    specialCategory: String,
    linkedEntityId: String,
    transferType: String,
    isVisible: Boolean,
    createdAt: Date,
    updatedAt: Date
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

async function deleteTodayTransactions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const result = await Transaction.deleteMany({
            date: {
                $gte: startOfToday,
                $lte: endOfToday
            }
        });

        console.log(`✅ Deleted ${result.deletedCount} transactions from today (${startOfToday.toDateString()})`);
        
        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteTodayTransactions();
