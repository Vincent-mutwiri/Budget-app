# Centralized Account System

## Overview
The SmartWallet app now uses a centralized main account system where all financial activity flows through a designated main account.

## How It Works

### Main Account
- Every user has exactly one main account (automatically created on signup)
- All income transactions add money to the main account
- All expense transactions deduct money from the main account
- Goal contributions are deducted from the main account

### Additional Accounts
- Users can create additional accounts (savings, checking, etc.)
- When money is added to non-main accounts, it automatically transfers to the main account
- Non-main accounts maintain a balance of 0 after transfers
- This ensures all money is centralized in the main account

### Automatic Behaviors
1. **New User Registration**: Automatically creates a "Main Account" 
2. **Transaction Creation**: Updates main account balance automatically
3. **Transaction Updates**: Adjusts main account balance based on changes
4. **Transaction Deletion**: Reverses main account balance changes
5. **Account Creation**: Transfers any initial balance to main account (if not main)
6. **Goal Contributions**: Deducted from main account balance

### API Changes
- `POST /api/accounts` - Handles main account designation and balance transfers
- `PUT /api/accounts/:id` - Updates accounts and handles main account changes
- `PATCH /api/accounts/:id/set-main` - Changes which account is the main account
- All transaction endpoints automatically sync with main account

### Frontend Changes
- Account creation form includes "Set as main account" checkbox
- Account forms show main account designation
- Balance calculations use main account as source of truth

## Benefits
1. **Simplified Balance Tracking**: Single source of truth for user's total money
2. **Automatic Centralization**: No manual transfers needed
3. **Consistent Financial View**: All transactions reflect in one place
4. **Goal Management**: Clear understanding of available funds for goals