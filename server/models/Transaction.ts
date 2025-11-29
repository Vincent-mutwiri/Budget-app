import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Clerk ID
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    createdAt: { type: Date, default: Date.now }
});

export const Transaction = mongoose.model('Transaction', TransactionSchema);
