import { useState, useCallback } from 'react';
import { Transaction } from '../types';
import { createTransaction } from '../services/api';
import { cache } from '../utils/cache';

export const useTransactions = (userId: string | undefined) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTransaction = useCallback(async (newTx: Omit<Transaction, 'id'>) => {
    if (!userId) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticTx = { ...newTx, id: tempId };
    setTransactions(prev => [optimisticTx as Transaction, ...prev]);

    try {
      const savedTx = await createTransaction({ ...newTx, userId });
      setTransactions(prev => prev.map(t => t.id === tempId ? savedTx : t));
      
      const updatedTransactions = [savedTx, ...transactions.filter(t => t.id !== tempId)];
      cache.set(`transactions_${userId}`, updatedTransactions);
      
      return savedTx;
    } catch (err) {
      setTransactions(prev => prev.filter(t => t.id !== tempId));
      setError('Failed to add transaction');
      throw err;
    }
  }, [userId, transactions]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    transactions,
    setTransactions,
    addTransaction,
    deleteTransaction,
    isLoading,
    setIsLoading,
    error,
    setError
  };
};