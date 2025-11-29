import mongoose from 'mongoose';

const BudgetSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    icon: { type: String, default: 'tag' },
    createdAt: { type: Date, default: Date.now }
});

export const Budget = mongoose.model('Budget', BudgetSchema);
