import { User } from '../models/User';
import { Challenge } from '../models/Challenge';
import { Badge, UserBadge } from '../models/Badge';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Investment } from '../models/Investment';
import { Debt } from '../models/Debt';

// Enhanced XP system with skill-based progression
export const ENHANCED_XP_REWARDS = {
    // Basic Actions (Reduced from current)
    ADD_TRANSACTION: 3,
    ADD_BUDGET: 8,
    ADD_SAVINGS_GOAL: 12,
    
    // Skill-Based Actions
    CATEGORIZE_CORRECTLY: 5,
    ADD_DETAILED_TRANSACTION: 7, // With notes, receipt, etc.
    BUDGET_OPTIMIZATION: 25,
    FINANCIAL_GOAL_PLANNING: 40,
    
    // Achievement-Based (Harder to earn)
    PERFECT_BUDGET_MONTH: 200,
    DEBT_REDUCTION_MILESTONE: 150,
    INVESTMENT_DIVERSIFICATION: 100,
    EMERGENCY_FUND_MILESTONE: 180,
    
    // Streak Multipliers (More challenging)
    WEEKLY_STREAK_BONUS: 30,
    MONTHLY_STREAK_BONUS: 120,
    QUARTERLY_STREAK_BONUS: 500,
    
    // Advanced Financial Behaviors
    RECEIPT_SCANNING_ACCURACY: 15,
    RECURRING_TRANSACTION_SETUP: 20,
    INVESTMENT_RESEARCH: 35,
    DEBT_PAYOFF_STRATEGY: 45,
    
    // Cross-feature Integration
    AI_RECOMMENDATION_ACCEPTED: 30,
    FINANCIAL_HEALTH_IMPROVEMENT: 50,
    GOAL_MILESTONE_REACHED: 75
};

// Skill Trees Definition
export interface SkillTree {
    id: string;
    name: string;
    description: string;
    icon: string;
    skills: Skill[];
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    level: number;
    maxLevel: number;
    xpRequired: number;
    prerequisites: string[];
    benefits: SkillBenefit[];
    unlocked: boolean;
}

export interface SkillBenefit {
    type: 'xp_multiplier' | 'feature_unlock' | 'insight_access' | 'challenge_unlock';
    value: number | string;
    description: string;
}

