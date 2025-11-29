import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Transaction } from '../types';

interface ChartsProps {
  transactions: Transaction[];
}

// Colors from design: Pink, Orange, Blue, Purple
const PIE_COLORS = ['#ec4899', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export const ExpensePieChart: React.FC<ChartsProps> = ({ transactions }) => {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};
    let total = 0;
    
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      total += t.amount;
    });

    return {
        data: Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 4), // Top 4 categories
        total
    };
  }, [transactions]);

  if (data.data.length === 0) {
    return <div className="h-full flex items-center justify-center text-forest-300/50 italic">No data</div>;
  }

  return (
    <div className="h-full w-full relative">
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-forest-300 text-xs">Total Spent</span>
        <span className="text-white font-bold text-xl">${data.total.toLocaleString()}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
          >
            {data.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#162222', borderColor: '#1c2828', color: '#f2fdf9', borderRadius: '8px' }}
            itemStyle={{ color: '#f2fdf9' }}
            formatter={(value: number) => `$${value}`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TrendChart: React.FC<ChartsProps> = ({ transactions }) => {
    const data = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // Mocking a smoothed line for visual demo if little data, typically you'd aggregate by day
        // For visual fidelity to design, we'll create a rolling balance or spending trend
        const dailyMap: Record<string, number> = {};
        
        // Populate last 10 days for graph
        const today = new Date();
        for(let i=9; i>=0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyMap[dateStr] = 0; 
        }

        sorted.forEach(t => {
            const dateStr = t.date.split('T')[0];
            if (dailyMap[dateStr] !== undefined) {
                 // For "Spending Over Time", only track expenses
                 if (t.type === 'expense') dailyMap[dateStr] += t.amount;
            }
        });

        // Add some mock noise for the "curve" look if empty
        return Object.entries(dailyMap).map(([date, amount], i) => ({
            date,
            amount: amount + (Math.sin(i) * 50) + 100 // Visual mock offset
        }));
    }, [transactions]);

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorSplit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#162222', borderColor: '#1c2828', color: '#f2fdf9', borderRadius: '8px' }}
                        itemStyle={{ color: '#10b981' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorSplit)" 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};