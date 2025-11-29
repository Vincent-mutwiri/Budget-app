import mongoose from 'mongoose';

const ChallengeSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    xpReward: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    resetTime: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

export const Challenge = mongoose.model('Challenge', ChallengeSchema);
