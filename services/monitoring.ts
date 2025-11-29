// Monitoring and error tracking service
// Integrates with Sentry for error tracking and performance monitoring

interface ErrorContext {
    userId?: string;
    feature?: string;
    action?: string;
    metadata?: Record<string, any>;
}

interface PerformanceMetric {
    name: string;
    duration: number;
    metadata?: Record<string, any>;
}

interface AnalyticsEvent {
    category: string;
    action: string;
    label?: string;
    value?: number;
    metadata?: Record<string, any>;
}

class MonitoringService {
    private isInitialized = false;
    private userId: string | null = null;

    /**
     * Initialize monitoring service
     * In production, this would initialize Sentry or similar service
     */
    initialize(config: { dsn?: string; environment: string; release?: string }) {
        if (this.isInitialized) {
            console.warn('Monitoring service already initialized');
            return;
        }

        // In production, initialize Sentry:
        // Sentry.init({
        //   dsn: config.dsn,
        //   environment: config.environment,
        //   release: config.release,
        //   tracesSampleRate: 1.0,
        //   integrations: [
        //     new Sentry.BrowserTracing(),
        //     new Sentry.Replay(),
        //   ],
        // });

        console.log('Monitoring service initialized', config);
        this.isInitialized = true;
    }

    /**
     * Set user context for error tracking
     */
    setUser(userId: string, email?: string, username?: string) {
        this.userId = userId;

        // In production:
        // Sentry.setUser({ id: userId, email, username });

        console.log('User context set', { userId, email, username });
    }

    /**
     * Clear user context (on logout)
     */
    clearUser() {
        this.userId = null;

        // In production:
        // Sentry.setUser(null);

        console.log('User context cleared');
    }

    /**
     * Capture and report an error
     */
    captureError(error: Error, context?: ErrorContext) {
        console.error('Error captured:', error, context);

        // In production:
        // Sentry.captureException(error, {
        //   tags: {
        //     feature: context?.feature,
        //     action: context?.action,
        //   },
        //   extra: context?.metadata,
        //   user: context?.userId ? { id: context.userId } : undefined,
        // });

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.group('🔴 Error Details');
            console.error('Error:', error);
            console.log('Context:', context);
            console.groupEnd();
        }
    }

    /**
     * Capture a message (non-error event)
     */
    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
        console.log(`[${level.toUpperCase()}] ${message}`, context);

        // In production:
        // Sentry.captureMessage(message, {
        //   level,
        //   tags: {
        //     feature: context?.feature,
        //     action: context?.action,
        //   },
        //   extra: context?.metadata,
        // });
    }

    /**
     * Track performance metric
     */
    trackPerformance(metric: PerformanceMetric) {
        console.log('Performance metric:', metric);

        // In production, send to performance monitoring service
        // This could be Sentry, DataDog, New Relic, etc.

        if (process.env.NODE_ENV === 'development') {
            console.log(`⚡ Performance: ${metric.name} took ${metric.duration}ms`, metric.metadata);
        }
    }

    /**
     * Start a performance measurement
     */
    startPerformanceMeasure(name: string): () => void {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;
            this.trackPerformance({ name, duration });
        };
    }

    /**
     * Track API call performance
     */
    async trackApiCall<T>(
        endpoint: string,
        apiCall: () => Promise<T>
    ): Promise<T> {
        const endMeasure = this.startPerformanceMeasure(`api_${endpoint}`);

        try {
            const result = await apiCall();
            endMeasure();
            return result;
        } catch (error) {
            endMeasure();
            this.captureError(error as Error, {
                feature: 'api',
                action: endpoint,
            });
            throw error;
        }
    }

    /**
     * Track component render performance
     */
    trackComponentRender(componentName: string, renderTime: number) {
        this.trackPerformance({
            name: `component_render_${componentName}`,
            duration: renderTime,
        });
    }
}

// Analytics service for tracking user behavior
class AnalyticsService {
    private isInitialized = false;

    /**
     * Initialize analytics service
     * In production, this would initialize Google Analytics, Mixpanel, etc.
     */
    initialize(config: { trackingId?: string; environment: string }) {
        if (this.isInitialized) {
            console.warn('Analytics service already initialized');
            return;
        }

        // In production, initialize analytics:
        // gtag('config', config.trackingId);

        console.log('Analytics service initialized', config);
        this.isInitialized = true;
    }

    /**
     * Track a page view
     */
    trackPageView(path: string, title?: string) {
        console.log('Page view:', { path, title });

        // In production:
        // gtag('event', 'page_view', {
        //   page_path: path,
        //   page_title: title,
        // });
    }

    /**
     * Track a custom event
     */
    trackEvent(event: AnalyticsEvent) {
        console.log('Analytics event:', event);

        // In production:
        // gtag('event', event.action, {
        //   event_category: event.category,
        //   event_label: event.label,
        //   value: event.value,
        //   ...event.metadata,
        // });

        if (process.env.NODE_ENV === 'development') {
            console.log(`📊 Analytics: ${event.category} - ${event.action}`, event);
        }
    }

