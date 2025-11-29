import React from 'react';
import { SpendingAnomaly } from '../types';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface AnomalyAlertsProps {
    anomalies: SpendingAnomaly[];
    onReview?: (transactionId: string) => void;
}

const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({ anomalies, onReview }) => {
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getSeverityColor = (deviation: number): string => {
        if (deviation >= 300) return 'bg-red-100 border-red-300 text-red-800';
        if (deviation >= 200) return 'bg-orange-100 border-orange-300 text-orange-800';
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    };

    const getSeverityBadge = (deviation: number): string => {
        if (deviation >= 300) return 'Critical';
        if (deviation >= 200) return 'High';
        return 'Medium';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                <h3 className="text-xl font-semibold">Spending Anomalies</h3>
            </div>

            {anomalies.length === 0 ? (
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <svg
                            className="w-8 h-8 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No unusual spending detected</p>
                    <p className="text-sm text-gray-500 mt-1">Your spending patterns look normal</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                        {anomalies.length} unusual {anomalies.length === 1 ? 'transaction' : 'transactions'} detected
                    </p>

                    {anomalies.map((anomaly, index) => (
                        <div
                            key={index}
                            className={`border-2 rounded-lg p-4 ${getSeverityColor(anomaly.deviationPercentage)}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{anomaly.category}</h4>
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white bg-opacity-50">
                                            {getSeverityBadge(anomaly.deviationPercentage)}
                                        </span>
                                    </div>
                                    <p className="text-sm opacity-90">
                                        {anomaly.deviationPercentage.toFixed(0)}% above average spending
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{formatCurrency(anomaly.amount)}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-current border-opacity-20">
                                <div className="text-sm">
                                    <span className="opacity-75">Average: </span>
                                    <span className="font-semibold">{formatCurrency(anomaly.averageAmount)}</span>
                                </div>
                                {onReview && (
                                    <button
                                        onClick={() => onReview(anomaly.transactionId)}
                                        className="px-3 py-1 text-sm font-medium bg-white bg-opacity-80 hover:bg-opacity-100 rounded-md transition-colors"
                                    >
                                        Review
                                    </button>
                                )}
                            </div>

                            {/* Visual comparison */}
                            <div className="mt-3">
                                <div className="flex items-center gap-2 text-xs opacity-75 mb-1">
                                    <span>Average</span>
                                    <div className="flex-1 border-t border-current border-opacity-30" />
                                    <span>This Transaction</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white bg-opacity-50 rounded-full h-2">
                                        <div
                                            className="h-2 bg-current rounded-full opacity-60"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="flex-1 bg-white bg-opacity-50 rounded-full h-2">
                                        <div
                                            className="h-2 bg-current rounded-full"
                                            style={{
                                                width: `${Math.min(100, (anomaly.amount / anomaly.averageAmount) * 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {anomalies.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 What are anomalies?</h4>
                    <p className="text-sm text-blue-800">
                        Anomalies are transactions that significantly exceed your typical spending in a category.
                        They may indicate unusual purchases, billing errors, or changes in spending habits worth reviewing.
                    </p>
                </div>
            )}
        </div>
    );
};

export default AnomalyAlerts;
