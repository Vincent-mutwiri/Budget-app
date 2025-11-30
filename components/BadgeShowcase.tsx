import React, { useState } from 'react';
import { Badge } from '../types';
import { Modal } from './Modal';

interface BadgeShowcaseProps {
    badges: Badge[];
}

const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ badges }) => {
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    const unlockedBadges = badges.filter(b => b.isUnlocked);
    const lockedBadges = badges.filter(b => !b.isUnlocked);

    return (
        <div>
            {/* Unlocked Badges Section */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">
                    Earned Badges ({unlockedBadges.length})
                </h3>
                {unlockedBadges.length === 0 ? (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <p className="text-gray-400">
                            Complete challenges and achievements to earn badges!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {unlockedBadges.map((badge) => (
                            <div
                                key={badge.id}
                                onClick={() => setSelectedBadge(badge)}
                                className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border-2 border-green-500"
                            >
                                <div className="text-5xl text-center mb-2">{badge.icon}</div>
                                <h4 className="text-white font-semibold text-sm text-center truncate">
                                    {badge.name}
                                </h4>
                                <p className="text-gray-400 text-xs text-center mt-1">
                                    Unlocked
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Locked Badges Section */}
            <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                    Locked Badges ({lockedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {lockedBadges.map((badge) => (
                        <div
                            key={badge.id}
                            onClick={() => setSelectedBadge(badge)}
                            className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border-2 border-gray-700 opacity-60"
                        >
                            <div className="text-5xl text-center mb-2 grayscale">
                                {badge.icon}
                            </div>
                            <h4 className="text-gray-400 font-semibold text-sm text-center truncate">
                                {badge.name}
                            </h4>
                            <p className="text-gray-500 text-xs text-center mt-1">
                                Locked
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Badge Details Modal */}
            {selectedBadge && (
                <Modal
                    isOpen={true}
                    onClose={() => setSelectedBadge(null)}
                    title="Badge Details"
                >
                    <div className="text-center">
                        <div className={`text-8xl mb-4 ${!selectedBadge.isUnlocked && 'grayscale opacity-60'}`}>
                            {selectedBadge.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {selectedBadge.name}
                        </h2>
                        <p className="text-gray-400 mb-4">
                            {selectedBadge.description}
                        </p>
                        <div className="bg-gray-800 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-400 mb-1">Unlock Requirement:</p>
                            <p className="text-white font-semibold">
                                {selectedBadge.unlockRequirement}
                            </p>
                        </div>
                        {selectedBadge.isUnlocked ? (
                            <div className="bg-green-500 bg-opacity-20 border border-green-500 rounded-lg p-3">
                                <p className="text-green-400 font-semibold">
                                    ✓ Badge Unlocked!
                                </p>
                            </div>
                        ) : (
                            <div className="bg-gray-700 rounded-lg p-3">
                                <p className="text-gray-400">
                                    Keep working to unlock this badge!
                                </p>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default BadgeShowcase;
