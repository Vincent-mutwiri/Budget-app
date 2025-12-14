import { EventEmitter } from 'events';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { SavingsGoal } from '../models/SavingsGoal';
import { Investment } from '../models/Investment';
import { Debt } from '../models/Debt';
import { Notification } from '../models/Notification';
import { EnhancedGamificationEngine } from './enhancedGamificationEngine';
import { AdvancedInsightsEngine } from './advancedInsightsEngine';

// Event types for cross-feature communication
export enum FinancialEvent {
    TRANSACTION_ADDED = 'transaction_added',
    BUDGET_CREATED = 'budget_created',
    BUDGET_UPDATED = 'budget_updated',
    GOAL_CREATED = 'goal_created',
    GOAL_MILESTONE_REACHED = 'goal_milestone_reached',
    GOAL_COMPLETED = 'goal_completed',
    INVESTMENT_ADDED = 'investment_added',
    DEBT_ADDED = 'debt_added',
    DEBT_PAYMENT_MADE = 'debt_payment_made',
    BUDGET_THRESHOLD_EXCEEDED = 'budget_threshold_exceeded',
    ANOMALY_DETECTED = 'anomaly_detected',
    HEALTH_SCORE_CHANGED = 'health_score_changed',
    LEVEL_UP = 'level_up',
    BADGE_EARNED = 'badge_earned',
    CHALLENGE_COMPLETED = 'challenge_completed'
}

export interface FinancialEventData {
    userId: string;
    eventType: FinancialEvent;
    data: any;
    timestamp: Date;
    source: string;
}

// Unified state interface
export interface UnifiedFinancialState {
    user: any;
    transactions: any[];
    budgets: any[];
    goals: any[];
    investments: any[];
    debts: any[];
    insights: any;
    gamification: any;
    notifications: any[];
    preferences: any;
    lastUpdated: Date;
}

// Cross-feature recommendation interface
export interface CrossFeatureRecommendation {
    id: string;
    type: 'budget_optimization' | 'goal_adjustment' | 'investment_rebalance' | 'debt_strategy';
    title: string;
    description: string;
    triggerFeatures: string[];
    affectedFeatures: string[];
    expectedImpact: {
        healthScore: number;
        xpGain: number;
        financialBenefit: number;
    };
    actions: RecommendationAction[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    validUntil: Date;
}

export interface RecommendationAction {
    feature: string;
    action: string;
    parameters: Record<string, any>;
    description: string;
}

// Smart automation rule interface
export interface AutomationRule {
    id: string;
    userId: string;
    name: string;
    description: string;
    trigger: AutomationTrigger;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    isActive: boolean;
    createdAt: Date;
    lastExecuted?: Date;
    executionCount: number;
}

export interface AutomationTrigger {
    type: 'transaction' | 'budget' | 'goal' | 'schedule' | 'threshold';
    parameters: Record<string, any>;
}

export interface AutomationCondition {
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
    value: any;
}

export interface AutomationAction {
    type: 'categorize' | 'budget_adjust' | 'goal_contribute' | 'notify' | 'gamify';
    parameters: Record<string, any>;
}

/**
 * Unified Integration Service - Central hub for cross-feature communication
 */
export class UnifiedIntegrationService extends EventEmitter {
    private static instance: UnifiedIntegrationService;
    private userStates: Map<string, UnifiedFinancialState> = new Map();
    private automationRules: Map<string, AutomationRule[]> = new Map();

    private constructor() {
        super();
        this.setupEventListeners();
    }

    public static getInstance(): UnifiedIntegrationService {
        if (!UnifiedIntegrationService.instance) {
            UnifiedIntegrationService.instance = new UnifiedIntegrationService();
        }
        return UnifiedIntegrationService.instance;
    }

    /**
     * Setup cross-feature event listeners
     */
    private setupEventListeners(): void {
        // Transaction events
        this.on(FinancialEvent.TRANSACTION_ADDED, this.handleTransactionAdded.bind(this));
        
        // Budget events
        this.on(FinancialEvent.BUDGET_CREATED, this.handleBudgetCreated.bind(this));
        this.on(FinancialEvent.BUDGET_THRESHOLD_EXCEEDED, this.handleBudgetThresholdExceeded.bind(this));
        
        // Goal events
        this.on(FinancialEvent.GOAL_MILESTONE_REACHED, this.handleGoalMilestone.bind(this));
        this.on(FinancialEvent.GOAL_COMPLETED, this.handleGoalCompleted.bind(this));
        
        // Investment events
        this.on(FinancialEvent.INVESTMENT_ADDED, this.handleInvestmentAdded.bind(this));
        
        // Debt events
        this.on(FinancialEvent.DEBT_PAYMENT_MADE, this.handleDebtPayment.bind(this));
        
        // Gamification events
        this.on(FinancialEvent.LEVEL_UP, this.handleLevelUp.bind(this));
        this.on(FinancialEvent.BADGE_EARNED, this.handleBadgeEarned.bind(this));
        
        // Insights events
        this.on(FinancialEvent.ANOMALY_DETECTED, this.handleAnomalyDetected.bind(this));
        this.on(FinancialEvent.HEALTH_SCORE_CHANGED, this.handleHealthScoreChanged.bind(this));
    }

