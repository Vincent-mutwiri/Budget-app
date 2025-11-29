import { Notification } from '../models/Notification';
import { UserPreferences } from '../models/UserPreferences';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { SavingsGoal } from '../models/SavingsGoal';
import { sendEmailNotification } from './emailNotificationService';
import { sendPushNotification } from './pushNotificationService';

/**
 * Create a notification in the database and route to delivery methods
 */
export async function createNotification(
    userId: string,
    type: 'bill_reminder' | 'budget_alert' | 'goal_milestone' | 'anomaly' | 'gamification' | 'system',
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    actionUrl?: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        // Check user preferences before creating notification
        const preferences = await getUserPreferences(userId);

        // Map notification type to preference key
        const preferenceKeyMap: Record<string, string> = {
            'bill_reminder': 'billReminders',
            'budget_alert': 'budgetAlerts',
            'goal_milestone': 'goalMilestones',
            'anomaly': 'anomalyAlerts',
            'gamification': 'gamificationNotifications',
            'system': 'system' // System notifications are always sent
        };

        const preferenceKey = preferenceKeyMap[type];

        // Check if this notification type is enabled (system notifications always sent)
        if (preferenceKey !== 'system' && preferences && preferences[preferenceKey] === false) {
            console.log(`Notification type ${type} is disabled for user ${userId}`);
            return;
        }

        // For budget alerts, check if the threshold is enabled
        if (type === 'budget_alert' && metadata?.threshold && preferences?.budgetThresholds) {
            if (!preferences.budgetThresholds.includes(metadata.threshold)) {
                console.log(`Budget threshold ${metadata.threshold}% is not enabled for user ${userId}`);
                return;
            }
        }

        // Create notification in database
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            priority,
            isRead: false,
            actionUrl,
            metadata,
            createdAt: new Date()
        });

        await notification.save();
        console.log(`Created ${type} notification for user ${userId}`);

        // Route to delivery methods based on preferences
        if (preferences?.emailNotifications) {
            try {
                await sendEmailNotification(userId, title, message, actionUrl);
            } catch (error) {
                console.error('Error sending email notification:', error);
                // Don't throw - continue with other delivery methods
            }
        }

        if (preferences?.pushNotifications) {
            try {
                await sendPushNotification(userId, title, message, actionUrl);
            } catch (error) {
                console.error('Error sending push notification:', error);
                // Don't throw - continue
            }
        }
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Check if user has enabled a specific notification type
 */
async function isNotificationEnabled(userId: string, notificationType: string): Promise<boolean> {
    try {
        const preferences = await UserPreferences.findOne({ userId });

        if (!preferences) {
            return true; // Default to enabled if no preferences set
        }

        const notificationPrefs = preferences.notifications as any;
        return notificationPrefs[notificationType] !== false;
    } catch (error) {
        console.error('Error checking notification preferences:', error);
        return true; // Default to enabled on error
    }
}

/**
 * Get user's notification preferences
 */
async function getUserPreferences(userId: string): Promise<any> {
    try {
        const preferences = await UserPreferences.findOne({ userId });
        return preferences?.notifications || {
            budgetAlerts: true,
            budgetThresholds: [50, 75, 80, 90, 100],
            billReminders: true,
            reminderDaysBefore: [1, 3, 7, 14],
            goalMilestones: true,
            anomalyAlerts: true,
            gamificationNotifications: true,
            emailNotifications: false,
            pushNotifications: true
        };
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        return null;
    }
}

/**
 * Check for upcoming bills and send reminders
 */
