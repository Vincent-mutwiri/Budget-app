
export type TransactionType = 'income' | 'expense';

export enum Category {
  Housing = 'Housing',
  Food = 'Food & Dining',
  Transport = 'Transportation',
  Utilities = 'Utilities',
  Entertainment = 'Entertainment',
  Health = 'Health',
  Shopping = 'Shopping',
  Savings = 'Savings',
  Investment = 'Investments',
  Income = 'Income',
  Other = 'Other'
}

export const CategoriesList = [
  Category.Housing,
  Category.Food,
  Category.Transport,
  Category.Utilities,
  Category.Entertainment,
  Category.Health,
  Category.Shopping,
  Category.Savings,
  Category.Investment,
  Category.Income,
  Category.Other
];

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: Category;
  date: string;
  type: TransactionType;
}

export interface UserState {
  xp: number;
  level: number;
  streak: number;
  badges: number;
  currency: string;
  monthlyIncome: number;
}

export interface LevelData {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
}

export interface DailyChallenge {
  id: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  icon: string;
}

export interface FinancialSnapshot {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
}

export interface Budget {
  id: string;
  category: Category | string;
  limit: number;
  spent: number;
  icon: string; // Identifier for the icon component
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'danger' | 'success' | 'info';
  time: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'xp';
}

export interface Security {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  marketPrice: number;
  marketValue: number;
  change24h: number;
  totalReturn: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  type: 'daily' | 'weekly' | 'monthly';
  resetTime: string;
  completed: boolean;
}
