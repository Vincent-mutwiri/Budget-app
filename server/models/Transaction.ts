import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Clerk ID
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    xpAwarded: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for performance optimization
TransactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model('Transaction', TransactionSchema);
