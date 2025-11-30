# Database Schema Updates - Migration Summary

## Overview

This document summarizes the database schema updates implemented for the Budget App bug fixes and enhancements.

## Schema Changes

### 1. Budget Model (`server/models/Budget.ts`)

**New Fields:**
- `updatedAt: Date` - Tracks when the budget was last modified (default: Date.now)

**New Indexes:**
- Compound index: `{ userId: 1, category: 1 }` - Optimizes budget queries by user and category

**Purpose:** Enables budget editing functionality and tracks modification history.

---

### 2. SavingsGoal Model (`server/models/SavingsGoal.ts`)

**New Fields:**
- `contributions: Array<{ amount: Number, date: Date, note?: String }>` - Tracks individual contributions to the goal
- `updatedAt: Date` - Tracks when the goal was last modified (default: Date.now)

**New Indexes:**
- Compound index: `{ userId: 1, status: 1 }` - Optimizes goal queries by user and status

**Purpose:** Enables goal contribution tracking and proper balance management.

---

### 3. User Model (`server/models/User.ts`)

**New Fields:**
- `totalBalance: Number` - Current total balance available for goal contributions (default: 0)
- `lastTransactionDate: Date` - Date of the user's last transaction for streak tracking
- `previousMonthsBalance: Number` - Balance carried forward from previous months (default: 0)
- `monthlyBalanceHistory: Array<{ month: Date, income: Number, expenses: Number, balance: Number }>` - Historical monthly balance data

**Purpose:** Enables accurate financial metrics calculation, goal contribution management, and gamification streak tracking.

---

### 4. Transaction Model (`server/models/Transaction.ts`)

**New Fields:**
- `xpAwarded: Number` - XP points awarded for this transaction (default: 0)

**New Indexes:**
- Compound index: `{ userId: 1, date: -1 }` - Optimizes transaction queries by user and date (descending)

**Purpose:** Tracks gamification rewards and enables same-day transaction bonus calculations.

---

## TypeScript Type Updates

### Backend Types (`server/types.ts`)

Updated interfaces to match schema changes:
- `Transaction` - Added `xpAwarded?: number`
- `Budget` - Added `updatedAt?: string`
- `SavingsGoal` - Added `contributions?: GoalContribution[]` and `updatedAt?: string`
- `UserState` - Added `totalBalance`, `lastTransactionDate`, `previousMonthsBalance`, `monthlyBalanceHistory`
- Added new interface: `GoalContribution`
- Added new interface: `MonthlyBalance`

### Frontend Types (`types.ts`)

Updated interfaces to match backend:
- `Transaction` - Added `xpAwarded?: number`
- `Budget` - Added `updatedAt?: string`
- `SavingsGoal` - Added `contributions?: GoalContribution[]` and `updatedAt?: string`
- `UserState` - Added `totalBalance`, `lastTransactionDate`, `previousMonthsBalance`, `monthlyBalanceHistory`
- Added new interface: `GoalContribution`
- Added new interface: `MonthlyBalance`

---

## Performance Optimizations

### Database Indexes

Three compound indexes were added to optimize common query patterns:

1. **Transaction Index:** `{ userId: 1, date: -1 }`
   - Optimizes: Fetching user transactions sorted by date
   - Use case: Transaction history, monthly calculations

2. **Budget Index:** `{ userId: 1, category: 1 }`
   - Optimizes: Finding specific user budgets by category
   - Use case: Budget updates, spending calculations

3. **SavingsGoal Index:** `{ userId: 1, status: 1 }`
   - Optimizes: Filtering user goals by status
   - Use case: Active goals display, goal completion tracking

---

## Migration Files

### Created Files:

1. `server/migrations/001_add_schema_fields.ts` - Main migration script
2. `server/migrations/run-migration.ts` - Migration runner
3. `server/migrations/README.md` - Migration documentation

### Migration Features:

- **Idempotent:** Safe to run multiple times
- **Reversible:** Includes rollback functionality (`down` method)
- **Safe Defaults:** Sets appropriate default values for existing documents
- **Index Management:** Creates and drops indexes as needed

---

## Requirements Addressed

This schema update addresses the following requirements from the spec:

- **1.1-1.4:** Budget editing and tracking (updatedAt field)
- **3.1-3.4:** Same-day transaction gamification (xpAwarded field)
- **6.1-6.4:** Goal image management (updatedAt field)
- **7.1-7.3:** Goal updates (updatedAt field)
- **8.1-8.3:** Total income calculation (balance tracking fields)
- **14.1-14.5:** Goal contributions (contributions array, totalBalance)

---

## Next Steps

After running the migration:

1. Test budget editing functionality
2. Test goal contribution flow
3. Test transaction XP calculation
4. Verify financial metrics calculations
5. Monitor query performance with new indexes

---

## Rollback Plan

If issues arise, the migration can be rolled back using:

```bash
cd server
npx ts-node migrations/run-migration.ts down
```

This will:
- Remove all added fields from documents
- Drop all created indexes
- Restore the database to its previous state

**Note:** Always backup your database before running migrations in production.
