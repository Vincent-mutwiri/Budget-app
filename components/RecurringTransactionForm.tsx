
import React, { useState, useEffect } from 'react';
import { RecurringTransactionInput, RecurringFrequency, Category, CategoriesList, RecurringTransaction } from '../types';
import { CustomSelect } from './CustomSelect';
import { Loader2 } from 'lucide-react';

interface RecurringTransactionFormProps {
    onSubmit: (data: RecurringTransactionInput) => Promise<void>;
    onClose: () => void;
    initialData?: RecurringTransaction;
}

export const RecurringTransactionForm: React.FC<RecurringTransactionFormProps & { customCategories?: Array<{ name: string; type: 'income' | 'expense' }> }> = ({
    onSubmit,
    onClose,
    initialData,
    customCategories = []
}) => {
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [category, setCategory] = useState<Category | string | ''>(initialData?.category || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly'>(
        initialData?.frequency || 'monthly'
    );
    const [startDate, setStartDate] = useState(
        initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : ''
    );
    const [endDate, setEndDate] = useState(
        initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : ''
    );
    const [reminderEnabled, setReminderEnabled] = useState(initialData?.reminderEnabled || false);
    const [reminderDaysBefore, setReminderDaysBefore] = useState(initialData?.reminderDaysBefore || 3);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category || !description || !startDate) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                amount: parseFloat(amount),
                category: category as Category,
                description,
                type,
                frequency,
                startDate,
                endDate: endDate || undefined,
                reminderEnabled,
                reminderDaysBefore
            });
            onClose();
        } catch (error) {
            console.error('Error submitting recurring transaction:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Type</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setType('expense')}
                        className={`flex - 1 py - 3 px - 4 rounded - xl font - medium transition - colors ${type === 'expense'
                                ? 'bg-red-500/20 text-red-400 border-2 border-red-500'
                                : 'bg-forest-950 text-forest-400 border border-forest-700 hover:border-forest-600'
                            } `}
                    >
                        Expense
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('income')}
                        className={`flex - 1 py - 3 px - 4 rounded - xl font - medium transition - colors ${type === 'income'
                                ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                                : 'bg-forest-950 text-forest-400 border border-forest-700 hover:border-forest-600'
                            } `}
                    >
                        Income
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Amount</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Category</label>
                <CustomSelect
                    value={category}
                    onChange={(val) => setCategory(val)}
                    options={[
                        ...CategoriesList.map(cat => ({ value: cat, label: cat, key: cat })),
                        ...customCategories.map((cat, idx) => ({ value: cat.name, label: cat.name, key: `custom - ${cat.name} -${idx} ` }))
                    ]}
                    placeholder="Select a category"
                    required
                />
            </div>

            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Description</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Monthly rent payment"
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                />
            </div>

            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Frequency</label>
                <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                    required
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-forest-300 text-sm font-medium mb-2">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                        required
                    />
                </div>
                <div>
                    <label className="block text-forest-300 text-sm font-medium mb-2">End Date (Optional)</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                    />
                </div>
            </div>

            <div className="border-t border-forest-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-forest-300 text-sm font-medium">Enable Reminders</label>
                    <button
                        type="button"
                        onClick={() => setReminderEnabled(!reminderEnabled)}
                        className={`relative inline - flex h - 6 w - 11 items - center rounded - full transition - colors ${reminderEnabled ? 'bg-primary' : 'bg-forest-700'
                            } `}
                    >
                        <span
                            className={`inline - block h - 4 w - 4 transform rounded - full bg - white transition - transform ${reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                                } `}
                        />
                    </button>
                </div>

                {reminderEnabled && (
                    <div>
                        <label className="block text-forest-300 text-sm font-medium mb-2">
                            Remind me (days before)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={reminderDaysBefore}
                            onChange={(e) => setReminderDaysBefore(parseInt(e.target.value))}
                            className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                )}
            </div>

            <div className="flex gap-3 mt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-forest-800 hover:bg-forest-700 text-white font-medium py-3.5 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                    {initialData ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    );
};
