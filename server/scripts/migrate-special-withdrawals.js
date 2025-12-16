require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

async function migrateSpecialWithdrawals() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Transfer = mongoose.model('Transfer', new mongoose.Schema({}, { strict: false }));
        const Account = mongoose.model('Account', new mongoose.Schema({}, { strict: false }));

        // Find all withdrawals from special accounts that went to current
        const withdrawals = await Transfer.find({
            type: 'withdraw',
            fromAccount: { $in: ['debt', 'investment', 'goal'] },
            toAccount: 'current'
        });

        console.log(`Found ${withdrawals.length} special account withdrawals to migrate`);

        for (const withdrawal of withdrawals) {
            const userId = withdrawal.userId;
            const amount = withdrawal.amount;

            // Get accounts
            const mainAccount = await Account.findOne({ userId, accountType: 'main' });
            const currentAccount = await Account.findOne({ userId, accountType: 'current' });

            if (!mainAccount || !currentAccount) {
                console.log(`⚠️  Skipping transfer ${withdrawal._id} - accounts not found`);
                continue;
            }

            // Move money from current to main
            currentAccount.balance -= amount;
            mainAccount.balance += amount;

            await currentAccount.save();
            await mainAccount.save();

            // Update transfer record
            withdrawal.toAccount = 'main';
            await withdrawal.save();

            console.log(`✅ Migrated withdrawal ${withdrawal._id}: ${amount} from ${withdrawal.fromAccount} now goes to main`);
        }

        console.log(`\n✅ Migration completed: ${withdrawals.length} withdrawals updated`);
        console.log('   - Special account withdrawals now go to Main Account');
        console.log('   - Account balances have been adjusted');

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

migrateSpecialWithdrawals();
