import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, Award, Zap, 
  PieChart as PieChartIcon, X, DollarSign, 
  Target, Brain, CreditCard, Calendar, ArrowRight, Check, Trophy,
  LayoutGrid, Settings, Folder, Download, Upload, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  Transaction, UserState, Category, DailyChallenge, 
  FinancialSnapshot, Goal, Notification
} from './types';
import { 
  MOCK_TRANSACTIONS, LEVEL_THRESHOLDS, XP_REWARDS, 
  calculateLevel, formatCurrency 
} from './constants';
import { ExpensePieChart, TrendChart } from './components/Charts';
import { generateFinancialAdvice } from './services/geminiService';

// --- Confetti Component ---
const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; dx: number; dy: number; color: string; size: number }[] = [];
    const colors = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        dx: (Math.random() - 0.5) * 15,
        dy: (Math.random() - 0.5) * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 2,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.x += p.dx;
        p.y += p.dy;
        p.dy += 0.1; // gravity
        p.size *= 0.96; // fade out

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.size < 0.1) particles.splice(index, 1);
      });

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />;
};

// --- Toast Component ---
const ToastContainer: React.FC<{ notifications: Notification[]; remove: (id: string) => void }> = ({ notifications, remove }) => (
  <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2">
    {notifications.map(n => (
      <div 
        key={n.id} 
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md border animate-slide-left
          ${n.type === 'xp' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : ''}
          ${n.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : ''}
          ${n.type === 'info' ? 'bg-slate-800/90 border-slate-700 text-slate-200' : ''}
        `}
        onClick={() => remove(n.id)}
      >
        {n.type === 'xp' && <Award size={18} />}
        {n.type === 'success' && <Check size={18} />}
        <span className="font-medium text-sm">{n.message}</span>
      </div>
    ))}
  </div>
);

// --- UI Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; icon?: React.ReactNode }> = ({ 
  children, className = "", title, icon 
}) => (
  <div className={`bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-4 text-slate-400 uppercase tracking-wider text-xs font-bold">
        {icon && <span className="text-emerald-500">{icon}</span>}
        {title}
      </div>
    )}
    {children}
  </div>
);

const ProgressBar: React.FC<{ current: number; max: number; colorClass?: string }> = ({ 
  current, max, colorClass = "bg-emerald-500" 
}) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-700 ease-out ${colorClass}`} 
        style={{ width: `${percent}%` }} 
      />
    </div>
  );
};

const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors first:rounded-t-xl last:rounded-b-xl last:border-0">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-full ${transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
        {transaction.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>
      <div>
        <h4 className="font-medium text-slate-100">{transaction.description}</h4>
        <p className="text-xs text-slate-400">{new Date(transaction.date).toLocaleDateString()} • {transaction.category}</p>
      </div>
    </div>
    <span className={`font-mono font-semibold ${transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
    </span>
  </div>
);

const GoalCard: React.FC<{ goal: Goal; onContribute: (id: string) => void }> = ({ goal, onContribute }) => (
  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3 hover:bg-slate-800/60 transition-colors">
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        <div className="text-2xl">{goal.icon}</div>
        <div>
          <h4 className="font-bold text-slate-200">{goal.name}</h4>
          <p className="text-xs text-slate-400">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</p>
        </div>
      </div>
      <button 
        onClick={() => onContribute(goal.id)}
        className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors text-slate-300"
        title="Add Funds"
      >
        <Plus size={16} />
      </button>
    </div>
    <ProgressBar current={goal.currentAmount} max={goal.targetAmount} colorClass={goal.color} />
  </div>
);

// --- Main Application ---

type View = 'dashboard' | 'accounts' | 'categories' | 'transactions' | 'statistics' | 'goals' | 'advisor' | 'settings';

export default function App() {
  // --- Initialization Logic (LocalStorage) ---
  const loadState = <T,>(key: string, defaultVal: T): T => {
    const saved = localStorage.getItem(`smartwallet_${key}`);
    return saved ? JSON.parse(saved) : defaultVal;
  };

  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadState('transactions', MOCK_TRANSACTIONS));
  const [user, setUser] = useState<UserState>(() => loadState('user', {
    xp: 1240,
    level: 5,
    streak: 14,
    currency: 'USD',
    monthlyIncome: 4500
  }));
  const [goals, setGoals] = useState<Goal[]>(() => loadState('goals', [
    { id: 'g1', name: 'Hawaii Trip', targetAmount: 3000, currentAmount: 1250, icon: '🏖️', color: 'bg-blue-500' },
    { id: 'g2', name: 'New Laptop', targetAmount: 2000, currentAmount: 450, icon: '💻', color: 'bg-purple-500' },
  ]));
  
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>(() => loadState('challenges', [
    { id: 'c1', description: 'Log 3 transactions', target: 3, current: 1, xpReward: 50, completed: false, icon: '📝' },
    { id: 'c2', description: 'Spend < $20 today', target: 20, current: 0, xpReward: 75, completed: false, icon: '☕' },
  ]));

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Transaction Form State
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState<Category>(Category.Food);

  // Advisor State
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => localStorage.setItem('smartwallet_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('smartwallet_user', JSON.stringify(user)), [user]);
  useEffect(() => localStorage.setItem('smartwallet_goals', JSON.stringify(goals)), [goals]);
  useEffect(() => localStorage.setItem('smartwallet_challenges', JSON.stringify(dailyChallenges)), [dailyChallenges]);

  // Check Level Up
  const currentLevelData = useMemo(() => calculateLevel(user.xp), [user.xp]);
  const prevLevelRef = useRef(user.level);

  useEffect(() => {
    if (currentLevelData.level > prevLevelRef.current) {
      setShowLevelUp(true);
      notify(`Level Up! Welcome to ${currentLevelData.name}`, 'xp');
      setUser(u => ({ ...u, level: currentLevelData.level }));
      prevLevelRef.current = currentLevelData.level;
    }
  }, [currentLevelData, user.xp]);

  // --- Derived Data ---
  const nextLevelData = LEVEL_THRESHOLDS.find(l => l.level === currentLevelData.level + 1) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  
  const snapshot: FinancialSnapshot = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    
    return { totalIncome, totalExpenses, balance, savingsRate };
  }, [transactions]);

  // --- Helpers ---
  const notify = (message: string, type: Notification['type'] = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formDesc) return;

    const newTx: Transaction = {
      id: Date.now().toString(),
      amount: parseFloat(formAmount),
      description: formDesc,
      category: formCategory,
      type: formType,
      date: new Date().toISOString()
    };

    setTransactions(prev => [newTx, ...prev]);
    
    // Gamification Logic
    const xpGain = XP_REWARDS.ADD_TRANSACTION;
    setUser(prev => ({ ...prev, xp: prev.xp + xpGain }));
    notify(`Transaction saved! +${xpGain} XP`, 'xp');
    
    // Challenge Logic (Mock update)
    const challengeUpdate = [...dailyChallenges];
    if (challengeUpdate[0].current < challengeUpdate[0].target) {
        challengeUpdate[0].current += 1;
        if (challengeUpdate[0].current >= challengeUpdate[0].target && !challengeUpdate[0].completed) {
            challengeUpdate[0].completed = true;
            const reward = challengeUpdate[0].xpReward;
            setUser(prev => ({ ...prev, xp: prev.xp + reward }));
            notify(`Daily Challenge Complete! +${reward} XP`, 'xp');
        }
    }
    setDailyChallenges(challengeUpdate);

    // Reset & Close
    setFormAmount('');
    setFormDesc('');
    setIsDrawerOpen(false);
  };

  const handleGetAdvice = async () => {
    setAdvisorLoading(true);
    const result = await generateFinancialAdvice(snapshot, transactions);
    setAdvice(result);
    setAdvisorLoading(false);
  };

  const handleContributeToGoal = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const newAmount = Math.min(g.targetAmount, g.currentAmount + 100);
        notify(`Added $100 to ${g.name}`, 'success');
        return { ...g, currentAmount: newAmount };
      }
      return g;
    }));
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ transactions, user, goals, dailyChallenges }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartwallet_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    notify("Data exported successfully!", "success");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.transactions) setTransactions(data.transactions);
        if (data.user) setUser(data.user);
        if (data.goals) setGoals(data.goals);
        if (data.dailyChallenges) setDailyChallenges(data.dailyChallenges);
        notify("Data imported successfully!", "success");
      } catch (err) {
        notify("Failed to import data. Invalid file.", "warning");
      }
    };
    reader.readAsText(file);
  };

  // --- Views Implementation ---

  const DashboardView = () => (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={64} />
          </div>
          <p className="text-slate-400 text-sm mb-1">Total Balance</p>
          <h3 className="text-2xl font-bold font-mono">{formatCurrency(snapshot.balance)}</h3>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-slate-400">Projected:</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(snapshot.balance + 500)}</span>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Target size={64} className="text-rose-500"/>
          </div>
           <p className="text-slate-400 text-sm mb-1">Monthly Expenses</p>
           <h3 className="text-2xl font-bold font-mono">{formatCurrency(snapshot.totalExpenses)}</h3>
           <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full w-[65%]"></div>
           </div>
           <p className="text-xs text-slate-500 mt-2 text-right">65% of Budget</p>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900/50 border-indigo-500/30 relative overflow-hidden">
           <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500 blur-3xl opacity-20"></div>
           <p className="text-indigo-300 text-sm mb-1">Savings Rate</p>
           <h3 className={`text-3xl font-bold font-mono ${snapshot.savingsRate > 20 ? 'text-emerald-400' : snapshot.savingsRate > 5 ? 'text-yellow-400' : 'text-rose-400'}`}>
             {snapshot.savingsRate.toFixed(1)}%
           </h3>
           <p className="text-xs text-slate-400 mt-2">
             {snapshot.savingsRate > 20 ? '🎉 Wealth Builder Tier' : '⚠️ Needs Optimization'}
           </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-6">
           <Card title="Daily Quests" icon={<Target size={16}/>}>
              <div className="space-y-3">
                {dailyChallenges.map(challenge => (
                  <div key={challenge.id} className={`p-3 rounded-lg border ${challenge.completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/30'} flex items-center justify-between transition-all`}>
                    <div className="flex items-center gap-3">
                       <span className="text-xl">{challenge.icon}</span>
                       <div>
                         <p className={`text-sm font-medium ${challenge.completed ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>{challenge.description}</p>
                         <p className="text-xs text-slate-500">{challenge.current}/{challenge.target}</p>
                       </div>
                    </div>
                    <div className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                       +{challenge.xpReward} XP
                    </div>
                  </div>
                ))}
              </div>
           </Card>

           <Card title="Recent Activity" icon={<CreditCard size={16}/>}>
             <div className="flex flex-col">
               {transactions.slice(0, 5).map(t => (
                 <TransactionItem key={t.id} transaction={t} />
               ))}
             </div>
           </Card>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
           <Card>
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Zap size={24} fill="currentColor" />
               </div>
               <div>
                 <h4 className="font-bold text-lg">{user.streak} Day Streak</h4>
                 <p className="text-xs text-slate-400">Keep logging to earn bonuses!</p>
               </div>
             </div>
           </Card>

           <Card title="Spending Breakdown" icon={<PieChartIcon size={16}/>}>
              <ExpensePieChart transactions={transactions} />
           </Card>
        </div>
      </div>
    </div>
  );

  const AccountsView = () => (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl text-slate-300">Total balance: {formatCurrency(snapshot.balance)}</h3>
        <button className="text-emerald-500 hover:text-emerald-400 font-medium text-sm">Add account</button>
      </div>
      
      {/* Mock Account List */}
      <div className="grid gap-4">
        <Card className="flex items-center justify-between hover:bg-slate-800/60 transition-colors cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
              <Wallet size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-200">Main Wallet</h4>
              <p className="text-xs text-slate-500">Cash & Debit</p>
            </div>
          </div>
          <div className="text-right">
             <div className="font-mono text-lg font-bold">{formatCurrency(snapshot.balance)}</div>
             <div className="text-xs text-emerald-500">Active</div>
          </div>
        </Card>
        
        {/* Placeholder for empty state matching screenshot style if needed, but showing one account is better UX */}
        {snapshot.balance === 0 && (
           <div className="text-slate-500 italic text-center py-12">No additional accounts found.</div>
        )}
      </div>
    </div>
  );

  const CategoriesView = () => {
    // Helper to group categories purely for display
    const incomeCats = [Category.Income, Category.Investment];
    const expenseCats = Object.values(Category).filter(c => !incomeCats.includes(c));

    return (
      <div className="animate-fade-in space-y-8">
        <div className="flex justify-end">
           <button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-4 rounded-lg text-sm">
             Add category
           </button>
        </div>

        <div>
          <h3 className="text-lg font-medium text-slate-300 mb-4">Income categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {incomeCats.map(cat => (
              <div key={cat} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                 <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                 <span className="font-medium text-slate-200">{cat}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-slate-300 mb-4">Expense categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {expenseCats.map(cat => (
              <div key={cat} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
                 <div className="w-2 h-8 bg-rose-500 rounded-full"></div>
                 <span className="font-medium text-slate-200">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TransactionsView = () => (
    <div className="animate-fade-in space-y-4">
      <Card title="History" icon={<Calendar size={16}/>}>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No transactions yet.</div>
        ) : (
          <div className="flex flex-col gap-1">
            {transactions.map(t => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const StatisticsView = () => (
    <div className="animate-fade-in space-y-6">
       <div className="flex items-center justify-center gap-4 mb-6">
          <button className="p-1 hover:bg-slate-800 rounded"><ChevronLeft size={20}/></button>
          <span className="font-mono text-lg text-slate-200">Current Period</span>
          <button className="p-1 hover:bg-slate-800 rounded"><ChevronRight size={20}/></button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Income/Expense Ratio">
             <div className="h-64">
                <TrendChart transactions={transactions} />
             </div>
          </Card>
          <Card title="Monthly Spending Distribution">
             <div className="h-64">
                <ExpensePieChart transactions={transactions} />
             </div>
          </Card>
       </div>
    </div>
  );

  const GoalsView = () => (
    <div className="animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onContribute={handleContributeToGoal} />
          ))}
          <button className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-all group">
             <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
             <span className="font-medium">Create New Goal</span>
          </button>
       </div>
    </div>
  );

  const AdvisorView = () => (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full text-indigo-400 mb-4">
          <Brain size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-2">AI Wealth Advisor</h2>
        <p className="text-slate-400">Powered by Gemini Models</p>
      </div>

      <Card className="border-indigo-500/30">
         {!advice ? (
           <div className="text-center py-8">
              <p className="text-slate-300 mb-6">
                I can analyze your {transactions.length} recent transactions and savings rate ({snapshot.savingsRate.toFixed(1)}%) to provide a personalized strategy.
              </p>
              <button 
                onClick={handleGetAdvice}
                disabled={advisorLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {advisorLoading ? (
                  <span className="animate-pulse">Analyzing...</span>
                ) : (
                  <>
                    <Zap size={18} /> Generate Strategy
                  </>
                )}
              </button>
           </div>
         ) : (
           <div className="prose prose-invert max-w-none">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-indigo-400 m-0">Financial Analysis</h3>
                <button onClick={() => setAdvice(null)} className="text-xs text-slate-500 hover:text-white">Reset</button>
             </div>
             <div className="whitespace-pre-line text-slate-300 leading-relaxed">
                {advice.split('**').map((part, i) => 
                  i % 2 === 1 ? <strong key={i} className="text-white block mt-4 mb-2">{part}</strong> : part
                )}
             </div>
           </div>
         )}
      </Card>
    </div>
  );

  const SettingsView = () => (
    <div className="animate-fade-in max-w-2xl space-y-8">
       <div>
         <h3 className="text-xl font-medium text-slate-200 mb-4">Currency</h3>
         <select className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-3 w-full max-w-xs focus:ring-2 focus:ring-cyan-500 outline-none">
            <option>US Dollar ($)</option>
            <option>Euro (€)</option>
            <option>British Pound (£)</option>
            <option>Japanese Yen (¥)</option>
         </select>
       </div>

       <div>
         <h3 className="text-xl font-medium text-slate-200 mb-4">Import/Export data</h3>
         <p className="text-slate-400 mb-4 text-sm">Here you can import or export your data.</p>
         <div className="flex gap-4">
            <label className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-6 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
               <Upload size={18} />
               Import
               <input type="file" onChange={handleImportData} accept=".json" className="hidden" />
            </label>
            <button 
              onClick={handleExportData}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
               <Download size={18} /> Export
            </button>
         </div>
       </div>

       <div>
         <h3 className="text-xl font-medium text-slate-200 mb-4">Danger Zone</h3>
         <button 
           onClick={() => {
              if(confirm('Are you sure you want to clear all data?')) {
                 localStorage.clear();
                 window.location.reload();
              }
           }}
           className="border border-rose-500/50 text-rose-500 hover:bg-rose-500/10 px-6 py-2 rounded-lg text-sm transition-colors"
         >
            Reset All Data
         </button>
       </div>
    </div>
  );

  const SidebarItem = ({ id, label, icon: Icon }: { id: View, label: string, icon: React.ElementType }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
        activeView === id 
        ? 'bg-slate-800 text-cyan-400 shadow-md shadow-slate-900/50' 
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-inter selection:bg-cyan-500/30">
      <ToastContainer notifications={notifications} remove={removeNotification} />
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <Confetti />
          <div className="bg-slate-900 border border-yellow-500/50 p-8 rounded-3xl max-w-md text-center shadow-2xl relative z-[101] animate-bounce-in">
             <Trophy size={48} className="text-yellow-500 mx-auto mb-6" />
             <h2 className="text-4xl font-bold text-white mb-2">Level Up!</h2>
             <p className="text-xl text-yellow-400 font-medium mb-6">You are now a {currentLevelData.name}</p>
             <button onClick={() => setShowLevelUp(false)} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-8 py-3 rounded-xl">Awesome!</button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2 text-emerald-500 font-bold text-xl tracking-tight">
           <Wallet className="fill-emerald-500/20" /> SmartWallet
        </div>

        <nav className="flex-1 px-4 py-2 overflow-y-auto">
          <SidebarItem id="dashboard" label="Dashboard" icon={LayoutGrid} />
          <SidebarItem id="accounts" label="Accounts" icon={Wallet} />
          <SidebarItem id="categories" label="Categories" icon={Folder} />
          <SidebarItem id="transactions" label="Transactions" icon={ArrowRight} />
          <SidebarItem id="statistics" label="Statistics" icon={PieChartIcon} />
          <SidebarItem id="goals" label="Goals" icon={Target} />
          <SidebarItem id="advisor" label="AI Advisor" icon={Brain} />
          <SidebarItem id="settings" label="Settings" icon={Settings} />
        </nav>

        {/* Gamification Stats Footer */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-slate-900 font-bold shadow-lg shadow-yellow-500/20">
                 {user.level}
              </div>
              <div className="flex-1">
                 <div className="text-xs font-bold text-slate-400 uppercase">Level {user.level}</div>
                 <div className="text-sm font-bold text-white truncate">{currentLevelData.name}</div>
              </div>
           </div>
           <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
               <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${((user.xp - currentLevelData.minXP) / (nextLevelData.minXP - currentLevelData.minXP)) * 100}%` }}></div>
           </div>
           <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>{user.xp} XP</span>
              <span>Next: {nextLevelData.minXP}</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
           <div className="font-bold text-emerald-500 flex items-center gap-2"><Wallet/> SmartWallet</div>
           <button onClick={() => setIsDrawerOpen(true)} className="bg-emerald-500 text-white p-2 rounded-lg"><Plus size={20}/></button>
        </div>

        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-6 bg-slate-950">
           <h1 className="text-3xl font-bold text-slate-100 capitalize">{activeView}</h1>
           <button 
             onClick={() => setIsDrawerOpen(true)}
             className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
           >
             <Plus size={18} /> New Transaction
           </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           {activeView === 'dashboard' && <DashboardView />}
           {activeView === 'accounts' && <AccountsView />}
           {activeView === 'categories' && <CategoriesView />}
           {activeView === 'transactions' && <TransactionsView />}
           {activeView === 'statistics' && <StatisticsView />}
           {activeView === 'goals' && <GoalsView />}
           {activeView === 'advisor' && <AdvisorView />}
           {activeView === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Add Transaction Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsDrawerOpen(false)}>
           <div 
              className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
           >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white">New Transaction</h2>
                 <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
              </div>
              <form onSubmit={handleAddTransaction} className="p-6 space-y-6">
                 <div className="grid grid-cols-2 gap-4 p-1 bg-slate-800 rounded-xl">
                    <button type="button" onClick={() => setFormType('income')} className={`py-2 rounded-lg text-sm font-medium transition-all ${formType === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>Income</button>
                    <button type="button" onClick={() => setFormType('expense')} className={`py-2 rounded-lg text-sm font-medium transition-all ${formType === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}>Expense</button>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Amount</label>
                    <div className="relative">
                       <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                       <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-mono" placeholder="0.00" autoFocus />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Description</label>
                    <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g., Coffee" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Category</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as Category)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                       {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                 </div>
                 <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                    <Plus size={20} /> Save <span className="bg-white/20 px-2 py-0.5 rounded text-xs">+{XP_REWARDS.ADD_TRANSACTION} XP</span>
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Mobile Nav (Fallback) */}
      <div className="md:hidden fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 p-2 flex justify-around">
          <button onClick={() => setActiveView('dashboard')} className={`p-2 rounded-lg ${activeView === 'dashboard' ? 'text-emerald-500' : 'text-slate-500'}`}><LayoutGrid/></button>
          <button onClick={() => setActiveView('transactions')} className={`p-2 rounded-lg ${activeView === 'transactions' ? 'text-emerald-500' : 'text-slate-500'}`}><ArrowRight/></button>
          <button onClick={() => setActiveView('statistics')} className={`p-2 rounded-lg ${activeView === 'statistics' ? 'text-emerald-500' : 'text-slate-500'}`}><PieChartIcon/></button>
          <button onClick={() => setActiveView('settings')} className={`p-2 rounded-lg ${activeView === 'settings' ? 'text-emerald-500' : 'text-slate-500'}`}><Settings/></button>
      </div>
    </div>
  );
}