    /**
     * Emit a financial event
     */
    public emitFinancialEvent(eventData: FinancialEventData): void {
        this.emit(eventData.eventType, eventData);
        
        // Update user state
        this.updateUserState(eventData.userId, eventData);
        
        // Check automation rules
        this.checkAutomationRules(eventData);
        
        // Generate cross-feature recommendations
        this.generateCrossFeatureRecommendations(eventData);
    }

    /**
     * Get unified financial state for a user
     */
    public async getUserState(userId: string): Promise<UnifiedFinancialState> {
        let state = this.userStates.get(userId);
        
        if (!state || this.isStateStale(state)) {
            state = await this.refreshUserState(userId);
            this.userStates.set(userId, state);
        }
        
        return state;
    }

    /**
     * Refresh user state from database
     */
    private async refreshUserState(userId: string): Promise<UnifiedFinancialState> {
        const [user, transactions, budgets, goals, investments, debts, notifications] = await Promise.all([
            User.findOne({ clerkId: userId }),
            Transaction.find({ userId }).sort({ date: -1 }).limit(100),
            Budget.find({ userId }),
            SavingsGoal.find({ userId }),
            Investment.find({ userId }),
            Debt.find({ userId }),
            Notification.find({ userId, isRead: false }).sort({ createdAt: -1 }).limit(20)
        ]);

        // Get insights and gamification data
        const [insights, gamification] = await Promise.all([
            AdvancedInsightsEngine.generateAdvancedInsights(userId),
            this.getGamificationState(userId)
        ]);

        return {
            user,
            transactions,
            budgets,
            goals,
            investments,
            debts,
            insights,
            gamification,
            notifications,
            preferences: (user as any)?.preferences || {},
            lastUpdated: new Date()
        };
    }

    /**
     * Check if state is stale (older than 5 minutes)
     */
    private isStateStale(state: UnifiedFinancialState): boolean {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return state.lastUpdated < fiveMinutesAgo;
    }

    /**
     * Update user state with new event data
     */
    private updateUserState(userId: string, eventData: FinancialEventData): void {
        const state = this.userStates.get(userId);
        if (!state) return;

        // Update relevant parts of state based on event type
        switch (eventData.eventType) {
            case FinancialEvent.TRANSACTION_ADDED:
                state.transactions.unshift(eventData.data);
                if (state.transactions.length > 100) {
                    state.transactions = state.transactions.slice(0, 100);
                }
                break;
            
            case FinancialEvent.BUDGET_UPDATED:
                const budgetIndex = state.budgets.findIndex(b => b.id === eventData.data.id);
                if (budgetIndex >= 0) {
                    state.budgets[budgetIndex] = eventData.data;
                }
                break;
            
            // Add more cases as needed
        }

        state.lastUpdated = new Date();
    }

    /**
     * Handle transaction added event
     */
    private async handleTransactionAdded(eventData: FinancialEventData): Promise<void> {
        const { userId, data: transaction } = eventData;

        // Award gamification XP
        const xpResult = await EnhancedGamificationEngine.awardEnhancedXP(
            userId, 
            'ADD_TRANSACTION',
            { 
                amount: transaction.amount,
                category: transaction.category,
                hasReceipt: !!transaction.receiptUrl,
                hasNotes: !!transaction.notes
            }
        );

        // Check budget impact
        await this.checkBudgetImpact(userId, transaction);

        // Update insights if significant transaction
        if (transaction.amount > 100) {
            await this.triggerInsightsUpdate(userId);
        }

        // Check for spending anomalies
        await this.checkSpendingAnomalies(userId, transaction);

        // Generate contextual recommendations
        await this.generateContextualRecommendations(userId, 'transaction', transaction);
    }

    /**
     * Handle budget threshold exceeded
     */
    private async handleBudgetThresholdExceeded(eventData: FinancialEventData): Promise<void> {
        const { userId, data: budgetAlert } = eventData;

        // Create high-priority notification
        await this.createNotification(userId, {
            type: 'budget_alert',
            title: 'Budget Alert',
            message: `You've exceeded ${budgetAlert.threshold}% of your ${budgetAlert.category} budget`,
            priority: 'high',
            actionUrl: '/budgets'
        });

        // Generate budget optimization recommendations
        await this.generateBudgetOptimizationRecommendations(userId, budgetAlert);
    }

