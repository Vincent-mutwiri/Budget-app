# Account Separation Feature - Implementation Roadmap

## Overview
Implement a dual-account system separating **Main Account** (long-term savings/reserves) from **Current Account** (monthly budget/operations) with special transaction tracking for debts, investments, and goals.

---

## Current System Analysis

### Existing Structure
- **Single Account Model**: All transactions affect one balance
- **Main Account**: Already exists (`Account` model with `isMain` flag)
- **Transaction Types**: Income/Expense tracked together
- **Special Entities**: Debts, Investments, Goals exist but don't affect main transactions

### Key Files
- `server/models/Account.ts` - Account schema
- `server/models/Transaction.ts` - Transaction schema
- `server/services/accountService.ts` - Account management
- `App.tsx` - Main UI with transaction views
- `components/views/` - Dashboard and transaction views

---

## Feature Requirements

### 1. Main Account (Savings/Reserve)
- Contains accumulated balance from previous months
- Excludes current month transactions
- Tracks "big player" transactions (Debt, Investment, Goal movements)
- Can lend to Current Account
- Can receive withdrawals from Debt/Investment/Goal accounts

### 2. Current Account (Monthly Operations)
- Contains current month budget
- Tracks day-to-day income/expenses
- Can borrow from Main Account
- Resets/rolls over at month end

### 3. Special Transaction Categories
- **Debt Transactions**: Payments, borrowing
- **Investment Transactions**: Deposits, withdrawals
- **Goal Transactions**: Contributions, withdrawals
- **Transfer Transactions**: Main ↔ Current, Special → Current

### 4. Transaction Visibility
- Day-to-day view: Only Current Account transactions
- Special transactions: Separate cards/sections
- Transfer transactions: Visible in both accounts

---

## Implementation Phases

## Phase 1: Database Schema Updates (Week 1)

### 1.1 Update Transaction Model
**File**: `server/models/Transaction.ts`

Add new fields:
```typescript
accountType: 'main' | 'current' | 'special'  // Which account this affects
specialCategory?: 'debt' | 'investment' | 'goal' | 'transfer'  // For special transactions
linkedEntityId?: string  // Reference to Debt/Investment/Goal
transferType?: 'borrow' | 'repay' | 'withdraw'  // For transfers
isVisible: boolean  // Show in day-to-day transactions
```

### 1.2 Update Account Model
**File**: `server/models/Account.ts`

Add new fields:
```typescript
accountCategory: 'main' | 'current'  // Distinguish account types
monthlyBudget?: number  // For current account
lastRolloverDate?: Date  // Track month-end rollovers
```

### 1.3 Create Transfer Model
**File**: `server/models/Transfer.ts` (NEW)

```typescript
{
  userId: string
  fromAccount: 'main' | 'current' | 'debt' | 'investment' | 'goal'
  toAccount: 'main' | 'current'
  amount: number
  type: 'borrow' | 'repay' | 'withdraw' | 'deposit'
  linkedEntityId?: string
  date: Date
  description: string
  status: 'pending' | 'completed' | 'cancelled'
}
```

---

## Phase 2: Backend Services (Week 2)

### 2.1 Account Service Updates
**File**: `server/services/accountService.ts`

New functions:
```typescript
- ensureCurrentAccount(userId: string)
- getCurrentAccount(userId: string)
- transferBetweenAccounts(from, to, amount, type)
- rolloverMonthEnd(userId: string)
- calculateMainAccountBalance(userId: string)
- calculateCurrentAccountBalance(userId: string)
```

### 2.2 Transaction Service
**File**: `server/services/transactionService.ts` (NEW)

```typescript
- createSpecialTransaction(type, entityId, amount)
- createTransferTransaction(from, to, amount, type)
- getVisibleTransactions(userId, accountType)
- getSpecialTransactions(userId, category)
```

### 2.3 Transfer Service
**File**: `server/services/transferService.ts` (NEW)

```typescript
- borrowFromMain(userId, amount, description)
- repayToMain(userId, amount, description)
- withdrawFromSpecial(userId, entityType, entityId, amount)
- depositToSpecial(userId, entityType, entityId, amount)
```

---

## Phase 3: API Endpoints (Week 2-3)

### 3.1 Account Endpoints
**File**: `server/index.ts`

```typescript
GET    /api/accounts/main/:userId          // Get main account
GET    /api/accounts/current/:userId       // Get current account
POST   /api/accounts/rollover              // Trigger month-end rollover
GET    /api/accounts/balance-summary/:userId  // Both accounts summary
```

