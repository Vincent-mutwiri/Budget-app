
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Wallet, Target, Brain, CreditCard, Calendar,
  LayoutGrid, Settings, Folder, ArrowRight, X, DollarSign,
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, AlertCircle, Medal, Flame, ChevronRight,
  Search, Filter, Pencil, Trash2, Lightbulb,
  ShoppingCart, Bus, Film, Zap, ShoppingBag, PlusCircle
} from 'lucide-react';
import {
  Transaction, UserState, Category, DailyChallenge,
  FinancialSnapshot, Goal, Notification, Alert, TransactionType, CategoriesList, Budget, Security, Challenge
} from './types';
import {
  MOCK_TRANSACTIONS, LEVEL_THRESHOLDS, XP_REWARDS,
  calculateLevel, formatCurrency
} from './constants';
import { ExpensePieChart, TrendChart } from './components/Charts';
import { generateFinancialAdvice } from './services/geminiService';

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

const MetricCard = ({ title, value, subValue, trend }: { title: string, value: string, subValue?: string, trend?: 'up' | 'down' | 'neutral' }) => (
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
    {/* Decorative BG */}
    <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-1/4 translate-y-1/4">
      <Wallet size={120} />
    </div>
  </div>
);

const GoalCard = ({ title, current, target, colorClass }: { title: string, current: number, target: number, colorClass: string }) => {
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
};

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
  onDelete
}: {
  transactions: Transaction[],
  onAdd: (t: Omit<Transaction, 'id'>) => void,
  onDelete: (id: string) => void
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;

    onAdd({
      amount: parseFloat(amount),
      category: category as Category,
      date,
      description: description || 'Untitled Transaction',
      type
    });

    // Reset form
    setAmount('');
    setDescription('');
    setCategory('');
  };

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Column: Add Transaction */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Add New Transaction</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Type Toggle */}
            <div className="bg-forest-900 p-1 rounded-xl flex">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === 'expense'
                  ? 'bg-forest-800 text-white shadow-sm border border-forest-700'
                  : 'text-forest-400 hover:text-white'
                  }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === 'income'
                  ? 'bg-forest-800 text-white shadow-sm border border-forest-700'
                  : 'text-forest-400 hover:text-white'
                  }`}
              >
                Income
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-forest-300 text-sm font-medium mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-forest-300 text-sm font-medium mb-2">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {CategoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-forest-400">
                  <ChevronRight className="rotate-90" size={16} />
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-forest-300 text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                required
              />
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
              Add Transaction
            </button>
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
      <div className="lg:col-span-2 bg-forest-800 border border-forest-700 rounded-3xl p-6 flex flex-col h-full overflow-hidden">
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

        <div className="flex-1 overflow-auto -mx-6 px-6 scrollbar-thin scrollbar-thumb-forest-700">
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
                      <button className="p-1.5 text-forest-400 hover:text-primary transition-colors rounded-lg hover:bg-forest-900">
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-1.5 text-forest-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-forest-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
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

const GamificationView = ({ user, challenges }: { user: UserState, challenges: Challenge[] }) => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'achievements' | 'leaderboards'>('challenges');

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
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" alt="User" className="w-full h-full" />
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
      <div className="flex gap-2 bg-forest-900 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'challenges'
            ? 'bg-forest-800 text-white border border-forest-700'
            : 'text-forest-400 hover:text-white'
            }`}
        >
          Challenges
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'achievements'
            ? 'bg-forest-800 text-white border border-forest-700'
            : 'text-forest-400 hover:text-white'
            }`}
        >
          Achievements
        </button>
        <button
          onClick={() => setActiveTab('leaderboards')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'leaderboards'
            ? 'bg-forest-800 text-white border border-forest-700'
            : 'text-forest-400 hover:text-white'
            }`}
        >
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

// --- Budgets View Component ---

