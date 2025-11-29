import mongoose from 'mongoose';

const UserSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    sessionToken: { type: String, required: true, unique: true },
    deviceInfo: {
        browser: { type: String },
        os: { type: String },
        ip: { type: String }
    },
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true }
});

// Index for automatic cleanup of expired sessions
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserSession = mongoose.model('UserSession', UserSessionSchema);
