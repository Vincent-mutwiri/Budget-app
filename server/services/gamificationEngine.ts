import { User } from '../models/User';
import { Challenge } from '../models/Challenge';
import { Badge, UserBadge } from '../models/Badge';
import { Notification } from '../models/Notification';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';

// XP thresholds for each level
const LEVEL_THRESHOLDS = [
    { level: 1, minXP: 0, maxXP: 100, name: 'Beginner' },
    { level: 2, minXP: 100, maxXP: 250, name: 'Novice' },
    { level: 3, minXP: 250, maxXP: 500, name: 'Apprentice' },
    { level: 4, minXP: 500, maxXP: 1000, name: 'Intermediate' },
    { level: 5, minXP: 1000, maxXP: 2000, name: 'Advanced' },
    { level: 6, minXP: 2000, maxXP: 3500, name: 'Expert' },
    { level: 7, minXP: 3500, maxXP: 5500, name: 'Master' },
    { level: 8, minXP: 5500, maxXP: 8000, name: 'Grandmaster' },
    { level: 9, minXP: 8000, maxXP: 11000, name: 'Legend' },
    { level: 10, minXP: 11000, maxXP: Infinity, name: 'Financial Guru' }
];

// XP rewards for different actions
export const XP_REWARDS = {
    ADD_TRANSACTION: 10,
    ADD_BUDGET: 20,
    COMPLETE_GOAL: 100,
    ADD_SAVINGS_GOAL: 30,
    ADD_RECURRING_TRANSACTION: 25,
    SCAN_RECEIPT: 15,
    ADD_INVESTMENT: 40,
    ADD_DEBT: 30,
    RECORD_DEBT_PAYMENT: 20,
    ACCEPT_BUDGET_RECOMMENDATION: 35,
    MAINTAIN_STREAK: 50,
    SAME_DAY_BONUS: 15,
    STREAK_MULTIPLIER: 2,
    BUDGET_ADHERENCE_DAILY: 20,
    BUDGET_ADHERENCE_WEEKLY: 50,
    BUDGET_ADHERENCE_MONTHLY: 150
};

// Badge definitions
export const BADGE_DEFINITIONS = [
    {
        id: 'first_transaction',
        name: 'First Steps',
        description: 'Add your first transaction',
        icon: '🎯',
        unlockRequirement: 'Add 1 transaction',
        category: 'transactions'
    },
    {
        id: 'transaction_master',
        name: 'Transaction Master',
        description: 'Add 100 transactions',
        icon: '📊',
        unlockRequirement: 'Add 100 transactions',
        category: 'transactions'
    },
    {
        id: 'budget_creator',
        name: 'Budget Creator',
        description: 'Create your first budget',
        icon: '💰',
        unlockRequirement: 'Create 1 budget',
        category: 'budgets'
    },
    {
        id: 'budget_master',
        name: 'Budget Master',
        description: 'Stay within budget for 3 consecutive months',
        icon: '🏆',
        unlockRequirement: 'Stay within budget for 3 months',
        category: 'budgets'
    },
    {
        id: 'goal_setter',
        name: 'Goal Setter',
        description: 'Create your first savings goal',
        icon: '🎯',
        unlockRequirement: 'Create 1 savings goal',
        category: 'goals'
    },
    {
        id: 'goal_achiever',
        name: 'Goal Achiever',
        description: 'Complete your first savings goal',
        icon: '⭐',
        unlockRequirement: 'Complete 1 savings goal',
        category: 'goals'
    },
    {
        id: 'streak_starter',
        name: 'Streak Starter',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        unlockRequirement: 'Maintain 7-day streak',
        category: 'streaks'
    },
    {
        id: 'streak_champion',
        name: 'Streak Champion',
        description: 'Maintain a 30-day streak',
        icon: '🔥🔥',
        unlockRequirement: 'Maintain 30-day streak',
        category: 'streaks'
    },
    {
        id: 'investor',
        name: 'Investor',
        description: 'Add your first investment',
        icon: '📈',
        unlockRequirement: 'Add 1 investment',
        category: 'investments'
    },
    {
        id: 'debt_warrior',
        name: 'Debt Warrior',
        description: 'Pay off your first debt',
        icon: '⚔️',
        unlockRequirement: 'Pay off 1 debt',
        category: 'debts'
    }
];

