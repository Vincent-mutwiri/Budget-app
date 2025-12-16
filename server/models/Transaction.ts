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
    // 'current' = Normal daily transactions (groceries, bills, etc.)
    // 'main' = Big expenses (debt payments, investments, savings goals)
    // 'special' = Special category transactions (hidden from day-to-day view)
    accountType: {
        type: String,
        enum: ['main', 'current', 'special'],
        default: 'current' // Default to current account for normal transactions
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

// Compound indexes for performance optimization
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, accountType: 1, date: -1 });
TransactionSchema.index({ userId: 1, isVisible: 1, date: -1 });
TransactionSchema.index({ userId: 1, specialCategory: 1, date: -1 });

export const Transaction = mongoose.model('Transaction', TransactionSchema);