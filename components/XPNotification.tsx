import React, { useEffect, useState } from 'react';
import { X, Star, TrendingUp, Award, Zap } from 'lucide-react';

export interface XPRewardData {
    baseXP: number;
    sameDayBonus: number;
    streakBonus: number;
    totalXP: number;
    newStreak: number;
    isSameDay?: boolean;
    levelUp?: {
        oldLevel: number;
        newLevel: number;
        levelName: string;
    };
    achievement?: {
        name: string;
        description: string;
        icon: string;
    };
}

interface XPNotificationProps {
    xpReward: XPRewardData;
    onClose: () => void;
    autoHideDuration?: number;
}

export const XPNotification: React.FC<XPNotificationProps> = ({
    xpReward,
    onClose,
    autoHideDuration = 5000
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        // Trigger animation
        setTimeout(() => setIsAnimating(true), 100);

        // Auto-hide after duration
        const timer = setTimeout(() => {
            handleClose();
        }, autoHideDuration);

        return () => clearTimeout(timer);
    }, [autoHideDuration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    if (!isVisible) return null;

    const hasBonus = xpReward.sameDayBonus > 0 || xpReward.streakBonus > 0;

    return (
        <div
            className={`fixed top-20 right-4 z-50 transition-all duration-500 transform ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
        >
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 rounded-2xl p-5 shadow-2xl backdrop-blur-sm min-w-[340px] max-w-[400px]">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-primary/20 p-3 rounded-xl animate-bounce-subtle">
                        <Star className="w-8 h-8 text-primary" fill="currentColor" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                            XP Earned!
                            <span className="text-2xl">🎉</span>
                        </h3>
                        <p className="text-forest-300 text-sm">
                            {xpReward.isSameDay ? 'Same-day logging bonus!' : 'Keep up the great work!'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-forest-400 hover:text-white transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* XP Breakdown */}
                <div className="space-y-2 mb-4">
                    {/* Base XP */}
                    <div className="flex justify-between items-center p-2 rounded-lg bg-forest-900/50">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-forest-300" />
                            <span className="text-forest-300 text-sm">Base XP:</span>
                        </div>
                        <span className="text-white font-semibold">+{xpReward.baseXP}</span>
                    </div>

                    {/* Same-Day Bonus */}
                    {xpReward.sameDayBonus > 0 && (
                        <div className="flex justify-between items-center p-2 rounded-lg bg-primary/10 border border-primary/20 animate-slide-in">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-primary" />
                                <span className="text-primary text-sm font-medium">Same-Day Bonus:</span>
                            </div>
                            <span className="text-primary font-bold">+{xpReward.sameDayBonus}</span>
                        </div>
                    )}

                    {/* Streak Bonus */}
                    {xpReward.streakBonus > 0 && (
                        <div className="flex justify-between items-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 animate-slide-in" style={{ animationDelay: '0.1s' }}>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                </svg>
                                <span className="text-orange-500 text-sm font-medium">Streak Bonus:</span>
                            </div>
                            <span className="text-orange-500 font-bold">+{xpReward.streakBonus}</span>
                        </div>
                    )}

                    {/* Total XP */}
                    <div className="pt-3 mt-2 border-t border-primary/20 flex justify-between items-center">
                        <span className="text-white font-bold text-base">Total XP:</span>
                        <span className="text-primary font-bold text-2xl animate-pulse">+{xpReward.totalXP}</span>
                    </div>
                </div>

                {/* Streak Info */}
                {xpReward.newStreak > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4 animate-slide-in" style={{ animationDelay: '0.2s' }}>
                        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        <span className="text-orange-500 text-sm font-medium flex-1">
                            {xpReward.newStreak} day streak! 🔥
                        </span>
                        <span className="text-orange-500 text-xs font-bold">Keep it up!</span>
                    </div>
                )}

                {/* Level Up Notification */}
                {xpReward.levelUp && (
                    <div className="p-4 bg-gradient-to-r from-amber-500/20 to-primary/20 border border-primary/30 rounded-xl animate-bounce-subtle">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-primary flex items-center justify-center">
                                <Award className="text-white" size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-base mb-1">Level Up!</h4>
                                <p className="text-forest-300 text-sm">
                                    Level {xpReward.levelUp.oldLevel} → <span className="text-primary font-bold">Level {xpReward.levelUp.newLevel}</span>
                                </p>
                                <p className="text-primary text-xs font-medium mt-1">
                                    {xpReward.levelUp.levelName}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Achievement Unlocked */}
                {xpReward.achievement && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/20 to-primary/20 border border-purple-500/30 rounded-xl animate-slide-in" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center gap-3">
                            <div className="text-3xl">{xpReward.achievement.icon}</div>
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm mb-1">Achievement Unlocked!</h4>
                                <p className="text-purple-300 text-xs font-medium">{xpReward.achievement.name}</p>
                                <p className="text-forest-400 text-xs mt-1">{xpReward.achievement.description}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Indicator */}
                <div className="mt-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 h-1 bg-forest-900 rounded-full overflow-hidden"
                        >
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{
                                    width: i < Math.min(5, Math.ceil(xpReward.totalXP / 10)) ? '100%' : '0%',
                                    transitionDelay: `${i * 100}ms`
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Add custom animations to your global CSS or tailwind config
// @keyframes bounce-subtle {
//   0%, 100% { transform: translateY(0); }
//   50% { transform: translateY(-5px); }
// }
// @keyframes slide-in {
//   from { transform: translateX(20px); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// }
