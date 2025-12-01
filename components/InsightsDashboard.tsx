import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { FinancialInsights } from '../types';
import { getAllInsights } from '../services/api';
import FinancialHealthScore from './FinancialHealthScore';
import SpendingTrends from './SpendingTrends';
import IncomeExpenseForecast from './IncomeExpenseForecast';
import AnomalyAlerts from './AnomalyAlerts';
import SpendingCalendar from './SpendingCalendar';

const InsightsDashboard: React.FC = () => {
    const { user } = useUser();
    const [insights, setInsights] = useState<FinancialInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m'>('3m');

    useEffect(() => {
        if (user) {
            fetchInsights();
        }
    }, [user]);

    const fetchInsights = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            const data = await getAllInsights(user.id);
            setInsights(data);
        } catch (err) {
            console.error('Error fetching insights:', err);
            setError('Failed to load insights. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchInsights();
    };

    const handleTimeRangeChange = (range: '3m' | '6m' | '12m') => {
        setTimeRange(range);
        // In a full implementation, this would trigger a new API call with the time range
        // For now, we're just updating the UI state
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading insights...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Insights</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md">
                    <div className="text-gray-400 text-5xl mb-4">📊</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Insights Available</h2>
                    <p className="text-gray-600 mb-6">
                        Start adding transactions to see your financial insights
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Financial Insights</h1>
                            <p className="text-gray-600 mt-1">
                                Comprehensive analysis of your financial health
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            Refresh
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Last updated: {new Date(insights.generatedAt).toLocaleString()}
                    </p>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Financial Health Score */}
                    <div className="lg:col-span-1">
                        <FinancialHealthScore
                            healthScore={insights.healthScore}
                            healthScoreComponents={insights.healthScoreComponents}
                        />
                    </div>

                    {/* Income/Expense Forecast */}
                    <div className="lg:col-span-1">
                        <IncomeExpenseForecast forecast={insights.forecast} />
                    </div>

                    {/* Spending Trends */}
                    <div className="lg:col-span-2">
                        <SpendingTrends
                            trends={insights.spendingTrends}
                            timeRange={timeRange}
                            onTimeRangeChange={handleTimeRangeChange}
                        />
                    </div>

                    {/* Anomaly Alerts */}
                    <div className="lg:col-span-2">
                        <AnomalyAlerts
                            anomalies={insights.anomalies}
                            onReview={(transactionId) => {
                                console.log('Review transaction:', transactionId);
                                // In a full implementation, this would navigate to the transaction details
                            }}
                        />
                    </div>

                    {/* Spending Calendar */}
                    <div className="lg:col-span-2">
                        <SpendingCalendar />
                    </div>
                </div>

                {/* Additional Info */}
                <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Understanding Your Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Financial Health Score</h4>
                            <p>
                                A comprehensive metric combining your savings rate, debt management,
                                budget adherence, and emergency fund status. Aim for 75+ for excellent health.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Spending Trends</h4>
                            <p>
                                Month-over-month changes in your spending by category. Use this to identify
                                areas where you can optimize your budget.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Forecast</h4>
                            <p>
                                Predictions for next month's income and expenses based on your historical
                                patterns and recurring transactions.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Anomalies</h4>
                            <p>
                                Unusual transactions that exceed 150% of your average spending in a category.
                                Review these to ensure they're legitimate.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsightsDashboard;
