import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from './Modal';
import { InvestmentForm } from './InvestmentForm';
import { InvestmentList } from './InvestmentList';
import { InvestmentCharts } from './InvestmentCharts';
import { getInvestments, createInvestment, updateInvestment, updateInvestmentValue, deleteInvestment } from '../services/api';
import type { Investment, InvestmentInput, InvestmentMetrics } from '../types';
import { formatCurrency } from '../constants';

interface InvestmentWithMetrics extends Investment {
    calculatedMetrics: InvestmentMetrics;
}

interface InvestmentsViewProps {
    userId: string;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({ userId }) => {
    const [investments, setInvestments] = useState<InvestmentWithMetrics[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<InvestmentWithMetrics | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState<string | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');

    // Load investments
    useEffect(() => {
        loadInvestments();
    }, [userId]);

    const loadInvestments = async () => {
        try {
            setLoading(true);
            const data = await getInvestments(userId);
            setInvestments(data);
        } catch (error) {
            console.error('Error loading investments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddInvestment = async (data: InvestmentInput) => {
        try {
            const newInvestment = await createInvestment({ ...data, userId });
            setInvestments(prev => [newInvestment, ...prev]);
            setShowAddModal(false);
        } catch (error) {
            console.error('Error adding investment:', error);
            throw error;
        }
    };

    const handleEditInvestment = async (data: InvestmentInput) => {
        if (!editingInvestment) return;

        try {
            const updatedInvestment = await updateInvestment(editingInvestment.id, data);
            setInvestments(prev =>
                prev.map(inv => inv.id === editingInvestment.id ? updatedInvestment : inv)
            );
            setEditingInvestment(null);
        } catch (error) {
            console.error('Error updating investment:', error);
            throw error;
        }
    };

    const handleUpdateValue = async (id: string, currentValue: number) => {
        try {
            const updatedInvestment = await updateInvestmentValue(id, currentValue);
            setInvestments(prev =>
                prev.map(inv => inv.id === id ? updatedInvestment : inv)
            );
        } catch (error) {
            console.error('Error updating investment value:', error);
        }
    };

    const handleDeleteInvestment = async (id: string) => {
        if (!confirm('Are you sure you want to delete this investment?')) return;

        try {
            await deleteInvestment(id);
            setInvestments(prev => prev.filter(inv => inv.id !== id));
        } catch (error) {
            console.error('Error deleting investment:', error);
        }
    };

    // Calculate portfolio metrics
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalInvested = investments.reduce((sum, inv) => sum + inv.initialAmount, 0);
    const totalReturn = totalValue - totalInvested;
    const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // Calculate weighted average annual return (yield)
    const avgAnnualizedReturn = totalValue > 0
        ? investments.reduce((sum, inv) => sum + (inv.ratePerAnnum * inv.currentValue), 0) / totalValue
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-forest-400">Loading investments...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">Investment Portfolio</h2>
                        <p className="text-forest-400">Track your investments and monitor portfolio performance.</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-2.5 px-5 rounded-xl transition-colors whitespace-nowrap"
                    >
                        <Plus size={18} strokeWidth={3} /> Add Investment
                    </button>
                </div>

                {/* Portfolio Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
                        <div className="text-forest-300 text-sm font-medium mb-1">Total Value</div>
                        <div className="text-2xl lg:text-3xl font-bold text-white truncate">
                            {formatCurrency(totalValue)}
                        </div>
                    </div>

                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
                        <div className="text-forest-300 text-sm font-medium mb-1">Total Invested</div>
                        <div className="text-2xl lg:text-3xl font-bold text-white truncate">
                            {formatCurrency(totalInvested)}
                        </div>
                    </div>

                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
                        <div className="text-forest-300 text-sm font-medium mb-1">Total Return</div>
                        <div className={`text-2xl lg:text-3xl font-bold truncate ${totalReturn >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                            {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
                        </div>
                        <div className={`text-sm font-medium mt-1 flex items-center gap-1 ${totalReturn >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                            {totalReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {totalReturn >= 0 ? '+' : ''}{totalReturnPercentage.toFixed(2)}%
                        </div>
                    </div>

                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
                        <div className="text-forest-300 text-sm font-medium mb-1">Avg. Annual Return</div>
                        <div className={`text-2xl lg:text-3xl font-bold truncate ${avgAnnualizedReturn >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                            {avgAnnualizedReturn >= 0 ? '+' : ''}{avgAnnualizedReturn.toFixed(2)}%
                        </div>
                        <div className="text-sm text-forest-400 mt-1">per year</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            {investments.length > 0 && (
                <InvestmentCharts investments={investments} />
            )}

            {/* Investment List */}
            <InvestmentList
                investments={investments}
                onEdit={setEditingInvestment}
                onDelete={handleDeleteInvestment}
                onUpdateValue={handleUpdateValue}
                onWithdraw={(id) => setShowWithdrawModal(id)}
            />

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <Modal
                    isOpen={!!showWithdrawModal}
                    onClose={() => {
                        setShowWithdrawModal(null);
                        setWithdrawAmount('');
                    }}
                    title={`Withdraw from ${investments.find(i => i.id === showWithdrawModal)?.name}`}
                >
                    <div className="flex flex-col gap-5">
                        <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4">
                            <p className="text-blue-300 text-sm">
                                Transfer money from this investment to your current account.
                            </p>
                        </div>

                        <div>
                            <label className="block text-forest-300 text-sm font-medium mb-2">
                                Withdrawal Amount <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowWithdrawModal(null);
                                    setWithdrawAmount('');
                                }}
                                className="flex-1 bg-forest-800 border border-forest-700 hover:border-forest-600 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    alert('Withdraw functionality will be implemented');
                                    setShowWithdrawModal(null);
                                    setWithdrawAmount('');
                                }}
                                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Add Investment Modal */}
            {showAddModal && (
                <Modal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Add New Investment"
                >
                    <InvestmentForm
                        onSubmit={handleAddInvestment}
                        onCancel={() => setShowAddModal(false)}
                    />
                </Modal>
            )}

            {/* Edit Investment Modal */}
            {editingInvestment && (
                <Modal
                    isOpen={!!editingInvestment}
                    onClose={() => setEditingInvestment(null)}
                    title="Edit Investment"
                >
                    <InvestmentForm
                        onSubmit={handleEditInvestment}
                        onCancel={() => setEditingInvestment(null)}
                        initialData={{
                            ...editingInvestment,
                            id: editingInvestment.id
                        }}
                    />
                </Modal>
            )}
        </div>
    );
};
