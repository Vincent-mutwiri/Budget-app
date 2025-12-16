import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Clerk ID
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    xpAwarded: { type: Number, default: 0 },

    // Account Separation Fields
    accountType: {
        type: String,
        enum: ['main', 'current', 'special'],
        default: 'current'
    },
    specialCategory: {
        type: String,
        enum: ['debt', 'investment', 'goal', 'transfer'],
        required: false
    },
    linkedEntityId: { type: String, required: false }, // ID of Debt/Investment/Goal
    transferType: {
        type: String,
        enum: ['borrow', 'repay', 'withdraw'],
        required: false
    },
    isVisible: { type: Boolean, default: true }, // Whether to show in day-to-day list

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index for performance optimization
TransactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model('Transaction', TransactionSchema);