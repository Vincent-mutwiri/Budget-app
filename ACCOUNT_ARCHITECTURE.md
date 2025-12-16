# Account Architecture

## Overview

The SmartWallet app uses a three-tier account system to separate different types of financial activities.

## Account Types

### 1. Main Account
- **Purpose**: Long-term savings and wealth accumulation
- **Interactions**:
  - Receives income from external sources
  - Lends money to Current Account (borrow)
  - Receives repayments from Current Account
  - Contributes to Special Accounts (Goals, Investments, Debts)
  - Receives withdrawals from Special Accounts

### 2. Current Account (Monthly Budget & Operations)
- **Purpose**: Day-to-day spending and monthly budget management
- **Interactions**:
  - Borrows money from Main Account when needed
  - Handles all day-to-day expenses
  - Repays surplus back to Main Account
  - **Does NOT interact with Special Accounts**

### 3. Special Accounts
- **Types**: Savings Goals, Investments, Debt Tracker
- **Purpose**: Track specific financial objectives
- **Interactions**:
  - Receive contributions from Main Account only
  - Send withdrawals to Main Account only
  - **Do NOT interact with Current Account**

## Money Flow

```
External Income → Current Account (Liquid Cash)
                       ↓
                  Expenses OR
                       ↓
                  Transfer to Main (Savings)
                       ↓
                  Main Account
                       ↓
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    Goals      Investments        Debts
        ↓              ↓              ↓
    Withdraw ← ← ← ← ← ← ← ← ← ← ← ←┘
        ↓
    Main Account
        ↓
    Transfer to Current (when needed)
```

### Key Principles

1. **Current Account = Entry Point**: All income enters through Current Account (liquid cash)
2. **One-Way Flow**: Money flows Current → Main → Special, then back through Main → Current
3. **Independent Balances**: Current Account balance is independent of Main Account
4. **Transfer Visibility**: Internal transfers are hidden from day-to-day transaction view
5. **Traceability**: Each transfer creates a clear audit trail

## Implementation Details

### Current Account Balance (Liquid Cash)
```
Balance = Income - Expenses - Transfers to Main + Transfers from Main
```
- All regular income/expense transactions
- Transfers TO Main (saving money)
- Transfers FROM Main (borrowing money back)
- Independent of Main Account balance

### Main Account Balance (Savings)
```
Balance = Transfers from Current + Withdrawals from Special
          - Transfers to Current - Contributions to Special
```
- Receives transfers from Current (savings)
- Sends transfers to Current (when needed)
- Contributes to Special Accounts
- Receives withdrawals from Special Accounts

### Special Account Balances
- Calculated within each entity (Goal, Investment, Debt)
- Updated when contributions/withdrawals occur
- Independent of transfer records

## Migration Notes

- Existing withdrawals from Special Accounts to Current have been migrated to Main
- Transfer visibility has been updated to hide internal transfers
- Account balances have been recalculated to reflect the new architecture
