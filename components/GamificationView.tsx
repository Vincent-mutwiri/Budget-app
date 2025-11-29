import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import ChallengeCard from './ChallengeCard';
import BadgeShowcase from './BadgeShowcase';
import Leaderboard from './Leaderboard';
import { Challenge, Badge, LeaderboardEntry, UserGamificationState } from '../types';
import { Calendar, LayoutGrid, Target, Trophy, Award, TrendingUp } from 'lucide-react';

interface GamificationViewProps {
    onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

const GamificationView: React.FC<GamificationViewProps> = ({ onShowNotification }) => {
    const { user } = useUser();
    const userId = user?.id || '';

    const [activeTab, setActiveTab] = useState<'challenges' | 'achievements' | 'leaderboards'>('challenges');
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [gamificationState, setGamificationState] = useState<UserGamificationState | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch gamification data
    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch challenges
                const challengesRes = await fetch(`http://localhost:5000/api/gamification/challenges?userId=${userId}`);
                const challengesData = await challengesRes.json();
                setChallenges(challengesData);

                // Fetch badges
                const badgesRes = await fetch(`http://localhost:5000/api/gamification/badges?userId=${userId}`);
                const badgesData = await badgesRes.json();
                setBadges(badgesData);

                // Fetch leaderboard
                const leaderboardRes = await fetch(`http://localhost:5000/api/gamification/leaderboard?limit=100`);
                const leaderboardData = await leaderboardRes.json();
                setLeaderboard(leaderboardData);

                // Fetch user gamification state
                const stateRes = await fetch(`http://localhost:5000/api/gamification/state?userId=${userId}`);
                const stateData = await stateRes.json();
                setGamificationState(stateData);

            } catch (error) {
                console.error('Error fetching gamification data:', error);
                onShowNotification?.('Failed to load gamification data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    // Handle claim challenge reward
    const handleClaimReward = async (challengeId: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/gamification/challenges/${challengeId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to claim reward');
            }

            // Update challenges list
            setChallenges(prev =>
                prev.map(c =>
                    c.id === challengeId ? { ...c, claimed: true } : c
                )
            );

            // Refresh gamification state
            const stateRes = await fetch(`http://localhost:5000/api/gamification/state?userId=${userId}`);
            const stateData = await stateRes.json();
            setGamificationState(stateData);

            onShowNotification?.('Challenge reward claimed successfully!', 'success');
        } catch (error: any) {
            console.error('Error claiming reward:', error);
            onShowNotification?.(error.message || 'Failed to claim reward', 'error');
        }
    };

    // Calculate level progress
    const getLevelProgress = () => {
        if (!gamificationState) return 0;
        return gamificationState.levelProgress;
    };

    // Get level name
    const getLevelName = (level: number) => {
        const levelNames = [
            'Beginner', 'Novice', 'Apprentice', 'Intermediate', 'Advanced',
            'Expert', 'Master', 'Grandmaster', 'Legend', 'Financial Guru'
        ];
        return levelNames[level - 1] || 'Unknown';
    };

    // Filter challenges by type
    const dailyChallenges = challenges.filter(c => c.type === 'daily');
    const weeklyChallenges = challenges.filter(c => c.type === 'weekly');
    const monthlyChallenges = challenges.filter(c => c.type === 'monthly');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-white text-lg">Loading gamification data...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white mb-1">Gamification Hub</h2>
                <p className="text-gray-400">
                    Track your progress, earn badges, and complete challenges to level up your finances.
                </p>
            </div>

            {/* Level Progress Card */}
            {gamificationState && (
                <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 border-4 border-blue-500">
                            <Trophy className="text-white" size={48} />
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">
                                        Level {gamificationState.level} - {getLevelName(gamificationState.level)}
                                    </h3>
                                    <p className="text-gray-400 text-sm">Keep up the great work!</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold text-xl">{gamificationState.xp}</div>
                                        <div className="text-gray-500 text-xs">Total XP</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-orange-400 font-bold text-xl flex items-center gap-1">
                                            🔥 {gamificationState.streak}
                                        </div>
                                        <div className="text-gray-500 text-xs">Day Streak</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-green-400 font-bold text-xl">#{gamificationState.rank}</div>
                                        <div className="text-gray-500 text-xs">Rank</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>Progress to Next Level</span>
                                    <span>{Math.round(getLevelProgress())}%</span>
                                </div>
                                <div className="w-full bg-gray-900 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                                        style={{ width: `${getLevelProgress()}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-900 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('challenges')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'challenges'
                            ? 'bg-gray-800 text-white border border-gray-700'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Calendar className="inline mr-2" size={16} />
                    Challenges
                </button>
                <button
                    onClick={() => setActiveTab('achievements')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'achievements'
                            ? 'bg-gray-800 text-white border border-gray-700'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Award className="inline mr-2" size={16} />
                    Achievements
                </button>
                <button
                    onClick={() => setActiveTab('leaderboards')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'leaderboards'
                            ? 'bg-gray-800 text-white border border-gray-700'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <TrendingUp className="inline mr-2" size={16} />
                    Leaderboards
                </button>
            </div>

            {/* Challenges Tab */}
            {activeTab === 'challenges' && (
                <div className="space-y-8">
                    {/* Daily Challenges */}
                    {dailyChallenges.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="text-blue-500" size={24} />
                                    Daily Challenges
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {dailyChallenges.map(challenge => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        challenge={challenge}
                                        onClaim={handleClaimReward}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weekly Challenges */}
                    {weeklyChallenges.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <LayoutGrid className="text-purple-500" size={24} />
                                    Weekly Challenges
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {weeklyChallenges.map(challenge => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        challenge={challenge}
                                        onClaim={handleClaimReward}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Monthly Challenges */}
                    {monthlyChallenges.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Target className="text-orange-500" size={24} />
                                    Monthly Challenges
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {monthlyChallenges.map(challenge => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        challenge={challenge}
                                        onClaim={handleClaimReward}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {challenges.length === 0 && (
                        <div className="bg-gray-800 rounded-lg p-12 text-center">
                            <p className="text-gray-400">No challenges available at the moment.</p>
                            <p className="text-gray-500 text-sm mt-2">Check back later for new challenges!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
                <BadgeShowcase badges={badges} />
            )}

            {/* Leaderboards Tab */}
            {activeTab === 'leaderboards' && (
                <Leaderboard leaderboard={leaderboard} currentUserId={userId} />
            )}
        </div>
    );
};

export default GamificationView;