    /**
     * Handle goal milestone reached
     */
    private async handleGoalMilestone(eventData: FinancialEventData): Promise<void> {
        const { userId, data: milestone } = eventData;

        // Award XP for milestone
        await EnhancedGamificationEngine.awardEnhancedXP(
            userId,
            'GOAL_MILESTONE_REACHED',
            { goalId: milestone.goalId, percentage: milestone.percentage }
        );

        // Create celebration notification
        await this.createNotification(userId, {
            type: 'achievement',
            title: 'Goal Milestone!',
            message: `You've reached ${milestone.percentage}% of your ${milestone.goalName} goal!`,
            priority: 'medium'
        });
    }

    /**
     * Handle level up event
     */
    private async handleLevelUp(eventData: FinancialEventData): Promise<void> {
        const { userId, data: levelData } = eventData;

        // Unlock new features based on level
        await this.unlockLevelFeatures(userId, levelData.newLevel);

        // Generate level-appropriate challenges
        await this.generateLevelChallenges(userId, levelData.newLevel);

        // Create celebration notification
        await this.createNotification(userId, {
            type: 'gamification',
            title: 'Level Up!',
            message: `Congratulations! You've reached level ${levelData.newLevel}!`,
            priority: 'high'
        });
    }

    /**
     * Handle anomaly detection
     */
    private async handleAnomalyDetected(eventData: FinancialEventData): Promise<void> {
        const { userId, data: anomaly } = eventData;

        // Create alert notification
        await this.createNotification(userId, {
            type: 'anomaly',
            title: 'Unusual Spending Detected',
            message: `Unusual ${anomaly.category} spending: $${anomaly.amount} (${anomaly.deviationPercentage}% above average)`,
            priority: 'medium',
            actionUrl: `/transactions/${anomaly.transactionId}`
        });

        // Generate spending analysis recommendations
        await this.generateSpendingAnalysisRecommendations(userId, anomaly);
    }

    /**
     * Check automation rules for user
     */
    private async checkAutomationRules(eventData: FinancialEventData): Promise<void> {
        const userRules = this.automationRules.get(eventData.userId) || [];
        
        for (const rule of userRules) {
            if (!rule.isActive) continue;
            
            if (this.evaluateAutomationRule(rule, eventData)) {
                await this.executeAutomationRule(rule, eventData);
            }
        }
    }

