import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';

async function fixTransactionTags() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || '');
        
        // Update all transactions without specialCategory to 'current'
        const result = await Transaction.updateMany(
            { 
                specialCategory: { $exists: false },
                accountType: { $ne: 'current' }
            },
            { 
                $set: { accountType: 'current' }
            }
        );
        
        console.log(`✅ Fixed ${result.modifiedCount} transactions`);
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

fixTransactionTags();
