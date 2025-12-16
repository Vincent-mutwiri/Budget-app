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

const TransferSchema = new mongoose.Schema({
    userId: String,
    fromAccount: String,
    toAccount: String,
    amount: Number,
    type: String,
    linkedEntityId: String,
    date: Date,
    description: String,
    status: String,
    createdAt: Date
});

const DebtPaymentSchema = new mongoose.Schema({
    amount: Number,
    date: Date,
    principalPaid: Number,
    interestPaid: Number
}, { _id: true });

const DebtSchema = new mongoose.Schema({
    userId: String,
    name: String,
    type: String,
    originalAmount: Number,
    currentBalance: Number,
    interestRate: Number,
    minimumPayment: Number,
    dueDate: Date,
    paymentHistory: [DebtPaymentSchema],
    createdAt: Date,
    updatedAt: Date
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
const Transfer = mongoose.model('Transfer', TransferSchema);
const Debt = mongoose.model('Debt', DebtSchema);

async function deleteTodaySpecialTransactions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Delete special transactions
        const specialTxResult = await Transaction.deleteMany({
            date: { $gte: startOfToday, $lte: endOfToday },
            accountType: 'special'
        });

        // Delete transfers
        const transferResult = await Transfer.deleteMany({
            date: { $gte: startOfToday, $lte: endOfToday }
        });

        // Remove today's debt payments from payment history
        const debts = await Debt.find({
            'paymentHistory.date': { $gte: startOfToday, $lte: endOfToday }
        });

        let debtPaymentsRemoved = 0;
        for (const debt of debts) {
            const originalLength = debt.paymentHistory.length;
            debt.paymentHistory = debt.paymentHistory.filter(payment => {
                const paymentDate = new Date(payment.date);
                return paymentDate < startOfToday || paymentDate > endOfToday;
            });
            debtPaymentsRemoved += originalLength - debt.paymentHistory.length;
            await debt.save();
        }

        console.log(`✅ Deleted ${specialTxResult.deletedCount} special transactions`);
        console.log(`✅ Deleted ${transferResult.deletedCount} transfers`);
        console.log(`✅ Removed ${debtPaymentsRemoved} debt payment(s) from history`);
        console.log(`\nAll special transactions from today (${startOfToday.toDateString()}) have been removed.\n`);
        
        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteTodaySpecialTransactions();
