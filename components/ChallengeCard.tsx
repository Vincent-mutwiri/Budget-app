import React from 'react';
import { Challenge } from '../types';

interface ChallengeCardProps {
    challenge: Challenge;
    onClaim: (challengeId: string) => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onClaim }) => {
    const progressPercentage = Math.min(100, (challenge.progress / challenge.target) * 100);
    const isCompleted = challenge.completed;
    const canClaim = isCompleted && !challenge.claimed;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'daily':
                return 'bg-blue-500';
            case 'weekly':
                return 'bg-purple-500';
            case 'monthly':
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getTypeLabel = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <div className={`bg-gray-800 rounded-lg p-4 border-2 ${isCompleted ? 'border-green-500' : 'border-gray-700'
            } transition-all hover:border-gray-600`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`${getTypeColor(challenge.type)} text-white text-xs px-2 py-1 rounded-full font-semibold`}>
                            {getTypeLabel(challenge.type)}
                        </span>
                        {isCompleted && (
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                ✓ Completed
                            </span>
                        )}
                    </div>
                    <h3 className="text-white font-semibold text-lg">{challenge.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">{challenge.description}</p>
                </div>
                <div className="text-right ml-4">
                    <div className="text-yellow-400 font-bold text-lg">+{challenge.xpReward} XP</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{challenge.progress} / {challenge.target}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    Resets: {new Date(challenge.resetTime).toLocaleDateString()}
                </div>
                {canClaim && (
                    <button
                        onClick={() => onClaim(challenge.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                        Claim Reward
                    </button>
                )}
                {challenge.claimed && (
                    <span className="text-gray-500 text-sm">Reward Claimed</span>
                )}
            </div>
        </div>
    );
};

export default ChallengeCard;
