import { Request, Response, NextFunction } from 'express';

// Standard error codes for consistent client handling
export const ERROR_CODES = {
  // Validation errors (400)
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_GOAL_STATUS: 'INVALID_GOAL_STATUS',

  // Authorization errors (403)
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Not found errors (404)
  BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Business logic errors (400)
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',

  // Server errors (500)
  SERVER_ERROR: 'SERVER_ERROR',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

// Standard error response interface
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp?: string;
}

// Create standardized error response
export const createErrorResponse = (
  error: string,
  code: string,
  details?: any
): ErrorResponse => {
  const response: ErrorResponse = {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return response;
};

// Enhanced error handler with consistent format and logging
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log error with request context
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    code: err.code || 'UNKNOWN'
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || ERROR_CODES.SERVER_ERROR;

  const errorResponse = createErrorResponse(message, code, err.details);

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    (errorResponse as any).stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error: any = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};