/**
 * Interface for transaction XP reward breakdown
 */
export interface TransactionXPReward {
    baseXP: number;
    sameDayBonus: number;
    streakBonus: number;
    totalXP: number;
    newStreak: number;
    isSameDay: boolean;
}

/**
 * Interface for budget adherence reward
 */
export interface BudgetAdherenceReward {
    type: 'daily' | 'weekly' | 'monthly';
    xpAwarded: number;
    categoriesWithinBudget: string[];
    totalCategories: number;
    achievementUnlocked?: string;
    adherencePercentage: number;
}

/**
 * Calculate XP reward for a transaction with same-day bonus
 * @param transactionDate - The date of the transaction
 * @param currentDate - The current date (defaults to now)
 * @param userStreak - The user's current streak
 * @returns TransactionXPReward breakdown
 */
export function calculateTransactionXP(
    transactionDate: Date,
    currentDate: Date = new Date(),
    userStreak: number = 0
): TransactionXPReward {
    const baseXP = XP_REWARDS.ADD_TRANSACTION;

    // Check if transaction date is the same as current date (same day)
    const isSameDay = isSameDateAs(transactionDate, currentDate);

    // Award same-day bonus only if transaction is logged on the same day
    const sameDayBonus = isSameDay ? XP_REWARDS.SAME_DAY_BONUS : 0;

    // Calculate streak bonus (only for same-day transactions)
    const streakBonus = isSameDay ? userStreak * XP_REWARDS.STREAK_MULTIPLIER : 0;

    // Calculate new streak (increment if same-day, otherwise reset to 0)
    const newStreak = isSameDay ? userStreak + 1 : 0;

    // Calculate total XP
    const totalXP = baseXP + sameDayBonus + streakBonus;

    return {
        baseXP,
        sameDayBonus,
        streakBonus,
        totalXP,
        newStreak,
        isSameDay
    };
}

/**
 * Check if two dates are on the same calendar day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates are on the same day
 */
