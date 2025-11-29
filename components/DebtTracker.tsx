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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<DebtWithMetrics | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'list' | 'charts'>('list');

    useEffect(() => {
        loadDebts();
        loadSummary();
    }, [userId]);

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

    const handleRecordPayment = async () => {
        if (!selectedDebt || !paymentAmount) return;

        try {
            await recordDebtPayment(selectedDebt.id, parseFloat(paymentAmount), paymentDate);
            await loadDebts();
            await loadSummary();
            setShowPaymentModal(false);
            setSelectedDebt(null);
            setPaymentAmount('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error('Error recording payment:', error);
        }
    };

    const openEditModal = (debt: DebtWithMetrics) => {
        setSelectedDebt(debt);
        setShowEditModal(true);
    };

    const openPaymentModal = (debtId: string) => {
        const debt = debts.find(d => d.id === debtId);
        if (debt) {
            setSelectedDebt(debt);
            setPaymentAmount(debt.minimumPayment.toString());
            setShowPaymentModal(true);
        }
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
                    onRecordPayment={openPaymentModal}
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

            {/* Record Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedDebt(null);
                    setPaymentAmount('');
                }}
                title="Record Debt Payment"
            >
                {selectedDebt && (
                    <div className="flex flex-col gap-5">
                        <div className="bg-forest-900 rounded-xl p-4">
                            <div className="text-forest-400 text-sm mb-1">Debt</div>
                            <div className="text-xl font-bold text-white">{selectedDebt.name}</div>
                            <div className="text-forest-400 text-sm mt-2">
                                Current Balance: {formatCurrency(selectedDebt.currentBalance)}
                            </div>
                        </div>

                        <div>
                            <label className="block text-forest-300 text-sm font-medium mb-2">
                                Payment Amount <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                                />
                            </div>
                            <div className="text-xs text-forest-400 mt-1">
                                Minimum payment: {formatCurrency(selectedDebt.minimumPayment)}
                            </div>
                        </div>

                        <div>
                            <label className="block text-forest-300 text-sm font-medium mb-2">
                                Payment Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                            />
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedDebt(null);
                                    setPaymentAmount('');
                                }}
                                className="flex-1 bg-forest-800 border border-forest-700 hover:border-forest-600 text-white font-medium py-3 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRecordPayment}
                                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                                className="flex-1 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Record Payment
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
