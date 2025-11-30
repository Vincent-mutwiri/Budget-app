import React, { useState, useEffect } from 'react';
import { CheckCircle2, TrendingUp, Award, Target, Flame } from 'lucide-react';
import { formatCurrency } from '../constants';

interface BudgetAdherenceReward {
    type: 'daily' | 'weekly' | 'monthly';
    xpAwarded: number;
    categoriesWithinBudget: string[];
    totalCategories: number;
    achievementUnlocked?: string;
    adherencePercentage: number;
}

interface BudgetAdherenceStreak {
    currentStreak: number;
    longestStreak: number;
    lastCheckDate: string;
}

interface BudgetAdherenceRewardsProps {
    userId: string;
    budgets: Array<{ category: string; limit: number; spent: number }>;
}

export const BudgetAdherenceRewards: React.FC<BudgetAdherenceRewardsProps> = ({ userId, budgets }) => {
    const [dailyReward, setDailyReward] = useState<BudgetAdherenceReward | null>(null);
    const [weeklyReward, setWeeklyReward] = useState<BudgetAdherenceReward | null>(null);
    const [monthlyReward, setMonthlyReward] = useState<BudgetAdherenceReward | null>(null);
    const [adherenceStreak, setAdherenceStreak] = useState<BudgetAdherenceStreak>({
        currentStreak: 0,
        longestStreak: 0,
        lastCheckDate: new Date().toISOString()
    });
    const [loading, setLoading] = useState(false);

    // Calculate budget adherence locally
    const calculateAdherence = () => {
        if (budgets.length === 0) return null;

        const categoriesWithinBudget = budgets.filter(b => b.spent <= b.limit);
        const adherencePercentage = (categoriesWithinBudget.length / budgets.length) * 100;

        return {
            categoriesWithinBudget: categoriesWithinBudget.map(b => b.category),
            totalCategories: budgets.length,
            adherencePercentage,
            withinBudgetCount: categoriesWithinBudget.length
        };
    };

    const adherenceData = calculateAdherence();

    // Fetch budget adherence rewards from backend
    useEffect(() => {
        const fetchRewards = async () => {
            if (!userId) return;

            setLoading(true);
            try {
                // In a real implementation, these would be API calls
                // For now, we'll simulate the data based on current budgets
                const adherence = calculateAdherence();

                if (adherence && adherence.adherencePercentage >= 50) {
                    // Simulate daily reward
                    setDailyReward({
                        type: 'daily',
                        xpAwarded: adherence.adherencePercentage === 100 ? 30 : 20,
                        categoriesWithinBudget: adherence.categoriesWithinBudget,
                        totalCategories: adherence.totalCategories,
                        adherencePercentage: adherence.adherencePercentage
                    });

                    // Simulate weekly reward (if applicable)
                    if (adherence.adherencePercentage >= 75) {
                        setWeeklyReward({
                            type: 'weekly',
                            xpAwarded: adherence.adherencePercentage === 100 ? 75 : 50,
                            categoriesWithinBudget: adherence.categoriesWithinBudget,
                            totalCategories: adherence.totalCategories,
                            adherencePercentage: adherence.adherencePercentage
                        });
                    }

                    // Simulate monthly reward (if applicable)
                    if (adherence.adherencePercentage === 100) {
                        setMonthlyReward({
                            type: 'monthly',
                            xpAwarded: 150,
                            categoriesWithinBudget: adherence.categoriesWithinBudget,
                            totalCategories: adherence.totalCategories,
                            adherencePercentage: adherence.adherencePercentage,
                            achievementUnlocked: 'budget_master'
                        });
                    }

                    // Simulate streak data
                    setAdherenceStreak({
                        currentStreak: 5,
                        longestStreak: 12,
                        lastCheckDate: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Failed to fetch budget adherence rewards:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRewards();
    }, [userId, budgets]);

    if (loading) {
        return (
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-forest-700 rounded w-1/3"></div>
                    <div className="h-20 bg-forest-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (!adherenceData || adherenceData.adherencePercentage < 50) {
        return (
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Target className="text-amber-500" size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white">Budget Adherence</h3>
                </div>
                <p className="text-forest-400 text-sm">
                    Stay within your budgets to earn XP rewards and unlock achievements!
                </p>
                <div className="mt-4 p-4 bg-forest-900 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-forest-300 text-sm">Current Progress</span>
                        <span className="text-white font-bold">{Math.round(adherenceData?.adherencePercentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-forest-950 rounded-full h-2">
                        <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${adherenceData?.adherencePercentage || 0}%` }}
                        />
                    </div>
                    <p className="text-forest-500 text-xs mt-2">
                        {adherenceData?.withinBudgetCount || 0} of {adherenceData?.totalCategories || 0} categories within budget
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Budget Adherence Overview */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Budget Adherence</h3>
                            <p className="text-forest-300 text-sm">Great job staying on track!</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-primary">{Math.round(adherenceData.adherencePercentage)}%</div>
                        <div className="text-forest-400 text-xs">Adherence Rate</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="w-full bg-forest-950 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all duration-500"
                            style={{ width: `${adherenceData.adherencePercentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-forest-400 text-xs">
                            {adherenceData.withinBudgetCount} of {adherenceData.totalCategories} categories
                        </span>
                        {adherenceData.adherencePercentage === 100 && (
                            <span className="text-primary text-xs font-bold flex items-center gap-1">
                                <Award size={12} />
                                Perfect!
                            </span>
                        )}
                    </div>
                </div>

                {/* Categories Within Budget */}
                <div className="flex flex-wrap gap-2">
                    {adherenceData.categoriesWithinBudget.map((category) => (
                        <span
                            key={category}
                            className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium flex items-center gap-1"
                        >
                            <CheckCircle2 size={12} />
                            {category}
                        </span>
                    ))}
                </div>
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Daily Reward */}
                {dailyReward && (
                    <div className="bg-forest-800 border border-forest-700 rounded-2xl p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <TrendingUp className="text-blue-500" size={16} />
                                </div>
                                <span className="text-white font-bold text-sm">Daily</span>
                            </div>
                            <span className="text-primary font-bold text-lg">+{dailyReward.xpAwarded} XP</span>
                        </div>
                        <p className="text-forest-400 text-xs">
                            {dailyReward.adherencePercentage === 100 ? 'Perfect adherence today!' : 'Good progress today!'}
                        </p>
                    </div>
                )}

                {/* Weekly Reward */}
                {weeklyReward && (
                    <div className="bg-forest-800 border border-forest-700 rounded-2xl p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Award className="text-purple-500" size={16} />
                                </div>
                                <span className="text-white font-bold text-sm">Weekly</span>
                            </div>
                            <span className="text-primary font-bold text-lg">+{weeklyReward.xpAwarded} XP</span>
                        </div>
                        <p className="text-forest-400 text-xs">
                            {weeklyReward.adherencePercentage === 100 ? 'Perfect week!' : 'Great week!'}
                        </p>
                    </div>
                )}

                {/* Monthly Reward */}
                {monthlyReward && (
                    <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <Award className="text-amber-500" size={16} />
                                </div>
                                <span className="text-white font-bold text-sm">Monthly</span>
                            </div>
                            <span className="text-amber-500 font-bold text-lg">+{monthlyReward.xpAwarded} XP</span>
                        </div>
                        <p className="text-amber-400 text-xs font-medium">
                            🏆 Perfect month! Achievement unlocked!
                        </p>
                    </div>
                )}
            </div>

            {/* Budget Adherence Streak */}
            <div className="bg-forest-800 border border-forest-700 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <Flame className="text-orange-500" size={20} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold">Budget Adherence Streak</h4>
                            <p className="text-forest-400 text-xs">Keep it going!</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-orange-500 flex items-center gap-1">
                            <Flame size={20} />
                            {adherenceStreak.currentStreak}
                        </div>
                        <div className="text-forest-400 text-xs">
                            Best: {adherenceStreak.longestStreak} days
                        </div>
                    </div>
                </div>
            </div>

            {/* Achievement Unlocked */}
            {monthlyReward?.achievementUnlocked && (
                <div className="bg-gradient-to-r from-amber-500/20 via-primary/20 to-purple-500/20 border border-primary/30 rounded-2xl p-5 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-primary flex items-center justify-center">
                            <Award className="text-white" size={32} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white font-bold text-lg mb-1">Achievement Unlocked!</h4>
                            <p className="text-forest-300 text-sm">
                                Budget Master - Stay within budget for 3 consecutive months
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