function isSameDateAs(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

/**
 * Award XP for a transaction with same-day bonus calculation
 * @param userId - The user's Clerk ID
 * @param transactionDate - The date of the transaction
 * @returns TransactionXPReward breakdown
 */
export async function awardTransactionXP(
    userId: string,
    transactionDate: Date
): Promise<TransactionXPReward> {
    try {
        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        const currentDate = new Date();
        const currentStreak = user.streak || 0;

        // Calculate XP reward with same-day bonus
        const xpReward = calculateTransactionXP(transactionDate, currentDate, currentStreak);

        // Update user XP
        const oldXP = user.xp || 0;
        const oldLevel = user.level || 1;
        user.xp = oldXP + xpReward.totalXP;

        // Update user streak if same-day transaction
        if (xpReward.isSameDay) {
            user.streak = xpReward.newStreak;
            user.lastTransactionDate = currentDate;

            // Check for streak badges
            if (user.streak === 7) {
                await unlockBadge(userId, 'streak_starter');
            } else if (user.streak === 30) {
                await unlockBadge(userId, 'streak_champion');
            }
        }

        // Calculate new level
        const newLevel = calculateLevel(user.xp);
        user.level = newLevel;

        await user.save();

        // Check if user leveled up
        if (newLevel > oldLevel) {
            await createNotification(userId, {
                type: 'gamification',
                title: 'Level Up!',
                message: `Congratulations! You've reached level ${newLevel} - ${getLevelName(newLevel)}`,
                priority: 'high'
            });
        }

        // Create XP notification with breakdown
        const bonusMessage = xpReward.isSameDay
            ? ` (Base: ${xpReward.baseXP} + Same-Day Bonus: ${xpReward.sameDayBonus}${xpReward.streakBonus > 0 ? ` + Streak Bonus: ${xpReward.streakBonus}` : ''})`
            : '';

        await createNotification(userId, {
            type: 'gamification',
            title: 'XP Earned',
            message: `You earned ${xpReward.totalXP} XP for adding a transaction${bonusMessage}`,
            priority: 'low'
        });

        return xpReward;

    } catch (error) {
        console.error('Error awarding transaction XP:', error);
        throw error;
    }
}

/**
 * Check budget adherence and award XP rewards
 * @param userId - The user's Clerk ID
 * @param checkType - Type of check: 'daily', 'weekly', or 'monthly'
 * @returns BudgetAdherenceReward with details
 */
export async function checkBudgetAdherence(
    userId: string,
    checkType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<BudgetAdherenceReward | null> {
    try {
        // Get all budgets for the user
        const budgets = await Budget.find({ userId });

        if (budgets.length === 0) {
            return null; // No budgets to check
        }

        // Determine date range based on check type
        const now = new Date();
        let startDate: Date;

        switch (checkType) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        // Get transactions for the period
        const transactions = await Transaction.find({
            userId,
            type: 'expense',
            date: { $gte: startDate, $lte: now }
        });

        // Calculate spending by category
        const spendingByCategory: { [category: string]: number } = {};
        transactions.forEach(transaction => {
            const category = transaction.category;
            spendingByCategory[category] = (spendingByCategory[category] || 0) + transaction.amount;
        });

        // Check which categories are within budget
        const categoriesWithinBudget: string[] = [];
        let totalCategories = 0;

        budgets.forEach(budget => {
            totalCategories++;
            const spent = spendingByCategory[budget.category] || 0;

            if (spent <= budget.limit) {
                categoriesWithinBudget.push(budget.category);
            }
        });

        // Calculate adherence percentage
        const adherencePercentage = totalCategories > 0
            ? (categoriesWithinBudget.length / totalCategories) * 100
            : 0;

        // Determine if user qualifies for reward (at least 50% adherence)
        if (adherencePercentage < 50) {
            return null; // Not enough adherence to award XP
        }

        // Determine XP reward based on check type
        let xpAwarded = 0;
        switch (checkType) {
            case 'daily':
                xpAwarded = XP_REWARDS.BUDGET_ADHERENCE_DAILY;
                break;
            case 'weekly':
                xpAwarded = XP_REWARDS.BUDGET_ADHERENCE_WEEKLY;
                break;
            case 'monthly':
                xpAwarded = XP_REWARDS.BUDGET_ADHERENCE_MONTHLY;
                break;
        }

        // Bonus XP for perfect adherence (100%)
        if (adherencePercentage === 100) {
            xpAwarded = Math.floor(xpAwarded * 1.5);
        }

        // Award XP to user
        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        const oldXP = user.xp || 0;
        const oldLevel = user.level || 1;
        user.xp = oldXP + xpAwarded;
        user.level = calculateLevel(user.xp);
        await user.save();

        // Check if user leveled up
        if (user.level > oldLevel) {
            await createNotification(userId, {
                type: 'gamification',
                title: 'Level Up!',
                message: `Congratulations! You've reached level ${user.level} - ${getLevelName(user.level)}`,
                priority: 'high'
            });
        }

        // Check for budget master badge (3 consecutive months)
        let achievementUnlocked: string | undefined;
        if (checkType === 'monthly' && adherencePercentage === 100) {
            // This is simplified - in production, you'd track consecutive months
            achievementUnlocked = 'budget_master';
            await unlockBadge(userId, 'budget_master');
        }

        // Create notification
        const adherenceMessage = adherencePercentage === 100
            ? 'Perfect budget adherence!'
            : `${categoriesWithinBudget.length} of ${totalCategories} categories within budget`;

        await createNotification(userId, {
            type: 'gamification',
            title: `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} Budget Achievement`,
            message: `${adherenceMessage} You earned ${xpAwarded} XP!`,
            priority: 'medium'
        });

        return {
            type: checkType,
            xpAwarded,
            categoriesWithinBudget,
            totalCategories,
            achievementUnlocked,
            adherencePercentage
        };

    } catch (error) {
        console.error('Error checking budget adherence:', error);
        throw error;
    }
}

/**
 * Track budget adherence streak for a user
 * This should be called at the end of each period (day/week/month)
 */
export async function trackBudgetAdherenceStreak(
    userId: string,
    periodType: 'daily' | 'weekly' | 'monthly'
): Promise<void> {
    try {
        const adherenceResult = await checkBudgetAdherence(userId, periodType);

        if (adherenceResult && adherenceResult.adherencePercentage >= 75) {
            // User maintained good budget adherence
            // In a production system, you'd track this in a separate collection
            // For now, we'll just award the XP through checkBudgetAdherence
            console.log(`User ${userId} maintained ${periodType} budget adherence streak`);
        }
    } catch (error) {
        console.error('Error tracking budget adherence streak:', error);
    }
}

/**
 * Award XP to a user for completing an action
 */
export async function awardXP(userId: string, action: keyof typeof XP_REWARDS, metadata?: any): Promise<void> {
    try {
        const xpAmount = XP_REWARDS[action];
        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            console.error(`User not found: ${userId}`);
            return;
        }

        const oldXP = user.xp || 0;
        const oldLevel = user.level || 1;

        // Add XP
        user.xp = oldXP + xpAmount;

        // Calculate new level
        const newLevel = calculateLevel(user.xp);
        user.level = newLevel;

        await user.save();

        // Check if user leveled up
        if (newLevel > oldLevel) {
            await createNotification(userId, {
                type: 'gamification',
                title: 'Level Up!',
                message: `Congratulations! You've reached level ${newLevel} - ${getLevelName(newLevel)}`,
                priority: 'high'
            });
        }

        // Create XP notification
        await createNotification(userId, {
            type: 'gamification',
            title: 'XP Earned',
            message: `You earned ${xpAmount} XP for ${formatAction(action)}`,
            priority: 'low'
        });

        // Check for badge unlocks
        await checkBadgeUnlocks(userId, action, metadata);

        // Update challenge progress
        await updateChallengeProgress(userId, action, metadata);

    } catch (error) {
        console.error('Error awarding XP:', error);
    }
}

/**
 * Calculate user level based on XP
 */
export function calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i].minXP) {
            return LEVEL_THRESHOLDS[i].level;
        }
    }
    return 1;
}

