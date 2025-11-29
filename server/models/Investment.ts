import mongoose from 'mongoose';

const InvestmentSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['stock', 'bond', 'mutual_fund', 'etf', 'crypto', 'real_estate', 'other'],
        required: true
    },
    symbol: { type: String },
    initialAmount: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    ratePerAnnum: { type: Number, required: true },
    purchaseDate: { type: Date, required: true, index: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient querying of user's investments
InvestmentSchema.index({ userId: 1, purchaseDate: -1 });

export const Investment = mongoose.model('Investment', InvestmentSchema);
