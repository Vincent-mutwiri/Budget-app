require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

async function recalculateCurrentAccount() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Account = mongoose.model('Account', new mongoose.Schema({}, { strict: false }));
        const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
        const Transfer = mongoose.model('Transfer', new mongoose.Schema({}, { strict: false }));

        // Get all users with current accounts (isMain: false)
        const currentAccounts = await Account.find({ isMain: false, name: 'Current Account' });
        console.log(`Found ${currentAccounts.length} current accounts to recalculate\n`);

        for (const account of currentAccounts) {
            const userId = account.userId;
            console.log(`Processing user: ${userId}`);

            // 1. Sum current account transactions (excluding transfers)
            const txAgg = await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        accountType: 'current',
                        specialCategory: { $ne: 'transfer' }
                    }
                },
                { $group: { _id: '$type', total: { $sum: '$amount' } } }
            ]);

            const income = txAgg.find(t => t._id === 'income')?.total || 0;
            const expenses = txAgg.find(t => t._id === 'expense')?.total || 0;
            let balance = income - expenses;

            console.log(`  - Income: ${income}`);
            console.log(`  - Expenses: ${expenses}`);
            console.log(`  - Net from transactions: ${balance}`);

            // 2. Add borrows from Main
            const borrowsIn = await Transfer.aggregate([
                {
                    $match: {
                        userId,
                        fromAccount: 'main',
                        toAccount: 'current',
                        status: 'completed'
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const borrowAmount = borrowsIn[0]?.total || 0;
            balance += borrowAmount;
            console.log(`  - Borrows from Main: +${borrowAmount}`);

            // 3. Subtract repayments to Main
            const repaymentsOut = await Transfer.aggregate([
                {
                    $match: {
                        userId,
                        fromAccount: 'current',
                        toAccount: 'main',
                        status: 'completed'
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const repayAmount = repaymentsOut[0]?.total || 0;
            balance -= repayAmount;
            console.log(`  - Repayments to Main: -${repayAmount}`);

            // Update account
            const oldBalance = account.balance;
            account.balance = balance;
            await account.save();

            console.log(`  ✅ Updated: ${oldBalance} → ${balance}`);
            console.log(`  Difference: ${balance - oldBalance}\n`);
        }

        console.log('✅ All current accounts recalculated successfully');
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

recalculateCurrentAccount();
