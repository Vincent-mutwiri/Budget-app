import mongoose from 'mongoose';

const RecurringTransactionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    nextOccurrence: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    reminderEnabled: { type: Boolean, default: false },
    reminderDaysBefore: { type: Number, default: 3 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient querying of active recurring transactions due for processing
RecurringTransactionSchema.index({ userId: 1, isActive: 1, nextOccurrence: 1 });

RecurringTransactionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete (ret as any)._id;
    }
});

export const RecurringTransaction = mongoose.model('RecurringTransaction', RecurringTransactionSchema);