export const SKILL_TREES: SkillTree[] = [
    {
        id: 'budgeting_master',
        name: 'Budgeting Master',
        description: 'Master the art of budgeting and financial planning',
        icon: '💰',
        skills: [
            {
                id: 'basic_budgeting',
                name: 'Basic Budgeting',
                description: 'Learn to create and manage basic budgets',
                level: 0,
                maxLevel: 5,
                xpRequired: 100,
                prerequisites: [],
                benefits: [
                    { type: 'xp_multiplier', value: 1.2, description: '20% more XP from budget-related actions' }
                ],
                unlocked: false
            },
            {
                id: 'budget_optimization',
                name: 'Budget Optimization',
                description: 'Optimize budgets based on spending patterns',
                level: 0,
                maxLevel: 5,
                xpRequired: 250,
                prerequisites: ['basic_budgeting'],
                benefits: [
                    { type: 'feature_unlock', value: 'advanced_budget_analytics', description: 'Unlock advanced budget analytics' }
                ],
                unlocked: false
            },
            {
                id: 'predictive_budgeting',
                name: 'Predictive Budgeting',
                description: 'Use AI to predict and adjust budgets',
                level: 0,
                maxLevel: 3,
                xpRequired: 500,
                prerequisites: ['budget_optimization'],
                benefits: [
                    { type: 'insight_access', value: 'budget_forecasting', description: 'Access to budget forecasting insights' }
                ],
                unlocked: false
            }
        ]
    },
    {
        id: 'investment_guru',
        name: 'Investment Guru',
        description: 'Build wealth through smart investing',
        icon: '📈',
        skills: [
            {
                id: 'basic_investing',
                name: 'Basic Investing',
                description: 'Learn investment fundamentals',
                level: 0,
                maxLevel: 5,
                xpRequired: 150,
                prerequisites: [],
                benefits: [
                    { type: 'xp_multiplier', value: 1.3, description: '30% more XP from investment actions' }
                ],
                unlocked: false
            },
            {
                id: 'portfolio_diversification',
                name: 'Portfolio Diversification',
                description: 'Master portfolio diversification strategies',
                level: 0,
                maxLevel: 5,
                xpRequired: 300,
                prerequisites: ['basic_investing'],
                benefits: [
                    { type: 'feature_unlock', value: 'risk_analysis', description: 'Unlock portfolio risk analysis' }
                ],
                unlocked: false
            }
        ]
    },
    {
        id: 'debt_destroyer',
        name: 'Debt Destroyer',
        description: 'Eliminate debt and achieve financial freedom',
        icon: '⚔️',
        skills: [
            {
                id: 'debt_tracking',
                name: 'Debt Tracking',
                description: 'Track and monitor all debts effectively',
                level: 0,
                maxLevel: 5,
                xpRequired: 120,
                prerequisites: [],
                benefits: [
                    { type: 'xp_multiplier', value: 1.25, description: '25% more XP from debt-related actions' }
                ],
                unlocked: false
            },
            {
                id: 'debt_strategy',
                name: 'Debt Strategy',
                description: 'Develop optimal debt payoff strategies',
                level: 0,
                maxLevel: 5,
                xpRequired: 280,
                prerequisites: ['debt_tracking'],
                benefits: [
                    { type: 'feature_unlock', value: 'debt_calculator', description: 'Unlock advanced debt calculators' }
                ],
                unlocked: false
            }
        ]
    }
];

// Advanced Challenge System
export interface AdvancedChallenge {
    id: string;
    title: string;
    description: string;
    type: 'skill' | 'achievement' | 'competitive' | 'seasonal';
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    requirements: ChallengeRequirement[];
    rewards: ChallengeReward[];
    timeLimit?: number; // in days
    prerequisites: string[];
    category: string;
}

export interface ChallengeRequirement {
    type: 'transaction_count' | 'budget_adherence' | 'savings_rate' | 'debt_reduction' | 'investment_return';
    target: number;
    timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    conditions?: Record<string, any>;
}

export interface ChallengeReward {
    type: 'xp' | 'badge' | 'skill_points' | 'feature_unlock';
    value: number | string;
    description: string;
}

export const ADVANCED_CHALLENGES: AdvancedChallenge[] = [
    {
        id: 'financial_foundation',
        title: 'Financial Foundation',
        description: 'Complete 5 different types of financial actions in one week',
        type: 'skill',
        difficulty: 'easy',
        requirements: [
            { type: 'transaction_count', target: 10, timeframe: 'weekly' },
        ],
        rewards: [
            { type: 'xp', value: 100, description: '100 XP bonus' },
            { type: 'skill_points', value: 5, description: '5 skill points' }
        ],
        prerequisites: [],
        category: 'beginner'
    },
    {
        id: 'budget_master_challenge',
        title: 'Budget Master',
        description: 'Stay within 95% of budget for 3 categories for 2 months',
        type: 'achievement',
        difficulty: 'medium',
        requirements: [
            { 
                type: 'budget_adherence', 
                target: 95, 
                timeframe: 'monthly',
                conditions: { categories: 3, duration: 2 }
            }
        ],
        rewards: [
            { type: 'xp', value: 300, description: '300 XP bonus' },
            { type: 'badge', value: 'budget_master', description: 'Budget Master badge' }
        ],
        prerequisites: ['basic_budgeting'],
        category: 'intermediate'
    },
    {
        id: 'investment_diversifier',
        title: 'Investment Diversifier',
        description: 'Create a diversified portfolio across 4 asset classes',
        type: 'achievement',
        difficulty: 'hard',
        requirements: [
            {
                type: 'investment_return',
                target: 4,
                timeframe: 'quarterly',
                conditions: { diversification: true }
            }
        ],
        rewards: [
            { type: 'xp', value: 500, description: '500 XP bonus' },
            { type: 'feature_unlock', value: 'advanced_portfolio_analytics', description: 'Advanced portfolio analytics' }
        ],
        prerequisites: ['basic_investing', 'portfolio_diversification'],
        category: 'advanced'
    }
];

