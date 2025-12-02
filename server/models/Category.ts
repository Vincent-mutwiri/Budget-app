import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model('Category', CategorySchema);
