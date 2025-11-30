import React from 'react';
import { RecurringTransaction } from '../types';
import { Calendar, Edit2, Trash2, TrendingUp, TrendingDown, ToggleLeft, ToggleRight } from 'lucide-react';

interface RecurringTransactionListProps {
    transactions: RecurringTransaction[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, active: boolean) => void;
    onPay: (id: string) => void;
}

export const RecurringTransactionList: React.FC<RecurringTransactionListProps> = ({
    transactions,
    onEdit,
    onDelete,
    onToggleActive,
    onPay
}) => {
    // ... existing helper functions ...

    // ... inside the map loop ...

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatFrequency = (frequency: string) => {
        return frequency.charAt(0).toUpperCase() + frequency.slice(1).replace('-', ' ');
    };

    const getCategoryIcon = (category: string) => {
        // Simple icon mapping - you can expand this
        const icons: Record<string, string> = {
            'Housing': '🏠',
            'Food & Dining': '🍽️',
            'Transportation': '🚗',
            'Utilities': '💡',
            'Entertainment': '🎮',
            'Health': '⚕️',
            'Shopping': '🛍️',
            'Savings': '💰',
            'Investments': '📈',
            'Income': '💵',
            'Other': '📌'
        };
        return icons[category] || '📌';
    };

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-forest-600 mb-4" />
                <p className="text-forest-400 text-lg">No recurring transactions yet</p>
                <p className="text-forest-500 text-sm mt-2">Create one to automate your regular income and expenses</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {transactions.map((transaction, index) => (
                <div
                    key={transaction.id || `transaction-${index}`}
                    className={`bg-forest-900 border rounded-xl p-4 transition-all ${transaction.isActive
                        ? 'border-forest-700 hover:border-forest-600'
                        : 'border-forest-800 opacity-60'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="text-2xl mt-1">
                                {getCategoryIcon(transaction.category)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-white font-semibold">{transaction.description}</h3>
                                    {!transaction.isActive && (
                                        <span className="text-xs bg-forest-800 text-forest-400 px-2 py-0.5 rounded">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-forest-400">
                                    <span className="flex items-center gap-1">
                                        <span className="text-forest-500">Category:</span>
                                        {transaction.category}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-forest-500">Frequency:</span>
                                        {formatFrequency(transaction.frequency)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-sm">
                                    <Calendar size={14} className="text-forest-500" />
                                    <span className="text-forest-400">
                                        Next: <span className="text-white font-medium">{formatDate(transaction.nextOccurrence)}</span>
                                    </span>
                                    {transaction.endDate && (
                                        <span className="text-forest-500">
                                            • Ends: {formatDate(transaction.endDate)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                            <div className="text-right">
                                <div className={`text-lg font-bold flex items-center gap-1 ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {transaction.type === 'income' ? (
                                        <TrendingUp size={18} />
                                    ) : (
                                        <TrendingDown size={18} />
                                    )}
                                    ${transaction.amount.toFixed(2)}
                                </div>
                                <div className="text-xs text-forest-500">
                                    {transaction.type === 'income' ? 'Income' : 'Expense'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 border-l border-forest-700 pl-3">
                                <button
                                    onClick={() => (transaction.id || (transaction as any)._id) && onPay(transaction.id || (transaction as any)._id)}
                                    disabled={(!transaction.id && !(transaction as any)._id) || !transaction.isActive}
                                    className="p-2 text-forest-400 hover:text-primary hover:bg-forest-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Pay Now"
                                >
                                    <div className="font-bold text-lg leading-none">$</div>
                                </button>
                                <button
                                    onClick={() => (transaction.id || (transaction as any)._id) && onToggleActive(transaction.id || (transaction as any)._id, !transaction.isActive)}
                                    disabled={!transaction.id && !(transaction as any)._id}
                                    className={`p-2 rounded-lg transition-colors ${transaction.isActive
                                        ? 'text-primary hover:bg-forest-800'
                                        : 'text-forest-600 hover:bg-forest-800'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title={transaction.isActive ? 'Deactivate' : 'Activate'}
                                >
                                    {transaction.isActive ? (
                                        <ToggleRight size={20} />
                                    ) : (
                                        <ToggleLeft size={20} />
                                    )}
                                </button>
                                <button
                                    onClick={() => (transaction.id || (transaction as any)._id) && onEdit(transaction.id || (transaction as any)._id)}
                                    disabled={!transaction.id && !(transaction as any)._id}
                                    className="p-2 text-forest-400 hover:text-white hover:bg-forest-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Edit"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => (transaction.id || (transaction as any)._id) && onDelete(transaction.id || (transaction as any)._id)}
                                    disabled={!transaction.id && !(transaction as any)._id}
                                    className="p-2 text-forest-400 hover:text-red-400 hover:bg-forest-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {transaction.reminderEnabled && (
                        <div className="mt-3 pt-3 border-t border-forest-800 flex items-center gap-2 text-xs text-forest-400">
                            <span className="bg-forest-800 px-2 py-1 rounded">
                                🔔 Reminder: {transaction.reminderDaysBefore} day{transaction.reminderDaysBefore !== 1 ? 's' : ''} before
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
