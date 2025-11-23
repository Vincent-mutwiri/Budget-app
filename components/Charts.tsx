import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Transaction, Category } from '../types';

interface ChartsProps {
  transactions: Transaction[];
}

const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#6366F1', '#14B8A6'];

export const ExpensePieChart: React.FC<ChartsProps> = ({ transactions }) => {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};
    
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-500 italic">No expense data available</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value: number) => `$${value}`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TrendChart: React.FC<ChartsProps> = ({ transactions }) => {
    const data = useMemo(() => {
        // Sort transactions by date
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Group by day (last 7 days logic roughly applied for demo)
        const dailyMap: Record<string, { date: string; income: number; expense: number }> = {};
        
        sorted.forEach(t => {
            const day = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!dailyMap[day]) dailyMap[day] = { date: day, income: 0, expense: 0 };
            
            if (t.type === 'income') dailyMap[day].income += t.amount;
            else dailyMap[day].expense += t.amount;
        });

        return Object.values(dailyMap);
    }, [transactions]);

    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-500 italic">Add transactions to see trends</div>;
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
