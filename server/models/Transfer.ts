import mongoose from 'mongoose';

const TransferSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    fromAccount: {
        type: String,
        enum: ['main', 'current', 'debt', 'investment', 'goal'],
        required: true
    },
    toAccount: {
        type: String,
        enum: ['main', 'current'],
        required: true
    },
    amount: { type: Number, required: true },
    type: {
        type: String,
        enum: ['borrow', 'repay', 'withdraw', 'deposit'],
        required: true
    },
    linkedEntityId: { type: String }, // For transfers involving special accounts
    date: { type: Date, default: Date.now },
    description: { type: String },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'completed'
    },
    createdAt: { type: Date, default: Date.now }
});

// Indexes for performance
TransferSchema.index({ userId: 1, date: -1 });
TransferSchema.index({ userId: 1, status: 1 });

export const Transfer = mongoose.model('Transfer', TransferSchema);
