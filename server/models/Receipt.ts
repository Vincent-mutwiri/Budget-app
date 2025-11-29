import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
}, { _id: false });

const ReceiptSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    transactionId: { type: String, index: true },
    imageUrl: { type: String, required: true },
    extractedData: {
        merchantName: { type: String, default: '' },
        date: { type: String, default: '' },
        totalAmount: { type: Number, default: 0 },
        lineItems: [LineItemSchema]
    },
    confidence: {
        merchantName: { type: Number, default: 0, min: 0, max: 1 },
        date: { type: Number, default: 0, min: 0, max: 1 },
        totalAmount: { type: Number, default: 0, min: 0, max: 1 }
    },
    ocrStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true
    },
    createdAt: { type: Date, default: Date.now, index: true }
});

// Index for efficient querying of receipts by user and status
ReceiptSchema.index({ userId: 1, ocrStatus: 1, createdAt: -1 });

export const Receipt = mongoose.model('Receipt', ReceiptSchema);
