import mongoose from 'mongoose';

const UserPreferencesSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    notifications: {
        budgetAlerts: { type: Boolean, default: true },
        budgetThresholds: { type: [Number], default: [50, 75, 80, 90, 100] },
        billReminders: { type: Boolean, default: true },
        reminderDaysBefore: { type: [Number], default: [1, 3, 7, 14] },
        goalMilestones: { type: Boolean, default: true },
        anomalyAlerts: { type: Boolean, default: true },
        gamificationNotifications: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: true }
    },
    security: {
        mfaEnabled: { type: Boolean, default: false },
        mfaMethod: { type: String, enum: ['email', 'sms', 'app'], default: 'email' },
        lastPasswordChange: { type: Date, default: Date.now },
        autoLogoutMinutes: { type: Number, default: 30 }
    },
    display: {
        currency: { type: String, default: 'USD' },
        theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
        language: { type: String, default: 'en' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const UserPreferences = mongoose.model('UserPreferences', UserPreferencesSchema);
