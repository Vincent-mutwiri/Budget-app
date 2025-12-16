import React, { useState } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../constants';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'borrow' | 'repay';
    maxAmount: number;
    onConfirm: (amount: number, description: string) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
    isOpen,
    onClose,
    type,
    maxAmount,
    onConfirm
}) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (numAmount > maxAmount) {
            setError(`Insufficient funds. Max available: ${formatCurrency(maxAmount)}`);
            return;
        }

        setIsLoading(true);
        try {
            await onConfirm(numAmount, description);
            onClose();
            setAmount('');
            setDescription('');
        } catch (err) {
            setError('Transfer failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isBorrow = type === 'borrow';
    const title = isBorrow ? 'Transfer to Current Account' : 'Repay to Main Account';
    const fromLabel = isBorrow ? 'Main Account' : 'Current Account';
    const toLabel = isBorrow ? 'Current Account' : 'Main Account';
    const themeColor = isBorrow ? 'blue' : 'emerald';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-forest-900 border border-forest-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-forest-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-forest-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Visual Flow */}
                    <div className="flex items-center justify-between bg-forest-950/50 p-4 rounded-xl border border-forest-800">
                        <div className="text-center">
                            <div className="text-xs text-forest-400 mb-1">From</div>
                            <div className={`font-bold text-${themeColor}-400`}>{fromLabel}</div>
                        </div>
                        <ArrowRight className="text-forest-500" />
                        <div className="text-center">
                            <div className="text-xs text-forest-400 mb-1">To</div>
                            <div className={`font-bold text-${isBorrow ? 'emerald' : 'blue'}-400`}>{toLabel}</div>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-forest-300 mb-2">
                            Amount (Max: {formatCurrency(maxAmount)})
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400 font-medium">KSh</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-14 pr-4 text-white text-lg font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="block text-sm font-medium text-forest-300 mb-2">
                            Description <span className="text-forest-500 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder={isBorrow ? "e.g. Emergency expense" : "e.g. Monthly savings"}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-forest-800 hover:bg-forest-700 text-white rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex-1 py-3.5 bg-${themeColor}-500 hover:bg-${themeColor}-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isLoading ? 'Processing...' : 'Confirm Transfer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
