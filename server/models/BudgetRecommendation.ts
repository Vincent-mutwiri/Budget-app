import mongoose from 'mongoose';

const BudgetRecommendationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    suggestedLimit: { type: Number, required: true },
    currentSpending: { type: Number, required: true },
    historicalAverage: { type: Number, required: true },
    potentialSavings: { type: Number, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    reasoning: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'dismissed'],
        default: 'pending',
        index: true
    },
    createdAt: { type: Date, default: Date.now }
});

// Index for efficient querying of pending recommendations
BudgetRecommendationSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const BudgetRecommendation = mongoose.model('BudgetRecommendation', BudgetRecommendationSchema);