### 3.2 Transfer Endpoints
```typescript
POST   /api/transfers/borrow               // Borrow from main
POST   /api/transfers/repay                // Repay to main
POST   /api/transfers/withdraw             // Withdraw from special
GET    /api/transfers/:userId              // Get transfer history
DELETE /api/transfers/:id                  // Cancel pending transfer
```

### 3.3 Transaction Endpoints Updates
```typescript
GET    /api/transactions/visible/:userId   // Only visible transactions
GET    /api/transactions/special/:userId   // Special transactions
POST   /api/transactions/special           // Create special transaction
```

---

## Phase 4: Frontend Components (Week 3-4)

### 4.1 Account Summary Component
**File**: `components/AccountSummary.tsx` (NEW)

Display:
- Main Account balance (previous months accumulation)
- Current Account balance (this month)
- Quick transfer buttons
- Month-to-date summary

### 4.2 Transfer Modal Component
**File**: `components/TransferModal.tsx` (NEW)

Features:
- Select from/to accounts
- Enter amount
- Select transfer type (borrow/repay/withdraw)
- Validation (sufficient balance)
- Confirmation

### 4.3 Special Transactions View
**File**: `components/SpecialTransactionsView.tsx` (NEW)

Sections:
- Debt Transactions card
- Investment Transactions card
- Goal Transactions card
- Transfer History card

### 4.4 Update Existing Components

**TransactionsView** (`App.tsx`):
- Filter to show only `isVisible: true` transactions
- Add "View Special Transactions" button
- Add "Transfer Money" button

**Dashboard** (`App.tsx`):
- Show both account balances
- Add account summary cards
- Update metrics to use Current Account for monthly stats

---

## Phase 5: Business Logic (Week 4)

### 5.1 Month-End Rollover Logic
**File**: `server/services/rolloverService.ts` (NEW)

Process:
1. Calculate Current Account net (income - expenses)
2. If positive: Transfer surplus to Main Account
3. If negative: Option to borrow from Main or carry deficit
4. Reset Current Account for new month
5. Update lastRolloverDate

### 5.2 Special Transaction Handlers

**Debt Payment**:
- Deduct from Current Account
- Record as special transaction
- Update debt balance
- Don't show in day-to-day transactions

**Investment Deposit**:
- Deduct from Current Account
- Record as special transaction
- Update investment value
- Don't show in day-to-day transactions

**Goal Contribution**:
- Deduct from Current Account
- Record as special transaction
- Update goal progress
- Don't show in day-to-day transactions

**Withdrawal from Special**:
- Add to Current Account
- Record as transfer transaction
- Update source entity balance
- Show in transfer history only

---

## Phase 6: UI/UX Updates (Week 5)

### 6.1 Dashboard Layout
```
┌─────────────────────────────────────────┐
│  Account Summary                        │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ Main Account │  │Current Account│   │
│  │ Ksh 50,000   │  │ Ksh 15,000    │   │
│  └──────────────┘  └──────────────┘   │
│  [Transfer] [Rollover]                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Current Month Transactions             │
│  (Day-to-day income/expenses only)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Special Transactions                   │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │  Debts   │ │Investments│ │  Goals  ││
│  └──────────┘ └──────────┘ └─────────┘│
└─────────────────────────────────────────┘
```

### 6.2 Transaction Filters
- "All Transactions" (includes special)
- "Day-to-Day" (default, visible only)
- "Special Transactions"
- "Transfers"

### 6.3 Visual Indicators
- Color coding: Main (Blue), Current (Green), Special (Purple)
- Icons for transaction types
- Transfer arrows (→ ←)

---

## Phase 7: Testing & Validation (Week 6)

### 7.1 Unit Tests
- Account balance calculations
- Transfer validations
- Rollover logic
- Special transaction creation

### 7.2 Integration Tests
- End-to-end transfer flow
- Month-end rollover
- Withdrawal from special accounts
- Balance consistency checks

### 7.3 User Acceptance Testing
- Create test scenarios
- Verify UI flows
- Check data accuracy
- Performance testing

---

## Phase 8: Migration & Deployment (Week 7)

### 8.1 Data Migration Script
**File**: `server/scripts/migrateToAccountSeparation.ts`

