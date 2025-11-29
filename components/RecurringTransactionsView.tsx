import React, { useState } from 'react';
import { RecurringTransaction, RecurringTransactionInput } from '../types';
import { RecurringTransactionForm } from './RecurringTransactionForm';
import { RecurringTransactionList } from './RecurringTransactionList';
import { Modal } from './Modal';
import { Plus, Calendar, Info } from 'lucide-react';

interface RecurringTransactionsViewProps {
    recurringTransactions: RecurringTransaction[];
    onAdd: (data: RecurringTransactionInput) => Promise<void>;
    onUpdate: (id: string, data: RecurringTransactionInput) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onToggleActive: (id: string, active: boolean) => Promise<void>;
}

export const RecurringTransactionsView: React.FC<RecurringTransactionsViewProps> = ({
    recurringTransactions,
    onAdd,
    onUpdate,
    onDelete,
    onToggleActive
}) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | undefined>();

    const handleEdit = (id: string) => {
        const transaction = recurringTransactions.find(t => t.id === id);
        if (transaction) {
            setEditingTransaction(transaction);
            setIsFormModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setIsFormModalOpen(false);
        setEditingTransaction(undefined);
    };

    const handleSubmit = async (data: RecurringTransactionInput) => {
        if (editingTransaction) {
            await onUpdate(editingTransaction.id, data);
        } else {
            await onAdd(data);
        }
        handleCloseModal();
    };

    const activeCount = recurringTransactions.filter(t => t.isActive).length;
    const inactiveCount = recurringTransactions.filter(t => !t.isActive).length;

    return (
        <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="text-4xl font-black text-white tracking-tight">Recurring Transactions</h2>
                    <p className="text-forest-400 text-base">
                        Automate your regular income and expenses. Set it once, and we'll handle the rest.
                    </p>
                </div>
                <button
                    onClick={() => setIsFormModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-forest-950 text-sm font-bold whitespace-nowrap"
                >
                    <Plus size={18} strokeWidth={3} />
                    Add Recurring Transaction
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl">
                    <div className="text-forest-300 text-sm font-medium mb-1">Total Recurring</div>
                    <div className="text-3xl font-bold text-white">{recurringTransactions.length}</div>
                </div>
                <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl">
                    <div className="text-forest-300 text-sm font-medium mb-1">Active</div>
                    <div className="text-3xl font-bold text-primary">{activeCount}</div>
                </div>
                <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl">
                    <div className="text-forest-300 text-sm font-medium mb-1">Inactive</div>
                    <div className="text-3xl font-bold text-forest-400">{inactiveCount}</div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-4">
                <div className="bg-blue-500/20 p-2.5 rounded-full h-fit text-blue-400 shrink-0">
                    <Info size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-white mb-1">How it works</h4>
                    <p className="text-forest-300 text-sm leading-relaxed">
                        Recurring transactions are automatically created based on your schedule. You can edit, pause, or delete them at any time.
                        The system checks daily for due transactions and creates them automatically.
                    </p>
                </div>
            </div>

            {/* Recurring Transactions List */}
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Calendar size={24} className="text-primary" />
                    <h3 className="text-xl font-bold text-white">Your Recurring Transactions</h3>
                </div>
                <RecurringTransactionList
                    transactions={recurringTransactions}
                    onEdit={handleEdit}
                    onDelete={onDelete}
                    onToggleActive={onToggleActive}
                />
            </div>

            {/* Modal */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={handleCloseModal}
                title={editingTransaction ? 'Edit Recurring Transaction' : 'Create Recurring Transaction'}
            >
                <RecurringTransactionForm
                    onSubmit={handleSubmit}
                    onClose={handleCloseModal}
                    initialData={editingTransaction}
                />
            </Modal>
        </div>
    );
};
