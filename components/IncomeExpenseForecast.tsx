import React from 'react';

interface IncomeExpenseForecastProps {
    forecast: {
        projectedIncome: number;
        projectedExpenses: number;
        confidence: number;
    };
}

const IncomeExpenseForecast: React.FC<IncomeExpenseForecastProps> = ({ forecast }) => {
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const projectedSavings = forecast.projectedIncome - forecast.projectedExpenses;
    const savingsRate = forecast.projectedIncome > 0
        ? (projectedSavings / forecast.projectedIncome) * 100
        : 0;

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 80) return 'text-green-600';
        if (confidence >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getConfidenceLabel = (confidence: number): string => {
        if (confidence >= 80) return 'High';
        if (confidence >= 60) return 'Medium';
        return 'Low';
    };

    const maxAmount = Math.max(forecast.projectedIncome, forecast.projectedExpenses);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-semibold">Next Month Forecast</h3>
                    <p className="text-sm text-gray-500 mt-1">Based on historical patterns</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Confidence Level</p>
                    <p className={`text-lg font-bold ${getConfidenceColor(forecast.confidence)}`}>
                        {getConfidenceLabel(forecast.confidence)} ({forecast.confidence}%)
                    </p>
                </div>
            </div>

            {/* Bar Chart Comparison */}
            <div className="space-y-6 mb-6">
                {/* Projected Income */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Projected Income</span>
                        <span className="text-lg font-bold text-green-600">
                            {formatCurrency(forecast.projectedIncome)}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                            className="h-8 bg-green-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-3"
                            style={{
                                width: `${(forecast.projectedIncome / maxAmount) * 100}%`
                            }}
                        >
                            <span className="text-white text-xs font-semibold">
                                {((forecast.projectedIncome / maxAmount) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Projected Expenses */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Projected Expenses</span>
                        <span className="text-lg font-bold text-red-600">
                            {formatCurrency(forecast.projectedExpenses)}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                            className="h-8 bg-red-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-3"
                            style={{
                                width: `${(forecast.projectedExpenses / maxAmount) * 100}%`
                            }}
                        >
                            <span className="text-white text-xs font-semibold">
                                {((forecast.projectedExpenses / maxAmount) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                {/* Projected Savings */}
                <div className={`p-4 rounded-lg ${projectedSavings >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-gray-600 mb-1">Projected Savings</p>
                    <p className={`text-2xl font-bold ${projectedSavings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(Math.abs(projectedSavings))}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                        {projectedSavings >= 0 ? 'Surplus' : 'Deficit'}
                    </p>
                </div>

                {/* Savings Rate */}
                <div className="p-4 rounded-lg bg-blue-50">
                    <p className="text-xs text-gray-600 mb-1">Savings Rate</p>
                    <p className="text-2xl font-bold text-blue-700">
                        {savingsRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                        {savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Good' : 'Needs Work'}
                    </p>
                </div>
            </div>

            {/* Insights */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Insights</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                    {projectedSavings >= 0 ? (
                        <li>✓ You're on track to save {formatCurrency(projectedSavings)} next month</li>
                    ) : (
                        <li>⚠ You may have a deficit of {formatCurrency(Math.abs(projectedSavings))} next month</li>
                    )}
                    {savingsRate >= 20 && (
                        <li>✓ Your projected savings rate is excellent</li>
                    )}
                    {savingsRate < 10 && (
                        <li>⚠ Consider reducing expenses to improve your savings rate</li>
                    )}
                    {forecast.confidence < 70 && (
                        <li>ℹ Add more transaction history for more accurate forecasts</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default IncomeExpenseForecast;
