import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    type: {
        type: String,
        enum: ['bill_reminder', 'budget_alert', 'goal_milestone', 'anomaly', 'gamification', 'system'],
        required: true,
        index: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isRead: { type: Boolean, default: false, index: true },
    actionUrl: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for efficient querying of unread notifications by user
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
