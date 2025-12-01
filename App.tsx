
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Wallet, Target, Brain, CreditCard, Calendar,
  LayoutGrid, Settings, Folder, ArrowRight, X, DollarSign,
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, AlertCircle, Medal, Flame, ChevronRight,
  Search, Filter, Pencil, Trash2, Lightbulb, Edit, Upload,
  ShoppingCart, Bus, Film, Zap, ShoppingBag, PlusCircle, Download, Menu, Trophy, Award
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import {
  getTransactions, createTransaction, updateTransaction,
  getBudgets, updateBudget,
  getGoals, updateGoal, deleteGoal, uploadGoalImage, removeGoalImage, contributeToGoal,
  getAccounts,
  getUser,
  createAccount,
  updateAccount,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  getMetrics
} from './services/api';
import {
  Transaction, UserState, Category, DailyChallenge,
  FinancialSnapshot, Goal, Notification, Alert, TransactionType, CategoriesList, Budget, Security, Challenge, SavingsGoal, UserProfile, Account, ChatMessage, FinancialMetrics
} from './types';
import {
  MOCK_TRANSACTIONS, LEVEL_THRESHOLDS, XP_REWARDS,
  calculateLevel, formatCurrency
} from './constants';
import { ExpensePieChart, TrendChart } from './components/Charts';

import { Modal } from './components/Modal';
import { AddBudgetForm, AddGoalForm } from './components/Forms';
import { AddAccountForm } from './components/AddAccountForm';
import { CategoryManager } from './components/CategoryManager';
import { createBudget, createGoal, getRecurringTransactions, createRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, toggleRecurringTransaction, deleteTransaction, payRecurringTransaction } from './services/api';
import { RecurringTransactionsView } from './components/RecurringTransactionsView';
import type { RecurringTransaction, RecurringTransactionInput } from './types';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationPreferences } from './components/NotificationPreferences';
import BudgetRecommendations from './components/BudgetRecommendations';
import InsightsDashboard from './components/InsightsDashboard';
import { ReceiptScanner } from './components/ReceiptScanner';
import { InvestmentsView as NewInvestmentsView } from './components/InvestmentsView';
import { DebtTracker } from './components/DebtTracker';
import { ExportReports } from './components/ExportReports';
import AIAssistantView from './components/AIAssistantView';
import { ToastContainer } from './components/Toast';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { useToast } from './hooks/useToast';
import { XPNotification, XPRewardData } from './components/XPNotification';
import GamificationViewIntegrated from './components/GamificationViewIntegrated';
import { cache } from './utils/cache';
import { SkeletonCard, SkeletonMetric, SkeletonTable } from './components/SkeletonLoader';
import { MetricCard } from './components/shared/MetricCard';
import { GoalCard } from './components/shared/GoalCard';
import { useTransactions } from './hooks/useTransactions';
import { handleApiError } from './utils/errorHandler';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FinancialMetricsDashboard } from './components/FinancialMetricsDashboard';

// --- Components ---

