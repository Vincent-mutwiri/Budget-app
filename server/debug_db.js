
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent dir, same as server/index.ts
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Define minimal schemas
const transactionSchema = new mongoose.Schema({ userId: String, amount: Number });
const Transaction = mongoose.model('Transaction', transactionSchema);

const userSchema = new mongoose.Schema({ clerkId: String, email: String, fullName: String });
const User = mongoose.model('User', userSchema);

async function debugDB() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB');
        console.log('DB Name:', mongoose.connection.name);

        const users = await User.find({});
        console.log(`\nFound ${users.length} users:`);

        for (const u of users) {
            const txCount = await Transaction.countDocuments({ userId: u.clerkId });
            console.log(`- User: ${u.fullName} (${u.email})`);
            console.log(`  ClerkID: ${u.clerkId}`);
            console.log(`  Transactions: ${txCount}`);
        }

        const allTxs = await Transaction.countDocuments({});
        console.log(`\nTotal Transactions in DB: ${allTxs}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugDB();
