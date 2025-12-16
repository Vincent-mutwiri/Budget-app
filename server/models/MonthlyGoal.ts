import mongoose from 'mongoose';

const MonthlyGoalSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

MonthlyGoalSchema.index({ userId: 1, month: 1, year: 1 });

export const MonthlyGoal = mongoose.model('MonthlyGoal', MonthlyGoalSchema);
