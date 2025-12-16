require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

async function fixTransferVisibility() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

        // Update all transfer transactions (borrow/repay) to be invisible
        const result = await Transaction.updateMany(
            {
                specialCategory: 'transfer',
                transferType: { $in: ['borrow', 'repay'] }
            },
            {
                $set: { isVisible: false }
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} transfer transactions to be invisible`);
        console.log('   - Borrow and repay transactions will no longer show in day-to-day view');
        console.log('   - They can still be viewed in Special Transactions view');

        await mongoose.connection.close();
        console.log('\n✅ Script completed successfully');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixTransferVisibility();