const BudgetsView = ({ budgets }: { budgets: Budget[] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate totals for summary cards
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudgeted - totalSpent;

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
            <p className="text-forest-400">October 2024</p>
          </div>
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-forest-950 font-bold py-2.5 px-5 rounded-xl transition-colors">
            <Plus size={18} strokeWidth={3} /> Add New Budget
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
            <div className="text-forest-300 text-sm font-medium mb-1">Total Budgeted</div>
            <div className="text-3xl font-bold text-white">{formatCurrency(totalBudgeted)}</div>
          </div>
          <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
            <div className="text-forest-300 text-sm font-medium mb-1">Total Spent</div>
            <div className="text-3xl font-bold text-white">{formatCurrency(totalSpent)}</div>
          </div>
          <div className="bg-forest-800 border border-forest-700 p-6 rounded-3xl">
            <div className="text-forest-300 text-sm font-medium mb-1">Remaining</div>
            <div className={`text-3xl font-bold ${remaining >= 0 ? 'text-primary' : 'text-rose-500'}`}>
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>
      </div>

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
          {filteredBudgets.map((budget) => {
            const percent = Math.min(100, Math.round((budget.spent / budget.limit) * 100));
            const isOver = budget.spent > budget.limit;
            const isWarning = !isOver && percent > 80;
            const overAmount = budget.spent - budget.limit;
            const leftAmount = budget.limit - budget.spent;

            let statusColor = 'bg-primary';
            if (isOver) statusColor = 'bg-rose-500';
            else if (isWarning) statusColor = 'bg-amber-500';

            return (
              <div key={budget.id} className="bg-forest-800 border border-forest-700 p-6 rounded-3xl hover:border-forest-600 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getIconColor(budget.icon)}`}>
                      {getIcon(budget.icon)}
                    </div>
                    <span className="font-bold text-lg text-white">{budget.category}</span>
                  </div>
                  {isOver && <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">error</span>}
                  {isWarning && <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">warning</span>}
                </div>

                <div className="mb-2 w-full bg-forest-950 rounded-full h-3 overflow-hidden">
                  <div className={`h-full rounded-full ${statusColor}`} style={{ width: `${percent}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="text-forest-300">
                    Spent <span className="text-white font-medium">{formatCurrency(budget.spent)}</span> of {formatCurrency(budget.limit)}
                  </div>
                  <div className={`font-bold ${isOver ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-primary'}`}>
                    {isOver ? `-${formatCurrency(overAmount)} Over` : `${Math.round((leftAmount / budget.limit) * 100)}% Left`}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Placeholder Card */}
          <button className="border-2 border-dashed border-forest-700 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-forest-400 hover:text-white hover:border-forest-500 hover:bg-forest-800/30 transition-all group min-h-[180px]">
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
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<UserState>(() => {
    const saved = localStorage.getItem('smartwallet_user');
    return saved ? JSON.parse(saved) : { xp: 150, level: 12, streak: 12, badges: 8, currency: 'USD', monthlyIncome: 4500 };
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('smartwallet_transactions');
    return saved ? JSON.parse(saved) : MOCK_TRANSACTIONS;
  });

  // Mock Budgets Data
  const [budgets, setBudgets] = useState<Budget[]>([
    { id: '1', category: 'Groceries', limit: 500, spent: 425.00, icon: 'cart' },
    { id: '2', category: 'Transport', limit: 150, spent: 162.30, icon: 'bus' },
    { id: '3', category: 'Entertainment', limit: 250, spent: 100.00, icon: 'film' },
    { id: '4', category: 'Utilities', limit: 150, spent: 112.50, icon: 'zap' },
    { id: '5', category: 'Shopping', limit: 400, spent: 200.00, icon: 'bag' },
  ]);

  // Mock Securities Data
  const [securities, setSecurities] = useState<Security[]>([
    { id: '1', name: 'Apple Inc.', symbol: 'AAPL', shares: 50.00, marketPrice: 214.29, marketValue: 10714.50, change24h: 1.25, totalReturn: 1500.25 },
    { id: '2', name: 'Tech Innovators ETF', symbol: 'INVT', shares: 200.00, marketPrice: 152.80, marketValue: 30560.00, change24h: -0.50, totalReturn: 5820.00 },
    { id: '3', name: 'Microsoft Corp.', symbol: 'MSFT', shares: 25.00, marketPrice: 447.67, marketValue: 11191.75, change24h: 2.10, totalReturn: 2101.50 },
    { id: '4', name: 'Global Growth Fund', symbol: 'GGF', shares: 1000.00, marketPrice: 73.36, marketValue: 73363.95, change24h: 0.80, totalReturn: 16408.45 },
  ]);

  // Mock Challenges Data
  const [challenges, setChallenges] = useState<Challenge[]>([
    { id: '1', title: 'Log a transaction today', description: '', progress: 1, target: 1, xpReward: 50, type: 'daily', resetTime: '12 hours', completed: true },
    { id: '2', title: 'Categorize 5 expenses', description: '', progress: 3, target: 5, xpReward: 75, type: 'daily', resetTime: '12 hours', completed: false },
    { id: '3', title: "Stay under 'Dining Out' budget", description: '', progress: 1, target: 1, xpReward: 300, type: 'weekly', resetTime: '4 days', completed: false },
    { id: '4', title: 'Complete daily challenges 3 times', description: '', progress: 1, target: 3, xpReward: 150, type: 'weekly', resetTime: '4 days', completed: false },
    { id: '5', title: 'Achieve a 90% savings goal', description: '', progress: 85, target: 90, xpReward: 500, type: 'monthly', resetTime: '22 days', completed: false },
    { id: '6', title: 'End with a positive cash flow', description: '', progress: 1, target: 1, xpReward: 400, type: 'monthly', resetTime: '22 days', completed: false },
  ]);

  // Mock Alerts
  const alerts: Alert[] = [
    { id: '1', title: 'Budget', message: "You're close to your 'Dining Out' budget.", type: 'warning', time: '5 minutes ago' },
    { id: '2', title: 'Bill', message: "Bill 'Netflix' is due in 3 days.", type: 'danger', time: '2 hours ago' },
    { id: '3', title: 'Badge', message: "New Badge Unlocked: Savvy Saver!", type: 'success', time: '1 day ago' },
    { id: '4', title: 'System', message: "You've categorized 50 transactions!", type: 'info', time: '2 days ago' },
  ];

  const snapshot: FinancialSnapshot = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, savingsRate: 0 }; // calc rate if needed
  }, [transactions]);

  // Persist Data
  useEffect(() => {
    localStorage.setItem('smartwallet_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('smartwallet_user', JSON.stringify(user));
  }, [user]);

  // Handlers
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transaction = {
      ...newTx,
      id: Math.random().toString(36).substr(2, 9),
    };
    setTransactions(prev => [transaction, ...prev]);

    // Gamification: Add XP
    setUser(prev => ({
      ...prev,
      xp: prev.xp + XP_REWARDS.ADD_TRANSACTION
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // --- Views ---

  const DashboardContent = () => (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Left Main Column */}
      <div className="xl:col-span-3 flex flex-col gap-6">

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Total Balance"
            value={formatCurrency(snapshot.balance)}
            subValue="+2.5%"
            trend="up"
          />
          <MetricCard
            title="This Month's Spending"
            value={formatCurrency(snapshot.totalExpenses)}
            subValue="-10.2%"
            trend="down"
          />
          <MetricCard
            title="Remaining Budget"
            value={formatCurrency(snapshot.totalIncome - snapshot.totalExpenses)}
            subValue="On Track"
            trend="neutral"
          />
        </div>

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
            {/* Custom Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-forest-300">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Food</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Transport</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ec4899]" /> Shopping</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#8b5cf6]" /> Bills</div>
            </div>
          </div>
        </div>

        {/* Bottom Goals Row */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Monthly Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GoalCard title="Vacation Fund" current={1500} target={2000} colorClass="bg-primary" />
            <GoalCard title="New Laptop" current={600} target={1500} colorClass="bg-primary" />
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
    <div className="flex h-screen bg-forest-950 text-forest-100 font-inter selection:bg-primary/30 overflow-hidden">

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
          <SidebarItem id="transactions" label="Transactions" icon={CreditCard} active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} />
          <SidebarItem id="budgets" label="Budgets" icon={Target} active={activeView === 'budgets'} onClick={() => setActiveView('budgets')} />
          <SidebarItem id="investments" label="Investments" icon={TrendingUp} active={activeView === 'investments'} onClick={() => setActiveView('investments')} />
          <SidebarItem id="gamification" label="Gamification" icon={Medal} active={activeView === 'gamification'} onClick={() => setActiveView('gamification')} />
          <SidebarItem id="goals" label="Goals" icon={Target} active={activeView === 'goals'} onClick={() => setActiveView('goals')} />
          <SidebarItem id="settings" label="Settings" icon={Settings} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </nav>

        <div className="p-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl hover:bg-forest-800 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border-2 border-white">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" alt="User" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">Jane Doe</div>
              <div className="text-forest-400 text-xs">jane.doe@email.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-forest-900 border-b border-forest-800 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-8">
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
            <button className="p-2 text-forest-400 hover:text-white transition-colors">
              <AlertCircle size={20} />
            </button>
            <button className="p-2 text-forest-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border-2 border-forest-700 cursor-pointer">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" alt="User" />
            </div>
          </div>
        </header>

        {/* Page Header */}
        <div className="px-8 py-6 shrink-0">
          <h1 className="text-3xl font-bold text-white mb-1">
            {activeView === 'dashboard' ? 'Welcome back, Jane!' :
              activeView === 'gamification' ? 'Your Gamification Hub' :
                activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          </h1>
          <p className="text-forest-400">
            {activeView === 'dashboard' ? "Here's a summary of your financial activity." :
              activeView === 'gamification' ? 'Track your progress, earn badges, and complete challenges to level up your finances.' :
                'Manage your financial records.'}
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-thin scrollbar-thumb-forest-700 scrollbar-track-transparent">
          {activeView === 'dashboard' ? (
            <DashboardContent />
          ) : activeView === 'transactions' ? (
            <TransactionsView
              transactions={transactions}
              onAdd={handleAddTransaction}
              onDelete={handleDeleteTransaction}
            />
          ) : activeView === 'budgets' ? (
            <BudgetsView budgets={budgets} />
          ) : activeView === 'investments' ? (
            <InvestmentsView securities={securities} />
          ) : activeView === 'gamification' ? (
            <GamificationView user={user} challenges={challenges} />
          ) : (
            <div className="flex items-center justify-center h-full text-forest-400 italic">
              Work in progress for {activeView} view
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