    /**
     * Track feature usage
     */
    trackFeatureUsage(featureName: string, action: string, metadata?: Record<string, any>) {
        this.trackEvent({
            category: 'feature_usage',
            action: `${featureName}_${action}`,
            metadata,
        });
    }

    /**
     * Track user engagement
     */
    trackEngagement(action: string, value?: number) {
        this.trackEvent({
            category: 'engagement',
            action,
            value,
        });
    }

    /**
     * Track conversion events
     */
    trackConversion(conversionType: string, value?: number) {
        this.trackEvent({
            category: 'conversion',
            action: conversionType,
            value,
        });
    }
}

// Export singleton instances
export const monitoring = new MonitoringService();
export const analytics = new AnalyticsService();

// Convenience functions for common tracking scenarios
export const trackFeature = {
    // Recurring Transactions
    recurringTransactionCreated: () => {
        analytics.trackFeatureUsage('recurring_transactions', 'created');
    },
    recurringTransactionToggled: (isActive: boolean) => {
        analytics.trackFeatureUsage('recurring_transactions', 'toggled', { isActive });
    },

    // Notifications
    notificationRead: (type: string) => {
        analytics.trackFeatureUsage('notifications', 'read', { type });
    },
    notificationPreferencesUpdated: () => {
        analytics.trackFeatureUsage('notifications', 'preferences_updated');
    },

    // Budget Recommendations
    budgetRecommendationsGenerated: (count: number) => {
        analytics.trackFeatureUsage('budget_recommendations', 'generated', { count });
    },
    budgetRecommendationAccepted: () => {
        analytics.trackFeatureUsage('budget_recommendations', 'accepted');
        analytics.trackConversion('budget_recommendation_accepted');
    },

    // Financial Insights
    insightsDashboardViewed: (timeRange: string) => {
        analytics.trackFeatureUsage('insights', 'dashboard_viewed', { timeRange });
    },
    healthScoreViewed: (score: number) => {
        analytics.trackFeatureUsage('insights', 'health_score_viewed', { score });
    },

    // Receipt Scanning
    receiptUploaded: () => {
        analytics.trackFeatureUsage('receipt_scanning', 'uploaded');
    },
    receiptProcessed: (success: boolean, confidence?: number) => {
        analytics.trackFeatureUsage('receipt_scanning', 'processed', { success, confidence });
    },

    // Investments
    investmentAdded: (type: string) => {
        analytics.trackFeatureUsage('investments', 'added', { type });
    },
    investmentValueUpdated: () => {
        analytics.trackFeatureUsage('investments', 'value_updated');
    },

    // Debts
    debtAdded: (type: string) => {
        analytics.trackFeatureUsage('debts', 'added', { type });
    },
    debtPaymentRecorded: (amount: number) => {
        analytics.trackFeatureUsage('debts', 'payment_recorded', { amount });
    },

    // Gamification
    challengeCompleted: (type: string, xpEarned: number) => {
        analytics.trackFeatureUsage('gamification', 'challenge_completed', { type, xpEarned });
    },
    badgeEarned: (badgeId: string) => {
        analytics.trackFeatureUsage('gamification', 'badge_earned', { badgeId });
        analytics.trackConversion('badge_earned');
    },
    levelUp: (newLevel: number) => {
        analytics.trackFeatureUsage('gamification', 'level_up', { newLevel });
        analytics.trackConversion('level_up', newLevel);
    },

    // AI Assistant
    aiQuerySent: (queryLength: number) => {
        analytics.trackFeatureUsage('ai_assistant', 'query_sent', { queryLength });
    },
    aiResponseReceived: (responseTime: number) => {
        analytics.trackFeatureUsage('ai_assistant', 'response_received', { responseTime });
    },

    // Security
    mfaEnabled: (method: string) => {
        analytics.trackFeatureUsage('security', 'mfa_enabled', { method });
        analytics.trackConversion('mfa_enabled');
    },
    passwordChanged: () => {
        analytics.trackFeatureUsage('security', 'password_changed');
    },

    // Export
    dataExported: (type: string, format: string) => {
        analytics.trackFeatureUsage('export', 'data_exported', { type, format });
    },
};

// Error boundary helper
export const withErrorBoundary = <T extends (...args: any[]) => any>(
    fn: T,
    context?: ErrorContext
): T => {
    return ((...args: any[]) => {
        try {
            const result = fn(...args);

            // Handle async functions
            if (result instanceof Promise) {
                return result.catch((error) => {
                    monitoring.captureError(error, context);
                    throw error;
                });
            }

            return result;
        } catch (error) {
            monitoring.captureError(error as Error, context);
            throw error;
        }
    }) as T;
};

// Performance monitoring hook helper
export const usePerformanceMonitor = (componentName: string) => {
    const startTime = performance.now();

    return () => {
        const renderTime = performance.now() - startTime;
        monitoring.trackComponentRender(componentName, renderTime);
    };
};
