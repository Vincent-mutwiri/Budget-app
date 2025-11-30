import { Request, Response, NextFunction } from 'express';
import { createErrorResponse, ERROR_CODES } from './errorHandler';

export const validateTransaction = (req: Request, res: Response, next: NextFunction) => {
  const { category, date, type } = req.body;
  let { amount } = req.body;

  // Convert string amount to number if needed
  if (typeof amount === 'string') {
    amount = parseFloat(amount);
    req.body.amount = amount;
  }

  if (!amount || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return res.status(400).json(
      createErrorResponse(
        'Transaction amount must be a positive number',
        ERROR_CODES.INVALID_AMOUNT
      )
    );
  }

  if (!category || typeof category !== 'string') {
    return res.status(400).json(
      createErrorResponse(
        'Category is required',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { field: 'category' }
      )
    );
  }

  if (!date) {
    return res.status(400).json(
      createErrorResponse(
        'Date is required',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { field: 'date' }
      )
    );
  }

  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json(
      createErrorResponse(
        'Type must be either "income" or "expense"',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { field: 'type', allowedValues: ['income', 'expense'] }
      )
    );
  }

  next();
};

export const validateBudget = (req: Request, res: Response, next: NextFunction) => {
  const { category, limit } = req.body;

  if (!category || typeof category !== 'string') {
    return res.status(400).json(
      createErrorResponse(
        'Category is required',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { field: 'category' }
      )
    );
  }

  if (!limit || typeof limit !== 'number' || limit <= 0) {
    return res.status(400).json(
      createErrorResponse(
        'Budget limit must be a positive number',
        ERROR_CODES.INVALID_AMOUNT,
        { field: 'limit' }
      )
    );
  }

  next();
};

export const validateGoal = (req: Request, res: Response, next: NextFunction) => {
  const { title, targetAmount, deadline } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json(
      createErrorResponse(
        'Goal title is required',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { field: 'title' }
      )
    );
  }

  if (!targetAmount || typeof targetAmount !== 'number' || targetAmount <= 0) {
    return res.status(400).json(
      createErrorResponse(
        'Target amount must be a positive number',
        ERROR_CODES.INVALID_AMOUNT,
        { field: 'targetAmount' }
      )
    );
  }

  if (!deadline) {
    return res.status(400).json(
      createErrorResponse(
        'Deadline is required',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { field: 'deadline' }
      )
    );
  }

  // Validate deadline is in the future
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate < new Date()) {
    return res.status(400).json(
      createErrorResponse(
        'Deadline must be a valid date in the future',
        ERROR_CODES.INVALID_DATE,
        { field: 'deadline' }
      )
    );
  }

  next();
};

export const validateContribution = (req: Request, res: Response, next: NextFunction) => {
  const { amount, userId } = req.body;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json(
      createErrorResponse(
        'User ID is required',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        { field: 'userId' }
      )
    );
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json(
      createErrorResponse(
        'Contribution amount must be a positive number',
        ERROR_CODES.INVALID_AMOUNT,
        { field: 'amount' }
      )
    );
  }

  next();
};