export async function checkBillReminders(): Promise<void> {
    try {
        console.log('Checking for bill reminders...');

        const now = new Date();
        const activeRecurringTransactions = await RecurringTransaction.find({
            isActive: true,
            reminderEnabled: true,
            type: 'expense'
        });

        for (const recurringTx of activeRecurringTransactions) {
            try {
                // Check if user has bill reminders enabled
                const enabled = await isNotificationEnabled(recurringTx.userId, 'billReminders');
                if (!enabled) continue;

                const preferences = await getUserPreferences(recurringTx.userId);
                const reminderDays = preferences?.reminderDaysBefore || [1, 3, 7];

                const nextOccurrence = new Date(recurringTx.nextOccurrence);
                const daysUntilDue = Math.ceil((nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                // Check if we should send a reminder
                if (reminderDays.includes(daysUntilDue) && daysUntilDue >= 0) {
                    // Check if we already sent a notification for this occurrence
                    const existingNotification = await Notification.findOne({
                        userId: recurringTx.userId,
                        type: 'bill_reminder',
                        'metadata.recurringTransactionId': recurringTx._id.toString(),
                        'metadata.dueDate': nextOccurrence.toISOString(),
                        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Within last 24 hours
                    });

                    if (!existingNotification) {
                        await createNotification(
                            recurringTx.userId,
                            'bill_reminder',
                            `Bill Reminder: ${recurringTx.description}`,
                            `Your ${recurringTx.description} payment of $${recurringTx.amount.toFixed(2)} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.`,
                            'high',
                            '/recurring',
                            {
                                recurringTransactionId: recurringTx._id.toString(),
                                amount: recurringTx.amount,
                                dueDate: nextOccurrence.toISOString(),
                                daysUntilDue
                            }
                        );
                    }
                }

                // Check for overdue bills
                if (daysUntilDue < 0) {
                    const daysOverdue = Math.abs(daysUntilDue);

                    const existingOverdueNotification = await Notification.findOne({
                        userId: recurringTx.userId,
                        type: 'bill_reminder',
                        'metadata.recurringTransactionId': recurringTx._id.toString(),
                        'metadata.isOverdue': true,
                        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
                    });

                    if (!existingOverdueNotification) {
                        await createNotification(
                            recurringTx.userId,
                            'bill_reminder',
                            `Overdue Payment: ${recurringTx.description}`,
                            `Your ${recurringTx.description} payment of $${recurringTx.amount.toFixed(2)} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue!`,
                            'high',
                            '/recurring',
                            {
                                recurringTransactionId: recurringTx._id.toString(),
                                amount: recurringTx.amount,
                                dueDate: nextOccurrence.toISOString(),
                                isOverdue: true,
                                daysOverdue
                            }
                        );
                    }
                }
            } catch (error) {
                console.error(`Error processing bill reminder for ${recurringTx._id}:`, error);
            }
        }

        console.log('Bill reminder check completed');
    } catch (error) {
        console.error('Error in checkBillReminders:', error);
    }
}

/**
 * Check budget spending and send alerts when thresholds are reached
 */
export async function checkBudgetAlerts(): Promise<void> {
    try {
        console.log('Checking for budget alerts...');

        // Get all budgets
        const budgets = await Budget.find({});

        // Group by userId
        const budgetsByUser = budgets.reduce((acc, budget) => {
            if (!acc[budget.userId]) {
                acc[budget.userId] = [];
            }
            acc[budget.userId].push(budget);
            return acc;
        }, {} as Record<string, any[]>);

        for (const [userId, userBudgets] of Object.entries(budgetsByUser)) {
            try {
                // Check if user has budget alerts enabled
                const enabled = await isNotificationEnabled(userId, 'budgetAlerts');
                if (!enabled) continue;

                const preferences = await getUserPreferences(userId);
                const thresholds = preferences?.budgetThresholds || [80, 100];

                for (const budget of userBudgets) {
                    const percentageSpent = (budget.spent / budget.limit) * 100;

                    for (const threshold of thresholds) {
                        if (percentageSpent >= threshold) {
                            // Check if we already sent this alert recently
                            const existingAlert = await Notification.findOne({
                                userId,
                                type: 'budget_alert',
                                'metadata.budgetId': budget._id.toString(),
                                'metadata.threshold': threshold,
                                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within last 7 days
                            });

                            if (!existingAlert) {
                                const priority = threshold >= 100 ? 'high' : threshold >= 80 ? 'medium' : 'low';
                                const message = threshold >= 100
                                    ? `You've exceeded your ${budget.category} budget! Spent $${budget.spent.toFixed(2)} of $${budget.limit.toFixed(2)}.`
                                    : `You've reached ${threshold}% of your ${budget.category} budget. Spent $${budget.spent.toFixed(2)} of $${budget.limit.toFixed(2)}.`;

                                await createNotification(
                                    userId,
                                    'budget_alert',
                                    `Budget Alert: ${budget.category}`,
                                    message,
                                    priority,
                                    '/budgets',
                                    {
                                        budgetId: budget._id.toString(),
                                        category: budget.category,
                                        spent: budget.spent,
                                        limit: budget.limit,
                                        percentageSpent: Math.round(percentageSpent),
                                        threshold
                                    }
                                );
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing budget alerts for user ${userId}:`, error);
            }
        }

        console.log('Budget alert check completed');
    } catch (error) {
        console.error('Error in checkBudgetAlerts:', error);
    }
}

/**
 * Check savings goals and send milestone notifications
 */
export async function checkGoalMilestones(): Promise<void> {
    try {
        console.log('Checking for goal milestones...');

        const goals = await SavingsGoal.find({ status: 'in-progress' });

        for (const goal of goals) {
            try {
                // Check if user has goal milestone notifications enabled
                const enabled = await isNotificationEnabled(goal.userId, 'goalMilestones');
                if (!enabled) continue;

                const percentageComplete = (goal.currentAmount / goal.targetAmount) * 100;
                const milestones = [25, 50, 75, 100];

                for (const milestone of milestones) {
                    if (percentageComplete >= milestone) {
                        // Check if we already sent this milestone notification
                        const existingNotification = await Notification.findOne({
                            userId: goal.userId,
                            type: 'goal_milestone',
                            'metadata.goalId': goal._id.toString(),
                            'metadata.milestone': milestone
                        });

                        if (!existingNotification) {
                            const message = milestone === 100
                                ? `Congratulations! You've reached your savings goal "${goal.title}"! 🎉`
                                : `Great progress! You've reached ${milestone}% of your "${goal.title}" goal.`;

                            await createNotification(
                                goal.userId,
                                'goal_milestone',
                                milestone === 100 ? `Goal Achieved: ${goal.title}` : `Milestone Reached: ${goal.title}`,
                                message,
                                milestone === 100 ? 'high' : 'medium',
                                '/goals',
                                {
                                    goalId: goal._id.toString(),
                                    goalTitle: goal.title,
                                    currentAmount: goal.currentAmount,
                                    targetAmount: goal.targetAmount,
                                    percentageComplete: Math.round(percentageComplete),
                                    milestone
                                }
                            );

                            // Mark goal as completed if 100% reached
                            if (milestone === 100 && goal.status !== 'completed') {
                                goal.status = 'completed';
                                await goal.save();
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing goal milestone for ${goal._id}:`, error);
            }
        }

        console.log('Goal milestone check completed');
    } catch (error) {
        console.error('Error in checkGoalMilestones:', error);
    }
}

/**
 * Detect spending anomalies and send alerts
 */
export async function checkSpendingAnomalies(): Promise<void> {
    try {
        console.log('Checking for spending anomalies...');

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get all transactions from the last 30 days
        const transactions = await Transaction.find({
            date: { $gte: thirtyDaysAgo },
            type: 'expense'
        });

        // Group by userId and category
        const transactionsByUserAndCategory = transactions.reduce((acc, tx) => {
            const key = `${tx.userId}:${tx.category}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(tx);
            return acc;
        }, {} as Record<string, any[]>);

        for (const [key, txs] of Object.entries(transactionsByUserAndCategory)) {
            try {
                const [userId, category] = key.split(':');

                // Check if user has anomaly alerts enabled
                const enabled = await isNotificationEnabled(userId, 'anomalyAlerts');
                if (!enabled) continue;

                // Calculate average spending for this category
                const amounts = txs.map(tx => tx.amount);
                const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

                // Check recent transactions (last 24 hours) for anomalies
                const recentTxs = txs.filter(tx => new Date(tx.date) >= oneDayAgo);

                for (const tx of recentTxs) {
                    // Anomaly: transaction exceeds 150% of average
                    if (tx.amount > average * 1.5 && average > 0) {
                        // Check if we already sent an alert for this transaction
                        const existingAlert = await Notification.findOne({
                            userId,
                            type: 'anomaly',
                            'metadata.transactionId': tx._id.toString()
                        });

                        if (!existingAlert) {
                            const deviationPercentage = Math.round(((tx.amount - average) / average) * 100);

                            await createNotification(
                                userId,
                                'anomaly',
                                `Unusual Spending Detected`,
                                `A ${category} transaction of $${tx.amount.toFixed(2)} is ${deviationPercentage}% higher than your average of $${average.toFixed(2)}.`,
                                'medium',
                                '/transactions',
                                {
                                    transactionId: tx._id.toString(),
                                    category,
                                    amount: tx.amount,
                                    averageAmount: average,
                                    deviationPercentage,
                                    description: tx.description
                                }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing anomaly detection for ${key}:`, error);
            }
        }

        console.log('Spending anomaly check completed');
    } catch (error) {
        console.error('Error in checkSpendingAnomalies:', error);
    }
}

/**
 * Run all notification checks
 */
export async function runNotificationEngine(): Promise<void> {
    console.log('Starting notification engine...');

    try {
        await Promise.all([
            checkBillReminders(),
            checkBudgetAlerts(),
            checkGoalMilestones(),
            checkSpendingAnomalies()
        ]);

        console.log('Notification engine completed successfully');
    } catch (error) {
        console.error('Error in notification engine:', error);
    }
}

/**
 * Start the notification engine scheduler
 * Runs every hour
 */
export function startNotificationEngine(): void {
    // Run immediately on startup
    runNotificationEngine().catch(console.error);

    // Schedule to run every hour
    const ONE_HOUR = 60 * 60 * 1000;

    setInterval(() => {
        runNotificationEngine().catch(console.error);
    }, ONE_HOUR);

    console.log('Notification engine scheduler started - running every hour');
}