    /**
     * Evaluate if automation rule should trigger
     */
    private evaluateAutomationRule(rule: AutomationRule, eventData: FinancialEventData): boolean {
        // Check trigger type
        if (rule.trigger.type === 'transaction' && eventData.eventType !== FinancialEvent.TRANSACTION_ADDED) {
            return false;
        }

        // Check conditions
        for (const condition of rule.conditions) {
            if (!this.evaluateCondition(condition, eventData.data)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluate individual condition
     */
    private evaluateCondition(condition: AutomationCondition, data: any): boolean {
        const fieldValue = data[condition.field];
        
        switch (condition.operator) {
            case 'equals':
                return fieldValue === condition.value;
            case 'greater_than':
                return fieldValue > condition.value;
            case 'less_than':
                return fieldValue < condition.value;
            case 'contains':
                return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
            case 'between':
                return fieldValue >= condition.value[0] && fieldValue <= condition.value[1];
            default:
                return false;
        }
    }

    /**
     * Execute automation rule actions
     */
    private async executeAutomationRule(rule: AutomationRule, eventData: FinancialEventData): Promise<void> {
        for (const action of rule.actions) {
            try {
                await this.executeAutomationAction(action, eventData);
            } catch (error) {
                console.error(`Error executing automation action:`, error);
            }
        }

        // Update rule execution stats
        rule.lastExecuted = new Date();
        rule.executionCount++;
    }

    /**
     * Execute individual automation action
     */
    private async executeAutomationAction(action: AutomationAction, eventData: FinancialEventData): Promise<void> {
        switch (action.type) {
            case 'categorize':
                await this.autoCategorizTransaction(eventData.data, action.parameters);
                break;
            case 'budget_adjust':
                await this.autoBudgetAdjust(eventData.userId, action.parameters);
                break;
            case 'goal_contribute':
                await this.autoGoalContribute(eventData.userId, action.parameters);
                break;
            case 'notify':
                await this.createNotification(eventData.userId, action.parameters);
                break;
            case 'gamify':
                await this.autoGamifyAction(eventData.userId, action.parameters);
                break;
        }
    }

    /**
     * Generate cross-feature recommendations
     */
    private async generateCrossFeatureRecommendations(eventData: FinancialEventData): Promise<void> {
        const recommendations: CrossFeatureRecommendation[] = [];

        // Analyze event for cross-feature opportunities
        switch (eventData.eventType) {
            case FinancialEvent.TRANSACTION_ADDED:
                const transactionRecs = await this.analyzeTransactionForRecommendations(eventData);
                recommendations.push(...transactionRecs);
                break;
            
            case FinancialEvent.BUDGET_THRESHOLD_EXCEEDED:
                const budgetRecs = await this.analyzeBudgetForRecommendations(eventData);
                recommendations.push(...budgetRecs);
                break;
        }

        // Store and notify about recommendations
        for (const rec of recommendations) {
            await this.storeRecommendation(rec);
            await this.notifyRecommendation(eventData.userId, rec);
        }
    }

    // Helper methods (simplified implementations)

    private async getGamificationState(userId: string): Promise<any> {
        const user = await User.findOne({ clerkId: userId });
        return {
            xp: user?.xp || 0,
            level: user?.level || 1,
            streak: user?.streak || 0,
            badges: user?.badges || 0
        };
    }

    private async checkBudgetImpact(userId: string, transaction: any): Promise<void> {
        // Implementation would check if transaction affects budget thresholds
    }

    private async triggerInsightsUpdate(userId: string): Promise<void> {
        // Implementation would trigger insights recalculation
    }

    private async checkSpendingAnomalies(userId: string, transaction: any): Promise<void> {
        // Implementation would check for spending anomalies
    }

    private async generateContextualRecommendations(userId: string, context: string, data: any): Promise<void> {
        // Implementation would generate contextual recommendations
    }

    private async createNotification(userId: string, notification: any): Promise<void> {
        const newNotification = new Notification({
            userId,
            ...notification,
            isRead: false,
            createdAt: new Date()
        });
        await newNotification.save();
    }

    private async generateBudgetOptimizationRecommendations(userId: string, budgetAlert: any): Promise<void> {
        // Implementation would generate budget optimization recommendations
    }

    private async unlockLevelFeatures(userId: string, level: number): Promise<void> {
        // Implementation would unlock features based on level
    }

    private async generateLevelChallenges(userId: string, level: number): Promise<void> {
        // Implementation would generate level-appropriate challenges
    }

    private async generateSpendingAnalysisRecommendations(userId: string, anomaly: any): Promise<void> {
        // Implementation would generate spending analysis recommendations
    }

    private async autoCategorizTransaction(transaction: any, parameters: any): Promise<void> {
        // Implementation would auto-categorize transaction
    }

    private async autoBudgetAdjust(userId: string, parameters: any): Promise<void> {
        // Implementation would auto-adjust budget
    }

    private async autoGoalContribute(userId: string, parameters: any): Promise<void> {
        // Implementation would auto-contribute to goal
    }

    private async autoGamifyAction(userId: string, parameters: any): Promise<void> {
        // Implementation would perform gamification action
    }

    private async analyzeTransactionForRecommendations(eventData: FinancialEventData): Promise<CrossFeatureRecommendation[]> {
        // Implementation would analyze transaction for cross-feature recommendations
        return [];
    }

    private async analyzeBudgetForRecommendations(eventData: FinancialEventData): Promise<CrossFeatureRecommendation[]> {
        // Implementation would analyze budget for cross-feature recommendations
        return [];
    }

    private async storeRecommendation(recommendation: CrossFeatureRecommendation): Promise<void> {
        // Implementation would store recommendation in database
    }

    private async notifyRecommendation(userId: string, recommendation: CrossFeatureRecommendation): Promise<void> {
        // Implementation would notify user about recommendation
    }

    private async handleBudgetCreated(eventData: FinancialEventData): Promise<void> {
        // Implementation would handle budget creation
    }

    private async handleGoalCompleted(eventData: FinancialEventData): Promise<void> {
        // Implementation would handle goal completion
    }

    private async handleInvestmentAdded(eventData: FinancialEventData): Promise<void> {
        // Implementation would handle investment addition
    }

    private async handleDebtPayment(eventData: FinancialEventData): Promise<void> {
        // Implementation would handle debt payment
    }

    private async handleBadgeEarned(eventData: FinancialEventData): Promise<void> {
        // Implementation would handle badge earning
    }

    private async handleHealthScoreChanged(eventData: FinancialEventData): Promise<void> {
        // Implementation would handle health score changes
    }
}

// Export singleton instance
export const integrationService = UnifiedIntegrationService.getInstance();