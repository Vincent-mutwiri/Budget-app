import React from 'react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { ContextualInsight } from '../types';

// Register ChartJS components
ChartJS.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface ContextualInsightPanelProps {
    insight: ContextualInsight | null;
    onAction?: (action: string) => void;
}

const ContextualInsightPanel: React.FC<ContextualInsightPanelProps> = ({ insight, onAction }) => {
    if (!insight) {
        return null;
    }

    const renderVisualization = (viz: any, index: number) => {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom' as const,
                    labels: {
                        color: '#e5e7eb',
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#e5e7eb',
                    borderColor: '#374151',
                    borderWidth: 1
                }
            },
            ...viz.options
        };

        switch (viz.type) {
            case 'pie':
                return (
                    <div key={index} className="h-64">
                        <Pie data={viz.data} options={chartOptions} />
                    </div>
                );
            case 'bar':
                return (
                    <div key={index} className="h-64">
                        <Bar data={viz.data} options={chartOptions} />
                    </div>
                );
            case 'line':
                return (
                    <div key={index} className="h-64">
                        <Line data={viz.data} options={chartOptions} />
                    </div>
                );
            case 'doughnut':
                return (
                    <div key={index} className="h-64">
                        <Pie data={viz.data} options={chartOptions} />
                    </div>
                );
            default:
                return null;
        }
    };

    const renderSpendingSummary = () => {
        const { data } = insight;
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Total Spent</p>
                        <p className="text-2xl font-bold text-white">
                            ${data.totalSpent?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Transactions</p>
                        <p className="text-2xl font-bold text-white">
                            {data.transactionCount || 0}
                        </p>
                    </div>
                </div>

                {data.topCategories && data.topCategories.length > 0 && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="text-white font-semibold mb-3">Top Categories</h4>
                        <div className="space-y-2">
                            {data.topCategories.map((cat: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <span className="text-gray-300">{cat.category}</span>
                                    <span className="text-white font-semibold">
                                        ${cat.amount?.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderBudgetStatus = () => {
        const { data } = insight;
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Total Budget</p>
                        <p className="text-2xl font-bold text-white">
                            ${data.totalBudget?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Total Spent</p>
                        <p className="text-2xl font-bold text-white">
                            ${data.totalSpent?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                </div>

                {data.overBudgetCategories && data.overBudgetCategories.length > 0 && (
                    <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg">
                        <h4 className="text-red-400 font-semibold mb-2 flex items-center">
                            <span className="mr-2">⚠️</span>
                            Over Budget
                        </h4>
                        <div className="space-y-1">
                            {data.overBudgetCategories.map((cat: any, idx: number) => (
                                <div key={idx} className="text-red-300 text-sm">
                                    {cat.category}: {cat.percentageUsed?.toFixed(1)}% used
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.budgets && data.budgets.length > 0 && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="text-white font-semibold mb-3">Budget Details</h4>
                        <div className="space-y-3">
                            {data.budgets.slice(0, 5).map((budget: any, idx: number) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-300">{budget.category}</span>
                                        <span className="text-gray-400">
                                            ${budget.spent?.toFixed(2)} / ${budget.limit?.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${budget.percentageUsed > 100
                                                    ? 'bg-red-500'
                                                    : budget.percentageUsed > 80
                                                        ? 'bg-yellow-500'
                                                        : 'bg-green-500'
                                                }`}
                                            style={{
                                                width: `${Math.min(budget.percentageUsed, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderInvestmentPerformance = () => {
        const { data } = insight;
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Total Value</p>
                        <p className="text-xl font-bold text-white">
                            ${data.totalValue?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Total Return</p>
                        <p className="text-xl font-bold text-green-400">
                            ${data.totalReturn?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Return %</p>
                        <p className={`text-xl font-bold ${(data.totalReturnPercentage || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {data.totalReturnPercentage?.toFixed(2) || '0.00'}%
                        </p>
                    </div>
                </div>

                {data.topPerformers && data.topPerformers.length > 0 && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="text-white font-semibold mb-3">Top Performers</h4>
                        <div className="space-y-2">
                            {data.topPerformers.map((inv: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div>
                                        <p className="text-gray-300">{inv.name}</p>
                                        <p className="text-gray-500 text-xs">{inv.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-semibold">
                                            ${inv.currentValue?.toFixed(2)}
                                        </p>
                                        <p className={`text-xs ${(inv.calculatedMetrics?.totalReturnPercentage || 0) >= 0
                                                ? 'text-green-400'
                                                : 'text-red-400'
                                            }`}>
                                            {inv.calculatedMetrics?.totalReturnPercentage?.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderDebtOverview = () => {
        const { data } = insight;
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Total Debt</p>
                        <p className="text-2xl font-bold text-red-400">
                            ${data.totalDebt?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Monthly Payment</p>
                        <p className="text-2xl font-bold text-white">
                            ${data.monthlyPayment?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                </div>

                {data.highestInterestDebt && (
                    <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg">
                        <h4 className="text-yellow-400 font-semibold mb-2">
                            Highest Interest Debt
                        </h4>
                        <div className="text-gray-300">
                            <p className="font-semibold">{data.highestInterestDebt.name}</p>
                            <p className="text-sm">
                                ${data.highestInterestDebt.currentBalance?.toFixed(2)} at{' '}
                                {data.highestInterestDebt.interestRate}% APR
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderQuickActions = () => {
        const actions = [];

        switch (insight.type) {
            case 'spending_summary':
                actions.push(
                    { label: 'View All Transactions', action: 'view_transactions' },
                    { label: 'Set Budget', action: 'create_budget' }
                );
                break;
            case 'budget_status':
                actions.push(
                    { label: 'Adjust Budgets', action: 'edit_budgets' },
                    { label: 'View Spending', action: 'view_spending' }
                );
                break;
            case 'investment_performance':
                actions.push(
                    { label: 'View Portfolio', action: 'view_investments' },
                    { label: 'Add Investment', action: 'add_investment' }
                );
                break;
            case 'debt_overview':
                actions.push(
                    { label: 'View Debts', action: 'view_debts' },
                    { label: 'Record Payment', action: 'record_payment' }
                );
                break;
        }

        if (actions.length === 0) return null;

        return (
            <div className="flex gap-2 mt-4">
                {actions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={() => onAction?.(action.action)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
                {insight.type === 'spending_summary' && '💰 Spending Summary'}
                {insight.type === 'budget_status' && '📊 Budget Status'}
                {insight.type === 'investment_performance' && '📈 Investment Performance'}
                {insight.type === 'debt_overview' && '💳 Debt Overview'}
            </h3>

            <div className="space-y-6">
                {/* Data Summary */}
                {insight.type === 'spending_summary' && renderSpendingSummary()}
                {insight.type === 'budget_status' && renderBudgetStatus()}
                {insight.type === 'investment_performance' && renderInvestmentPerformance()}
                {insight.type === 'debt_overview' && renderDebtOverview()}

                {/* Visualizations */}
                {insight.visualizations && insight.visualizations.length > 0 && (
                    <div className="space-y-4">
                        {insight.visualizations.map((viz, idx) => renderVisualization(viz, idx))}
                    </div>
                )}

                {/* Quick Actions */}
                {renderQuickActions()}
            </div>
        </div>
    );
};

export default ContextualInsightPanel;
