import mongoose, { Schema, Document } from 'mongoose';

export interface ICurrentTransaction extends Document {
    userId: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    date: Date;
    isRecurring: boolean;
    recurringId?: string;
    relatedTransferId?: string; // Link to a Transfer if applicable
}

const CurrentTransactionSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, default: Date.now, index: true },
    isRecurring: { type: Boolean, default: false },
    recurringId: { type: String },
    relatedTransferId: { type: String }
}, {
    timestamps: true
});

export const CurrentTransaction = mongoose.model<ICurrentTransaction>('CurrentTransaction', CurrentTransactionSchema);