const SidebarItem = ({
  id, label, icon: Icon, active, onClick
}: {
  id: string, label: string, icon: React.ElementType, active: boolean, onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all mb-2 group ${active
      ? 'bg-primary/10 text-primary font-semibold'
      : 'text-forest-300 hover:bg-forest-800 hover:text-white'
      }`}
  >
    <Icon size={22} className={active ? 'text-primary' : 'text-forest-400 group-hover:text-white'} />
    <span className="tracking-wide">{label}</span>
  </button>
);

const AlertItem: React.FC<{ alert: Alert }> = ({ alert }) => {
  const icons = {
    warning: <AlertTriangle size={20} className="text-amber-500" />,
    danger: <AlertCircle size={20} className="text-rose-500" />,
    success: <Medal size={20} className="text-primary" />,
    info: <CheckCircle2 size={20} className="text-blue-500" />
  };

  const bgColors = {
    warning: 'bg-amber-500/10',
    danger: 'bg-rose-500/10',
    success: 'bg-primary/10',
    info: 'bg-blue-500/10'
  };

  return (
    <div className="flex gap-4 items-start p-3 hover:bg-forest-700/50 rounded-xl transition-colors">
      <div className={`p-2 rounded-full ${bgColors[alert.type]} mt-1`}>
        {icons[alert.type]}
      </div>
      <div>
        <p className="text-sm font-medium text-white leading-tight mb-1">{alert.message}</p>
        <p className="text-xs text-forest-400">{alert.time}</p>
      </div>
    </div>
  );
};

// --- Transactions View Component ---

const TransactionsView = ({
  transactions,
  onAdd,
  onUpdate,
  onDelete,
  onOpenCategoryManager,
  customCategories
}: {
  transactions: Transaction[],
  onAdd: (t: Omit<Transaction, 'id'>) => void,
  onUpdate: (id: string, t: Partial<Transaction>) => void,
  onDelete: (id: string) => void,
  onOpenCategoryManager: () => void,
  customCategories: Array<{ name: string; type: 'income' | 'expense' }>
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [amountFilter, setAmountFilter] = useState({ min: '', max: '' });
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [retainDate, setRetainDate] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; transaction: Transaction | null }>({ isOpen: false, transaction: null });
  const { user: clerkUser } = useUser();

  console.log('Custom categories in TransactionsView:', customCategories);

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setType(transaction.type);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setDate(new Date(transaction.date).toISOString().split('T')[0]);
    setDescription(transaction.description);
    setCustomCategory('');

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setDescription('');
    setCategory('' as Category);
    setCustomCategory('');
    if (!retainDate) {
      setDate(new Date().toISOString().split('T')[0]);
    }
    setType('expense');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;

    const finalCategory = customCategory.trim() || category;
    const transactionData = {
      amount: parseFloat(amount),
      category: finalCategory as Category,
      date,
      description: description || 'Untitled Transaction',
      type
    };

    if (editingId) {
      onUpdate(editingId, transactionData);
      setEditingId(null);
    } else {
      onAdd(transactionData);
    }

    // Reset form - keep date if retainDate is enabled
    setAmount('');
    setDescription('');
    setCategory('' as Category);
    setCustomCategory('');
    if (!retainDate) {
      setDate(new Date().toISOString().split('T')[0]);
    }
    if (editingId) {
      setType('expense'); // Reset type after edit
    }
  };

  const handleReceiptTransaction = (transactionData: any) => {
    onAdd({
      amount: transactionData.amount,
      category: transactionData.category,
      date: transactionData.date,
      description: transactionData.description,
      type: transactionData.type || 'expense'
    });
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || t.category === categoryFilter;
    const matchesAmount = (!amountFilter.min || t.amount >= parseFloat(amountFilter.min)) &&
      (!amountFilter.max || t.amount <= parseFloat(amountFilter.max));
    return matchesSearch && matchesCategory && matchesAmount;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Add Transaction */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Transaction' : 'Add New Transaction'}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenCategoryManager}
                className="flex items-center gap-2 px-3 py-2 bg-forest-900 hover:bg-forest-700 text-forest-300 hover:text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Settings size={16} />
                Categories
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptScanner(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium"
              >
                <ShoppingCart size={16} />
                Scan Receipt
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Type Toggle */}
            <div className="bg-forest-900 p-1.5 rounded-xl flex gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${type === 'expense'
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'bg-forest-800 text-forest-400 hover:text-white hover:bg-forest-700'
                  }`}
              >
                💸 Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${type === 'income'
                  ? 'bg-primary text-forest-950 shadow-lg'
                  : 'bg-forest-800 text-forest-400 hover:text-white hover:bg-forest-700'
                  }`}
              >
                💰 Income
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-forest-300 text-sm font-medium mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">KSh</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                  required
                />
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {[50, 100, 200, 500, 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className="px-3 py-1 text-xs bg-forest-900 hover:bg-forest-700 text-forest-300 hover:text-white rounded-lg transition-colors"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-forest-300 text-sm font-medium mb-2">Category</label>
              <select
                value={category === 'custom' || (category && !CategoriesList.includes(category as Category)) ? 'custom' : category}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setCategory('custom' as Category);
                    setCustomCategory('');
                  } else {
                    setCategory(e.target.value as Category);
                    setCustomCategory('');
                  }
                }}
                className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                required
              >
                <option value="" disabled>Select a category</option>
                {CategoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {customCategories.map((cat, idx) => (
                  <option key={`custom-${cat.name}-${idx}`} value={cat.name}>{cat.name}</option>
                ))}
                <option key="add-custom" value="custom">+ Add Custom Category</option>
              </select>
              {category === 'custom' && (
                <input
                  type="text"
                  value={customCategory}
                  placeholder="Enter custom category name"
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      setCategory(e.target.value.trim() as Category);
                    }
                  }}
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary mt-2"
                  autoFocus
                  required
                />
              )}
            </div>

            {/* Date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-forest-300 text-sm font-medium">Date</label>
                <button
                  type="button"
                  onClick={() => setRetainDate(!retainDate)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${retainDate
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-forest-900 text-forest-400 border border-forest-700 hover:text-forest-300'
                    }`}
                  title={retainDate ? 'Date will be kept after submission' : 'Date will reset after submission'}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {retainDate ? 'Keep Date' : 'Reset Date'}
                </button>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full bg-forest-950 border rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-1 [color-scheme:dark] transition-colors ${retainDate
                    ? 'border-primary/50 focus:border-primary ring-primary/20'
                    : 'border-forest-700 focus:border-primary focus:ring-primary'
                    }`}
                  required
                />
                {retainDate && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {retainDate && (
                <p className="mt-1.5 text-xs text-primary/80 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Date will be kept for bulk entry
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-forest-300 text-sm font-medium mb-2">Description <span className="text-forest-500 font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekly grocery shopping"
                rows={3}
                className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3.5 rounded-xl transition-colors mt-2"
            >
              {editingId ? 'Update Transaction' : 'Add Transaction'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="w-full bg-forest-800 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition-colors mt-2 border border-forest-700"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Smart Suggestion Alert */}
        {showSuggestion && (
          <div className="bg-forest-800/50 border border-primary/20 rounded-2xl p-4 flex gap-4 relative">
            <button
              onClick={() => setShowSuggestion(false)}
              className="absolute top-3 right-3 text-forest-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <div className="bg-primary/10 p-2.5 rounded-full h-fit text-primary shrink-0">
              <Lightbulb size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">Smart Suggestion</h4>
              <p className="text-forest-300 text-sm leading-relaxed">
                Based on "Weekly grocery shopping", we suggest the 'Groceries' category. <span className="text-primary font-medium cursor-pointer hover:underline">Apply</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Transaction History */}
      <div className="lg:col-span-2 bg-forest-800 border border-forest-700 rounded-3xl p-6 flex flex-col max-h-[800px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <h2 className="text-xl font-bold text-white">Transaction History</h2>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-forest-950 border border-forest-700 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-primary w-full md:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-forest-950 border border-forest-700 rounded-xl text-forest-300 hover:text-white hover:border-forest-600 transition-colors text-sm font-medium">
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 scrollbar-thin scrollbar-thumb-forest-700 min-h-0">
          <table className="w-full min-w-[600px]">
            <thead className="sticky top-0 bg-forest-800 z-10 text-forest-400 text-xs uppercase tracking-wider font-semibold text-left">
              <tr>
                <th className="pb-4 pl-2">Date</th>
                <th className="pb-4">Description</th>
                <th className="pb-4">Category</th>
                <th className="pb-4 text-right">Amount</th>
                <th className="pb-4 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-700/50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="group hover:bg-forest-700/30 transition-colors">
                  <td className="py-4 pl-2 text-forest-300 text-sm">
                    {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-4 text-white font-medium text-sm">{t.description}</td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 rounded-full bg-forest-900 border border-forest-700 text-forest-300 text-xs font-medium">
                      {t.category}
                    </span>
                  </td>
                  <td className={`py-4 text-right font-medium text-sm ${t.type === 'income' ? 'text-primary' : 'text-rose-400'}`}>
                    {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                  </td>
                  <td className="py-4 pr-2 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-1.5 text-forest-400 hover:text-primary transition-colors rounded-lg hover:bg-forest-900"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation({ isOpen: true, transaction: t })}
                        className="p-1.5 text-forest-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-forest-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr key="no-transactions">
                  <td colSpan={5} className="py-12 text-center text-forest-400 italic">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length > 5 && (
          <div className="pt-4 border-t border-forest-700 shrink-0 flex justify-center">
            <button className="text-sm font-medium text-forest-300 hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-forest-900">
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Receipt Scanner Modal */}
      {showReceiptScanner && clerkUser && (
        <Modal
          isOpen={showReceiptScanner}
          onClose={() => setShowReceiptScanner(false)}
          title=""
        >
          <ReceiptScanner
            userId={clerkUser.id}
            onTransactionCreated={handleReceiptTransaction}
            onClose={() => setShowReceiptScanner(false)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && deleteConfirmation.transaction && (
        <Modal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, transaction: null })}
          title="Delete Transaction"
        >
          <div className="space-y-4">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
              <p className="text-forest-300 text-sm mb-3">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
              <div className="bg-forest-950 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-forest-400 text-xs">Description:</span>
                  <span className="text-white text-sm font-medium">{deleteConfirmation.transaction.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-forest-400 text-xs">Category:</span>
                  <span className="px-2 py-0.5 rounded-full bg-forest-900 border border-forest-700 text-forest-300 text-xs">
                    {deleteConfirmation.transaction.category}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-forest-400 text-xs">Amount:</span>
                  <span className={`text-sm font-bold ${deleteConfirmation.transaction.type === 'income' ? 'text-primary' : 'text-rose-400'}`}>
                    {deleteConfirmation.transaction.type === 'expense' ? '-' : '+'}{formatCurrency(deleteConfirmation.transaction.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-forest-400 text-xs">Date:</span>
                  <span className="text-white text-sm">
                    {new Date(deleteConfirmation.transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, transaction: null })}
                className="flex-1 px-4 py-3 bg-forest-800 hover:bg-forest-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(deleteConfirmation.transaction!.id);
                  setDeleteConfirmation({ isOpen: false, transaction: null });
                }}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-colors"
              >
                Delete Transaction
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- Investments View Component ---

const InvestmentsView = ({ securities }: { securities: Security[] }) => {
  const [activeTab, setActiveTab] = useState<'holdings' | 'history' | 'performance'>('holdings');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate portfolio totals
  const totalValue = securities.reduce((sum, s) => sum + s.marketValue, 0);
  const change24h = securities.reduce((sum, s) => sum + (s.marketValue * s.change24h / 100), 0);
  const change24hPercent = (change24h / totalValue) * 100;
  const allTimeReturn = securities.reduce((sum, s) => sum + s.totalReturn, 0);
  const dividendsYTD = 4320.50; // Mock value

  const filteredSecurities = securities.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">

      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Investments & Holdings</h2>
            <p className="text-forest-400">Track your portfolio performance and manage securities.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="flex items-center gap-2 bg-forest-800 border border-forest-700 hover:border-forest-600 text-white font-medium py-2.5 px-5 rounded-xl transition-colors whitespace-nowrap">
              <Settings size={18} /> <span className="hidden sm:inline">Manage Securities</span><span className="sm:hidden">Manage</span>
            </button>
            <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-2.5 px-5 rounded-xl transition-colors whitespace-nowrap">
              <Plus size={18} strokeWidth={3} /> Add Trade
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
            <div className="text-forest-300 text-sm font-medium mb-1">Total Value</div>
            <div className="text-2xl lg:text-3xl font-bold text-white truncate">{formatCurrency(totalValue)}</div>
          </div>
          <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
            <div className="text-forest-300 text-sm font-medium mb-1">24h Change</div>
            <div className="text-2xl lg:text-3xl font-bold text-primary truncate">+{formatCurrency(change24h)}</div>
            <div className="text-sm text-primary font-medium mt-1">+{change24hPercent.toFixed(2)}%</div>
          </div>
          <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
            <div className="text-forest-300 text-sm font-medium mb-1">All-time Return</div>
            <div className="text-2xl lg:text-3xl font-bold text-primary truncate">+{formatCurrency(allTimeReturn)}</div>
          </div>
          <div className="bg-forest-800 border border-forest-700 p-5 rounded-3xl min-w-0">
            <div className="text-forest-300 text-sm font-medium mb-1">Dividends (YTD)</div>
            <div className="text-2xl lg:text-3xl font-bold text-white truncate">{formatCurrency(dividendsYTD)}</div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6 flex flex-col">

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 bg-forest-900 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'holdings'
                ? 'bg-forest-800 text-white border border-forest-700'
                : 'text-forest-400 hover:text-white'
                }`}
            >
              Holdings
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                ? 'bg-forest-800 text-white border border-forest-700'
                : 'text-forest-400 hover:text-white'
                }`}
            >
              Trade History
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'performance'
                ? 'bg-forest-800 text-white border border-forest-700'
                : 'text-forest-400 hover:text-white'
                }`}
            >
              Performance
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-forest-950 border border-forest-700 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-primary w-full md:w-80"
            />
          </div>
        </div>

        {/* Holdings Table */}
        {activeTab === 'holdings' && (
          <div className="overflow-auto -mx-6 px-6 scrollbar-thin scrollbar-thumb-forest-700">
            <table className="w-full min-w-[800px]">
              <thead className="text-forest-400 text-xs uppercase tracking-wider font-semibold text-left border-b border-forest-700">
                <tr>
                  <th className="pb-4 pl-2">Security</th>
                  <th className="pb-4 text-right">Shares</th>
                  <th className="pb-4 text-right">Market Price</th>
                  <th className="pb-4 text-right">Market Value</th>
                  <th className="pb-4 text-right">24h Change</th>
                  <th className="pb-4 pr-2 text-right">Total Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-700/50">
                {filteredSecurities.map((security) => (
                  <tr key={security.id} className="group hover:bg-forest-700/30 transition-colors">
                    <td className="py-5 pl-2">
                      <div>
                        <div className="text-white font-bold text-sm">{security.name}</div>
                        <div className="text-forest-400 text-xs mt-0.5">{security.symbol}</div>
                      </div>
                    </td>
                    <td className="py-5 text-right text-white font-medium text-sm">
                      {security.shares.toFixed(2)}
                    </td>
                    <td className="py-5 text-right text-white font-medium text-sm">
                      {formatCurrency(security.marketPrice)}
                    </td>
                    <td className="py-5 text-right text-white font-medium text-sm">
                      {formatCurrency(security.marketValue)}
                    </td>
                    <td className="py-5 text-right">
                      <span className={`font-medium text-sm ${security.change24h >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                        {security.change24h >= 0 ? '+' : ''}{security.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-5 pr-2 text-right">
                      <span className={`font-medium text-sm ${security.totalReturn >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                        {security.totalReturn >= 0 ? '+' : ''}{formatCurrency(security.totalReturn)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredSecurities.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-forest-400 italic">
                      No securities found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="py-12 text-center text-forest-400 italic">
            Trade history coming soon...
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="py-12 text-center text-forest-400 italic">
            Performance analytics coming soon...
          </div>
        )}
      </div>
    </div>
  );
};

// --- Gamification View Component ---

const GamificationView = ({ user, challenges, clerkUser, budgets }: { user: UserState, challenges: Challenge[], clerkUser: any, budgets: Budget[] }) => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'achievements' | 'leaderboards' | 'rewards'>('challenges');

  const currentLevel = calculateLevel(user.xp);
  const nextLevel = LEVEL_THRESHOLDS.find(l => l.level === currentLevel.level + 1);
  const progressPercent = nextLevel
    ? ((user.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100
    : 100;

  const dailyChallenges = challenges.filter(c => c.type === 'daily');
  const weeklyChallenges = challenges.filter(c => c.type === 'weekly');
  const monthlyChallenges = challenges.filter(c => c.type === 'monthly');

  const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
    const progressPercent = (challenge.progress / challenge.target) * 100;
    const canClaim = challenge.completed && progressPercent >= 100;

    return (
      <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl hover:border-forest-600 transition-colors">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${challenge.type === 'daily' ? 'bg-primary/20 text-primary' :
            challenge.type === 'weekly' ? 'bg-blue-500/20 text-blue-500' :
              'bg-purple-500/20 text-purple-500'
            }`}>
            {challenge.type === 'daily' && <Calendar size={24} />}
            {challenge.type === 'weekly' && <LayoutGrid size={24} />}
            {challenge.type === 'monthly' && <Target size={24} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-base mb-1">{challenge.title}</h4>
            <p className="text-forest-400 text-sm">{challenge.description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-forest-300">{challenge.progress} / {challenge.target}</span>
            <span className="text-primary font-bold">+{challenge.xpReward} XP</span>
          </div>
          <div className="w-full bg-forest-950 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${challenge.type === 'daily' ? 'bg-primary' :
                challenge.type === 'weekly' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            ></div>
          </div>
          <button
            disabled={!canClaim}
            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-colors ${canClaim
              ? 'bg-primary hover:bg-primary/90 text-forest-950'
              : 'bg-forest-900 text-forest-500 cursor-not-allowed'
              }`}
          >
            {canClaim ? 'Claim Rewards' : 'In Progress'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-1">Your Gamification Hub</h2>
        <p className="text-forest-400">Track your progress, earn badges, and complete challenges to level up your finances.</p>
      </div>

      {/* Level Card */}
      <div className="bg-forest-800 border border-forest-700 p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border-4 border-primary shrink-0">
            <img src={clerkUser?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clerkUser?.firstName || 'User'}`} alt="User" className="w-full h-full" />
          </div>
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-2xl font-bold text-white">Level {currentLevel.level} - {currentLevel.name}</h3>
                <p className="text-forest-400 text-sm">Keep up the great work!</p>
              </div>
              <div className="text-forest-300 text-sm font-medium">
                {user.xp} / {nextLevel?.minXP || currentLevel.maxXP} XP
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-forest-400">Progress to Next Level</div>
              <div className="w-full bg-forest-950 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-forest-900 p-1 rounded-xl w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'challenges'
            ? 'bg-forest-800 text-white border border-forest-700'
            : 'text-forest-400 hover:text-white'
            }`}
        >
          <Calendar className="inline mr-2" size={16} />
          Challenges
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'rewards'
            ? 'bg-forest-800 text-white border border-forest-700'
            : 'text-forest-400 hover:text-white'
            }`}
        >
          <Trophy className="inline mr-2" size={16} />
          Rewards
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'achievements'
            ? 'bg-forest-800 text-white border border-forest-700'
            : 'text-forest-400 hover:text-white'
            }`}
        >
          <Award className="inline mr-2" size={16} />
          Achievements
        </button>
        <button
          onClick={() => setActiveTab('leaderboards')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'leaderboards'
            ? 'bg-forest-800 text-white border border-forest-700'
            : 'text-forest-400 hover:text-white'
            }`}
        >
          <TrendingUp className="inline mr-2" size={16} />
          Leaderboards
        </button>
      </div>

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="space-y-8">
          {/* Daily Challenges */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Daily Challenges</h3>
              <span className="text-sm text-forest-400">Resets in 12 hours</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {dailyChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </div>

          {/* Weekly Challenges */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Weekly Challenges</h3>
              <span className="text-sm text-forest-400">Resets in 4 days</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {weeklyChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </div>

          {/* Monthly Challenges */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Monthly Challenges</h3>
              <span className="text-sm text-forest-400">Resets in 22 days</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {monthlyChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Budget Adherence Rewards</h3>
            <p className="text-forest-400 mb-6">
              Earn XP by staying within your budgets. The more categories you manage well, the more rewards you earn!
            </p>
            {clerkUser && (
              <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <p className="text-forest-400 text-center">Budget adherence rewards are tracked automatically. Keep your spending within budget limits to earn bonus XP!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="py-12 text-center text-forest-400 italic">
          Achievements coming soon...
        </div>
      )}

      {activeTab === 'leaderboards' && (
        <div className="py-12 text-center text-forest-400 italic">
          Leaderboards coming soon...
        </div>
      )}
    </div>
  );
};

// --- Goals View Component ---

const GoalsView = ({
  goals,
  onRemoveImage,
  onContribute,
  onDelete,
  onEdit,
  userBalance
}: {
  goals: SavingsGoal[];
  onRemoveImage: (goalId: string) => Promise<void>;
  onContribute: (goalId: string, amount: number) => Promise<void>;
  onDelete: (goalId: string) => Promise<void>;
  onEdit: (goalId: string, formData: any, imageFile: File | null) => Promise<void>;
  userBalance: number;
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed' | 'archived'>('all');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', targetAmount: '', deadline: '' });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredGoals = filterStatus === 'all'
    ? goals
    : goals.filter(g => g.status === filterStatus);

  const handleRemoveImage = async (goalId: string) => {
    setIsProcessing(true);
    try {
      await onRemoveImage(goalId);
      setShowRemoveConfirm(null);
    } catch (error) {
      console.error('Failed to remove image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContribute = async (goalId: string) => {
    const amount = parseFloat(contributionAmount);

    // Validate contribution amount is a valid number
    if (isNaN(amount)) {
      alert('Please enter a valid amount');
      return;
    }

    // Validate contribution amount is positive
    if (amount <= 0) {
      alert('Contribution amount must be greater than zero');
      return;
    }

    // Validate contribution amount is within available balance
    if (amount > userBalance) {
      alert(`Insufficient balance. Available: ${formatCurrency(userBalance)}`);
      return;
    }

    setIsProcessing(true);
    try {
      await onContribute(goalId, amount);
      setShowContributeModal(null);
      setContributionAmount('');
    } catch (error) {
      console.error('Failed to contribute:', error);
      alert('Failed to contribute. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const GoalCard = ({ goal }: { goal: SavingsGoal }) => {
    const progressPercent = (goal.currentAmount / goal.targetAmount) * 100;
    const isCompleted = progressPercent >= 100;
    const hasCustomImage = goal.imageUrl && !goal.imageUrl.includes('placeholder') && !goal.imageUrl.includes('default');

    return (
      <div className="flex flex-col rounded-3xl bg-forest-800 border border-forest-700 overflow-hidden hover:border-forest-600 transition-colors">
        <div className="relative">
          <div
            className="w-full bg-center bg-no-repeat aspect-video bg-cover"
            style={{ backgroundImage: `url("${goal.imageUrl}")` }}
          ></div>
          {hasCustomImage && (
            <button
              onClick={() => setShowRemoveConfirm(goal.id)}
              className="absolute top-2 right-2 p-2 rounded-lg bg-forest-950/80 hover:bg-forest-950 text-forest-400 hover:text-white transition-colors"
              title="Remove image"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex flex-col p-6 gap-4">
          <div className="flex justify-between items-start">
            <h3 className="text-white text-lg font-bold leading-tight flex-1">{goal.title}</h3>
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => {
                  setEditFormData({
                    title: goal.title,
                    targetAmount: goal.targetAmount.toString(),
                    deadline: new Date(goal.deadline).toISOString().split('T')[0]
                  });
                  setEditImageFile(null);
                  setEditImagePreview(null);
                  setShowEditModal(goal.id);
                }}
                className="p-1.5 rounded-lg bg-forest-700 hover:bg-blue-600 text-forest-400 hover:text-white transition-colors"
                title="Edit goal"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(goal.id)}
                className="p-1.5 rounded-lg bg-forest-700 hover:bg-red-600 text-forest-400 hover:text-white transition-colors"
                title="Delete goal"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-forest-400 text-sm font-normal">Progress</span>
              <span className="text-white text-sm font-bold">{Math.min(100, Math.round(progressPercent))}%</span>
            </div>
            <div className="rounded-full bg-forest-950 h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              ></div>
            </div>
            <div className="text-forest-400 text-sm font-normal text-right">
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {isCompleted ? (
              <div className="text-primary text-sm font-bold flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                Completed!
              </div>
            ) : (
              <span className="text-forest-400 text-sm font-normal">
                Est: {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
            <button
              onClick={() => !isCompleted && setShowContributeModal(goal.id)}
              disabled={isCompleted}
              className={`flex items-center justify-center rounded-xl h-8 px-4 text-sm font-medium transition-colors ${isCompleted
                ? 'bg-forest-900 text-forest-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-forest-950 cursor-pointer'
                }`}>
              {isCompleted ? 'View' : 'Contribute'}
            </button>
          </div>
        </div>

        {/* Remove Image Confirmation Modal */}
        {showRemoveConfirm === goal.id && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-forest-800 rounded-2xl p-6 max-w-md w-full border border-forest-700">
              <h3 className="text-xl font-bold text-white mb-4">Remove Image?</h3>
              <p className="text-forest-400 mb-6">
                Are you sure you want to remove the custom image from this goal? It will be replaced with the default image.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRemoveConfirm(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveImage(goal.id)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Delete Goal Confirmation Modal */}
        {showDeleteConfirm === goal.id && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-forest-800 rounded-2xl p-6 max-w-md w-full border border-forest-700">
              <h3 className="text-xl font-bold text-white mb-4">Delete Goal?</h3>
              <p className="text-forest-400 mb-6">
                Are you sure you want to delete "{goal.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      await onDelete(goal.id);
                      setShowDeleteConfirm(null);
                    } catch (error) {
                      console.error('Failed to delete goal:', error);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Goal Modal */}
        {showEditModal === goal.id && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-forest-800 rounded-2xl p-6 max-w-md w-full border border-forest-700">
              <h3 className="text-xl font-bold text-white mb-4">Edit Goal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-forest-400 text-sm mb-2">Goal Title</label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-forest-900 border border-forest-700 text-white focus:outline-none focus:border-primary"
                    placeholder="e.g., New Car"
                  />
                </div>
                <div>
                  <label className="block text-forest-400 text-sm mb-2">Target Amount</label>
                  <input
                    type="number"
                    value={editFormData.targetAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, targetAmount: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-forest-900 border border-forest-700 text-white focus:outline-none focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-forest-400 text-sm mb-2">Deadline</label>
                  <input
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-forest-900 border border-forest-700 text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-forest-400 text-sm mb-2">Goal Image (Optional)</label>
                  <div className="flex flex-col gap-2">
                    {editImagePreview && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden">
                        <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white cursor-pointer transition-colors">
                      <Upload size={16} />
                      <span>{editImageFile ? 'Change Image' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setEditImagePreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowEditModal(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      await onEdit(goal.id, editFormData, editImageFile);
                      setShowEditModal(null);
                      setEditImageFile(null);
                      setEditImagePreview(null);
                    } catch (error) {
                      console.error('Failed to edit goal:', error);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-forest-950 font-bold transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black text-white tracking-tight">My Savings Goals</h2>
          <p className="text-forest-400 text-base">Create and track your progress towards your financial goals.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`flex h-8 shrink-0 items-center justify-center gap-2 rounded-full px-4 transition-colors ${filterStatus === 'all'
            ? 'bg-primary/20 text-primary'
            : 'bg-forest-800 text-forest-400 hover:bg-forest-700 hover:text-white'
            }`}
        >
          <span className="text-sm font-medium">All Goals</span>
        </button>
        <button
          onClick={() => setFilterStatus('in-progress')}
          className={`flex h-8 shrink-0 items-center justify-center gap-2 rounded-full px-4 transition-colors ${filterStatus === 'in-progress'
            ? 'bg-primary/20 text-primary'
            : 'bg-forest-800 text-forest-400 hover:bg-forest-700 hover:text-white'
            }`}
        >
          <span className="text-sm font-medium">In Progress</span>
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`flex h-8 shrink-0 items-center justify-center gap-2 rounded-full px-4 transition-colors ${filterStatus === 'completed'
            ? 'bg-primary/20 text-primary'
            : 'bg-forest-800 text-forest-400 hover:bg-forest-700 hover:text-white'
            }`}
        >
          <span className="text-sm font-medium">Completed</span>
        </button>
        <button
          onClick={() => setFilterStatus('archived')}
          className={`flex h-8 shrink-0 items-center justify-center gap-2 rounded-full px-4 transition-colors ${filterStatus === 'archived'
            ? 'bg-primary/20 text-primary'
            : 'bg-forest-800 text-forest-400 hover:bg-forest-700 hover:text-white'
            }`}
        >
          <span className="text-sm font-medium">Archived</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {filteredGoals.map(goal => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        {filteredGoals.length === 0 && (
          <div className="col-span-2 py-12 text-center text-forest-400 italic">
            No goals found for this filter.
          </div>
        )}
      </div>

      {/* Contribute Modal - Outside of GoalCard to prevent re-renders */}
      {showContributeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-forest-800 rounded-2xl p-6 max-w-md w-full border border-forest-700">
            <h3 className="text-xl font-bold text-white mb-4">Contribute to {goals.find(g => g.id === showContributeModal)?.title}</h3>
            <div className="mb-4">
              <p className="text-forest-400 text-sm mb-2">Available Balance: {formatCurrency(userBalance)}</p>
              <p className="text-forest-400 text-sm mb-4">
                Goal Progress: {formatCurrency(goals.find(g => g.id === showContributeModal)?.currentAmount || 0)} / {formatCurrency(goals.find(g => g.id === showContributeModal)?.targetAmount || 0)}
              </p>
              <label className="block text-forest-400 text-sm mb-2">Contribution Amount</label>
              <input
                type="number"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-2 rounded-xl bg-forest-900 border border-forest-700 text-white focus:outline-none focus:border-primary"
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowContributeModal(null);
                  setContributionAmount('');
                }}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleContribute(showContributeModal)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-forest-950 font-bold transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Contribute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Settings View Component ---

const SettingsView = ({ userProfile, onUpdateProfile }: { userProfile: UserProfile, onUpdateProfile: (profile: UserProfile) => void }) => {
  const [activeSection, setActiveSection] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [currency, setCurrency] = useState(userProfile.currency);
  const [theme, setTheme] = useState(userProfile.theme);
  const [budgetAlerts, setBudgetAlerts] = useState(userProfile.budgetAlerts);

  const handleSaveProfile = () => {
    onUpdateProfile({
      ...userProfile,
      fullName,
      currency,
      theme,
      budgetAlerts
    });
  };

  return (
    <div className="flex flex-col md:flex-row w-full gap-8 max-w-full overflow-hidden">

      {/* Side Navigation */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <div className="flex flex-col gap-2 p-4 bg-forest-800 border border-forest-700 rounded-3xl">
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === 'profile'
              ? 'bg-primary/20 text-primary'
              : 'text-forest-300 hover:bg-forest-700 hover:text-white'
              }`}
          >
            <Settings size={20} className={activeSection === 'profile' ? 'fill-primary' : ''} />
            <span className="text-sm font-bold">Profile</span>
          </button>
          <button
            onClick={() => setActiveSection('preferences')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === 'preferences'
              ? 'bg-primary/20 text-primary'
              : 'text-forest-300 hover:bg-forest-700 hover:text-white'
              }`}
          >
            <Target size={20} />
            <span className="text-sm font-medium">Preferences</span>
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === 'security'
              ? 'bg-primary/20 text-primary'
              : 'text-forest-300 hover:bg-forest-700 hover:text-white'
              }`}
          >
            <AlertCircle size={20} />
            <span className="text-sm font-medium">Security</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="flex flex-col gap-8">

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="flex flex-col gap-6 p-6 bg-forest-800 border border-forest-700 rounded-3xl">
              <div className="flex flex-col gap-1 pb-4 border-b border-forest-700">
                <h2 className="text-2xl font-bold text-white">Profile</h2>
                <p className="text-forest-400 text-base">Update your photo and personal details here.</p>
              </div>

              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
                <div className="flex gap-4 items-center">
                  <div
                    className="w-24 h-24 rounded-full bg-center bg-cover border-4 border-forest-700"
                    style={{ backgroundImage: `url("${userProfile.avatarUrl}")` }}
                  ></div>
                  <div className="flex flex-col justify-center">
                    <p className="text-white text-xl font-bold">{userProfile.fullName}</p>
                    <p className="text-forest-400 text-base">
                      Joined on {new Date(userProfile.joinedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button className="flex items-center justify-center rounded-xl h-10 px-4 bg-forest-900 hover:bg-forest-700 text-white text-sm font-bold transition-colors whitespace-nowrap">
                  Upload new photo
                </button>
              </div>

              {/* Profile Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                <div className="flex flex-col">
                  <label className="flex flex-col">
                    <span className="text-white text-sm font-medium mb-2">Full Name</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </div>
                <div className="flex flex-col">
                  <label className="flex flex-col">
                    <span className="text-white text-sm font-medium mb-2">Email Address</span>
                    <input
                      type="email"
                      value={userProfile.email}
                      readOnly
                      className="w-full bg-forest-900 border border-forest-700 rounded-xl py-3 px-4 text-forest-400 cursor-not-allowed"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end p-4 border-t border-forest-700">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center justify-center rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-forest-950 text-sm font-bold transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <div className="flex flex-col gap-6 p-6 bg-forest-800 border border-forest-700 rounded-3xl">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-white">Preferences</h2>
                <p className="text-forest-400 text-base">Manage your currency, theme, and notification settings.</p>
              </div>

              <div className="flex flex-col gap-6 p-4 border-t border-forest-700">
                {/* Currency Dropdown */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-white font-medium">Default Currency</p>
                    <p className="text-forest-400 text-sm">Choose your primary currency for reports and budgets.</p>
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full md:w-52 bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="USD">USD - United States Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <hr className="border-forest-700" />

                {/* Theme Toggle */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-white font-medium">Theme</p>
                    <p className="text-forest-400 text-sm">Switch between light and dark mode.</p>
                  </div>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-forest-700'
                      }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                <hr className="border-forest-700" />

                {/* Budget Alerts Toggle */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-white font-medium">Budget Alerts</p>
                    <p className="text-forest-400 text-sm">Get notified when you're nearing a budget limit.</p>
                  </div>
                  <button
                    onClick={() => setBudgetAlerts(!budgetAlerts)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${budgetAlerts ? 'bg-primary' : 'bg-forest-700'
                      }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${budgetAlerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end p-4 border-t border-forest-700">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center justify-center rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-forest-950 text-sm font-bold transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="flex flex-col gap-6 p-6 bg-forest-800 border border-forest-700 rounded-3xl">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-white">Security & Privacy</h2>
                <p className="text-forest-400 text-base">Manage your password and account security.</p>
              </div>

              <div className="flex flex-col gap-6 p-4 border-t border-forest-700">
                {/* Change Password */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-white font-medium">Password</p>
                    <p className="text-forest-400 text-sm">
                      Last changed on {new Date(userProfile.lastPasswordChange).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <button className="flex items-center justify-center rounded-xl h-10 px-4 bg-forest-900 hover:bg-forest-700 text-white text-sm font-bold transition-colors whitespace-nowrap">
                    Change Password
                  </button>
                </div>

                <hr className="border-forest-700" />

                {/* 2FA */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-white font-medium">Two-Factor Authentication</p>
                    <p className="text-forest-400 text-sm">Add an extra layer of security to your account.</p>
                  </div>
                  <button className="flex items-center justify-center rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-forest-950 text-sm font-bold transition-colors whitespace-nowrap">
                    {userProfile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="flex flex-col p-4 border-t border-rose-500/20 bg-rose-500/5 mt-8 rounded-b-3xl">
                <p className="text-white font-medium">Delete Account</p>
                <p className="text-forest-400 text-sm mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button className="text-rose-500 text-sm font-bold self-start hover:underline">
                  I want to delete my account
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- Accounts View Component ---

const AccountsView = ({ accounts, onAddAccount, onEditAccount, metrics }: { accounts: Account[], onAddAccount: () => void, onEditAccount: (account: Account) => void, metrics: FinancialMetrics | null }) => {
  const [assetsExpanded, setAssetsExpanded] = useState(true);
  const [liabilitiesExpanded, setLiabilitiesExpanded] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const assets = accounts.filter(a => a.type === 'asset');
  const liabilities = accounts.filter(a => a.type === 'liability');

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const formatSyncTime = (lastSynced: string) => {
    const now = new Date();
    const synced = new Date(lastSynced);
    const diffMs = now.getTime() - synced.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Synced ${diffMins}m ago`;
    if (diffHours < 24) return `Synced ${diffHours}h ago`;
    return `Synced ${diffDays}d ago`;
  };

  const AccountItem = ({ account }: { account: Account }) => {
    return (
      <div className="group flex items-center justify-between gap-4 py-4 hover:bg-forest-700/30 -mx-4 px-4 transition-colors rounded-xl">
        <div className="flex items-center gap-4 flex-1">
          <div
            className="w-12 h-12 rounded-xl bg-center bg-cover border border-forest-700 shrink-0"
            style={{ backgroundImage: `url("${account.logoUrl}")` }}
          ></div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <p className="text-base font-medium text-white truncate">{account.name}</p>
            <p className="text-sm text-forest-300 truncate">{account.institution}</p>
            <p className={`text-sm font-normal ${account.syncStatus === 'error' ? 'text-rose-500' : 'text-forest-400'}`}>
              {account.syncStatus === 'error' ? 'Sync error' : formatSyncTime(account.lastSynced)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">

          <>
            <p className="text-base font-semibold text-white">{formatCurrency(account.balance)}</p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEditAccount(account)}
                className="p-1.5 text-forest-400 hover:text-primary hover:bg-forest-800 rounded-lg transition-colors"
                title="Edit account"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeleteConfirm(account.id || (account as any)._id)}
                className="p-1.5 text-forest-400 hover:text-rose-500 hover:bg-forest-800 rounded-lg transition-colors"
                title="Delete account"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>

        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-hidden">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-white tracking-tight">Accounts</h1>
          <p className="text-forest-400 text-base">A complete overview of your assets and liabilities.</p>
        </div>
        <button
          onClick={onAddAccount}
          className="flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-forest-950 text-sm font-bold whitespace-nowrap"
        >
          <Plus size={18} strokeWidth={3} />
          Add Account
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 rounded-3xl border border-forest-700 bg-forest-800 p-6">
          <p className="text-base font-medium text-white">Total Assets</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalAssets)}</p>
          {/* Historical tracking not yet implemented */}
        </div>
        <div className="flex flex-col gap-2 rounded-3xl border border-forest-700 bg-forest-800 p-6">
          <p className="text-base font-medium text-white">Total Liabilities</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalLiabilities)}</p>
          {/* Historical tracking not yet implemented */}
        </div>
        <div className="flex flex-col gap-2 rounded-3xl border border-forest-700 bg-forest-800 p-6">
          <p className="text-base font-medium text-white">Net Worth</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(netWorth)}</p>
          {metrics && (
            <p className={`text-sm font-medium ${metrics.monthlySavings >= 0 ? 'text-primary' : 'text-rose-500'}`}>
              {metrics.monthlySavings >= 0 ? '+' : ''}{formatCurrency(metrics.monthlySavings)} this month
            </p>
          )}
        </div>
      </div>

      {/* Accounts Sections */}
      <div className="flex flex-col gap-6">

        {/* Assets */}
        <div className="flex flex-col rounded-3xl border border-forest-700 bg-forest-800">
          <div className="p-6">
            <button
              onClick={() => setAssetsExpanded(!assetsExpanded)}
              className="flex w-full cursor-pointer items-center justify-between gap-6 py-2"
            >
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-bold text-white">Assets</h2>
                <p className="text-base font-medium text-forest-400">{formatCurrency(totalAssets)}</p>
              </div>
              <ChevronRight
                size={24}
                className={`text-forest-400 transition-transform duration-300 ${assetsExpanded ? 'rotate-90' : ''
                  }`}
              />
            </button>

            {assetsExpanded && (
              <div className="mt-4 flex flex-col divide-y divide-forest-700/50">
                {assets.map(account => (
                  <AccountItem key={account.id} account={account} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Liabilities */}
        <div className="flex flex-col rounded-3xl border border-forest-700 bg-forest-800">
          <div className="p-6">
            <button
              onClick={() => setLiabilitiesExpanded(!liabilitiesExpanded)}
              className="flex w-full cursor-pointer items-center justify-between gap-6 py-2"
            >
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-bold text-white">Liabilities</h2>
                <p className="text-base font-medium text-forest-400">{formatCurrency(totalLiabilities)}</p>
              </div>
              <ChevronRight
                size={24}
                className={`text-forest-400 transition-transform duration-300 ${liabilitiesExpanded ? 'rotate-90' : ''
                  }`}
              />
            </button>

            {liabilitiesExpanded && (
              <div className="mt-4 flex flex-col divide-y divide-forest-700/50">
                {liabilities.map(account => (
                  <AccountItem key={account.id} account={account} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-forest-800 rounded-2xl p-6 max-w-md w-full border border-forest-700">
            <h3 className="text-xl font-bold text-white mb-4">Delete Account?</h3>
            <p className="text-forest-400 mb-6">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



// --- Budgets View Component ---

const BudgetsView = ({ budgets, onAdd, onUpdate }: { budgets: Budget[], onAdd: () => void, onUpdate: (id: string, updates: Partial<Budget>) => Promise<void> }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editedLimit, setEditedLimit] = useState<string>('');

  // Calculate totals for summary cards
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudgeted - totalSpent;

  const handleEditClick = (budget: Budget) => {
    setEditingBudgetId(budget.id);
    setEditedLimit(budget.limit.toString());
  };

  const handleCancelEdit = () => {
    setEditingBudgetId(null);
    setEditedLimit('');
  };

  const handleSaveEdit = async (budgetId: string) => {
    const newLimit = parseFloat(editedLimit);

    // Validate budget limit is positive
    if (isNaN(newLimit)) {
      alert('Please enter a valid number');
      return;
    }

    if (newLimit <= 0) {
      alert('Budget limit must be greater than zero');
      return;
    }

    await onUpdate(budgetId, { limit: newLimit });
    setEditingBudgetId(null);
    setEditedLimit('');
  };

  // Icon mapping
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'cart': return <ShoppingCart size={24} />;
      case 'bus': return <Bus size={24} />;
      case 'film': return <Film size={24} />;
      case 'zap': return <Zap size={24} />;
      case 'bag': return <ShoppingBag size={24} />;
      default: return <Wallet size={24} />;
    }
  };

  // Color mapping based on icon/category logic
  const getIconColor = (iconName: string) => {
    switch (iconName) {
      case 'cart': return 'bg-emerald-500/20 text-emerald-500';
      case 'bus': return 'bg-rose-500/20 text-rose-500'; // Reddish for contrast in demo
      case 'film': return 'bg-purple-500/20 text-purple-500';
      case 'zap': return 'bg-yellow-500/20 text-yellow-500';
      case 'bag': return 'bg-blue-500/20 text-blue-500';
      default: return 'bg-forest-700 text-forest-300';
    }
  };

  const filteredBudgets = budgets.filter(b =>
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">

      {/* Top Section: Header & Summary Cards */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Monthly Budgets</h2>
            <p className="text-forest-400">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-2.5 px-5 rounded-xl transition-colors"
          >
            <Plus size={18} strokeWidth={3} /> Add New Budget
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div key="total-budgeted" className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
            <div className="text-forest-300 text-sm font-medium mb-1">Total Planned Budget</div>
            <div className="text-3xl font-bold text-white">{formatCurrency(totalBudgeted)}</div>
          </div>
          <div key="total-spent" className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
            <div className="text-forest-300 text-sm font-medium mb-1">Total Spent</div>
            <div className="text-3xl font-bold text-white">{formatCurrency(totalSpent)}</div>
          </div>
          <div key="remaining" className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
            <div className="text-forest-300 text-sm font-medium mb-1">Remaining</div>
            <div className={`text-3xl font-bold ${remaining >= 0 ? 'text-primary' : 'text-rose-500'}`}>
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Recommendations Section */}
      {showRecommendations && (
        <div className="bg-forest-900/50 border border-forest-700 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Smart Budget Recommendations</h3>
            <button
              onClick={() => setShowRecommendations(false)}
              className="text-forest-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <BudgetRecommendations />
        </div>
      )}

      {/* Main Grid Section */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Your Budgets</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={16} />
            <input
              type="text"
              placeholder="Find a budget category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-forest-800 border border-forest-700 rounded-xl py-2 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-primary w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBudgets.map((budget, index) => {
            const isEditing = editingBudgetId === budget.id;
            const displayLimit = isEditing ? parseFloat(editedLimit) || budget.limit : budget.limit;
            const percent = Math.min(100, Math.round((budget.spent / displayLimit) * 100));
            const isOver = budget.spent > displayLimit;
            const isWarning = !isOver && percent > 80;
            const overAmount = budget.spent - displayLimit;
            const leftAmount = displayLimit - budget.spent;

            let statusColor = 'bg-primary';
            if (isOver) statusColor = 'bg-rose-500';
            else if (isWarning) statusColor = 'bg-amber-500';

            return (
              <div key={budget.id || `budget-${index}`} className="bg-forest-800 border border-forest-700 p-6 rounded-3xl hover:border-forest-600 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getIconColor(budget.icon)}`}>
                      {getIcon(budget.icon)}
                    </div>
                    <span className="font-bold text-lg text-white">{budget.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => handleEditClick(budget)}
                        className="text-forest-400 hover:text-primary transition-colors p-1"
                        title="Edit budget"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {isOver && <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">error</span>}
                    {isWarning && <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">warning</span>}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mb-4">
                    <label className="text-forest-300 text-sm mb-2 block">Budget Limit</label>
                    <input
                      type="number"
                      value={editedLimit}
                      onChange={(e) => setEditedLimit(e.target.value)}
                      className="w-full bg-forest-900 border border-forest-700 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-primary"
                      placeholder="Enter new limit"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleSaveEdit(budget.id || (budget as any)._id)}
                        className="flex-1 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-2 px-4 rounded-xl transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 bg-forest-700 hover:bg-forest-600 text-white font-bold py-2 px-4 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 w-full bg-forest-950 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full ${statusColor}`} style={{ width: `${percent}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <div className="text-forest-300">
                        Spent <span className="text-white font-medium">{formatCurrency(budget.spent)}</span> of {formatCurrency(displayLimit)}
                      </div>
                      <div className={`font-bold ${isOver ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-primary'}`}>
                        {isOver ? `-${formatCurrency(overAmount)} Over` : `${Math.round((leftAmount / displayLimit) * 100)}% Left`}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Add New Placeholder Card */}
          <button
            onClick={onAdd}
            className="border-2 border-dashed border-forest-700 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-forest-400 hover:text-white hover:border-forest-500 hover:bg-forest-800/30 transition-all group min-h-[180px]"
          >
            <div className="w-14 h-14 rounded-full bg-forest-900 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle size={32} className="text-primary" />
            </div>
            <span className="font-medium">Add a new budget category</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // --- State & Setup ---
  const { user: clerkUser } = useUser();
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal States
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountData, setEditingAccountData] = useState<Account | undefined>(undefined);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<Array<{ name: string; type: 'income' | 'expense' }>>([]);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, success, error: showError, closeToast } = useToast();

  const [user, setUser] = useState<UserState>({ xp: 0, level: 1, streak: 0, badges: 0, currency: 'KES', monthlyIncome: 0 });

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Budgets Data
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Securities Data
  const [securities, setSecurities] = useState<Security[]>([]);

  // Challenges Data
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // Savings Goals Data
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  // User Profile Data
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: 'User',
    email: 'user@email.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
    joinedDate: '2023-01-15',
    currency: 'KES',
    theme: 'dark',
    budgetAlerts: true,
    lastPasswordChange: '2024-02-20',
    twoFactorEnabled: false
  });

  // Accounts Data
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Recurring Transactions Data
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);

  // Notification Preferences Modal
  const [isNotificationPrefsOpen, setIsNotificationPrefsOpen] = useState(false);

  // XP Reward Notification
  const [xpReward, setXpReward] = useState<XPRewardData | null>(null);

  // Financial Metrics
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Alerts
  const alerts: Alert[] = useMemo(() => {
    const newAlerts: Alert[] = [];
    const now = new Date();

    // 1. Budget Alerts
    budgets.forEach(budget => {
      const percentage = (budget.spent / budget.limit) * 100;
      if (percentage >= 100) {
        newAlerts.push({
          id: `budget-over-${budget.id}`,
          title: 'Budget Exceeded',
          message: `You've exceeded your ${budget.category} budget by ${formatCurrency(budget.spent - budget.limit)}.`,
          type: 'danger',
          time: 'Just now'
        });
      } else if (percentage >= 80) {
        newAlerts.push({
          id: `budget-warn-${budget.id}`,
          title: 'Budget Warning',
          message: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget.`,
          type: 'warning',
          time: 'Today'
        });
      }
    });

    // 2. Goal Achievements
    savingsGoals.forEach(goal => {
      if (goal.currentAmount >= goal.targetAmount && goal.status !== 'completed') {
        newAlerts.push({
          id: `goal-reached-${goal.id}`,
          title: 'Goal Reached!',
          message: `Congratulations! You've reached your savings goal for ${goal.title}.`,
          type: 'success',
          time: 'Today'
        });
      }
    });

    // 3. Recurring Transactions Due Soon
    recurringTransactions.forEach(rt => {
      if (!rt.isActive) return;
      const nextDate = new Date(rt.nextOccurrence);
      const diffTime = nextDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 3) {
        newAlerts.push({
          id: `recurring-due-${rt.id}`,
          title: 'Upcoming Payment',
          message: `${rt.description} (${formatCurrency(rt.amount)}) is due ${diffDays === 0 ? 'today' : `in ${diffDays} days`}.`,
          type: 'info',
          time: diffDays === 0 ? 'Today' : `${diffDays} days left`
        });
      }
    });

    // 4. Large Transactions (last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(now.getDate() - 3);

    transactions.forEach(t => {
      const txDate = new Date(t.date);
      if (txDate >= threeDaysAgo && t.amount > 5000) {
        newAlerts.push({
          id: `large-tx-${t.id}`,
          title: 'Large Transaction',
          message: `A large ${t.type} of ${formatCurrency(t.amount)} was recorded for ${t.category}.`,
          type: 'info',
          time: txDate.toLocaleDateString() === now.toLocaleDateString() ? 'Today' : 'Recent'
        });
      }
    });

    return newAlerts.slice(0, 5); // Show top 5 alerts
  }, [budgets, savingsGoals, recurringTransactions, transactions]);

  const snapshot: FinancialSnapshot = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, savingsRate: 0 };
  }, [transactions]);

  const expensesByCategory = useMemo(() =>
    transactions.filter(t => t.type === 'expense')
      .reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {})
    , [transactions]);

  const recentTransactions = useMemo(() =>
    transactions.slice(0, 10)
    , [transactions]);

  // Update user profile when Clerk user changes
  useEffect(() => {
    if (clerkUser) {
      setUserProfile({
        fullName: clerkUser.fullName || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || 'user@email.com',
        avatarUrl: clerkUser.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clerkUser.firstName || 'User'}`,
        joinedDate: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString().split('T')[0] : '2023-01-15',
        currency: 'KES',
        theme: 'dark',
        budgetAlerts: true,
        lastPasswordChange: '2024-02-20',
        twoFactorEnabled: false
      });
    }
  }, [clerkUser]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'n', ctrl: true, action: () => setActiveView('transactions') },
    { key: 'b', ctrl: true, action: () => setActiveView('budgets') },
    { key: 'd', ctrl: true, action: () => setActiveView('dashboard') },
    { key: 'g', ctrl: true, action: () => setActiveView('goals') },
    { key: 's', ctrl: true, action: () => setActiveView('settings') },
  ]);

  // Periodic sync every 5 minutes
  useEffect(() => {
    if (!clerkUser) return;

    const syncData = async () => {
      try {
        const [txs, bgs, gls, accs, recTxs] = await Promise.all([
          getTransactions(clerkUser.id),
          getBudgets(clerkUser.id),
          getGoals(clerkUser.id),
          getAccounts(clerkUser.id),
          getRecurringTransactions(clerkUser.id)
        ]);

        const goalsWithId = gls.map((g: any) => ({ ...g, id: g.id || g._id }));
        setTransactions(txs);
        setBudgets(bgs);
        setSavingsGoals(goalsWithId);
        setAccounts(accs);
        setRecurringTransactions(recTxs);

        cache.set(`transactions_${clerkUser.id}`, txs);
        cache.set(`budgets_${clerkUser.id}`, bgs);
        cache.set(`goals_${clerkUser.id}`, gls);
        cache.set(`accounts_${clerkUser.id}`, accs);
        cache.set(`recurring_${clerkUser.id}`, recTxs);
      } catch (err) {
        console.error('Sync failed:', err);
      }
    };

    const interval = setInterval(syncData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [clerkUser]);

  // Fetch Financial Metrics
  const fetchMetrics = async () => {
    if (!clerkUser) return;
    setMetricsLoading(true);
    setMetricsError(null);

    try {
      const response = await getMetrics(clerkUser.id);
      setFinancialMetrics(response.metrics);
      cache.set(`metrics_${clerkUser.id}`, response.metrics);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setMetricsError('Failed to load financial metrics');
      // Try to use cached metrics
      const cachedMetrics = cache.get<FinancialMetrics>(`metrics_${clerkUser.id}`);
      if (cachedMetrics) {
        setFinancialMetrics(cachedMetrics);
      }
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch Data on Load
  useEffect(() => {
    if (clerkUser) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        // Try to load from cache first
        const cachedTransactions = cache.get<Transaction[]>(`transactions_${clerkUser.id}`);
        const cachedBudgets = cache.get<Budget[]>(`budgets_${clerkUser.id}`);
        const cachedGoals = cache.get<SavingsGoal[]>(`goals_${clerkUser.id}`);
        const cachedAccounts = cache.get<Account[]>(`accounts_${clerkUser.id}`);
        const cachedRecTxs = cache.get<RecurringTransaction[]>(`recurring_${clerkUser.id}`);
        const cachedCustomCategories = cache.get<Array<{ name: string; type: 'income' | 'expense' }>>(`customCategories_${clerkUser.id}`);
        const cachedMetrics = cache.get<FinancialMetrics>(`metrics_${clerkUser.id}`);

        if (cachedTransactions) {
          // Ensure cached transactions have id
          const sanitizedCache = cachedTransactions.map((t: any) => ({ ...t, id: t.id || t._id }));
          setTransactions(sanitizedCache);
        }
        if (cachedCustomCategories) setCustomCategories(cachedCustomCategories);
        if (cachedBudgets) setBudgets(cachedBudgets);
        if (cachedGoals) setSavingsGoals(cachedGoals);
        if (cachedAccounts) setAccounts(cachedAccounts);
        if (cachedRecTxs) setRecurringTransactions(cachedRecTxs);
        if (cachedMetrics) setFinancialMetrics(cachedMetrics);

        try {
          // Sync User
          const userData = await getUser(
            clerkUser.id,
            clerkUser.primaryEmailAddress?.emailAddress,
            clerkUser.fullName || ''
          );
          setUser(prev => ({ ...prev, ...userData }));

          // Fetch Resources
          const [txs, bgs, gls, accs, recTxs, customCats] = await Promise.all([
            getTransactions(clerkUser.id),
            getBudgets(clerkUser.id),
            getGoals(clerkUser.id),
            getAccounts(clerkUser.id),
            getRecurringTransactions(clerkUser.id),
            getCustomCategories(clerkUser.id)
          ]);

          // Ensure all transactions have id field (MongoDB returns _id)
          const transactionsWithId = txs.map((t: any) => ({ ...t, id: t.id || t._id }));
          const goalsWithId = gls.map((g: any) => ({ ...g, id: g.id || g._id }));

          // Update state and cache
          setTransactions(transactionsWithId);
          setBudgets(bgs);
          setSavingsGoals(goalsWithId);
          setAccounts(accs);
          setRecurringTransactions(recTxs);
          setCustomCategories(customCats);

          cache.set(`transactions_${clerkUser.id}`, transactionsWithId);
          cache.set(`budgets_${clerkUser.id}`, bgs);
          cache.set(`goals_${clerkUser.id}`, gls);
          cache.set(`accounts_${clerkUser.id}`, accs);
          cache.set(`recurring_${clerkUser.id}`, recTxs);
          cache.set(`customCategories_${clerkUser.id}`, customCats);

          // Fetch metrics after other data is loaded
          await fetchMetrics();

          setIsLoading(false);
        } catch (err) {
          console.error("Failed to fetch data:", err);
          // If we have cached data, don't show error
          if (!cachedTransactions && !cachedBudgets) {
            setError("Failed to load your financial data. Please try again.");
            showError("Failed to load your financial data. Please try again.");
          } else {
            showError("Using cached data. Some information may be outdated.");
          }
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [clerkUser, showError]);

  // Handlers
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (!clerkUser) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticTx = { ...newTx, id: tempId };
    setTransactions(prev => [optimisticTx as Transaction, ...prev]);

    try {
      const response = await createTransaction({
        ...newTx,
        userId: clerkUser.id
      });

      const savedTx = response.transaction || response;
      const xpRewardData = response.xpReward;

      // Ensure transaction has id field (MongoDB returns _id)
      if (savedTx._id && !savedTx.id) {
        savedTx.id = savedTx._id;
      }

      setTransactions(prev => prev.map(t => t.id === tempId ? savedTx : t));
      cache.set(`transactions_${clerkUser.id}`, [savedTx, ...transactions.filter(t => t.id !== tempId)]);

      // Track custom category
      if (!CategoriesList.includes(newTx.category as any) && !customCategories.find(c => c.name === newTx.category)) {
        const updated = await addCustomCategory(clerkUser.id, newTx.category, newTx.type);
        setCustomCategories(updated);
        cache.set(`customCategories_${clerkUser.id}`, updated);
      }

      // Update budgets spent amount
      const categoryBudget = budgets.find(b => b.category === newTx.category);
      if (categoryBudget && newTx.type === 'expense') {
        const updatedBudgets = budgets.map(b =>
          b.id === categoryBudget.id
            ? { ...b, spent: b.spent + newTx.amount }
            : b
        );
        setBudgets(updatedBudgets);
        cache.set(`budgets_${clerkUser.id}`, updatedBudgets);
      }

      // Update user XP and streak
      if (xpRewardData) {
        setUser(prev => ({
          ...prev,
          xp: prev.xp + xpRewardData.totalXP,
          streak: xpRewardData.newStreak || prev.streak
        }));

        // Show XP reward notification
        setXpReward({
          baseXP: xpRewardData.baseXP || 10,
          sameDayBonus: xpRewardData.sameDayBonus || 0,
          streakBonus: xpRewardData.streakBonus || 0,
          totalXP: xpRewardData.totalXP,
          newStreak: xpRewardData.newStreak || 0,
          isSameDay: xpRewardData.isSameDay || false
        });
      } else {
        setUser(prev => ({ ...prev, xp: prev.xp + XP_REWARDS.ADD_TRANSACTION }));
      }

      // Refresh metrics
      await fetchMetrics();

      success('Transaction added successfully!');
    } catch (err) {
      setTransactions(prev => prev.filter(t => t.id !== tempId));
      showError('Failed to add transaction. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!clerkUser) return;
    try {
      const updated = await deleteCustomCategory(clerkUser.id, categoryName);
      setCustomCategories(updated);
      cache.set(`customCategories_${clerkUser.id}`, updated);
      success('Category deleted successfully!');
    } catch (err) {
      showError('Failed to delete category.');
    }
  };

  const handleDeleteDefaultCategory = async (categoryName: string) => {
    if (!clerkUser) return;
    try {
      // Remove from CategoriesList
      const index = CategoriesList.indexOf(categoryName as any);
      if (index > -1) {
        CategoriesList.splice(index, 1);
      }
      success(`"${categoryName}" removed from default categories!`);
    } catch (err) {
      showError('Failed to delete default category.');
    }
  };

  const handleAddToDefault = async (categoryName: string) => {
    if (!clerkUser) return;
    try {
      // Add to CategoriesList by updating types
      if (!CategoriesList.includes(categoryName as any)) {
        CategoriesList.push(categoryName as any);
      }
      // Remove from custom categories
      const updated = await deleteCustomCategory(clerkUser.id, categoryName);
      setCustomCategories(updated);
      cache.set(`customCategories_${clerkUser.id}`, updated);
      success(`"${categoryName}" added to default categories!`);
    } catch (err) {
      showError('Failed to add to default categories.');
    }
  };

  const handleAddCategory = async (name: string, type: 'income' | 'expense') => {
    if (!clerkUser) return;
    try {
      const updated = await addCustomCategory(clerkUser.id, name, type);
      setCustomCategories(updated);
      cache.set(`customCategories_${clerkUser.id}`, updated);
      success(`Category "${name}" added successfully!`);
    } catch (err) {
      showError('Failed to add category.');
    }
  };

  const handleAddBudget = async (newBudget: any) => {
    if (!clerkUser) return;
    try {
      const savedBudget = await createBudget({ ...newBudget, userId: clerkUser.id, spent: 0 });
      const updatedBudgets = [...budgets, savedBudget];
      setBudgets(updatedBudgets);
      cache.set(`budgets_${clerkUser.id}`, updatedBudgets);
      success('Budget created successfully!');
      setIsBudgetModalOpen(false);
    } catch (err) {
      showError('Failed to create budget. Please try again.');
    }
  };

  const handleUpdateBudget = async (id: string, updates: Partial<Budget>) => {
    if (!clerkUser) return;
    try {
      // API call
      await updateBudget(id, updates);

      // Re-fetch budgets to get updated data
      const updatedBudgets = await getBudgets(clerkUser.id);
      setBudgets(updatedBudgets);
      cache.set(`budgets_${clerkUser.id}`, updatedBudgets);

      // Refresh metrics
      await fetchMetrics();

      success('Budget updated successfully!');
    } catch (err) {
      showError('Failed to update budget. Please try again.');
    }
  };

  const handleAddGoal = async (newGoal: any) => {
    if (!clerkUser) return;
    try {
      const savedGoal = await createGoal({ ...newGoal, userId: clerkUser.id });
      const updatedGoals = [...savingsGoals, savedGoal];
      setSavingsGoals(updatedGoals);
      cache.set(`goals_${clerkUser.id}`, updatedGoals);
      success('Goal created successfully!');
      setIsGoalModalOpen(false);
    } catch (err) {
      showError('Failed to create goal. Please try again.');
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<SavingsGoal>) => {
    if (!clerkUser) return;

    // Store original goal for rollback
    const originalGoal = savingsGoals.find(g => g.id === goalId);
    if (!originalGoal) return;

    // Optimistic update
    const optimisticGoals = savingsGoals.map(g =>
      g.id === goalId ? { ...g, ...updates } : g
    );
    setSavingsGoals(optimisticGoals);

    try {
      await updateGoal(goalId, updates);
      cache.set(`goals_${clerkUser.id}`, optimisticGoals);
      success('Goal updated successfully!');
    } catch (err) {
      // Rollback on error
      setSavingsGoals(prev => prev.map(g =>
        g.id === goalId ? originalGoal : g
      ));
      showError('Failed to update goal. Please try again.');
    }
  };

  const handleRemoveGoalImage = async (goalId: string) => {
    if (!clerkUser) return;

    // Store original goal for rollback
    const originalGoal = savingsGoals.find(g => g.id === goalId);
    if (!originalGoal) return;

    // Optimistic update - immediately show default image
    const defaultImageUrl = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400';
    const optimisticGoals = savingsGoals.map(g =>
      g.id === goalId ? { ...g, imageUrl: defaultImageUrl } : g
    );
    setSavingsGoals(optimisticGoals);

    try {
      const result = await removeGoalImage(goalId, clerkUser.id);
      const updatedGoals = savingsGoals.map(g =>
        g.id === goalId ? { ...g, imageUrl: result.defaultImageUrl || defaultImageUrl } : g
      );
      setSavingsGoals(updatedGoals);
      cache.set(`goals_${clerkUser.id}`, updatedGoals);
      success('Image removed successfully!');
    } catch (err) {
      // Rollback on error
      setSavingsGoals(prev => prev.map(g =>
        g.id === goalId ? originalGoal : g
      ));
      showError('Failed to remove image. Please try again.');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!clerkUser) return;

    try {
      await deleteGoal(goalId, clerkUser.id);
      const updatedGoals = savingsGoals.filter(g => g.id !== goalId);
      setSavingsGoals(updatedGoals);
      cache.set(`goals_${clerkUser.id}`, updatedGoals);
      success('Goal deleted successfully!');
    } catch (err) {
      showError('Failed to delete goal. Please try again.');
    }
  };

  const handleEditGoal = async (goalId: string, formData: any, imageFile: File | null) => {
    if (!clerkUser) return;

    try {
      const updates = {
        userId: clerkUser.id,
        title: formData.title,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline
      };
      const updatedGoal = await updateGoal(goalId, updates);

      // Upload image if selected
      if (imageFile) {
        const imageResult = await uploadGoalImage(goalId, clerkUser.id, imageFile);
        updatedGoal.imageUrl = imageResult.imageUrl;
      }

      const updatedGoals = savingsGoals.map(g => g.id === goalId ? { ...g, ...updatedGoal } : g);
      setSavingsGoals(updatedGoals);
      cache.set(`goals_${clerkUser.id}`, updatedGoals);
      success('Goal updated successfully!');
    } catch (err) {
      showError('Failed to update goal. Please try again.');
    }
  };

  const handleContributeToGoal = async (goalId: string, amount: number) => {
    if (!clerkUser) return;

    // Store original state for rollback
    const originalGoal = savingsGoals.find(g => g.id === goalId);
    const originalUser = { ...user };
    if (!originalGoal) return;

    // Optimistic update - immediately update goal progress and user balance
    const optimisticGoals = savingsGoals.map(g =>
      g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
    );
    setSavingsGoals(optimisticGoals);

    // Optimistically update user balance
    setUser(prev => ({
      ...prev,
      totalBalance: (prev.totalBalance || 0) - amount
    }));

    try {
      const result = await contributeToGoal(goalId, amount, clerkUser.id);
      const updatedGoals = savingsGoals.map(g =>
        g.id === goalId ? result.goal : g
      );
      setSavingsGoals(updatedGoals);
      cache.set(`goals_${clerkUser.id}`, updatedGoals);

      // Update user balance and XP with actual values from server
      setUser(prev => ({
        ...prev,
        totalBalance: result.newBalance,
        xp: result.xpReward?.newXP || prev.xp,
        level: result.xpReward?.newLevel || prev.level
      }));

      // Refresh metrics
      await fetchMetrics();

      success(`Contributed ${formatCurrency(amount)} to goal! ${result.xpReward ? `+${result.xpReward.amount} XP` : ''}`);
    } catch (err: any) {
      // Rollback on error
      setSavingsGoals(prev => prev.map(g =>
        g.id === goalId ? originalGoal : g
      ));
      setUser(originalUser);

      const errorMessage = err?.response?.data?.error || 'Failed to contribute. Please try again.';
      showError(errorMessage);
    }
  };

  const handleSaveAccount = async (accountData: any) => {
    if (!clerkUser) return;
    try {
      if (editingAccountData) {
        // Update existing account
        const id = editingAccountData.id || (editingAccountData as any)._id;
        const updatedAccount = await updateAccount(id, accountData);
        setAccounts(prev => prev.map(a => (a.id === id || (a as any)._id === id) ? updatedAccount : a));
        success('Account updated successfully!');
      } else {
        // Create new account
        const newAccount = await createAccount({ ...accountData, userId: clerkUser.id });
        setAccounts(prev => [...prev, newAccount]);
        success('Account created successfully!');
      }

      // Refresh metrics
      fetchMetrics();
      setIsAccountModalOpen(false);
      setEditingAccountData(undefined);
    } catch (err) {
      console.error('Failed to save account:', err);
      showError('Failed to save account. Please try again.');
    }
  };

  const handleAddAccount = async (account: any) => {
    // Legacy handler, now using handleSaveAccount
    await handleSaveAccount(account);
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!clerkUser) return;

    // Optimistically update UI
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    try {
      await updateTransaction(id, { ...updates, userId: clerkUser.id });

      // Refresh data to ensure consistency
      const updatedTransactions = await getTransactions(clerkUser.id);
      setTransactions(updatedTransactions);
      cache.set(`transactions_${clerkUser.id}`, updatedTransactions);

      await fetchMetrics();
      success('Transaction updated successfully!');
    } catch (err) {
      // Revert on error (fetching from cache or API would be better, but simple revert for now)
      const original = transactions.find(t => t.id === id);
      if (original) {
        setTransactions(prev => prev.map(t => t.id === id ? original : t));
      }
      showError('Failed to update transaction.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!clerkUser) return;

    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Store original for rollback
    const originalTransactions = [...transactions];

    // Optimistically update UI
    setTransactions(prev => prev.filter(t => t.id !== id));

    try {
      // Call API to delete transaction with userId
      await deleteTransaction(id, clerkUser.id);

      const updatedTransactions = transactions.filter(t => t.id !== id);
      cache.set(`transactions_${clerkUser.id}`, updatedTransactions);

      // Update budget spent amount
      if (transaction.type === 'expense') {
        const categoryBudget = budgets.find(b => b.category === transaction.category);
        if (categoryBudget) {
          const updatedBudgets = budgets.map(b =>
            b.id === categoryBudget.id
              ? { ...b, spent: Math.max(0, b.spent - transaction.amount) }
              : b
          );
          setBudgets(updatedBudgets);
          cache.set(`budgets_${clerkUser.id}`, updatedBudgets);
        }
      }

      // Refresh metrics
      await fetchMetrics();

      success('Transaction deleted successfully!');
    } catch (err) {
      // Rollback on error
      setTransactions(originalTransactions);
      showError('Failed to delete transaction. Please try again.');
    }
  };

  // Recurring Transaction Handlers
  const handleAddRecurringTransaction = async (data: RecurringTransactionInput) => {
    if (!clerkUser) return;
    try {
      const savedRecTx = await createRecurringTransaction({ ...data, userId: clerkUser.id });
      const updated = [savedRecTx, ...recurringTransactions];
      setRecurringTransactions(updated);
      cache.set(`recurring_${clerkUser.id}`, updated);
      success('Recurring transaction created successfully!');
    } catch (err) {
      showError('Failed to create recurring transaction. Please try again.');
    }
  };

  const handleUpdateRecurringTransaction = async (id: string, data: RecurringTransactionInput) => {
    if (!clerkUser) return;
    try {
      const updatedRecTx = await updateRecurringTransaction(id, data);
      const updated = recurringTransactions.map(rt => (rt.id === id || (rt as any)._id === id) ? updatedRecTx : rt);
      setRecurringTransactions(updated);
      cache.set(`recurring_${clerkUser.id}`, updated);
      success('Recurring transaction updated successfully!');
    } catch (err) {
      showError('Failed to update recurring transaction. Please try again.');
    }
  };

  const handleDeleteRecurringTransaction = async (id: string) => {
    if (!clerkUser) return;
    try {
      await deleteRecurringTransaction(id);
      const updated = recurringTransactions.filter(rt => rt.id !== id && (rt as any)._id !== id);
      setRecurringTransactions(updated);
      cache.set(`recurring_${clerkUser.id}`, updated);
      success('Recurring transaction deleted successfully!');
    } catch (err) {
      showError('Failed to delete recurring transaction. Please try again.');
    }
  };

  const handleToggleRecurringTransaction = async (id: string, isActive: boolean) => {
    if (!clerkUser) return;
    try {
      const updatedRecTx = await toggleRecurringTransaction(id, isActive);
      const updated = recurringTransactions.map(rt => (rt.id === id || (rt as any)._id === id) ? updatedRecTx : rt);
      setRecurringTransactions(updated);
      cache.set(`recurring_${clerkUser.id}`, updated);
      success(`Recurring transaction ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      showError('Failed to update recurring transaction. Please try again.');
    }
  };

  const handlePayRecurringTransaction = async (id: string) => {
    try {
      const response = await payRecurringTransaction(id);
      const { transaction, recurringTransaction } = response;

      // Update recurring transactions list with new next occurrence
      // Update recurring transactions list with new next occurrence
      setRecurringTransactions(prev => prev.map(t => (t.id === id || (t as any)._id === id) ? recurringTransaction : t));

      // Add new transaction to list
      setTransactions(prev => [transaction, ...prev]);

      // Refresh metrics to update balance
      fetchMetrics();

      success('Payment processed successfully');
    } catch (err) {
      console.error('Failed to pay recurring transaction:', err);
      showError('Failed to process payment');
    }
  };

  // --- Views ---

  const DashboardContent = () => (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Left Main Column */}
      <div className="xl:col-span-3 flex flex-col gap-6">

        {/* Financial Metrics Dashboard */}
        <FinancialMetricsDashboard
          metrics={financialMetrics}
          isLoading={metricsLoading}
          error={metricsError}
        />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
          <div className="lg:col-span-2 bg-forest-800 border border-forest-700 p-6 rounded-3xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-white text-lg">Spending Over Time</h3>
              <span className="text-xl font-bold text-white">{formatCurrency(snapshot.totalExpenses)}</span>
            </div>
            <div className="flex-1 w-full min-h-0">
              <TrendChart transactions={transactions} />
            </div>
          </div>
          <div className="lg:col-span-1 bg-forest-800 border border-forest-700 p-6 rounded-3xl flex flex-col">
            <h3 className="font-bold text-white text-lg mb-6">Spending by Category</h3>
            <div className="flex-1 w-full min-h-0 relative">
              <ExpensePieChart transactions={transactions} />
            </div>
          </div>
          {/* Legend handled by Chart component */}
        </div>

        {/* Bottom Goals Row */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Monthly Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GoalCard title="Emergency Fund" current={75000} target={100000} colorClass="bg-primary" />
            <GoalCard title="House Deposit" current={300000} target={500000} colorClass="bg-primary" />
          </div>
        </div>
      </div>

      {/* Right Widget Column */}
      <div className="xl:col-span-1 flex flex-col gap-6">

        {/* Gamification Card */}
        <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
          <h3 className="font-bold text-white text-lg mb-6">Your Progress</h3>

          <div className="text-center mb-6">
            <div className="text-primary font-bold text-2xl mb-2">Level {user.level}</div>
            {/* XP Bar */}
            <div className="w-full bg-forest-900 rounded-full h-2.5 mb-2">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <div className="text-xs text-forest-400">150 / 250 XP</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="text-center p-3 rounded-2xl bg-forest-900/50">
              <Flame size={24} className="text-amber-500 mx-auto mb-1" />
              <div className="font-bold text-white text-lg">{user.streak}</div>
              <div className="text-xs text-forest-400">Day Streak</div>
            </div>
            <div className="text-center p-3 rounded-2xl bg-forest-900/50">
              <Medal size={24} className="text-purple-500 mx-auto mb-1" />
              <div className="font-bold text-white text-lg">{user.badges}</div>
              <div className="text-xs text-forest-400">Badges</div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white text-sm mb-3">Recent Badges</h4>
            <div className="flex gap-3 justify-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Wallet size={18} /></div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Medal size={18} /></div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Flame size={18} /></div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl flex-1">
          <h3 className="font-bold text-white text-lg mb-4">Recent Activity & Alerts</h3>
          <div className="flex flex-col gap-2">
            {alerts.map(alert => <AlertItem key={alert.id} alert={alert} />)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <SignedOut>
        <div className="flex items-center justify-center h-screen bg-forest-950 text-white">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Welcome to SmartWallet</h1>
            <SignInButton mode="modal">
              <button className="bg-primary text-forest-950 px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        {/* Toast Container */}
        <ToastContainer toasts={toasts} onClose={closeToast} />

        {/* XP Reward Notification */}
        {xpReward && (
          <XPNotification
            xpReward={xpReward}
            onClose={() => setXpReward(null)}
            autoHideDuration={5000}
          />
        )}

        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Loading State */}
        {isLoading && <LoadingSpinner fullScreen message="Loading your financial data..." />}

        {/* Error State with Retry */}
        {error && !isLoading && (
          <ErrorMessage
            message={error}
            onRetry={() => window.location.reload()}
            fullScreen
          />
        )}

        {/* Main App */}
        {!isLoading && !error && (
          <div className="flex h-screen bg-forest-950 text-forest-100 font-inter selection:bg-primary/30 overflow-hidden">

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
                <aside className="absolute left-0 top-0 h-full w-72 bg-forest-900 border-r border-forest-800 flex flex-col animate-slide-in">
                  <div className="p-8 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white font-bold text-2xl">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-forest-900">
                          <Wallet size={24} strokeWidth={2.5} />
                        </div>
                        SmartWallet
                      </div>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-forest-400 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                  <nav className="flex-1 px-6 py-6 overflow-y-auto">
                    <SidebarItem id="dashboard" label="Dashboard" icon={LayoutGrid} active={activeView === 'dashboard'} onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }} />
                    <SidebarItem id="accounts" label="Accounts" icon={Wallet} active={activeView === 'accounts'} onClick={() => { setActiveView('accounts'); setIsMobileMenuOpen(false); }} />
                    <SidebarItem id="transactions" label="Transactions" icon={CreditCard} active={activeView === 'transactions'} onClick={() => { setActiveView('transactions'); setIsMobileMenuOpen(false); }} />
                    <SidebarItem id="budgets" label="Budgets" icon={Target} active={activeView === 'budgets'} onClick={() => { setActiveView('budgets'); setIsMobileMenuOpen(false); }} />
                    <SidebarItem id="goals" label="Goals" icon={Target} active={activeView === 'goals'} onClick={() => { setActiveView('goals'); setIsMobileMenuOpen(false); }} />
                    <SidebarItem id="settings" label="Settings" icon={Settings} active={activeView === 'settings'} onClick={() => { setActiveView('settings'); setIsMobileMenuOpen(false); }} />
                  </nav>
                </aside>
              </div>
            )}

            {/* Sidebar - Desktop */}
            <aside className="w-72 bg-forest-900 hidden md:flex flex-col border-r border-forest-800">
              <div className="p-8 pb-4">
                <div className="flex items-center gap-3 text-white font-bold text-2xl">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-forest-900">
                    <Wallet size={24} strokeWidth={2.5} />
                  </div>
                  SmartWallet
                </div>
              </div>

              <nav className="flex-1 px-6 py-6 overflow-y-auto">
                <SidebarItem id="dashboard" label="Dashboard" icon={LayoutGrid} active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
                <SidebarItem id="accounts" label="Accounts" icon={Wallet} active={activeView === 'accounts'} onClick={() => setActiveView('accounts')} />
                <SidebarItem id="transactions" label="Transactions" icon={CreditCard} active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} />
                <SidebarItem id="recurring" label="Recurring" icon={Calendar} active={activeView === 'recurring'} onClick={() => setActiveView('recurring')} />
                <SidebarItem id="budgets" label="Budgets" icon={Target} active={activeView === 'budgets'} onClick={() => setActiveView('budgets')} />
                <SidebarItem id="insights" label="Insights" icon={TrendingUp} active={activeView === 'insights'} onClick={() => setActiveView('insights')} />
                <SidebarItem id="investments" label="Investments" icon={TrendingUp} active={activeView === 'investments'} onClick={() => setActiveView('investments')} />
                <SidebarItem id="debts" label="Debt Tracker" icon={CreditCard} active={activeView === 'debts'} onClick={() => setActiveView('debts')} />
                <SidebarItem id="ai-assistant" label="AI Assistant" icon={Brain} active={activeView === 'ai-assistant'} onClick={() => setActiveView('ai-assistant')} />
                <SidebarItem id="gamification" label="Gamification" icon={Medal} active={activeView === 'gamification'} onClick={() => setActiveView('gamification')} />
                <SidebarItem id="goals" label="Goals" icon={Target} active={activeView === 'goals'} onClick={() => setActiveView('goals')} />
                <SidebarItem id="export" label="Export" icon={Download} active={activeView === 'export'} onClick={() => setActiveView('export')} />
                <SidebarItem id="settings" label="Settings" icon={Settings} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
              </nav>

              <div className="p-6">
                <div className="flex items-center gap-3 p-4 rounded-2xl hover:bg-forest-800 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border-2 border-white">
                    <img src={clerkUser?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clerkUser?.firstName || 'User'}`} alt="User" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{clerkUser?.fullName || 'User'}</div>
                    <div className="text-forest-400 text-xs">{clerkUser?.primaryEmailAddress?.emailAddress || 'user@email.com'}</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative h-full overflow-hidden">
              {/* Top Navigation Bar */}
              <header className="bg-forest-900 border-b border-forest-800 px-4 md:px-8 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4 md:gap-8">
                  <button
                    className="md:hidden p-2 text-white hover:bg-forest-800 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    <Menu size={24} />
                  </button>
                  <div className="flex items-center gap-3 text-white font-bold text-xl md:hidden">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-forest-900">
                      <Wallet size={20} strokeWidth={2.5} />
                    </div>
                    SmartWallet
                  </div>
                  <nav className="hidden md:flex items-center gap-6">
                    <button
                      onClick={() => setActiveView('dashboard')}
                      className={`text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'text-white' : 'text-forest-400 hover:text-white'}`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setActiveView('budgets')}
                      className={`text-sm font-medium transition-colors ${activeView === 'budgets' ? 'text-white' : 'text-forest-400 hover:text-white'}`}
                    >
                      Budgets
                    </button>
                    <button
                      onClick={() => setActiveView('transactions')}
                      className={`text-sm font-medium transition-colors ${activeView === 'transactions' ? 'text-white' : 'text-forest-400 hover:text-white'}`}
                    >
                      Transactions
                    </button>
                    <button
                      onClick={() => setActiveView('goals')}
                      className={`text-sm font-medium transition-colors ${activeView === 'goals' ? 'text-white' : 'text-forest-400 hover:text-white'}`}
                    >
                      Goals
                    </button>
                    <button
                      onClick={() => setActiveView('gamification')}
                      className={`text-sm font-medium transition-colors ${activeView === 'gamification' ? 'text-white' : 'text-forest-400 hover:text-white'}`}
                    >
                      Gamification
                    </button>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  {clerkUser && <NotificationCenter userId={clerkUser.id} />}
                  <button
                    onClick={() => setIsNotificationPrefsOpen(true)}
                    className="p-2 text-forest-400 hover:text-white hover:bg-forest-800 rounded-lg transition-colors"
                    title="Notification Settings"
                  >
                    <Settings size={20} />
                  </button>
                  <div className="flex items-center justify-center">
                    <UserButton />
                  </div>
                </div>
              </header>

              {/* Page Header */}
              {activeView !== 'insights' && activeView !== 'ai-assistant' && (
                <div className="px-8 py-6 shrink-0">
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {activeView === 'dashboard' ? `Welcome back, ${clerkUser?.firstName || 'User'}!` :
                      activeView === 'gamification' ? 'Your Gamification Hub' :
                        activeView === 'export' ? 'Export & Reports' :
                          activeView === 'debts' ? 'Debt Tracker' :
                            activeView === 'recurring' ? 'Recurring Transactions' :
                              activeView === 'investments' ? 'Investments & Holdings' :
                                activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </h1>
                  <p className="text-forest-400">
                    {activeView === 'dashboard' ? "Here's a summary of your financial activity." :
                      activeView === 'gamification' ? 'Track your progress, earn badges, and complete challenges to level up your finances.' :
                        activeView === 'export' ? 'Generate and download reports for your financial data.' :
                          activeView === 'debts' ? 'Track your debts with reduction calculations and payoff projections.' :
                            activeView === 'recurring' ? 'Manage your recurring income and expenses.' :
                              activeView === 'investments' ? 'Track your portfolio performance and manage securities.' :
                                activeView === 'accounts' ? 'A complete overview of your assets and liabilities.' :
                                  activeView === 'transactions' ? 'View and manage all your transactions.' :
                                    activeView === 'budgets' ? 'Set and track your monthly budgets.' :
                                      activeView === 'goals' ? 'Create and track your progress towards your financial goals.' :
                                        activeView === 'settings' ? 'Manage your profile and preferences.' :
                                          'Manage your financial records.'}
                  </p>
                </div>
              )}

              {/* Scrollable Content */}
              <div className={`flex-1 ${activeView === 'ai-assistant' ? 'overflow-hidden' : 'overflow-y-auto px-8 pb-8'} scrollbar-thin scrollbar-thumb-forest-700 scrollbar-track-transparent`}>
                {activeView === 'dashboard' ? (
                  <DashboardContent />
                ) : activeView === 'transactions' ? (
                  <TransactionsView
                    transactions={transactions}
                    onAdd={handleAddTransaction}
                    onUpdate={handleUpdateTransaction}
                    onDelete={handleDeleteTransaction}
                    onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                    customCategories={customCategories}
                  />
                ) : activeView === 'recurring' ? (
                  <RecurringTransactionsView
                    recurringTransactions={recurringTransactions}
                    onAdd={handleAddRecurringTransaction}
                    onUpdate={handleUpdateRecurringTransaction}
                    onDelete={handleDeleteRecurringTransaction}
                    onToggleActive={handleToggleRecurringTransaction}
                    onPay={handlePayRecurringTransaction}
                    customCategories={customCategories}
                  />
                ) : activeView === 'budgets' ? (
                  <BudgetsView budgets={budgets} onAdd={() => setIsBudgetModalOpen(true)} onUpdate={handleUpdateBudget} />
                ) : activeView === 'insights' ? (
                  <InsightsDashboard />
                ) : activeView === 'investments' ? (
                  clerkUser ? <NewInvestmentsView userId={clerkUser.id} /> : <div>Loading...</div>
                ) : activeView === 'debts' ? (
                  clerkUser ? <DebtTracker userId={clerkUser.id} /> : <div>Loading...</div>
                ) : activeView === 'gamification' ? (
                  clerkUser ? (
                    <GamificationViewIntegrated
                      budgets={budgets}
                      userXP={user.xp}
                      userLevel={user.level}
                      userStreak={user.streak}
                      onShowNotification={(message, type) => type === 'success' ? success(message) : showError(message)}
                    />
                  ) : <div>Loading...</div>
                ) : activeView === 'goals' ? (
                  <>
                    <div className="flex justify-end mb-4 px-8">
                      <button
                        onClick={() => setIsGoalModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-2.5 px-5 rounded-xl transition-colors"
                      >
                        <Plus size={18} strokeWidth={3} /> Add New Goal
                      </button>
                    </div>
                    <GoalsView
                      goals={savingsGoals}
                      onRemoveImage={handleRemoveGoalImage}
                      onContribute={handleContributeToGoal}
                      onDelete={handleDeleteGoal}
                      onEdit={handleEditGoal}
                      userBalance={snapshot.balance}
                    />
                  </>
                ) : activeView === 'accounts' ? (
                  <AccountsView
                    accounts={accounts}
                    onAddAccount={() => {
                      setEditingAccountData(undefined);
                      setIsAccountModalOpen(true);
                    }}
                    onEditAccount={(account) => {
                      setEditingAccountData(account);
                      setIsAccountModalOpen(true);
                    }}
                    metrics={financialMetrics}
                  />
                ) : activeView === 'ai-assistant' ? (
                  clerkUser ? <AIAssistantView userId={clerkUser.id} /> : <div>Loading...</div>
                ) : activeView === 'export' ? (
                  clerkUser ? <ExportReports userId={clerkUser.id} /> : <div>Loading...</div>
                ) : activeView === 'settings' ? (
                  <SettingsView userProfile={userProfile} onUpdateProfile={setUserProfile} />
                ) : (
                  <div className="flex items-center justify-center h-full text-forest-400 italic">
                    Work in progress for {activeView} view
                  </div>
                )}
              </div>
            </main>

            {/* Modals */}
            <Modal
              isOpen={isBudgetModalOpen}
              onClose={() => setIsBudgetModalOpen(false)}
              title="Create New Budget"
            >
              <AddBudgetForm onAdd={handleAddBudget} onClose={() => setIsBudgetModalOpen(false)} customCategories={customCategories} />
            </Modal>

            <Modal
              isOpen={isGoalModalOpen}
              onClose={() => setIsGoalModalOpen(false)}
              title="Set Savings Goal"
            >
              <AddGoalForm onAdd={handleAddGoal} onClose={() => setIsGoalModalOpen(false)} />
            </Modal>

            <Modal
              isOpen={isAccountModalOpen}
              onClose={() => {
                setIsAccountModalOpen(false);
                setEditingAccountData(undefined);
              }}
              title={editingAccountData ? "Edit Account" : "Add Account"}
            >
              <AddAccountForm
                onAdd={handleSaveAccount}
                onClose={() => {
                  setIsAccountModalOpen(false);
                  setEditingAccountData(undefined);
                }}
                initialData={editingAccountData}
              />
            </Modal>

            <Modal
              isOpen={isCategoryManagerOpen}
              onClose={() => setIsCategoryManagerOpen(false)}
              title=""
            >
              <CategoryManager
                onClose={() => setIsCategoryManagerOpen(false)}
                customCategories={customCategories}
                onDeleteCategory={handleDeleteCategory}
                onAddToDefault={handleAddToDefault}
                onAddCategory={handleAddCategory}
                onDeleteDefaultCategory={handleDeleteDefaultCategory}
              />
            </Modal>

            {/* Notification Preferences Modal */}
            {clerkUser && (
              <NotificationPreferences
                userId={clerkUser.id}
                isOpen={isNotificationPrefsOpen}
                onClose={() => setIsNotificationPrefsOpen(false)}
              />
            )}

          </div>
        )}
      </SignedIn>
    </ErrorBoundary>
  );
}
