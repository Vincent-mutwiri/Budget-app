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
            />

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
