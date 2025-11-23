import { Category, LevelData, Transaction } from './types';

export const LEVEL_THRESHOLDS: LevelData[] = [
  { level: 1, name: 'Novice Saver', minXP: 0, maxXP: 100 },
  { level: 2, name: 'Budget Apprentice', minXP: 101, maxXP: 300 },
  { level: 3, name: 'Expense Tracker', minXP: 301, maxXP: 600 },
  { level: 4, name: 'Money Mindful', minXP: 601, maxXP: 1000 },
  { level: 5, name: 'Savings Scout', minXP: 1001, maxXP: 1500 },
  { level: 6, name: 'Wealth Warrior', minXP: 1501, maxXP: 2200 },
  { level: 7, name: 'Investment Initiate', minXP: 2201, maxXP: 3000 },
  { level: 8, name: 'Portfolio Pro', minXP: 3001, maxXP: 4000 },
  { level: 9, name: 'Financial Sage', minXP: 4001, maxXP: 5500 },
  { level: 10, name: 'Wealth Wizard', minXP: 5501, maxXP: 100000 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', amount: 4500, description: 'Monthly Salary', category: Category.Income, date: new Date().toISOString(), type: 'income' },
  { id: '2', amount: 1200, description: 'Rent Payment', category: Category.Housing, date: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'expense' },
  { id: '3', amount: 150, description: 'Weekly Groceries', category: Category.Food, date: new Date(Date.now() - 86400000 * 5).toISOString(), type: 'expense' },
  { id: '4', amount: 45, description: 'Gas Station', category: Category.Transport, date: new Date(Date.now() - 86400000 * 1).toISOString(), type: 'expense' },
  { id: '5', amount: 60, description: 'Internet Bill', category: Category.Utilities, date: new Date(Date.now() - 86400000 * 10).toISOString(), type: 'expense' },
  { id: '6', amount: 120, description: 'Dinner Date', category: Category.Entertainment, date: new Date(Date.now() - 86400000 * 3).toISOString(), type: 'expense' },
];

export const XP_REWARDS = {
  ADD_TRANSACTION: 10,
  STREAK_BONUS: 25,
  DAILY_CHALLENGE: 50,
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const calculateLevel = (xp: number): LevelData => {
  return LEVEL_THRESHOLDS.find(l => xp >= l.minXP && xp <= l.maxXP) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
};
