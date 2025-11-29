import React, { useState } from 'react';
import { CategoryTrend } from '../types';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';

interface SpendingTrendsProps {
    trends: CategoryTrend[];
    timeRange: '3m' | '6m' | '12m';
    onTimeRangeChange: (range: '3m' | '6m' | '12m') => void;
}

const SpendingTrends: React.FC<SpendingTrendsProps> = ({
    trends,
    timeRange,
    onTimeRangeChange
}) => {
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up':
                return <ArrowUpIcon className="w-4 h-4 text-red-500" />;
            case 'down':
                return <ArrowDownIcon className="w-4 h-4 text-green-500" />;
            case 'stable':
                return <MinusIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up':
                return 'text-red-600';
            case 'down':
                return 'text-green-600';
            case 'stable':
                return 'text-gray-600';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Spending Trends</h3>

                {/* Time Range Selector */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onTimeRangeChange('3m')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === '3m'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        3M
                    </button>
                    <button
                        onClick={() => onTimeRangeChange('6m')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === '6m'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        6M
                    </button>
                    <button
                        onClick={() => onTimeRangeChange('12m')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === '12m'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        12M
                    </button>
                </div>
            </div>

            {/* Trends List */}
            {trends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No spending data available for the selected period
                </div>
            ) : (
                <div className="space-y-4">
                    {trends.map((trend, index) => (
                        <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-semibold text-gray-800">{trend.category}</h4>
                                    <p className="text-sm text-gray-500">Month-over-Month</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getTrendIcon(trend.trend)}
                                    <span className={`text-lg font-bold ${getTrendColor(trend.trend)}`}>
                                        {trend.percentageChange > 0 ? '+' : ''}
                                        {trend.percentageChange.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* Spending Comparison */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Previous Month</p>
                                    <p className="text-lg font-semibold text-gray-700">
                                        {formatCurrency(trend.previousMonth)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Current Month</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {formatCurrency(trend.currentMonth)}
                                    </p>
                                </div>
                            </div>

                            {/* Visual Bar */}
                            <div className="mt-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-2 bg-blue-400 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, (trend.previousMonth / Math.max(trend.currentMonth, trend.previousMonth)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, (trend.currentMonth / Math.max(trend.currentMonth, trend.previousMonth)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SpendingTrends;