Steps:
1. Create Current Account for all users
2. Classify existing transactions
3. Calculate initial Main Account balance
4. Set lastRolloverDate
5. Validate data integrity

### 8.2 Deployment Checklist
- [ ] Run migration script on staging
- [ ] Verify data accuracy
- [ ] Deploy backend updates
- [ ] Deploy frontend updates
- [ ] Monitor for errors
- [ ] User communication/documentation

---

## Technical Considerations

### Balance Calculation Rules

**Main Account Balance**:
```
= Previous Main Balance
+ Income from special transactions (withdrawals)
- Expenses to special transactions (deposits)
+ Rollovers from Current Account (surplus)
- Loans to Current Account (borrowing)
+ Repayments from Current Account
```

**Current Account Balance**:
```
= Monthly Budget (if set)
+ Current Month Income (visible transactions)
- Current Month Expenses (visible transactions)
+ Borrowed from Main Account
- Repaid to Main Account
+ Withdrawn from Special Accounts
```

### Transaction Visibility Rules

**Visible in Day-to-Day**:
- Regular income/expenses
- Current Account transactions
- `isVisible: true`

**Hidden from Day-to-Day**:
- Debt payments
- Investment deposits
- Goal contributions
- Internal transfers
- `isVisible: false`

**Special Transaction View**:
- All special category transactions
- Grouped by type (Debt/Investment/Goal)
- Transfer history

---

## API Response Examples

### Account Summary
```json
{
  "mainAccount": {
    "balance": 50000,
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "currentAccount": {
    "balance": 15000,
    "monthlyBudget": 20000,
    "monthToDate": {
      "income": 25000,
      "expenses": 10000
    }
  },
  "canBorrow": 50000,
  "pendingTransfers": []
}
```

### Transfer Request
```json
{
  "fromAccount": "main",
  "toAccount": "current",
  "amount": 5000,
  "type": "borrow",
  "description": "Emergency expense coverage"
}
```

---

## Database Indexes

Add for performance:
```javascript
// Transactions
{ userId: 1, accountType: 1, date: -1 }
{ userId: 1, isVisible: 1, date: -1 }
{ userId: 1, specialCategory: 1, date: -1 }

// Transfers
{ userId: 1, date: -1 }
{ userId: 1, status: 1 }

// Accounts
{ userId: 1, accountCategory: 1 }
```

---

## Success Metrics

- [ ] Users can distinguish Main vs Current Account
- [ ] Special transactions don't clutter day-to-day view
- [ ] Transfer flow is intuitive (< 3 clicks)
- [ ] Month-end rollover works automatically
- [ ] Balance calculations are accurate
- [ ] No performance degradation
- [ ] User satisfaction > 80%

---

## Future Enhancements

1. **Auto-Budget Allocation**: Automatically split income between accounts
2. **Savings Goals**: Auto-transfer to Main Account
3. **Overdraft Protection**: Auto-borrow from Main when Current is low
4. **Multiple Current Accounts**: Different budgets (Personal, Business)
5. **Investment Auto-Deposit**: Scheduled transfers to investments
6. **Debt Snowball**: Auto-allocate surplus to debt payments

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Database Schema | 1 week | Updated models |
| 2. Backend Services | 1 week | Core logic |
| 3. API Endpoints | 1-2 weeks | REST APIs |
| 4. Frontend Components | 1-2 weeks | UI components |
| 5. Business Logic | 1 week | Rollover, transfers |
| 6. UI/UX Updates | 1 week | Polished interface |
| 7. Testing | 1 week | QA complete |
| 8. Migration & Deploy | 1 week | Production ready |

**Total Estimated Time**: 7-9 weeks

---

## Risk Mitigation

1. **Data Loss**: Comprehensive backups before migration
2. **Balance Errors**: Extensive validation and reconciliation
3. **User Confusion**: Clear documentation and onboarding
4. **Performance**: Optimize queries, add caching
5. **Rollback Plan**: Keep old system accessible for 1 month

---

## Documentation Needs

- [ ] User Guide: Account separation explained
- [ ] API Documentation: New endpoints
- [ ] Migration Guide: For existing users
- [ ] Developer Docs: Architecture changes
- [ ] FAQ: Common questions

---

## Next Steps

1. **Review & Approve** this roadmap
2. **Set up project board** (Trello/Jira)
3. **Assign tasks** to team members
4. **Create feature branch**: `feature/account-separation`
5. **Start Phase 1**: Database schema updates
