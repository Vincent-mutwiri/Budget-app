import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, Award, Zap, 
  PieChart as PieChartIcon, X, DollarSign, 
  Target, Brain, CreditCard, Calendar, ArrowRight, Check, Trophy
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

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'advisor'>('dashboard');
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
    // For demo purposes, simply add $100 to the goal
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const newAmount = Math.min(g.targetAmount, g.currentAmount + 100);
        notify(`Added $100 to ${g.name}`, 'success');
        return { ...g, currentAmount: newAmount };
      }
      return g;
    }));
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Charts & Transactions */}
        <div className="lg:col-span-2 space-y-6">
           <Card title="Spending Trends" icon={<TrendingUp size={16}/>}>
              <TrendChart transactions={transactions} />
           </Card>
           
           <Card title="Recent Activity" icon={<CreditCard size={16}/>}>
             <div className="flex flex-col">
               {transactions.slice(0, 4).map(t => (
                 <TransactionItem key={t.id} transaction={t} />
               ))}
             </div>
             <button 
                onClick={() => setActiveTab('transactions')}
                className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1"
             >
               View All History <ArrowRight size={14}/>
             </button>
           </Card>

           {/* Goals Section (New) */}
           <Card title="Savings Goals" icon={<Trophy size={16}/>}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} onContribute={handleContributeToGoal} />
                ))}
              </div>
           </Card>
        </div>

        {/* Right Col: Gamification & Categories */}
        <div className="space-y-6">
           {/* XP Card */}
           <Card className="border-yellow-500/20 bg-yellow-900/5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-1">Level {user.level}</p>
                  <h3 className="text-xl font-bold text-slate-100">{currentLevelData.name}</h3>
                </div>
                <Award className="text-yellow-500" size={32} />
              </div>
              <div className="mb-2 flex justify-between text-xs text-slate-400">
                 <span>{user.xp} XP</span>
                 <span>{nextLevelData.minXP} XP</span>
              </div>
              <ProgressBar current={user.xp - currentLevelData.minXP} max={nextLevelData.minXP - currentLevelData.minXP} colorClass="bg-gradient-to-r from-yellow-600 to-yellow-400" />
              <p className="text-xs text-center mt-3 text-slate-500">
                 {nextLevelData.minXP - user.xp} XP to next level
              </p>
           </Card>

           {/* Streak */}
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

           {/* Daily Challenges */}
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

           <Card title="Spending Breakdown" icon={<PieChartIcon size={16}/>}>
              <ExpensePieChart transactions={transactions} />
           </Card>
        </div>
      </div>
    </div>
  );

  const renderAdvisor = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
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

  const renderTransactions = () => (
    <div className="space-y-6 animate-fade-in">
      <Card title="Transaction History" icon={<Calendar size={16}/>}>
        <div className="flex flex-col gap-2">
          {transactions.map(t => (
            <TransactionItem key={t.id} transaction={t} />
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">
      {/* Notifications */}
      <ToastContainer notifications={notifications} remove={removeNotification} />

      {/* Level Up Modal */}
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <Confetti />
          <div className="bg-slate-900 border border-yellow-500/50 p-8 rounded-3xl max-w-md text-center shadow-2xl shadow-yellow-500/20 relative z-[101] animate-bounce-in">
             <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
               <Trophy size={48} className="text-yellow-500" />
             </div>
             <h2 className="text-4xl font-bold text-white mb-2">Level Up!</h2>
             <p className="text-xl text-yellow-400 font-medium mb-6">You are now a {currentLevelData.name}</p>
             <button 
               onClick={() => setShowLevelUp(false)}
               className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-8 py-3 rounded-xl transition-colors"
             >
               Awesome!
             </button>
          </div>
        </div>
      )}

      {/* Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Mobile Nav Toggle */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 z-50 px-4 py-3 flex justify-between items-center">
         <div className="font-bold text-emerald-500 flex items-center gap-2">
           <Wallet /> SmartWallet
         </div>
         <div className="flex items-center gap-4">
            <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-mono text-yellow-500 border border-yellow-500/20">
               Lvl {user.level}
            </div>
         </div>
      </div>

      {/* Sidebar (Desktop) & Bottom Nav (Mobile) */}
      <nav className="z-40 bg-slate-900/80 backdrop-blur border-r border-slate-800 w-full md:w-64 md:h-screen fixed md:relative bottom-0 md:bottom-auto flex md:flex-col justify-around md:justify-start p-4 md:pt-8">
        <div className="hidden md:flex items-center gap-2 px-4 mb-12 text-emerald-500 font-bold text-xl">
           <Wallet /> SmartWallet
        </div>
        
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col md:flex-row items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          <PieChartIcon size={20} /> <span className="text-xs md:text-sm font-medium">Dashboard</span>
        </button>

        <button 
           onClick={() => setActiveTab('transactions')}
           className={`flex flex-col md:flex-row items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          <CreditCard size={20} /> <span className="text-xs md:text-sm font-medium">Transactions</span>
        </button>

        <button 
           onClick={() => setActiveTab('advisor')}
           className={`flex flex-col md:flex-row items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'advisor' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
        >
          <Brain size={20} /> <span className="text-xs md:text-sm font-medium">AI Advisor</span>
        </button>
        
        {/* Quick Add Button (Mobile Only position in nav) */}
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="md:hidden -mt-8 bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-500/40"
        >
          <Plus size={24} />
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto pb-24 md:pb-8 scroll-smooth">
         <header className="hidden md:flex justify-between items-center px-8 py-6 sticky top-0 bg-slate-950/80 backdrop-blur z-30 border-b border-slate-800/50">
            <h1 className="text-2xl font-bold text-slate-100 capitalize">{activeTab}</h1>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-2">
                  <Zap size={16} className="text-orange-500" fill="currentColor"/>
                  <span className="font-bold text-slate-200">{user.streak}</span>
               </div>
               <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-full pr-4 pl-2 py-1">
                  <div className="bg-yellow-500 h-8 w-8 rounded-full flex items-center justify-center text-slate-900 font-bold text-xs">
                    {user.level}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300">{currentLevelData.name}</span>
                    <div className="w-24 h-1 bg-slate-800 rounded-full mt-1">
                       <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${((user.xp - currentLevelData.minXP) / (nextLevelData.minXP - currentLevelData.minXP)) * 100}%` }}></div>
                    </div>
                  </div>
               </div>
               <button 
                 onClick={() => setIsDrawerOpen(true)}
                 className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
               >
                 <Plus size={18} /> Add New
               </button>
            </div>
         </header>

         <div className="p-4 md:p-8 mt-16 md:mt-0">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'advisor' && renderAdvisor()}
            {activeTab === 'transactions' && renderTransactions()}
         </div>
      </main>

      {/* Add Transaction Drawer/Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 md:p-4 animate-fade-in">
           <div 
              className="bg-slate-900 w-full md:w-[500px] rounded-t-2xl md:rounded-2xl border border-slate-800 shadow-2xl animate-slide-up"
              onClick={(e) => e.stopPropagation()}
           >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white">New Transaction</h2>
                 <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
              </div>
              <form onSubmit={handleAddTransaction} className="p-6 space-y-6">
                 {/* Type Switcher */}
                 <div className="grid grid-cols-2 gap-4 p-1 bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormType('income')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${formType === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('expense')}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${formType === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      Expense
                    </button>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Amount</label>
                    <div className="relative">
                       <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                       <input 
                          type="number" 
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-lg font-mono"
                          placeholder="0.00"
                          autoFocus
                       />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Description</label>
                    <input 
                        type="text" 
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g., Starbucks Coffee"
                     />
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Category</label>
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as Category)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
                    >
                       {Object.values(Category).map(cat => (
                         <option key={cat} value={cat}>{cat}</option>
                       ))}
                    </select>
                 </div>

                 <button 
                   type="submit"
                   className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                 >
                    <Plus size={20} /> Save Transaction
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs text-emerald-50">+{XP_REWARDS.ADD_TRANSACTION} XP</span>
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}