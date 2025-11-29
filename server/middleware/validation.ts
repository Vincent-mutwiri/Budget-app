import { Request, Response, NextFunction } from 'express';

export const validateTransaction = (req: Request, res: Response, next: NextFunction) => {
  const { amount, category, date, type } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }
  
  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }
  
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }
  
  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Valid type is required' });
  }
  
  next();
};

export const validateBudget = (req: Request, res: Response, next: NextFunction) => {
  const { category, limit } = req.body;
  
  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }
  
  if (!limit || limit <= 0) {
    return res.status(400).json({ error: 'Valid limit is required' });
  }
  
  next();
};