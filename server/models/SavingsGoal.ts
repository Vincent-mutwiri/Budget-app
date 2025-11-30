import mongoose from 'mongoose';

const SavingsGoalSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    deadline: { type: Date, required: true },
    imageUrl: { type: String }, // AWS S3 URL
    status: { type: String, enum: ['in-progress', 'completed', 'archived'], default: 'in-progress' },
    contributions: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for performance optimization
SavingsGoalSchema.index({ userId: 1, status: 1 });

export const SavingsGoal = mongoose.model('SavingsGoal', SavingsGoalSchema);
