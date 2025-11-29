import React, { useState } from 'react';
import { Debt, DebtMetrics } from '../types';
import { Pencil, Trash2, DollarSign, Calendar, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../constants';

interface DebtWithMetrics extends Debt {
    calculatedMetrics: DebtMetrics;
}

interface DebtListProps {
    debts: DebtWithMetrics[];
    onEdit: (debt: DebtWithMetrics) => void;
    onDelete: (id: string) => void;
    onRecordPayment: (id: string) => void;
}

const DEBT_TYPE_LABELS: Record<string, string> = {
    credit_card: 'Credit Card',
    student_loan: 'Student Loan',
    mortgage: 'Mortgage',
    car_loan: 'Car Loan',
    personal_loan: 'Personal Loan',
    other: 'Other'
};

export const DebtList: React.FC<DebtListProps> = ({ debts, onEdit, onDelete, onRecordPayment }) => {
    const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

    const toggleExpand = (debtId: string) => {
        setExpandedDebtId(expandedDebtId === debtId ? null : debtId);
    };

    const calculateProgress = (debt: DebtWithMetrics): number => {
        const paidAmount = debt.originalAmount - debt.currentBalance;
        return (paidAmount / debt.originalAmount) * 100;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (debts.length === 0) {
        return (
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-12 text-center">
                <div className="text-forest-400 mb-4">
                    <TrendingDown size={48} className="mx-auto opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Debts Tracked</h3>
                <p className="text-forest-400">Add your first debt to start tracking your debt reduction journey.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {debts.map((debt) => {
                const progress = calculateProgress(debt);
                const isExpanded = expandedDebtId === debt.id;

                return (
                    <div
                        key={debt.id}
                        className="bg-forest-800 border border-forest-700 rounded-3xl p-6 hover:border-forest-600 transition-colors"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-bold text-white">{debt.name}</h3>
                                    <span className="px-3 py-1 rounded-full bg-forest-900 border border-forest-700 text-forest-300 text-xs font-medium">
                                        {DEBT_TYPE_LABELS[debt.type]}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-forest-400">
                                    <span>Interest Rate: {debt.interestRate}%</span>
                                    <span>•</span>
                                    <span>Min Payment: {formatCurrency(debt.minimumPayment)}/mo</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onEdit(debt)}
                                    className="p-2 text-forest-400 hover:text-primary transition-colors rounded-lg hover:bg-forest-900"
                                    title="Edit debt"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => onDelete(debt.id)}
                                    className="p-2 text-forest-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-forest-900"
                                    title="Delete debt"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Balance and Progress */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-forest-900 rounded-xl p-4">
                                <div className="text-forest-400 text-xs font-medium mb-1">Current Balance</div>
                                <div className="text-2xl font-bold text-white">{formatCurrency(debt.currentBalance)}</div>
                                <div className="text-forest-500 text-xs mt-1">
                                    of {formatCurrency(debt.originalAmount)} original
                                </div>
                            </div>
                            <div className="bg-forest-900 rounded-xl p-4">
                                <div className="text-forest-400 text-xs font-medium mb-1">Payoff Date</div>
                                <div className="text-lg font-bold text-white">
                                    {formatDate(debt.calculatedMetrics.payoffDate)}
                                </div>
                                <div className="text-forest-500 text-xs mt-1">
                                    {debt.calculatedMetrics.monthsRemaining} months remaining
                                </div>
                            </div>
                            <div className="bg-forest-900 rounded-xl p-4">
                                <div className="text-forest-400 text-xs font-medium mb-1">Total Interest</div>
                                <div className="text-lg font-bold text-rose-400">
                                    {formatCurrency(debt.calculatedMetrics.totalInterest)}
                                </div>
                                <div className="text-forest-500 text-xs mt-1">
                                    at minimum payments
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-forest-300">Reduction Progress</span>
                                <span className="text-sm font-bold text-primary">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-forest-950 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, progress)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => onRecordPayment(debt.id)}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3 rounded-xl transition-colors"
                            >
                                <DollarSign size={18} />
                                Record Payment
                            </button>
                            <button
                                onClick={() => toggleExpand(debt.id)}
                                className="px-6 bg-forest-900 border border-forest-700 hover:border-forest-600 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                {isExpanded ? 'Hide' : 'Details'}
                            </button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-forest-700">
                                <h4 className="text-sm font-bold text-white mb-3">Payment History</h4>
                                {debt.paymentHistory.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-forest-700">
                                        {[...debt.paymentHistory].reverse().map((payment, index) => (
                                            <div
                                                key={payment.id || index}
                                                className="flex items-center justify-between bg-forest-900 rounded-lg p-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-primary/10 p-2 rounded-lg">
                                                        <Calendar size={16} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">
                                                            {formatDate(payment.date)}
                                                        </div>
                                                        <div className="text-xs text-forest-400">
                                                            Principal: {formatCurrency(payment.principalPaid)} |
                                                            Interest: {formatCurrency(payment.interestPaid)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-bold text-primary">
                                                    {formatCurrency(payment.amount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-forest-400 text-sm italic">
                                        No payments recorded yet
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
