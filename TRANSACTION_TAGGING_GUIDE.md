# Transaction Tagging System

## Overview
The app uses an account separation system to distinguish between normal daily transactions and big financial commitments.

## Account Types

### 1. **Current Account** (`accountType: 'current'`)
- **Purpose**: Day-to-day spending and income
- **Examples**:
  - Groceries
  - Utilities
  - Transportation
  - Entertainment
  - Salary/wages
  - Regular bills
- **Visibility**: Visible in transaction history
- **Default**: All normal transactions default to this account

### 2. **Main Account** (`accountType: 'main'`)
- **Purpose**: Big financial commitments and long-term goals
- **Examples**:
  - Debt payments
  - Investment contributions
  - Savings goal deposits
  - Large one-time expenses
- **Visibility**: Can be hidden from day-to-day view
- **Usage**: Automatically set for special transactions (debt, investment, goals)

### 3. **Special Account** (`accountType: 'special'`)
- **Purpose**: Internal system transactions
- **Examples**:
  - Transfers between accounts
  - System-generated transactions
- **Visibility**: Hidden from normal transaction views
- **Usage**: Reserved for system use

## Implementation

### Creating Normal Transactions
```javascript
// Normal daily transaction - automatically tagged as 'current'
const transaction = {
  userId: 'user123',
  amount: 50.00,
  description: 'Grocery shopping',
  category: 'Groceries',
  type: 'expense',
  date: new Date()
  // accountType defaults to 'current'
};
```

### Creating Special Transactions (Debt/Investment/Goals)
```javascript
// Big expense - automatically tagged as 'main'
const specialTransaction = {
  userId: 'user123',
  amount: 500.00,
  description: 'Debt payment',
  category: 'Debt Repayment',
  type: 'expense',
  date: new Date(),
  specialCategory: 'debt',
  linkedEntityId: 'debt123'
  // accountType automatically set to 'main'
};
```

## Balance Calculation

### Current Account Balance
```
Current Balance = (Current Income) - (Current Expenses)
```
Includes all normal daily transactions.

### Main Account Balance
```
Main Balance = (Main Income) - (Main Expenses) + Transfers In - Transfers Out
```
Includes debt payments, investments, and goal contributions.

## Migration Notes

If you have existing transactions that are incorrectly tagged:
1. Normal daily transactions should have `accountType: 'current'`
2. Debt/investment/goal transactions should have `accountType: 'main'`
3. Run the migration script to fix existing data (if needed)

## Summary

✅ **Normal daily transactions** → `current` account tag  
✅ **Big expenses (debt, investment, goals)** → `main` account tag  
✅ **System transfers** → `special` account tag
