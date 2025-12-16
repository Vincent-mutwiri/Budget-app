require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

async function recalculateMainAccount() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const Account = mongoose.model('Account', new mongoose.Schema({}, { strict: false }));
        const Transfer = mongoose.model('Transfer', new mongoose.Schema({}, { strict: false }));
        const MainTransaction = mongoose.model('MainTransaction', new mongoose.Schema({}, { strict: false }));

        const mainAccounts = await Account.find({ isMain: true });
        console.log(`Found ${mainAccounts.length} main accounts\n`);

        for (const account of mainAccounts) {
            const userId = account.userId;
            console.log(`Processing user: ${userId}`);

            // 1. Transfers FROM Current (savings)
            const transfersFromCurrent = await Transfer.aggregate([
                { $match: { userId, fromAccount: 'current', toAccount: 'main', status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            let balance = transfersFromCurrent[0]?.total || 0;
            console.log(`  - Transfers from Current: +${balance}`);

            // 2. Special expenses
            const expenses = await MainTransaction.aggregate([
                { $match: { userId, type: 'expense' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const expenseAmount = expenses[0]?.total || 0;
            balance -= expenseAmount;
            console.log(`  - Special expenses: -${expenseAmount}`);

            // 3. Special withdrawals
            const withdrawals = await Transfer.aggregate([
                { $match: { userId, toAccount: 'main', fromAccount: { $in: ['debt', 'investment', 'goal'] }, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const withdrawalAmount = withdrawals[0]?.total || 0;
            balance += withdrawalAmount;
            console.log(`  - Special withdrawals: +${withdrawalAmount}`);

            const oldBalance = account.balance;
            account.balance = balance;
            await account.save();

            console.log(`  ✅ Updated: ${oldBalance} → ${balance}\n`);
        }

        console.log('✅ All main accounts recalculated');
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

recalculateMainAccount();
