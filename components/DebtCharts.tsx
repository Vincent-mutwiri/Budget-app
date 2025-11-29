import React, { useState } from 'react';
import { Debt, DebtMetrics } from '../types';
import { Line } from 'react-chartjs-2';
import { formatCurrency } from '../constants';
import { TrendingDown, Calculator } from 'lucide-react';

interface DebtWithMetrics extends Debt {
    calculatedMetrics: DebtMetrics;
}

interface DebtChartsProps {
    debts: DebtWithMetrics[];
    onCalculateAccelerated?: (debtId: string, extraPayment: number) => Promise<any>;
}

export const DebtCharts: React.FC<DebtChartsProps> = ({ debts, onCalculateAccelerated }) => {
    const [selectedDebtId, setSelectedDebtId] = useState<string>(debts[0]?.id || '');
    const [extraPayment, setExtraPayment] = useState<number>(0);
    const [acceleratedData, setAcceleratedData] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const selectedDebt = debts.find(d => d.id === selectedDebtId);

    // Generate debt reduction timeline data
    const generateTimelineData = (debt: DebtWithMetrics) => {
        const months: string[] = [];
        const balances: number[] = [];

        let balance = debt.currentBalance;
        const monthlyRate = debt.interestRate / 100 / 12;
        let currentMonth = 0;

        // Generate data for up to 60 months or until paid off
        while (balance > 0 && currentMonth < 60) {
            const date = new Date();
            date.setMonth(date.getMonth() + currentMonth);
            months.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            balances.push(Math.round(balance * 100) / 100);

            // Calculate next month's balance
            const interestCharge = balance * monthlyRate;
            const principalPayment = Math.min(debt.minimumPayment - interestCharge, balance);

            if (principalPayment <= 0) break;

            balance -= principalPayment;
            currentMonth++;
        }

        // Add final point at zero
        if (balance <= 0 && currentMonth < 60) {
            const date = new Date();
            date.setMonth(date.getMonth() + currentMonth);
            months.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            balances.push(0);
        }

        return { months, balances };
    };

    const handleCalculateAccelerated = async () => {
        if (!selectedDebt || !onCalculateAccelerated || extraPayment <= 0) return;

        setIsCalculating(true);
        try {
            const result = await onCalculateAccelerated(selectedDebt.id, extraPayment);
            setAcceleratedData(result);
        } catch (error) {
            console.error('Error calculating accelerated payoff:', error);
        } finally {
            setIsCalculating(false);
        }
    };

    if (debts.length === 0) {
        return (
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-12 text-center">
                <div className="text-forest-400 mb-4">
                    <TrendingDown size={48} className="mx-auto opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Debt Data</h3>
                <p className="text-forest-400">Add debts to see reduction charts and projections.</p>
            </div>
        );
    }

    const timelineData = selectedDebt ? generateTimelineData(selectedDebt) : { months: [], balances: [] };

    const chartData = {
        labels: timelineData.months,
        datasets: [
            {
                label: 'Debt Balance',
                data: timelineData.balances,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 28, 0.95)',
                titleColor: '#fff',
                bodyColor: '#94a3b8',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context: any) => `Balance: ${formatCurrency(context.parsed.y)}`
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    callback: (value: any) => formatCurrency(value)
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Debt Reduction Timeline Chart */}
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Debt Reduction Timeline</h3>
                    {debts.length > 1 && (
                        <select
                            value={selectedDebtId}
                            onChange={(e) => {
                                setSelectedDebtId(e.target.value);
                                setAcceleratedData(null);
                            }}
                            className="bg-forest-950 border border-forest-700 rounded-xl py-2 px-4 text-white text-sm focus:outline-none focus:border-primary"
                        >
                            {debts.map(debt => (
                                <option key={debt.id} value={debt.id}>{debt.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="h-80">
                    <Line data={chartData} options={chartOptions} />
                </div>

                {selectedDebt && (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="bg-forest-900 rounded-xl p-4 text-center">
                            <div className="text-forest-400 text-xs font-medium mb-1">Current Balance</div>
                            <div className="text-lg font-bold text-white">{formatCurrency(selectedDebt.currentBalance)}</div>
                        </div>
                        <div className="bg-forest-900 rounded-xl p-4 text-center">
                            <div className="text-forest-400 text-xs font-medium mb-1">Payoff Date</div>
                            <div className="text-lg font-bold text-white">
                                {new Date(selectedDebt.calculatedMetrics.payoffDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                        <div className="bg-forest-900 rounded-xl p-4 text-center">
                            <div className="text-forest-400 text-xs font-medium mb-1">Total Interest</div>
                            <div className="text-lg font-bold text-rose-400">{formatCurrency(selectedDebt.calculatedMetrics.totalInterest)}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Accelerated Payoff Calculator */}
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Calculator size={24} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Accelerated Payoff Calculator</h3>
                        <p className="text-forest-400 text-sm">See how extra payments can reduce your debt faster</p>
                    </div>
                </div>

                {selectedDebt && (
                    <>
                        <div className="mb-6">
                            <label className="block text-forest-300 text-sm font-medium mb-2">
                                Extra Monthly Payment
                            </label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                                    <input
                                        type="number"
                                        step="10"
                                        value={extraPayment || ''}
                                        onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                                    />
                                </div>
                                <button
                                    onClick={handleCalculateAccelerated}
                                    disabled={isCalculating || extraPayment <= 0}
                                    className="px-6 bg-primary hover:bg-primary/90 text-forest-950 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCalculating ? 'Calculating...' : 'Calculate'}
                                </button>
                            </div>
                        </div>

                        {acceleratedData && (
                            <div className="bg-forest-900 rounded-xl p-6">
                                <h4 className="text-sm font-bold text-white mb-4">Results with ${extraPayment}/month extra</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <div className="text-forest-400 text-xs font-medium mb-1">New Payoff Date</div>
                                        <div className="text-lg font-bold text-primary">
                                            {new Date(acceleratedData.acceleratedPayoffDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </div>
                                        <div className="text-forest-500 text-xs mt-1">
                                            {acceleratedData.monthsRemaining} months
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-forest-400 text-xs font-medium mb-1">Time Saved</div>
                                        <div className="text-lg font-bold text-primary">
                                            {selectedDebt.calculatedMetrics.monthsRemaining - acceleratedData.monthsRemaining} months
                                        </div>
                                        <div className="text-forest-500 text-xs mt-1">
                                            faster payoff
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-forest-400 text-xs font-medium mb-1">Interest Savings</div>
                                        <div className="text-lg font-bold text-primary">
                                            {formatCurrency(acceleratedData.interestSavings)}
                                        </div>
                                        <div className="text-forest-500 text-xs mt-1">
                                            total saved
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
