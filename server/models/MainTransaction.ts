import mongoose, { Schema, Document } from 'mongoose';

export interface IMainTransaction extends Document {
    userId: string;
    amount: number;
    type: 'income' | 'expense';
    category: string; // e.g., 'Savings Goal', 'Investment', 'Debt Repayment', 'Transfer'
    description: string;
    date: Date;
    relatedEntityId?: string; // ID of the Goal, Investment, or Debt
    relatedTransferId?: string; // Link to a Transfer if applicable
}

const MainTransactionSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, default: Date.now, index: true },
    relatedEntityId: { type: String },
    relatedTransferId: { type: String }
}, {
    timestamps: true
});

export const MainTransaction = mongoose.model<IMainTransaction>('MainTransaction', MainTransactionSchema);
