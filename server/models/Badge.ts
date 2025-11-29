import mongoose from 'mongoose';

const BadgeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    unlockRequirement: { type: String, required: true },
    category: { type: String, required: true }
});

const UserBadgeSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    badgeId: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now }
});

export const Badge = mongoose.model('Badge', BadgeSchema);
export const UserBadge = mongoose.model('UserBadge', UserBadgeSchema);
