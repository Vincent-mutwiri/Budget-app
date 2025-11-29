import React from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Investment, InvestmentMetrics } from '../types';
import { formatCurrency } from '../constants';

interface InvestmentWithMetrics extends Investment {
    calculatedMetrics: InvestmentMetrics;
}

interface InvestmentChartsProps {
    investments: InvestmentWithMetrics[];
}

const COLORS = ['#A3E635', '#84CC16', '#65A30D', '#4D7C0F', '#3F6212', '#365314', '#1A2E05'];

export const InvestmentCharts: React.FC<InvestmentChartsProps> = ({ investments }) => {
    if (investments.length === 0) {
        return null;
    }

    // Calculate asset allocation data
    const assetAllocationMap = new Map<string, number>();
    investments.forEach(inv => {
        const current = assetAllocationMap.get(inv.type) || 0;
        assetAllocationMap.set(inv.type, current + inv.currentValue);
    });

    const assetAllocationData = Array.from(assetAllocationMap.entries()).map(([type, value]) => {
        const typeLabels: Record<string, string> = {
            stock: 'Stocks',
            bond: 'Bonds',
            mutual_fund: 'Mutual Funds',
            etf: 'ETFs',
            crypto: 'Crypto',
            real_estate: 'Real Estate',
            other: 'Other'
        };
        return {
            name: typeLabels[type] || type,
            value,
            percentage: (value / investments.reduce((sum, inv) => sum + inv.currentValue, 0)) * 100
        };
    });

    // Calculate growth projection data
    const currentTotal = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const avgRate = investments.reduce((sum, inv) => sum + inv.ratePerAnnum, 0) / investments.length;

    const growthProjectionData = [
        { year: 'Now', value: currentTotal },
        { year: '1Y', value: investments.reduce((sum, inv) => sum + inv.calculatedMetrics.projectedValue1Year, 0) },
        { year: '3Y', value: investments.reduce((sum, inv) => sum + inv.calculatedMetrics.projectedValue3Years, 0) },
        { year: '5Y', value: investments.reduce((sum, inv) => sum + inv.calculatedMetrics.projectedValue5Years, 0) }
    ];

    // Calculate historical performance data (simulated based on purchase dates and current values)
    const historicalData = investments
        .map(inv => {
            const purchaseDate = new Date(inv.purchaseDate);
            const monthsSincePurchase = Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

            return {
                name: inv.name,
                months: monthsSincePurchase,
                initialValue: inv.initialAmount,
                currentValue: inv.currentValue
            };
        })
        .sort((a, b) => a.months - b.months);

    // Create cumulative historical data
    let cumulativeValue = 0;
    const cumulativeHistoricalData = historicalData.map((inv, index) => {
        cumulativeValue += inv.currentValue;
        return {
            month: `M${inv.months}`,
            value: cumulativeValue,
            label: inv.name
        };
    });

    // Custom tooltip for pie chart
    const CustomPieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-forest-900 border border-forest-700 rounded-lg p-3 shadow-lg">
                    <p className="text-white font-semibold">{payload[0].name}</p>
                    <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
                    <p className="text-forest-400 text-sm">{payload[0].payload.percentage.toFixed(1)}%</p>
                </div>
            );
        }
        return null;
    };

    // Custom tooltip for line chart
    const CustomLineTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-forest-900 border border-forest-700 rounded-lg p-3 shadow-lg">
                    <p className="text-white font-semibold">{payload[0].payload.year}</p>
                    <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Allocation Pie Chart */}
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Asset Allocation</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={assetAllocationData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {assetAllocationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 space-y-2">
                    {assetAllocationData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-forest-300">{item.name}</span>
                            </div>
                            <span className="text-white font-semibold">{formatCurrency(item.value)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Growth Projection Line Chart */}
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Growth Projection</h3>
                <p className="text-forest-400 text-sm mb-4">
                    Based on average rate of {avgRate.toFixed(2)}% per annum
                </p>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={growthProjectionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                            <XAxis
                                dataKey="year"
                                stroke="#9CA3AF"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                style={{ fontSize: '12px' }}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomLineTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#A3E635"
                                strokeWidth={3}
                                dot={{ fill: '#A3E635', r: 6 }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Projection Details */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-forest-900 rounded-lg p-3 text-center">
                        <p className="text-forest-400 text-xs mb-1">1 Year</p>
                        <p className="text-white font-semibold text-sm">
                            {formatCurrency(growthProjectionData[1].value)}
                        </p>
                    </div>
                    <div className="bg-forest-900 rounded-lg p-3 text-center">
                        <p className="text-forest-400 text-xs mb-1">3 Years</p>
                        <p className="text-white font-semibold text-sm">
                            {formatCurrency(growthProjectionData[2].value)}
                        </p>
                    </div>
                    <div className="bg-forest-900 rounded-lg p-3 text-center">
                        <p className="text-forest-400 text-xs mb-1">5 Years</p>
                        <p className="text-white font-semibold text-sm">
                            {formatCurrency(growthProjectionData[3].value)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Historical Performance Chart */}
            {cumulativeHistoricalData.length > 1 && (
                <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6 lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-4">Portfolio Growth History</h3>
                    <p className="text-forest-400 text-sm mb-4">
                        Cumulative portfolio value over time
                    </p>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={cumulativeHistoricalData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                                <XAxis
                                    dataKey="month"
                                    stroke="#9CA3AF"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    style={{ fontSize: '12px' }}
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-forest-900 border border-forest-700 rounded-lg p-3 shadow-lg">
                                                    <p className="text-white font-semibold">{payload[0].payload.label}</p>
                                                    <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#A3E635"
                                    strokeWidth={3}
                                    dot={{ fill: '#A3E635', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};