// Enhanced Gamification Engine
export class EnhancedGamificationEngine {
    
    /**
     * Award XP with skill tree bonuses and multipliers
     */
    static async awardEnhancedXP(
        userId: string, 
        action: keyof typeof ENHANCED_XP_REWARDS, 
        metadata?: any
    ): Promise<{
        baseXP: number;
        bonusXP: number;
        totalXP: number;
        skillBonuses: string[];
        levelUp: boolean;
        newLevel?: number;
    }> {
        const user = await User.findOne({ clerkId: userId });
        if (!user) throw new Error('User not found');

        const baseXP = ENHANCED_XP_REWARDS[action] || 0;
        let bonusXP = 0;
        const skillBonuses: string[] = [];

        // Apply skill tree multipliers
        const userSkills = await this.getUserSkills(userId);
        for (const skill of userSkills) {
            const multiplier = this.getSkillMultiplier(skill, action);
            if (multiplier > 1) {
                bonusXP += Math.floor(baseXP * (multiplier - 1));
                skillBonuses.push(skill.name);
            }
        }

        // Apply streak bonuses (enhanced)
        const streakBonus = this.calculateStreakBonus(user.streak || 0, action);
        bonusXP += streakBonus;

        const totalXP = baseXP + bonusXP;
        const oldLevel = user.level || 1;
        
        // Update user XP and level
        user.xp = (user.xp || 0) + totalXP;
        user.level = this.calculateLevel(user.xp);
        await user.save();

        const levelUp = user.level > oldLevel;

        return {
            baseXP,
            bonusXP,
            totalXP,
            skillBonuses,
            levelUp,
            newLevel: levelUp ? user.level : undefined
        };
    }

    /**
     * Get user's unlocked skills
     */
    static async getUserSkills(userId: string): Promise<Skill[]> {
        // In a real implementation, this would fetch from a UserSkills collection
        // For now, return empty array
        return [];
    }

    /**
     * Calculate skill multiplier for specific action
     */
    static getSkillMultiplier(skill: Skill, action: keyof typeof ENHANCED_XP_REWARDS): number {
        // Logic to determine if skill applies to action and return multiplier
        const relevantBenefits = skill.benefits.filter(b => b.type === 'xp_multiplier');
        return relevantBenefits.length > 0 ? Number(relevantBenefits[0].value) : 1;
    }

    /**
     * Enhanced streak bonus calculation
     */
    static calculateStreakBonus(streak: number, action: keyof typeof ENHANCED_XP_REWARDS): number {
        if (streak < 7) return 0;
        
        const baseBonus = Math.floor(streak / 7) * 5; // 5 XP per week of streak
        
        // Special bonuses for milestones
        if (streak >= 30) return baseBonus + ENHANCED_XP_REWARDS.MONTHLY_STREAK_BONUS;
        if (streak >= 7) return baseBonus + ENHANCED_XP_REWARDS.WEEKLY_STREAK_BONUS;
        
        return baseBonus;
    }

    /**
     * Enhanced level calculation with exponential scaling
     */
    static calculateLevel(xp: number): number {
        // More challenging level progression
        const levels = [
            { level: 1, minXP: 0, maxXP: 200 },
            { level: 2, minXP: 200, maxXP: 500 },
            { level: 3, minXP: 500, maxXP: 900 },
            { level: 4, minXP: 900, maxXP: 1500 },
            { level: 5, minXP: 1500, maxXP: 2500 },
            { level: 6, minXP: 2500, maxXP: 4000 },
            { level: 7, minXP: 4000, maxXP: 6000 },
            { level: 8, minXP: 6000, maxXP: 9000 },
            { level: 9, minXP: 9000, maxXP: 13000 },
            { level: 10, minXP: 13000, maxXP: Infinity }
        ];

        for (let i = levels.length - 1; i >= 0; i--) {
            if (xp >= levels[i].minXP) {
                return levels[i].level;
            }
        }
        return 1;
    }

