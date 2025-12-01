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

export const INCOME_CATEGORIES = [
  Category.Income,
  Category.Other
];

export const EXPENSE_CATEGORIES = [
  Category.Housing,
  Category.Food,
  Category.Transport,
  Category.Utilities,
  Category.Water,
  Category.Mobile,
  Category.MPesa,
  Category.Entertainment,
  Category.Health,
  Category.Shopping,
  Category.Savings,
  Category.Investment,
  Category.Other
];

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const XP_REWARDS = {
  ADD_TRANSACTION: 10,
  STREAK_BONUS: 25,
  DAILY_CHALLENGE: 50,
};

export const formatCurrency = (amount: number) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    amount = 0;
  }
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}KSh ${formatted}`;
};

export const calculateLevel = (xp: number): LevelData => {
  return LEVEL_THRESHOLDS.find(l => xp >= l.minXP && xp <= l.maxXP) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
};
