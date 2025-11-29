import React, { useState } from 'react';
import { DebtInput } from '../types';
import { ChevronRight } from 'lucide-react';

interface DebtFormProps {
    onSubmit: (data: DebtInput) => Promise<void>;
    onCancel: () => void;
    initialData?: DebtInput & { id?: string };
}

const DEBT_TYPES = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'student_loan', label: 'Student Loan' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'car_loan', label: 'Car Loan' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'other', label: 'Other' }
];

export const DebtForm: React.FC<DebtFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [formData, setFormData] = useState<DebtInput>({
        name: initialData?.name || '',
        type: initialData?.type || 'credit_card',
        originalAmount: initialData?.originalAmount || 0,
        currentBalance: initialData?.currentBalance || 0,
        interestRate: initialData?.interestRate || 0,
        minimumPayment: initialData?.minimumPayment || 0,
        dueDate: initialData?.dueDate || new Date().toISOString().split('T')[0]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: keyof DebtInput, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Debt name is required';
        }

        if (formData.originalAmount <= 0) {
            newErrors.originalAmount = 'Original amount must be greater than 0';
        }

        if (formData.currentBalance < 0) {
            newErrors.currentBalance = 'Current balance cannot be negative';
        }

        if (formData.currentBalance > formData.originalAmount) {
            newErrors.currentBalance = 'Current balance cannot exceed original amount';
        }

        if (formData.interestRate < 0 || formData.interestRate > 100) {
            newErrors.interestRate = 'Interest rate must be between 0 and 100';
        }

        if (formData.minimumPayment <= 0) {
            newErrors.minimumPayment = 'Minimum payment must be greater than 0';
        }

        if (!formData.dueDate) {
            newErrors.dueDate = 'Due date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting debt form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Debt Name */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Debt Name <span className="text-rose-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Chase Credit Card"
                    className={`w-full bg-forest-950 border ${errors.name ? 'border-rose-500' : 'border-forest-700'} rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500`}
                />
                {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Debt Type */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Debt Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <select
                        value={formData.type}
                        onChange={(e) => handleChange('type', e.target.value as any)}
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                    >
                        {DEBT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-forest-400">
                        <ChevronRight className="rotate-90" size={16} />
                    </div>
                </div>
            </div>

            {/* Original Amount */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Original Amount <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.originalAmount || ''}
                        onChange={(e) => handleChange('originalAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`w-full bg-forest-950 border ${errors.originalAmount ? 'border-rose-500' : 'border-forest-700'} rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500`}
                    />
                </div>
                {errors.originalAmount && <p className="text-rose-500 text-xs mt-1">{errors.originalAmount}</p>}
            </div>

            {/* Current Balance */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Current Balance <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.currentBalance || ''}
                        onChange={(e) => handleChange('currentBalance', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`w-full bg-forest-950 border ${errors.currentBalance ? 'border-rose-500' : 'border-forest-700'} rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500`}
                    />
                </div>
                {errors.currentBalance && <p className="text-rose-500 text-xs mt-1">{errors.currentBalance}</p>}
            </div>

            {/* Interest Rate */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Interest Rate (% per annum) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="number"
                        step="0.01"
                        value={formData.interestRate || ''}
                        onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`w-full bg-forest-950 border ${errors.interestRate ? 'border-rose-500' : 'border-forest-700'} rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-forest-400">%</span>
                </div>
                {errors.interestRate && <p className="text-rose-500 text-xs mt-1">{errors.interestRate}</p>}
            </div>

            {/* Minimum Payment */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Minimum Monthly Payment <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.minimumPayment || ''}
                        onChange={(e) => handleChange('minimumPayment', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`w-full bg-forest-950 border ${errors.minimumPayment ? 'border-rose-500' : 'border-forest-700'} rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500`}
                    />
                </div>
                {errors.minimumPayment && <p className="text-rose-500 text-xs mt-1">{errors.minimumPayment}</p>}
            </div>

            {/* Due Date */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Monthly Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                    className={`w-full bg-forest-950 border ${errors.dueDate ? 'border-rose-500' : 'border-forest-700'} rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]`}
                />
                {errors.dueDate && <p className="text-rose-500 text-xs mt-1">{errors.dueDate}</p>}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-forest-800 border border-forest-700 hover:border-forest-600 text-white font-medium py-3 rounded-xl transition-colors"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Debt' : 'Add Debt'}
                </button>
            </div>
        </form>
    );
};
