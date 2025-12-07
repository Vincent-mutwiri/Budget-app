import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface DashboardPasswordGateProps {
  onAuthenticated: () => void;
  userId: string;
}

const CORRECT_PASSWORD = 'Mutwiri@2026*';

export const DashboardPasswordGate: React.FC<DashboardPasswordGateProps> = ({ onAuthenticated, userId }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already authenticated in this session
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem(`dashboard_auth_${userId}`);
    if (isAuthenticated === 'true') {
      onAuthenticated();
    }
  }, [userId, onAuthenticated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        sessionStorage.setItem(`dashboard_auth_${userId}`, 'true');
        onAuthenticated();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-forest-950 flex items-center justify-center z-50 p-4">
      <div className="bg-forest-800 border border-forest-700 rounded-3xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Lock size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Dashboard Access</h2>
          <p className="text-forest-400 text-center text-sm">
            Enter your password to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-forest-300 text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 pr-12 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                placeholder="Enter password"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-rose-500 flex items-center gap-1">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!password || isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Unlock Dashboard'}
          </button>
        </form>

        <p className="mt-4 text-xs text-forest-500 text-center">
          This password is required for additional security
        </p>
      </div>
    </div>
  );
};
