import React, { memo } from 'react';
import { formatCurrency } from '../../constants';

interface GoalCardProps {
  title: string;
  current: number;
  target: number;
  colorClass: string;
}

export const GoalCard: React.FC<GoalCardProps> = memo(({ title, current, target, colorClass }) => {
  const percent = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h4 className="font-bold text-white text-lg">{title}</h4>
          <div className="text-forest-400 text-sm mt-1">{formatCurrency(current)} / {formatCurrency(target)}</div>
        </div>
        <div className="text-xl font-bold text-forest-200">{percent}%</div>
      </div>
      <div className="w-full bg-forest-900 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
});