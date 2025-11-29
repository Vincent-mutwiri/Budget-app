import React, { useState } from 'react';
import type { InvestmentInput } from '../types';

interface InvestmentFormProps {
    onSubmit: (data: InvestmentInput) => Promise<void>;
    onCancel: () => void;
    initialData?: InvestmentInput & { id?: string };
}

const INVESTMENT_TYPES = [
    { value: 'stock', label: 'Stock' },
    { value: 'bond', label: 'Bond' },
    { value: 'mutual_fund', label: 'Mutual Fund' },
    { value: 'etf', label: 'ETF' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'other', label: 'Other' }
];

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState<InvestmentInput['type']>(initialData?.type || 'stock');
    const [symbol, setSymbol] = useState(initialData?.symbol || '');
    const [initialAmount, setInitialAmount] = useState(initialData?.initialAmount?.toString() || '');
    const [currentValue, setCurrentValue] = useState(initialData?.currentValue?.toString() || '');
    const [ratePerAnnum, setRatePerAnnum] = useState(initialData?.ratePerAnnum?.toString() || '');
    const [purchaseDate, setPurchaseDate] = useState(
        initialData?.purchaseDate
            ? new Date(initialData.purchaseDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!name.trim()) {
            setError('Investment name is required');
            return;
        }

        if (!initialAmount || parseFloat(initialAmount) <= 0) {
            setError('Initial amount must be greater than 0');
            return;
        }

        if (!currentValue || parseFloat(currentValue) < 0) {
            setError('Current value must be 0 or greater');
            return;
        }

        if (ratePerAnnum === '' || parseFloat(ratePerAnnum) < -100) {
            setError('Rate per annum must be -100 or greater');
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                name: name.trim(),
                type,
                symbol: symbol.trim() || undefined,
                initialAmount: parseFloat(initialAmount),
                currentValue: parseFloat(currentValue),
                ratePerAnnum: parseFloat(ratePerAnnum),
                purchaseDate,
                notes: notes.trim() || undefined
            });
        } catch (err) {
            setError('Failed to save investment. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-500 text-sm">
                    {error}
                </div>
            )}

            {/* Investment Name */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Investment Name <span className="text-rose-500">*</span>
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apple Inc., Bitcoin, Rental Property"
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                    required
                />
            </div>

            {/* Investment Type */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Investment Type <span className="text-rose-500">*</span>
                </label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as InvestmentInput['type'])}
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                    required
                >
                    {INVESTMENT_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Symbol (Optional) */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Symbol/Ticker <span className="text-forest-500 font-normal">(optional)</span>
                </label>
                <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL, BTC"
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                />
            </div>

            {/* Initial Amount and Current Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-forest-300 text-sm font-medium mb-2">
                        Initial Amount <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                        <input
                            type="number"
                            step="0.01"
                            value={initialAmount}
                            onChange={(e) => setInitialAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-forest-300 text-sm font-medium mb-2">
                        Current Value <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                        <input
                            type="number"
                            step="0.01"
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Rate Per Annum and Purchase Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-forest-300 text-sm font-medium mb-2">
                        Rate Per Annum (%) <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={ratePerAnnum}
                        onChange={(e) => setRatePerAnnum(e.target.value)}
                        placeholder="e.g. 7.5"
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                        required
                    />
                    <p className="text-forest-500 text-xs mt-1">Expected annual growth rate</p>
                </div>

                <div>
                    <label className="block text-forest-300 text-sm font-medium mb-2">
                        Purchase Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                        required
                    />
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Notes <span className="text-forest-500 font-normal">(optional)</span>
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this investment..."
                    rows={3}
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500 resize-none"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-forest-900 hover:bg-forest-800 text-white font-medium py-3 rounded-xl transition-colors"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Investment' : 'Add Investment'}
                </button>
            </div>
        </form>
    );
};
