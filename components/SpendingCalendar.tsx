import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getMonthlySpendingHistory } from '../services/api';

interface DailySpending {
  date: string;
  total: number;
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
  }>;
}

const SpendingCalendar: React.FC = () => {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [spendingData, setSpendingData] = useState<Record<string, DailySpending>>({});
  const [selectedDay, setSelectedDay] = useState<DailySpending | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMonthData();
    }
  }, [user, currentDate]);

  const fetchMonthData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await getMonthlySpendingHistory(user.id, year, month);
      const mapped = data.reduce((acc: Record<string, DailySpending>, item: DailySpending) => {
        acc[item.date] = item;
        return acc;
      }, {});
      setSpendingData(mapped);
    } catch (error) {
      console.error('Error fetching spending history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDay(null);
  };

  const getSpendingColor = (amount: number) => {
    if (amount === 0) return 'bg-gray-50';
    if (amount < 500) return 'bg-green-100';
    if (amount < 1000) return 'bg-yellow-100';
    if (amount < 1500) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const formatDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Spending History</h2>
        <div className="flex items-center gap-4">
          <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded">
            ←
          </button>
          <span className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}

          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = formatDate(day);
            const dayData = spendingData[dateKey];
            const amount = dayData?.total || 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(dayData || null)}
                className={`aspect-square p-2 rounded-lg border ${getSpendingColor(amount)} hover:ring-2 hover:ring-blue-400 transition-all`}
              >
                <div className="text-sm font-semibold text-gray-900">{day}</div>
                {amount > 0 && (
                  <div className="text-xs font-bold text-gray-700">${amount.toFixed(0)}</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedDay && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            {new Date(selectedDay.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          <div className="text-2xl font-bold text-gray-900 mb-4">
            Total: ${selectedDay.total.toFixed(2)}
          </div>
          <div className="space-y-2">
            {selectedDay.transactions.map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-white rounded">
                <div>
                  <div className="font-medium text-gray-900">{tx.description}</div>
                  <div className="text-sm text-gray-500">{tx.category}</div>
                </div>
                <div className="font-semibold text-red-600">-${tx.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingCalendar;
