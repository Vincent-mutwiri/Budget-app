const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('./server/node_modules/mongoose');

async function fixTags() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
    
    const result = await Transaction.updateMany(
        { specialCategory: { $exists: false } },
        { $set: { accountType: 'current' } }
    );
    
    console.log(`✅ Fixed ${result.modifiedCount} transactions to 'current' account`);
    
    await mongoose.disconnect();
}

fixTags().catch(console.error);
