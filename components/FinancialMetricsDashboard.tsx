import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Target, PiggyBank, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../constants';
import type { FinancialMetrics } from '../types';

interface FinancialMetricsDashboardProps {
    metrics: FinancialMetrics | null;
    isLoading: boolean;
    error: string | null;
}

export const FinancialMetricsDashboard: React.FC<FinancialMetricsDashboardProps> = ({
    metrics,
    isLoading,
    error
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-forest-800 border border-forest-700 p-6 rounded-3xl animate-pulse">
                        <div className="h-4 bg-forest-700 rounded w-1/2 mb-3"></div>
                        <div className="h-8 bg-forest-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-forest-700 rounded w-1/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex items-center gap-4">
                <AlertCircle className="text-rose-500" size={24} />
                <div>
                    <h3 className="text-white font-bold mb-1">Failed to Load Metrics</h3>
                    <p className="text-forest-300 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (!metrics) {
        return null;
    }

    const MetricCard = ({
        title,
        value,
        icon: Icon,
        trend,
        trendValue,
        colorClass = 'text-white'
    }: {
        title: string;
        value: string;
        icon: React.ElementType;
        trend?: 'up' | 'down' | 'neutral';
        trendValue?: string;
        colorClass?: string;
    }) => (
        <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl hover:border-forest-600 transition-colors relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-forest-300 text-sm font-medium">{title}</h3>
                    <div className="bg-forest-900 p-2 rounded-lg">
                        <Icon size={18} className="text-forest-400" />
                    </div>
                </div>
                <div className={`text-3xl font-bold mb-2 ${colorClass}`}>{value}</div>
                {trendValue && (
                    <div className={`flex items-center text-sm font-medium ${trend === 'up' ? 'text-primary' :
                            trend === 'down' ? 'text-rose-500' :
                                'text-forest-400'
                        }`}>
                        {trend === 'up' && <TrendingUp size={16} className="mr-1" />}
                        {trend === 'down' && <TrendingDown size={16} className="mr-1" />}
                        {trendValue}
                    </div>
                )}
            </div>
            <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-1/4 translate-y-1/4">
                <Icon size={120} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Income Section */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Income Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        title="Current Month Income"
                        value={formatCurrency(metrics.currentMonthIncome)}
                        icon={DollarSign}
                        trend="neutral"
                        trendValue="This month"
                    />
                    <MetricCard
                        title="Overall Total Income"
                        value={formatCurrency(metrics.overallTotalIncome)}
                        icon={Wallet}
                        trend="up"
                        trendValue="Including previous balance"
                        colorClass="text-primary"
                    />
                    <MetricCard
                        title="Previous Balance"
                        value={formatCurrency(metrics.previousMonthsRemainder)}
                        icon={PiggyBank}
                        trend="neutral"
                        trendValue="Carried forward"
                    />
                </div>
            </div>

            {/* Spending & Savings Section */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Spending & Savings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MetricCard
                        title="Current Month Spending"
                        value={formatCurrency(metrics.currentMonthSpending)}
                        icon={TrendingDown}
                        trend="down"
                        trendValue={`${metrics.budgetUtilization.toFixed(1)}% of budget`}
                        colorClass="text-rose-400"
                    />
                    <MetricCard
                        title="Monthly Savings"
                        value={formatCurrency(metrics.monthlySavings)}
                        icon={PiggyBank}
                        trend={metrics.monthlySavings >= 0 ? 'up' : 'down'}
                        trendValue={metrics.monthlySavings >= 0 ? 'Positive savings' : 'Negative savings'}
                        colorClass={metrics.monthlySavings >= 0 ? 'text-primary' : 'text-rose-500'}
                    />
                </div>
            </div>

            {/* Budget Section */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Budget Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        title="Total Planned Budget"
                        value={formatCurrency(metrics.totalPlannedBudget)}
                        icon={Target}
                        trend="neutral"
                        trendValue="Monthly budget"
                    />
                    <MetricCard
                        title="Remaining Budget"
                        value={formatCurrency(metrics.remainingBudget)}
                        icon={Wallet}
                        trend={metrics.remainingBudget >= 0 ? 'up' : 'down'}
                        trendValue={metrics.remainingBudget >= 0 ? 'Within budget' : 'Over budget'}
                        colorClass={metrics.remainingBudget >= 0 ? 'text-primary' : 'text-rose-500'}
                    />
                    <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl hover:border-forest-600 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-forest-300 text-sm font-medium">Budget Trend</h3>
                            <div className="bg-forest-900 p-2 rounded-lg">
                                {metrics.trendPositive ? (
                                    <TrendingUp size={18} className="text-primary" />
                                ) : (
                                    <TrendingDown size={18} className="text-rose-500" />
                                )}
                            </div>
                        </div>
                        <div className={`text-3xl font-bold mb-2 ${metrics.trendPositive ? 'text-primary' : 'text-rose-500'
                            }`}>
                            {metrics.trendPositive ? 'On Track' : 'Over Budget'}
                        </div>
                        <div className={`flex items-center text-sm font-medium ${metrics.trendPositive ? 'text-primary' : 'text-rose-500'
                            }`}>
                            {metrics.trendPositive ? (
                                <TrendingUp size={16} className="mr-1" />
                            ) : (
                                <TrendingDown size={16} className="mr-1" />
                            )}
                            {Math.abs(metrics.trendPercentage).toFixed(1)}% {metrics.trendPositive ? 'under' : 'over'} budget
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
