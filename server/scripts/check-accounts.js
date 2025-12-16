require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

async function checkAccounts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const Account = mongoose.model('Account', new mongoose.Schema({}, { strict: false }));
        
        const allAccounts = await Account.find({});
        console.log(`Total accounts: ${allAccounts.length}\n`);

        for (const account of allAccounts) {
            console.log('Account:', {
                id: account._id,
                userId: account.userId,
                accountType: account.accountType,
                name: account.name,
                balance: account.balance,
                isMain: account.isMain
            });
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAccounts();