/**
 * Get level name
 */
export function getLevelName(level: number): string {
    const levelData = LEVEL_THRESHOLDS.find(l => l.level === level);
    return levelData ? levelData.name : 'Unknown';
}

/**
 * Calculate level progress percentage
 */
export function calculateLevelProgress(xp: number): number {
    const currentLevel = calculateLevel(xp);
    const levelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevel);

    if (!levelData) return 0;

    const xpInLevel = xp - levelData.minXP;
    const xpNeeded = levelData.maxXP - levelData.minXP;

    if (xpNeeded === Infinity) return 100;

    return Math.min(100, (xpInLevel / xpNeeded) * 100);
}

/**
 * Update or maintain user streak
 */
export async function updateStreak(userId: string): Promise<void> {
    try {
        const user = await User.findOne({ clerkId: userId });
        if (!user) return;

        // For simplicity, increment streak
        // In production, you'd check last activity date
        user.streak = (user.streak || 0) + 1;
        await user.save();

        // Check for streak badges
        if (user.streak === 7) {
            await unlockBadge(userId, 'streak_starter');
        } else if (user.streak === 30) {
            await unlockBadge(userId, 'streak_champion');
        }

        // Award XP for maintaining streak milestones
        if (user.streak % 7 === 0) {
            await awardXP(userId, 'MAINTAIN_STREAK');
        }

    } catch (error) {
        console.error('Error updating streak:', error);
    }
}

/**
 * Check and unlock badges based on user actions
 */
async function checkBadgeUnlocks(userId: string, action: keyof typeof XP_REWARDS, metadata?: any): Promise<void> {
    try {
        // Badge unlock logic based on action
        switch (action) {
            case 'ADD_TRANSACTION':
                if (metadata?.transactionCount === 1) {
                    await unlockBadge(userId, 'first_transaction');
                } else if (metadata?.transactionCount === 100) {
                    await unlockBadge(userId, 'transaction_master');
                }
                break;

            case 'ADD_BUDGET':
                if (metadata?.budgetCount === 1) {
                    await unlockBadge(userId, 'budget_creator');
                }
                break;

            case 'ADD_SAVINGS_GOAL':
                if (metadata?.goalCount === 1) {
                    await unlockBadge(userId, 'goal_setter');
                }
                break;

            case 'COMPLETE_GOAL':
                if (metadata?.completedGoals === 1) {
                    await unlockBadge(userId, 'goal_achiever');
                }
                break;

            case 'ADD_INVESTMENT':
                if (metadata?.investmentCount === 1) {
                    await unlockBadge(userId, 'investor');
                }
                break;

            case 'RECORD_DEBT_PAYMENT':
                if (metadata?.debtPaidOff) {
                    await unlockBadge(userId, 'debt_warrior');
                }
                break;
        }
    } catch (error) {
        console.error('Error checking badge unlocks:', error);
    }
}

