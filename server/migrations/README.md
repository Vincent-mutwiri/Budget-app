# Database Migrations

This directory contains database migration scripts for the Budget App.

## Migration 001: Add Schema Fields

This migration adds new fields to existing models to support enhanced features:

### Changes

**Budget Model:**
- `updatedAt`: Timestamp for tracking budget modifications

**SavingsGoal Model:**
- `contributions`: Array to track individual contributions to goals
- `updatedAt`: Timestamp for tracking goal modifications

**User Model:**
- `totalBalance`: Current total balance for goal contributions
- `lastTransactionDate`: Date of last transaction for streak tracking
- `previousMonthsBalance`: Balance carried forward from previous months
- `monthlyBalanceHistory`: Array tracking monthly income, expenses, and balance

**Transaction Model:**
- `xpAwarded`: XP points awarded for this transaction

### Indexes Created

For performance optimization, the following compound indexes are created:

- **Transaction**: `{ userId: 1, date: -1 }` - Optimizes queries for user transactions by date
- **Budget**: `{ userId: 1, category: 1 }` - Optimizes queries for user budgets by category
- **SavingsGoal**: `{ userId: 1, status: 1 }` - Optimizes queries for user goals by status

## Running Migrations

### Prerequisites

Ensure your MongoDB connection string is set in the `.env` file:

```
MONGODB_URI=mongodb://localhost:27017/budget-app
```

### Apply Migration (Up)

To apply the migration and add the new fields:

```bash
cd server
npx ts-node migrations/run-migration.ts up
```

### Rollback Migration (Down)

To rollback the migration and remove the added fields:

```bash
cd server
npx ts-node migrations/run-migration.ts down
```

## Notes

- The migration is idempotent - running it multiple times won't cause issues
- Existing documents will have default values set for new fields
- Indexes are created if they don't already exist
- Always backup your database before running migrations in production