    /**
     * Check and progress advanced challenges
     */
    static async checkAdvancedChallenges(userId: string, action: string, metadata?: any): Promise<void> {
        // Get user's active challenges
        const activeChallenges = await Challenge.find({
            userId,
            completed: false,
            resetTime: { $gt: new Date() }
        });

        for (const challenge of activeChallenges) {
            const advancedChallenge = ADVANCED_CHALLENGES.find(ac => ac.id === challenge.title);
            if (!advancedChallenge) continue;

            // Check if action contributes to challenge progress
            const progress = await this.calculateChallengeProgress(
                userId, 
                advancedChallenge, 
                action, 
                metadata
            );

            if (progress > challenge.progress) {
                challenge.progress = progress;
                
                // Check if challenge is completed
                if (progress >= challenge.target) {
                    challenge.completed = true;
                    challenge.completedAt = new Date();
                    
                    // Award challenge rewards
                    await this.awardChallengeRewards(userId, advancedChallenge);
                }
                
                await challenge.save();
            }
        }
    }

    /**
     * Calculate challenge progress based on requirements
     */
    static async calculateChallengeProgress(
        userId: string,
        challenge: AdvancedChallenge,
        action: string,
        metadata?: any
    ): Promise<number> {
        // Implementation would check each requirement type and calculate progress
        // This is a simplified version
        return 0;
    }

    /**
     * Award challenge rewards
     */
    static async awardChallengeRewards(userId: string, challenge: AdvancedChallenge): Promise<void> {
        for (const reward of challenge.rewards) {
            switch (reward.type) {
                case 'xp':
                    await this.awardEnhancedXP(userId, 'ADD_TRANSACTION', { bonus: Number(reward.value) });
                    break;
                case 'badge':
                    // Award badge logic
                    break;
                case 'skill_points':
                    // Award skill points logic
                    break;
                case 'feature_unlock':
                    // Unlock feature logic
                    break;
            }
        }
    }

    /**
     * Generate personalized challenges based on user behavior
     */
    static async generatePersonalizedChallenges(userId: string): Promise<AdvancedChallenge[]> {
        const user = await User.findOne({ clerkId: userId });
        if (!user) return [];

        // Analyze user's financial behavior
        const behavior = await this.analyzeUserBehavior(userId);
        
        // Generate challenges based on behavior patterns
        const personalizedChallenges: AdvancedChallenge[] = [];
        
        // Example: If user has low savings rate, create savings challenge
        if (behavior.savingsRate < 0.1) {
            personalizedChallenges.push({
                id: `savings_boost_${userId}`,
                title: 'Savings Boost',
                description: 'Increase your savings rate to 15% this month',
                type: 'achievement',
                difficulty: 'medium',
                requirements: [
                    { type: 'savings_rate', target: 15, timeframe: 'monthly' }
                ],
                rewards: [
                    { type: 'xp', value: 250, description: '250 XP bonus' }
                ],
                prerequisites: [],
                category: 'personalized'
            });
        }

        return personalizedChallenges;
    }

    /**
     * Analyze user's financial behavior patterns
     */
    static async analyzeUserBehavior(userId: string): Promise<{
        savingsRate: number;
        budgetAdherence: number;
        transactionFrequency: number;
        categoryDiversity: number;
    }> {
        // Implementation would analyze user's transaction history, budgets, etc.
        // This is a placeholder
        return {
            savingsRate: 0.05,
            budgetAdherence: 0.8,
            transactionFrequency: 15,
            categoryDiversity: 6
        };
    }
}