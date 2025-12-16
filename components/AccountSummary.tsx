import React from 'react';
import { ArrowRight, ArrowLeft, Wallet, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../constants';

interface AccountSummaryProps {
    mainBalance: number;
    currentBalance: number;
    onBorrow: () => void;
    onRepay: () => void;
    onRollover: () => void;
}

export const AccountSummary: React.FC<AccountSummaryProps> = ({
    mainBalance,
    currentBalance,
    onBorrow,
    onRepay,
    onRollover
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Main Account (Savings/Reserve) */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-6 border border-blue-700 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet size={120} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                            <Wallet className="text-blue-300" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Main Account</h3>
                            <p className="text-blue-300 text-xs">Long-term Savings & Reserves</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <span className="text-4xl font-bold text-white tracking-tight">
                            {formatCurrency(mainBalance)}
                        </span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onBorrow}
                            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowRight size={16} />
                            Transfer to Current
                        </button>
                    </div>
                </div>
            </div>

            {/* Current Account (Monthly Operations) */}
            <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-6 border border-emerald-700 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={120} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                            <TrendingUp className="text-emerald-300" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Current Account</h3>
                            <p className="text-emerald-300 text-xs">Monthly Budget & Operations</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <span className="text-4xl font-bold text-white tracking-tight">
                            {formatCurrency(currentBalance)}
                        </span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onRepay}
                            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} />
                            Repay to Main
                        </button>
                        <button
                            onClick={onRollover}
                            className="px-4 py-2.5 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-100 rounded-xl text-sm font-medium transition-all border border-emerald-500/20"
                            title="End of Month Rollover"
                        >
                            Rollover
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
