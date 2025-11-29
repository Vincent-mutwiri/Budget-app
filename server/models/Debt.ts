import mongoose from 'mongoose';

const DebtPaymentSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    principalPaid: { type: Number, required: true },
    interestPaid: { type: Number, required: true }
}, { _id: true });

const DebtSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['credit_card', 'student_loan', 'mortgage', 'car_loan', 'personal_loan', 'other'],
        required: true
    },
    originalAmount: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    minimumPayment: { type: Number, required: true },
    dueDate: { type: Date, required: true, index: true },
    paymentHistory: [DebtPaymentSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient querying of user's debts and upcoming due dates
DebtSchema.index({ userId: 1, dueDate: 1 });

export const Debt = mongoose.model('Debt', DebtSchema);
