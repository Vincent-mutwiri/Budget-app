import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../constants';
import { getSpecialTransactions, getTransferHistory } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ArrowRight, ArrowLeft, History, CreditCard, TrendingUp, Target } from 'lucide-react';

interface SpecialTransactionsViewProps {
    userId: string;
}

export const SpecialTransactionsView: React.FC<SpecialTransactionsViewProps> = ({ userId }) => {
    const [activeTab, setActiveTab] = useState<'transfers' | 'debt' | 'investment' | 'goal'>('transfers');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'transfers') {
                    const data = await getTransferHistory(userId);
                    setTransactions(data);
                } else {
                    const data = await getSpecialTransactions(userId, activeTab);
                    setTransactions(data);
                }
            } catch (error) {
                console.error('Error fetching special transactions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, activeTab]);

    const tabs = [
        { id: 'transfers', label: 'Transfers', icon: History },
        { id: 'debt', label: 'Debt Payments', icon: CreditCard },
        { id: 'investment', label: 'Investments', icon: TrendingUp },
        { id: 'goal', label: 'Goal Contrib.', icon: Target },
    ];

    return (
        <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Special Transactions & History</h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-primary text-forest-950'
                            : 'bg-forest-900 text-forest-400 hover:text-white hover:bg-forest-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-forest-700">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12 text-forest-400 italic">
                            No transactions found for this category.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((t) => (
                                <div key={t._id || t.id} className="bg-forest-900/50 border border-forest-700/50 p-4 rounded-xl flex items-center justify-between group hover:bg-forest-900 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-full ${activeTab === 'transfers'
                                            ? (t.type === 'borrow' || t.type === 'withdraw') ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-primary/10 text-primary'
                                            }`}>
                                            {activeTab === 'transfers' ? (
                                                (t.type === 'borrow' || t.type === 'withdraw') ? <ArrowRight size={18} /> : <ArrowLeft size={18} />
                                            ) : (
                                                <CreditCard size={18} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-white font-medium text-sm">
                                                {t.description || (activeTab === 'transfers' ? `${(t.type === 'borrow' || t.type === 'withdraw') ? 'Transfer to Current' : 'Repay to Main'}` : 'Transaction')}
                                            </div>
                                            <div className="text-forest-400 text-xs">
                                                {new Date(t.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`font-bold ${activeTab === 'transfers'
                                        ? (t.type === 'borrow' || t.type === 'withdraw') ? 'text-blue-400' : 'text-emerald-400'
                                        : 'text-white'
                                        }`}>
                                        {formatCurrency(t.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
