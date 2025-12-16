import React, { useState, useEffect } from 'react';
import { Plus, TrendingDown, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { Debt, DebtInput, DebtMetrics } from '../types';
import { formatCurrency } from '../constants';
import { Modal } from './Modal';
import { DebtForm } from './DebtForm';
import { DebtList } from './DebtList';
import { DebtCharts } from './DebtCharts';
import {
    getDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    getDebtSummary,
    calculateAcceleratedPayoff
} from '../services/api';

interface DebtWithMetrics extends Debt {
    calculatedMetrics: DebtMetrics;
}

interface DebtTrackerProps {
    userId: string;
}

export const DebtTracker: React.FC<DebtTrackerProps> = ({ userId }) => {
    const [debts, setDebts] = useState<DebtWithMetrics[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<DebtWithMetrics | null>(null);
    const [activeTab, setActiveTab] = useState<'list' | 'charts'>('list');
    const [showWithdrawModal, setShowWithdrawModal] = useState<string | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [showContributeModal, setShowContributeModal] = useState<string | null>(null);
    const [contributeAmount, setContributeAmount] = useState<string>('');
    const [mainAccountBalance, setMainAccountBalance] = useState<number>(0);

    useEffect(() => {
        loadDebts();
        loadSummary();
        loadMainAccountBalance();
    }, [userId]);

    const loadMainAccountBalance = async () => {
        try {
            const { getAccountSummary } = await import('../services/api');
            const accountSummary = await getAccountSummary(userId);
            setMainAccountBalance(accountSummary.mainAccount.balance);
        } catch (error) {
            console.error('Error loading main account balance:', error);
        }
    };

    const loadDebts = async () => {
        try {
            setIsLoading(true);
            const data = await getDebts(userId);
            setDebts(data);
        } catch (error) {
            console.error('Error loading debts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSummary = async () => {
        try {
            const data = await getDebtSummary(userId);
            setSummary(data);
        } catch (error) {
            console.error('Error loading debt summary:', error);
        }
    };

    const handleAddDebt = async (debtData: DebtInput) => {
        try {
            await createDebt({ ...debtData, userId });
            await loadDebts();
            await loadSummary();
            setShowAddModal(false);
        } catch (error) {
            console.error('Error adding debt:', error);
        }
    };

    const handleEditDebt = async (debtData: DebtInput) => {
        if (!selectedDebt) return;

        try {
            await updateDebt(selectedDebt.id, debtData);
            await loadDebts();
            await loadSummary();
            setShowEditModal(false);
            setSelectedDebt(null);
        } catch (error) {
            console.error('Error updating debt:', error);
        }
    };

    const handleDeleteDebt = async (debtId: string) => {
        if (!confirm('Are you sure you want to delete this debt? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteDebt(debtId);
            await loadDebts();
            await loadSummary();
        } catch (error) {
            console.error('Error deleting debt:', error);
        }
    };



    const openEditModal = (debt: DebtWithMetrics) => {
        setSelectedDebt(debt);
        setShowEditModal(true);
    };



    const handleCalculateAccelerated = async (debtId: string, extraPayment: number) => {
        return await calculateAcceleratedPayoff(debtId, extraPayment);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-forest-400">Loading debts...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1">Debt Tracker</h2>
                    <p className="text-forest-400">Track your debts and visualize your path to financial freedom.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-2.5 px-5 rounded-xl transition-colors whitespace-nowrap"
                >
                    <Plus size={18} strokeWidth={3} />
                    Add Debt
                </button>
            </div>

            {/* Total Contributions Card */}
            {debts.length > 0 && (
                <div className="bg-gradient-to-br from-rose-500/10 to-amber-500/10 border border-rose-500/30 p-6 rounded-3xl mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-forest-300 text-sm font-medium mb-1">Total Paid Towards Debts</p>
                            <p className="text-4xl font-bold text-white">
                                {formatCurrency(debts.reduce((sum, d) => {
                                    const totalPaid = d.paymentHistory?.reduce((pSum, p) => pSum + p.amount, 0) || 0;
                                    return sum + totalPaid;
                                }, 0))}
                            </p>
                            <p className="text-forest-400 text-sm mt-2">
                                Remaining debt: {formatCurrency(summary?.totalDebt || 0)}
                            </p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center">
                            <TrendingDown size={32} className="text-rose-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {summary && debts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl">
                        <div className="text-forest-300 text-sm font-medium mb-1">Total Debt</div>
                        <div className="text-2xl lg:text-3xl font-bold text-rose-400">
                            {formatCurrency(summary.totalDebt)}
                        </div>
                    </div>
                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl">
                        <div className="text-forest-300 text-sm font-medium mb-1">Monthly Obligations</div>
                        <div className="text-2xl lg:text-3xl font-bold text-white">
                            {formatCurrency(summary.monthlyObligations)}
                        </div>
                    </div>
                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl">
                        <div className="text-forest-300 text-sm font-medium mb-1">Avg Interest Rate</div>
                        <div className="text-2xl lg:text-3xl font-bold text-white">
                            {summary.averageInterestRate.toFixed(2)}%
                        </div>
                    </div>
                    <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl">
                        <div className="text-forest-300 text-sm font-medium mb-1">Monthly Interest</div>
                        <div className="text-2xl lg:text-3xl font-bold text-rose-400">
                            {formatCurrency(summary.totalMonthlyInterest)}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            {debts.length > 0 && (
                <div className="flex gap-2 bg-forest-900 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'list'
                            ? 'bg-forest-800 text-white border border-forest-700'
                            : 'text-forest-400 hover:text-white'
                            }`}
                    >
                        Debt List
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'charts'
                            ? 'bg-forest-800 text-white border border-forest-700'
                            : 'text-forest-400 hover:text-white'
                            }`}
                    >
                        Charts & Projections
                    </button>
                </div>
            )}

            {/* Content */}
            {activeTab === 'list' && (
                <DebtList
                    debts={debts}
                    onEdit={openEditModal}
                    onDelete={handleDeleteDebt}
                    onWithdraw={(id) => setShowWithdrawModal(id)}
                    onContribute={(id) => setShowContributeModal(id)}
                />
            )}

            {activeTab === 'charts' && (
                <DebtCharts
                    debts={debts}
                    onCalculateAccelerated={handleCalculateAccelerated}
                />
            )}

            {/* Add Debt Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Debt"
            >
                <DebtForm
                    onSubmit={handleAddDebt}
                    onCancel={() => setShowAddModal(false)}
                />
            </Modal>

            {/* Edit Debt Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedDebt(null);
                }}
                title="Edit Debt"
            >
                {selectedDebt && (
                    <DebtForm
                        onSubmit={handleEditDebt}
                        onCancel={() => {
                            setShowEditModal(false);
                            setSelectedDebt(null);
                        }}
                        initialData={{
                            ...selectedDebt,
                            dueDate: new Date(selectedDebt.dueDate).toISOString().split('T')[0]
                        }}
                    />
                )}
            </Modal>

            {/* Contribute Modal */}
            {showContributeModal && (
                <Modal
                    isOpen={!!showContributeModal}
                    onClose={() => {
                        setShowContributeModal(null);
                        setContributeAmount('');
                    }}
                    title={`Contribute to ${debts.find(d => d.id === showContributeModal)?.name}`}
                >
                    <div className="flex flex-col gap-5">
                        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4">
                            <p className="text-emerald-300 text-sm mb-2">
                                Money will be taken from your Main Account.
                            </p>
                            <p className="text-emerald-200 text-sm font-semibold">
                                Main Account Balance: {formatCurrency(mainAccountBalance)}
                            </p>
                        </div>

                        <div>
                            <label className="block text-forest-300 text-sm font-medium mb-2">
                                Contribution Amount <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={contributeAmount}
                                    onChange={(e) => setContributeAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowContributeModal(null);
                                    setContributeAmount('');
                                }}
                                className="flex-1 bg-forest-800 border border-forest-700 hover:border-forest-600 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const amount = parseFloat(contributeAmount);
                                    if (isNaN(amount) || amount <= 0) return;

                                    if (amount > mainAccountBalance) {
                                        alert('Insufficient funds in Main Account');
                                        return;
                                    }

                                    try {
                                        const { contributeToSpecial } = await import('../services/api');
                                        await contributeToSpecial(userId, 'debt', showContributeModal!, amount, 'Debt Contribution');
                                        await loadDebts();
                                        await loadSummary();
                                        await loadMainAccountBalance();
                                        setShowContributeModal(null);
                                        setContributeAmount('');
                                        alert('Contribution successful!');
                                    } catch (error) {
                                        console.error('Error contributing:', error);
                                        alert('Failed to contribute. Please try again.');
                                    }
                                }}
                                disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Contribute
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <Modal
                    isOpen={!!showWithdrawModal}
                    onClose={() => {
                        setShowWithdrawModal(null);
                        setWithdrawAmount('');
                    }}
                    title={`Withdraw from ${debts.find(d => d.id === showWithdrawModal)?.name}`}
                >
                    <div className="flex flex-col gap-5">
                        <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4">
                            <p className="text-blue-300 text-sm">
                                Transfer money from this debt to your Current Account.
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
                                onClick={async () => {
                                    const amount = parseFloat(withdrawAmount);
                                    if (isNaN(amount) || amount <= 0) return;

                                    // For debt, withdrawal means increasing the debt balance (borrowing more)
                                    // or taking back an overpayment. 
                                    // Usually "Withdraw" from a debt context means "Borrow More" if it's a line of credit,
                                    // or it might not make sense for a fixed loan.
                                    // Assuming "Borrow More" or "Cash Advance" logic here as per user request to have "Withdraw" button.

                                    try {
                                        const { withdrawFromSpecial } = await import('../services/api');
                                        await withdrawFromSpecial(userId, 'debt', showWithdrawModal!, amount, 'Debt Withdrawal / Borrow');
                                        await loadDebts();
                                        await loadSummary();
                                        setShowWithdrawModal(null);
                                        setWithdrawAmount('');
                                        alert('Withdrawal successful!');
                                    } catch (error) {
                                        console.error('Error withdrawing:', error);
                                        alert('Failed to withdraw. Please try again.');
                                    }
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

        </div>
    );
};
