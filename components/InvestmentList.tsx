import React, { useState } from 'react';
import { Pencil, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { Investment, InvestmentMetrics } from '../types';
import { formatCurrency } from '../constants';

interface InvestmentWithMetrics extends Investment {
    calculatedMetrics: InvestmentMetrics;
}

interface InvestmentListProps {
    investments: InvestmentWithMetrics[];
    onEdit: (investment: InvestmentWithMetrics) => void;
    onDelete: (id: string) => void;
    onUpdateValue: (id: string, currentValue: number) => void;
    onWithdraw?: (id: string) => void;
}

export const InvestmentList: React.FC<InvestmentListProps> = ({
    investments,
    onEdit,
    onDelete,
    onUpdateValue,
    onWithdraw
}) => {
    const [editingValueId, setEditingValueId] = useState<string | null>(null);
    const [newValue, setNewValue] = useState('');

    const handleStartEditValue = (investment: InvestmentWithMetrics) => {
        setEditingValueId(investment.id);
        setNewValue(investment.currentValue.toString());
    };

    const handleSaveValue = async (id: string) => {
        const value = parseFloat(newValue);
        if (!isNaN(value) && value >= 0) {
            await onUpdateValue(id, value);
            setEditingValueId(null);
            setNewValue('');
        }
    };

    const handleCancelEditValue = () => {
        setEditingValueId(null);
        setNewValue('');
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            stock: 'Stock',
            bond: 'Bond',
            mutual_fund: 'Mutual Fund',
            etf: 'ETF',
            crypto: 'Crypto',
            real_estate: 'Real Estate',
            other: 'Other'
        };
        return labels[type] || type;
    };

    if (investments.length === 0) {
        return (
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-12 text-center">
                <p className="text-forest-400 text-lg">No investments yet. Add your first investment to start tracking your portfolio.</p>
            </div>
        );
    }

    return (
        <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Your Investments</h3>

            <div className="space-y-4">
                {investments.map((investment) => {
                    const { calculatedMetrics } = investment;
                    const isPositiveReturn = calculatedMetrics.totalReturn >= 0;

                    return (
                        <div
                            key={investment.id}
                            className="bg-forest-900 border border-forest-700 rounded-2xl p-5 hover:border-forest-600 transition-colors"
                        >
                            {/* Header Row */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-lg font-bold text-white truncate">{investment.name}</h4>
                                        {investment.symbol && (
                                            <span className="px-2 py-0.5 bg-forest-800 border border-forest-700 rounded text-forest-300 text-xs font-mono">
                                                {investment.symbol}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-forest-400 text-sm">{getTypeLabel(investment.type)}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onEdit(investment)}
                                        className="p-2 text-forest-400 hover:text-primary hover:bg-forest-800 rounded-lg transition-colors"
                                        title="Edit investment"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(investment.id)}
                                        className="p-2 text-forest-400 hover:text-rose-500 hover:bg-forest-800 rounded-lg transition-colors"
                                        title="Delete investment"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {/* Initial Amount */}
                                <div>
                                    <p className="text-forest-500 text-xs mb-1">Initial Amount</p>
                                    <p className="text-white font-semibold">{formatCurrency(investment.initialAmount)}</p>
                                </div>

                                {/* Current Value */}
                                <div>
                                    <p className="text-forest-500 text-xs mb-1">Current Value</p>
                                    {editingValueId === investment.id ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={newValue}
                                                onChange={(e) => setNewValue(e.target.value)}
                                                className="w-24 bg-forest-950 border border-forest-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-primary"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSaveValue(investment.id)}
                                                className="text-primary hover:text-primary/80 text-xs font-medium"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={handleCancelEditValue}
                                                className="text-forest-400 hover:text-white text-xs font-medium"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleStartEditValue(investment)}
                                            className="text-white font-semibold hover:text-primary transition-colors text-left"
                                        >
                                            {formatCurrency(investment.currentValue)}
                                            <DollarSign size={12} className="inline ml-1 text-forest-500" />
                                        </button>
                                    )}
                                </div>

                                {/* Total Return */}
                                <div>
                                    <p className="text-forest-500 text-xs mb-1">Total Return</p>
                                    <div className="flex items-center gap-1">
                                        {isPositiveReturn ? (
                                            <TrendingUp size={16} className="text-primary" />
                                        ) : (
                                            <TrendingDown size={16} className="text-rose-500" />
                                        )}
                                        <p className={`font-semibold ${isPositiveReturn ? 'text-primary' : 'text-rose-500'}`}>
                                            {isPositiveReturn ? '+' : ''}{formatCurrency(calculatedMetrics.totalReturn)}
                                        </p>
                                    </div>
                                    <p className={`text-xs ${isPositiveReturn ? 'text-primary' : 'text-rose-500'}`}>
                                        {isPositiveReturn ? '+' : ''}{calculatedMetrics.totalReturnPercentage.toFixed(2)}%
                                    </p>
                                </div>

                                {/* Annualized Return */}
                                <div>
                                    <p className="text-forest-500 text-xs mb-1">Annualized Return</p>
                                    <p className={`font-semibold ${(calculatedMetrics.annualizedReturn || 0) >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                        {(calculatedMetrics.annualizedReturn || 0) >= 0 ? '+' : ''}{(calculatedMetrics.annualizedReturn || 0).toFixed(2)}%
                                    </p>
                                    <p className="text-forest-500 text-xs">per year</p>
                                </div>
                            </div>

                            {/* Projections */}
                            <div className="pt-4 border-t border-forest-800">
                                <p className="text-forest-500 text-xs mb-2">Projected Value (at {investment.ratePerAnnum}% p.a.)</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-forest-950 rounded-lg p-2 text-center">
                                        <p className="text-forest-400 text-xs mb-1">1 Year</p>
                                        <p className="text-white font-semibold text-sm">{formatCurrency(calculatedMetrics.projectedValue1Year)}</p>
                                    </div>
                                    <div className="bg-forest-950 rounded-lg p-2 text-center">
                                        <p className="text-forest-400 text-xs mb-1">3 Years</p>
                                        <p className="text-white font-semibold text-sm">{formatCurrency(calculatedMetrics.projectedValue3Years)}</p>
                                    </div>
                                    <div className="bg-forest-950 rounded-lg p-2 text-center">
                                        <p className="text-forest-400 text-xs mb-1">5 Years</p>
                                        <p className="text-white font-semibold text-sm">{formatCurrency(calculatedMetrics.projectedValue5Years)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {onWithdraw && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => onWithdraw(investment.id)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                                    >
                                        Withdraw
                                    </button>
                                </div>
                            )}

                            {/* Notes */}
                            {investment.notes && (
                                <div className="mt-4 pt-4 border-t border-forest-800">
                                    <p className="text-forest-500 text-xs mb-1">Notes</p>
                                    <p className="text-forest-300 text-sm">{investment.notes}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
