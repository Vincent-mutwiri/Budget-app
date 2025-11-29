import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Wallet, Target, Brain, CreditCard, Calendar, 
  LayoutGrid, Settings, Folder, ArrowRight, X, DollarSign,
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, AlertCircle, Medal, Flame, ChevronRight
} from 'lucide-react';
import { 
  Transaction, UserState, Category, DailyChallenge, 
  FinancialSnapshot, Goal, Notification, Alert
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
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all mb-2 group ${
      active 
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
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"/> Food</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"/> Transport</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ec4899]"/> Shopping</div>
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#8b5cf6]"/> Bills</div>
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
            <SidebarItem id="goals" label="Goals" icon={Medal} active={activeView === 'goals'} onClick={() => setActiveView('goals')} />
            <SidebarItem id="settings" label="Settings" icon={Settings} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
         </nav>

         <div className="p-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl hover:bg-forest-800 transition-colors cursor-pointer">
               <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border-2 border-white">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="User" />
               </div>
               <div>
                  <div className="text-white font-bold text-sm">Alex Doe</div>
                  <div className="text-forest-400 text-xs">alex.doe@email.com</div>
               </div>
            </div>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
         {/* Header */}
         <header className="px-8 py-8 flex justify-between items-start shrink-0">
            <div>
               <h1 className="text-3xl font-bold text-white mb-1">Welcome back, Alex!</h1>
               <p className="text-forest-400">Here's a summary of your financial activity.</p>
            </div>
            
            {/* Mobile Menu Toggle would go here */}
         </header>

         {/* Scrollable Content */}
         <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-thin scrollbar-thumb-forest-700 scrollbar-track-transparent">
            {activeView === 'dashboard' ? (
              <DashboardContent />
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