import React, { useMemo } from 'react';
import { RecurringTransaction } from '../types';
import { Calendar, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../constants';

interface UpcomingTransactionsListProps {
    transactions: RecurringTransaction[];
    daysAhead?: number;
}

export const UpcomingTransactionsList: React.FC<UpcomingTransactionsListProps> = ({
    transactions,
    daysAhead = 30
}) => {
    const upcomingTransactions = useMemo(() => {
        const now = new Date();
        const future = new Date();
        future.setDate(now.getDate() + daysAhead);

        return transactions
            .filter(t => t.isActive)
            .map(t => {
                const nextDate = new Date(t.nextOccurrence);
                const daysRemaining = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return { ...t, nextDate, daysRemaining };
            })
            .filter(t => t.nextDate <= future && t.nextDate >= now) // Only show future (or today's) transactions within range
            .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
    }, [transactions, daysAhead]);

    if (upcomingTransactions.length === 0) {
        return null; // Don't render anything if no upcoming transactions
    }

    return (
        <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <Clock size={24} className="text-amber-400" />
                <h3 className="text-xl font-bold text-white">Upcoming (Next {daysAhead} Days)</h3>
            </div>

            <div className="space-y-3">
                {upcomingTransactions.map(t => (
                    <div key={t.id} className="bg-forest-900/50 border border-forest-700/50 rounded-xl p-4 flex items-center justify-between hover:bg-forest-900 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${t.daysRemaining <= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-forest-800 text-forest-400'}`}>
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-semibold">{t.description}</h4>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={`font-medium ${t.daysRemaining <= 3 ? 'text-amber-400' : 'text-forest-400'}`}>
                                        {t.daysRemaining === 0 ? 'Due Today' : `In ${t.daysRemaining} day${t.daysRemaining !== 1 ? 's' : ''}`}
                                    </span>
                                    <span className="text-forest-600">•</span>
                                    <span className="text-forest-500">{t.nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className={`font-bold text-lg flex items-center justify-end gap-1 ${t.type === 'income' ? 'text-green-400' : 'text-white'}`}>
                                {t.type === 'income' ? <TrendingUp size={16} /> : null}
                                {formatCurrency(t.amount)}
                            </div>
                            <div className="text-xs text-forest-500 capitalize">{t.category}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