/**
 * Unlock a badge for a user
 */
export async function unlockBadge(userId: string, badgeId: string): Promise<void> {
    try {
        // Check if badge is already unlocked
        const existingBadge = await UserBadge.findOne({ userId, badgeId });
        if (existingBadge) return;

        // Unlock the badge
        const userBadge = new UserBadge({
            userId,
            badgeId,
            unlockedAt: new Date()
        });
        await userBadge.save();

        // Get badge details
        const badgeDefinition = BADGE_DEFINITIONS.find(b => b.id === badgeId);
        if (!badgeDefinition) return;

        // Create notification
        await createNotification(userId, {
            type: 'gamification',
            title: 'Badge Unlocked!',
            message: `You've unlocked the "${badgeDefinition.name}" badge: ${badgeDefinition.description}`,
            priority: 'high'
        });

    } catch (error) {
        console.error('Error unlocking badge:', error);
    }
}

/**
 * Update challenge progress
 */
async function updateChallengeProgress(userId: string, action: keyof typeof XP_REWARDS, metadata?: any): Promise<void> {
    try {
        // Get active challenges for user
        const now = new Date();
        const challenges = await Challenge.find({
            userId,
            completed: false,
            resetTime: { $gt: now }
        });

        for (const challenge of challenges) {
            let shouldUpdate = false;

            // Update progress based on action type
            // This is simplified - in production, you'd have more sophisticated matching
            if (action === 'ADD_TRANSACTION' && challenge.title.includes('transaction')) {
                challenge.progress += 1;
                shouldUpdate = true;
            } else if (action === 'ADD_BUDGET' && challenge.title.includes('budget')) {
                challenge.progress += 1;
                shouldUpdate = true;
            } else if (action === 'ADD_SAVINGS_GOAL' && challenge.title.includes('goal')) {
                challenge.progress += 1;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                // Check if challenge is completed
                if (challenge.progress >= challenge.target && !challenge.completed) {
                    challenge.completed = true;
                    challenge.completedAt = new Date();

                    // Create notification
                    await createNotification(userId, {
                        type: 'gamification',
                        title: 'Challenge Completed!',
                        message: `You've completed the "${challenge.title}" challenge! Claim your ${challenge.xpReward} XP reward.`,
                        priority: 'high'
                    });
                }

                await challenge.save();
            }
        }
    } catch (error) {
        console.error('Error updating challenge progress:', error);
    }
}

/**
 * Claim challenge reward
 */
export async function claimChallengeReward(userId: string, challengeId: string): Promise<boolean> {
    try {
        const challenge = await Challenge.findById(challengeId);

        if (!challenge) {
            throw new Error('Challenge not found');
        }

        if (challenge.userId !== userId) {
            throw new Error('Challenge does not belong to user');
        }

        if (!challenge.completed) {
            throw new Error('Challenge not completed');
        }

        if (challenge.claimed) {
            throw new Error('Reward already claimed');
        }

        // Mark as claimed
        challenge.claimed = true;
        await challenge.save();

        // Award XP
        const user = await User.findOne({ clerkId: userId });
        if (user) {
            user.xp = (user.xp || 0) + challenge.xpReward;
            user.level = calculateLevel(user.xp);
            await user.save();
        }

        return true;
    } catch (error) {
        console.error('Error claiming challenge reward:', error);
        throw error;
    }
}

/**
 * Generate challenges for a user
 */
