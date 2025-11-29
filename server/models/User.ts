import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    fullName: { type: String },
    avatarUrl: { type: String },
    currency: { type: String, default: 'USD' },
    theme: { type: String, default: 'dark' },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    badges: { type: Number, default: 0 },
    monthlyIncome: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    // Security fields
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    mfaMethod: { type: String, enum: ['email', 'sms', 'app'], default: 'app' },
    backupCodes: [{ type: String }],
    passwordHash: { type: String },
    lastPasswordChange: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
