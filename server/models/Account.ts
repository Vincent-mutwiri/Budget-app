import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['asset', 'liability'], required: true },
    balance: { type: Number, default: 0 },
    institution: { type: String },
    logoUrl: { type: String },
    lastSynced: { type: Date, default: Date.now },
    syncStatus: { type: String, enum: ['success', 'error'], default: 'success' },
    createdAt: { type: Date, default: Date.now }
});

export const Account = mongoose.model('Account', AccountSchema);
