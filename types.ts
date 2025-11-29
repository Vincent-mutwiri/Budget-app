
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
  claimed?: boolean;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  imageUrl: string;
  status: 'in-progress' | 'completed' | 'archived';
}

export interface UserProfile {
  fullName: string;
  email: string;
  avatarUrl: string;
  joinedDate: string;
  currency: string;
  theme: 'light' | 'dark';
  budgetAlerts: boolean;
  lastPasswordChange: string;
  twoFactorEnabled: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability';
  balance: number;
  institution: string;
  logoUrl: string;
  lastSynced: string;
  syncStatus: 'success' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Recurring Transactions
export interface RecurringTransaction {
  id: string;
  userId: string;
  amount: number;
  category: Category;
  description: string;
  type: TransactionType;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextOccurrence: string;
  isActive: boolean;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransactionInput {
  amount: number;
  category: Category;
  description: string;
  type: TransactionType;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
}

// Notifications
export interface NotificationExtended {
  id: string;
  userId: string;
  type: 'bill_reminder' | 'budget_alert' | 'goal_milestone' | 'anomaly' | 'gamification' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NotificationPreferences {
  budgetAlerts: boolean;
  budgetThresholds: number[];
  billReminders: boolean;
  reminderDaysBefore: number[];
  goalMilestones: boolean;
  anomalyAlerts: boolean;
  gamificationNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// Investments
export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: 'stock' | 'bond' | 'mutual_fund' | 'etf' | 'crypto' | 'real_estate' | 'other';
  symbol?: string;
  initialAmount: number;
  currentValue: number;
  ratePerAnnum: number;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentInput {
  name: string;
  type: 'stock' | 'bond' | 'mutual_fund' | 'etf' | 'crypto' | 'real_estate' | 'other';
  symbol?: string;
  initialAmount: number;
  currentValue: number;
  ratePerAnnum: number;
  purchaseDate: string;
  notes?: string;
}

export interface InvestmentMetrics {
  totalReturn: number;
  totalReturnPercentage: number;
  annualizedReturn: number;
  projectedValue1Year: number;
  projectedValue3Years: number;
  projectedValue5Years: number;
}

// Debts
export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'car_loan' | 'personal_loan' | 'other';
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
  paymentHistory: DebtPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface DebtInput {
  name: string;
  type: 'credit_card' | 'student_loan' | 'mortgage' | 'car_loan' | 'personal_loan' | 'other';
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  principalPaid: number;
  interestPaid: number;
}

export interface DebtMetrics {
  payoffDate: string;
  totalInterest: number;
  monthsRemaining: number;
  acceleratedPayoffDate?: string;
  interestSavings?: number;
}

// Budget Recommendations
export interface BudgetRecommendation {
  id: string;
  userId: string;
  category: Category;
  suggestedLimit: number;
  currentSpending: number;
  historicalAverage: number;
  potentialSavings: number;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: string;
}

// Financial Insights
export interface FinancialInsights {
  userId: string;
  healthScore: number;
  healthScoreComponents: {
    savingsRate: number;
    debtToIncome: number;
    budgetAdherence: number;
    emergencyFund: number;
  };
  spendingTrends: CategoryTrend[];
  forecast: {
    projectedIncome: number;
    projectedExpenses: number;
    confidence: number;
  };
  anomalies: SpendingAnomaly[];
  generatedAt: string;
}

export interface CategoryTrend {
  category: Category;
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SpendingAnomaly {
  transactionId: string;
  category: Category;
  amount: number;
  averageAmount: number;
  deviationPercentage: number;
  detectedAt: string;
}

// Receipts
export interface Receipt {
  id: string;
  userId: string;
  transactionId?: string;
  imageUrl: string;
  extractedData: {
    merchantName: string;
    date: string;
    totalAmount: number;
    lineItems: LineItem[];
  };
  confidence: {
    merchantName: number;
    date: number;
    totalAmount: number;
  };
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ExtractedReceiptData {
  merchantName: string;
  date: string;
  totalAmount: number;
  lineItems: LineItem[];
  confidence: {
    merchantName: number;
    date: number;
    totalAmount: number;
  };
  receiptImageUrl: string;
}

// Gamification
export interface UserGamificationState {
  xp: number;
  level: number;
  levelProgress: number;
  streak: number;
  badges: string[];
  rank: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockRequirement: string;
  isUnlocked: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  rank: number;
}

// AI Assistant
export interface ContextualInsight {
  type: 'spending_summary' | 'budget_status' | 'investment_performance' | 'debt_overview';
  data: any;
  visualizations: ChartData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: any;
  options?: any;
}

// Export
export interface ExportConfig {
  type: 'transactions' | 'budgets' | 'investments' | 'debts' | 'summary';
  format: 'csv' | 'pdf';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: {
    categories?: Category[];
    accounts?: string[];
  };
}

// Security
export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerifyRequest {
  userId: string;
  code: string;
  secret?: string;
}

export interface PasswordChangeRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: {
    browser: string;
    os: string;
    ip: string;
  };
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
}