export async function generateChallenges(userId: string): Promise<void> {
    try {
        const now = new Date();

        // Check if user already has active challenges
        const existingChallenges = await Challenge.find({
            userId,
            resetTime: { $gt: now }
        });

        if (existingChallenges.length > 0) {
            return; // User already has active challenges
        }

        // Generate daily challenges
        const dailyResetTime = new Date();
        dailyResetTime.setHours(23, 59, 59, 999);

        const dailyChallenges = [
            {
                userId,
                title: 'Daily Tracker',
                description: 'Add 3 transactions today',
                type: 'daily',
                progress: 0,
                target: 3,
                xpReward: 50,
                resetTime: dailyResetTime
            }
        ];

        // Generate weekly challenges
        const weeklyResetTime = new Date();
        weeklyResetTime.setDate(weeklyResetTime.getDate() + (7 - weeklyResetTime.getDay()));
        weeklyResetTime.setHours(23, 59, 59, 999);

        const weeklyChallenges = [
            {
                userId,
                title: 'Weekly Organizer',
                description: 'Add 10 transactions this week',
                type: 'weekly',
                progress: 0,
                target: 10,
                xpReward: 100,
                resetTime: weeklyResetTime
            },
            {
                userId,
                title: 'Budget Planner',
                description: 'Create or update 2 budgets this week',
                type: 'weekly',
                progress: 0,
                target: 2,
                xpReward: 150,
                resetTime: weeklyResetTime
            }
        ];

        // Generate monthly challenges
        const monthlyResetTime = new Date();
        monthlyResetTime.setMonth(monthlyResetTime.getMonth() + 1);
        monthlyResetTime.setDate(0);
        monthlyResetTime.setHours(23, 59, 59, 999);

        const monthlyChallenges = [
            {
                userId,
                title: 'Monthly Master',
                description: 'Add 50 transactions this month',
                type: 'monthly',
                progress: 0,
                target: 50,
                xpReward: 200,
                resetTime: monthlyResetTime
            },
            {
                userId,
                title: 'Savings Champion',
                description: 'Create a new savings goal this month',
                type: 'monthly',
                progress: 0,
                target: 1,
                xpReward: 150,
                resetTime: monthlyResetTime
            }
        ];

        // Insert all challenges
        await Challenge.insertMany([...dailyChallenges, ...weeklyChallenges, ...monthlyChallenges]);

    } catch (error) {
        console.error('Error generating challenges:', error);
    }
}

/**
 * Get leaderboard rankings
 */
export async function getLeaderboard(limit: number = 100): Promise<any[]> {
    try {
        const users = await User.find()
            .sort({ xp: -1 })
            .limit(limit)
            .select('clerkId fullName xp level streak');

        return users.map((user, index) => ({
            userId: user.clerkId,
            username: anonymizeUsername(user.fullName || user.clerkId),
            xp: user.xp || 0,
            level: user.level || 1,
            streak: user.streak || 0,
            rank: index + 1
        }));
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return [];
    }
}

/**
 * Anonymize username for leaderboard
 */
function anonymizeUsername(username: string): string {
    if (!username || username.length < 3) {
        return 'User***';
    }

    const firstChar = username.charAt(0);
    const lastChar = username.charAt(username.length - 1);
    const stars = '*'.repeat(Math.min(username.length - 2, 5));

    return `${firstChar}${stars}${lastChar}`;
}

/**
 * Create a notification
 */
async function createNotification(userId: string, data: {
    type: string;
    title: string;
    message: string;
    priority: string;
}): Promise<void> {
    try {
        const notification = new Notification({
            userId,
            type: data.type,
            title: data.title,
            message: data.message,
            priority: data.priority,
            isRead: false,
            createdAt: new Date()
        });

        await notification.save();
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

/**
 * Format action name for display
 */
function formatAction(action: string): string {
    return action.toLowerCase().replace(/_/g, ' ');
}

/**
 * Initialize badge definitions in database
 */
export async function initializeBadges(): Promise<void> {
    try {
        for (const badgeDef of BADGE_DEFINITIONS) {
            const existing = await Badge.findOne({ id: badgeDef.id });
            if (!existing) {
                await Badge.create(badgeDef);
            }
        }
        console.log('Badge definitions initialized');
    } catch (error) {
        console.error('Error initializing badges:', error);
    }
}
