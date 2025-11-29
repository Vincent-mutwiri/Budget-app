import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, Wallet } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, trend }) => (
  <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl flex flex-col justify-between h-40 relative overflow-hidden group hover:border-forest-600 transition-colors">
    <div className="z-10">
      <h3 className="text-forest-300 text-sm font-medium mb-2">{title}</h3>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      {subValue && (
        <div className={`flex items-center text-sm font-medium ${trend === 'up' ? 'text-primary' : trend === 'down' ? 'text-rose-500' : 'text-primary'}`}>
          {trend === 'up' && <TrendingUp size={16} className="mr-1" />}
          {trend === 'down' && <TrendingDown size={16} className="mr-1" />}
          {trend === 'neutral' && <CheckCircle2 size={16} className="mr-1" />}
          {subValue}
        </div>
      )}
    </div>
    <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-1/4 translate-y-1/4">
      <Wallet size={120} />
    </div>
  </div>
);