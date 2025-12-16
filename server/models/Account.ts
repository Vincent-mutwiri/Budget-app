import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['asset', 'liability'], required: true },
    balance: { type: Number, default: 0 },
    isMain: { type: Boolean, default: false },
    institution: { type: String },
    logoUrl: { type: String },
    lastSynced: { type: Date, default: Date.now },
    syncStatus: { type: String, enum: ['success', 'error'], default: 'success' },

    // Account Separation Fields
    accountCategory: {
        type: String,
        enum: ['main', 'current'],
        default: 'main' // Default existing accounts to main, migration script will handle splitting
    },
    monthlyBudget: { type: Number, default: 0 }, // For current account
    lastRolloverDate: { type: Date },

    createdAt: { type: Date, default: Date.now }
});

AccountSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete (ret as any)._id;
    }
});

export const Account = mongoose.model('Account', AccountSchema);
