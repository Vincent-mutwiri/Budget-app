# Month-End Automation Implementation Guide

## Overview
This guide implements three critical features for SmartWallet:
1. **Budget Persistence**: Last month's budgets automatically carry over to the new month
2. **Balance Rollover**: Current Account balance transfers to Main Account at month-end
3. **Recurring Transactions**: Automatic income/expense transactions at the start of each month

---

## Current System Analysis

### Existing Components
- ✅ **RecurringTransaction Model**: Already exists with frequency, nextOccurrence, isActive fields
- ✅ **Rollover Service**: `performMonthEndRollover()` function exists
- ✅ **Budget Model**: Has userId, category, limit, spent fields
- ✅ **Account System**: Main Account and Current Account separation

### What's Missing
- ❌ Budget persistence/copying mechanism
- ❌ Automatic rollover trigger (currently manual via API)
- ❌ Recurring transaction processor
- ❌ Scheduled job runner (cron)

---

## Implementation Plan

### Phase 1: Budget Persistence System

#### 1.1 Update Budget Model
Add fields to track budget periods:

```typescript
// server/models/Budget.ts
const BudgetSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    icon: { type: String, default: 'tag' },
    
    // NEW FIELDS
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },  // 2024, 2025, etc.
    isTemplate: { type: Boolean, default: false }, // If true, this is a template for future months
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update compound index
BudgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 });
```

#### 1.2 Create Budget Persistence Service

```typescript
// server/services/budgetPersistenceService.ts
import { Budget } from '../models/Budget';

/**
 * Copies budgets from previous month to current month
 */
export async function copyBudgetsToNewMonth(userId: string, targetMonth: number, targetYear: number) {
    // Calculate previous month
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }

    // Get previous month's budgets
    const previousBudgets = await Budget.find({
        userId,
        month: prevMonth,
        year: prevYear
    });

    if (previousBudgets.length === 0) {
        console.log(`No budgets found for ${prevMonth}/${prevYear}`);
        return [];
    }

    // Check if budgets already exist for target month
    const existingBudgets = await Budget.find({
        userId,
        month: targetMonth,
        year: targetYear
    });

    if (existingBudgets.length > 0) {
        console.log(`Budgets already exist for ${targetMonth}/${targetYear}`);
        return existingBudgets;
    }

    // Create new budgets for current month
    const newBudgets = previousBudgets.map(budget => ({
        userId: budget.userId,
        category: budget.category,
        limit: budget.limit,
        spent: 0, // Reset spent to 0
        icon: budget.icon,
        month: targetMonth,
        year: targetYear,
        isTemplate: false
    }));

    const created = await Budget.insertMany(newBudgets);
    console.log(`Created ${created.length} budgets for ${targetMonth}/${targetYear}`);
    return created;
}

/**
 * Get budgets for a specific month/year
 */
export async function getBudgetsForMonth(userId: string, month: number, year: number) {
    return await Budget.find({ userId, month, year });
}

/**
 * Get current month's budgets (or create from previous month if none exist)
 */
export async function getCurrentMonthBudgets(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    let budgets = await getBudgetsForMonth(userId, currentMonth, currentYear);

    // If no budgets exist for current month, copy from previous month
    if (budgets.length === 0) {
        budgets = await copyBudgetsToNewMonth(userId, currentMonth, currentYear);
    }

    return budgets;
}
```

---

### Phase 2: Recurring Transaction Processor

#### 2.1 Create Recurring Transaction Processor Service

```typescript
// server/services/recurringTransactionProcessor.ts
import { RecurringTransaction } from '../models/RecurringTransaction';
import { Transaction } from '../models/Transaction';
import { syncCurrentAccountBalance } from './accountService';

/**
 * Calculate next occurrence date based on frequency
 */
function calculateNextOccurrence(currentDate: Date, frequency: string): Date {
    const next = new Date(currentDate);
    
    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'bi-weekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
    }
    
    return next;
}

/**
 * Process all due recurring transactions
 */
export async function processDueRecurringTransactions() {
    const now = new Date();
    
    // Find all active recurring transactions that are due
    const dueTransactions = await RecurringTransaction.find({
        isActive: true,
        nextOccurrence: { $lte: now }
    });

    console.log(`Found ${dueTransactions.length} due recurring transactions`);

    const results = [];

    for (const recurring of dueTransactions) {
        try {
            // Create actual transaction
            const transaction = new Transaction({
                userId: recurring.userId,
                amount: recurring.amount,
                category: recurring.category,
                description: `${recurring.description} (Recurring)`,
                type: recurring.type,
                date: now,
                accountType: 'current', // All recurring transactions go to current account
                isVisible: true
            });

            await transaction.save();

            // Update next occurrence
            recurring.nextOccurrence = calculateNextOccurrence(recurring.nextOccurrence, recurring.frequency);
            recurring.updatedAt = now;
            await recurring.save();

            // Sync current account balance
            await syncCurrentAccountBalance(recurring.userId);

            results.push({
                success: true,
                recurringId: recurring.id,
                transactionId: transaction.id,
                amount: recurring.amount,
                type: recurring.type
            });

            console.log(`Processed recurring transaction: ${recurring.description}`);
        } catch (error) {
            console.error(`Error processing recurring transaction ${recurring.id}:`, error);
            results.push({
                success: false,
                recurringId: recurring.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return results;
}

/**
 * Process recurring transactions for a specific user (useful for testing)
 */
export async function processUserRecurringTransactions(userId: string) {
    const now = new Date();
    
    const dueTransactions = await RecurringTransaction.find({
        userId,
        isActive: true,
        nextOccurrence: { $lte: now }
    });

    const results = [];

    for (const recurring of dueTransactions) {
        const transaction = new Transaction({
            userId: recurring.userId,
            amount: recurring.amount,
            category: recurring.category,
            description: `${recurring.description} (Recurring)`,
            type: recurring.type,
            date: now,
            accountType: 'current',
            isVisible: true
        });

        await transaction.save();

        recurring.nextOccurrence = calculateNextOccurrence(recurring.nextOccurrence, recurring.frequency);
        recurring.updatedAt = now;
        await recurring.save();

        await syncCurrentAccountBalance(recurring.userId);

        results.push({ transactionId: transaction.id, amount: recurring.amount });
    }

    return results;
}
```

---

### Phase 3: Month-End Automation Service

#### 3.1 Create Month-End Automation Service

```typescript
// server/services/monthEndAutomationService.ts
import { performMonthEndRollover } from './rolloverService';
import { copyBudgetsToNewMonth } from './budgetPersistenceService';
import { processDueRecurringTransactions } from './recurringTransactionProcessor';
import { User } from '../models/User';

/**
 * Performs complete month-end automation for a user
 */
export async function performMonthEndAutomation(userId: string) {
    console.log(`Starting month-end automation for user: ${userId}`);
    
    const results = {
        rollover: null as any,
        budgets: null as any,
        recurringTransactions: null as any,
        errors: [] as string[]
    };

    try {
        // Step 1: Rollover current account balance to main account
        console.log('Step 1: Performing balance rollover...');
        results.rollover = await performMonthEndRollover(userId);
    } catch (error) {
        const message = `Rollover failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(message);
        results.errors.push(message);
    }

    try {
        // Step 2: Copy budgets from previous month
        console.log('Step 2: Copying budgets...');
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        results.budgets = await copyBudgetsToNewMonth(userId, currentMonth, currentYear);
    } catch (error) {
        const message = `Budget copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(message);
        results.errors.push(message);
    }

    try {
        // Step 3: Process recurring transactions for the new month
        console.log('Step 3: Processing recurring transactions...');
        results.recurringTransactions = await processDueRecurringTransactions();
    } catch (error) {
        const message = `Recurring transactions failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(message);
        results.errors.push(message);
    }

    console.log(`Month-end automation completed for user: ${userId}`);
    return results;
}

/**
 * Performs month-end automation for all users
 */
export async function performMonthEndAutomationForAllUsers() {
    console.log('Starting month-end automation for all users...');
    
    // Get all unique user IDs (you might want to add pagination for large user bases)
    const users = await User.find({}).select('clerkId').lean();
    
    const results = [];
    
    for (const user of users) {
        try {
            const result = await performMonthEndAutomation(user.clerkId);
            results.push({
                userId: user.clerkId,
                success: result.errors.length === 0,
                ...result
            });
        } catch (error) {
            console.error(`Failed to process user ${user.clerkId}:`, error);
            results.push({
                userId: user.clerkId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    
    console.log(`Month-end automation completed for ${results.length} users`);
    return results;
}
```

---

### Phase 4: Scheduled Job Runner (Cron)

#### 4.1 Install node-cron

```bash
cd server
npm install node-cron
npm install --save-dev @types/node-cron
```

#### 4.2 Create Cron Job Service

```typescript
// server/services/cronService.ts
import cron from 'node-cron';
import { performMonthEndAutomationForAllUsers } from './monthEndAutomationService';
import { processDueRecurringTransactions } from './recurringTransactionProcessor';

/**
 * Initialize all scheduled jobs
 */
export function initializeCronJobs() {
    console.log('Initializing cron jobs...');

    // Job 1: Process recurring transactions daily at 12:01 AM
    cron.schedule('1 0 * * *', async () => {
        console.log('Running daily recurring transactions processor...');
        try {
            const results = await processDueRecurringTransactions();
            console.log(`Processed ${results.length} recurring transactions`);
        } catch (error) {
            console.error('Error processing recurring transactions:', error);
        }
    });

    // Job 2: Month-end automation on the 1st of every month at 12:05 AM
    cron.schedule('5 0 1 * *', async () => {
        console.log('Running month-end automation for all users...');
        try {
            const results = await performMonthEndAutomationForAllUsers();
            console.log(`Month-end automation completed for ${results.length} users`);
        } catch (error) {
            console.error('Error running month-end automation:', error);
        }
    });

    console.log('Cron jobs initialized successfully');
    console.log('- Recurring transactions: Daily at 12:01 AM');
    console.log('- Month-end automation: 1st of month at 12:05 AM');
}
```

#### 4.3 Update Server Entry Point

```typescript
// server/index.ts
// Add this import at the top
import { initializeCronJobs } from './services/cronService';

// Add this after database connection
mongoose.connect(process.env.MONGODB_URI!)
    .then(() => {
        console.log('Connected to MongoDB');
        
        // Initialize cron jobs
        initializeCronJobs();
    })
    .catch(err => console.error('MongoDB connection error:', err));
```

---

### Phase 5: API Endpoints

#### 5.1 Create Month-End Automation Routes

```typescript
// server/routes/automation.ts
import express from 'express';
import { performMonthEndAutomation } from '../services/monthEndAutomationService';
import { processDueRecurringTransactions, processUserRecurringTransactions } from '../services/recurringTransactionProcessor';
import { copyBudgetsToNewMonth, getCurrentMonthBudgets } from '../services/budgetPersistenceService';

const router = express.Router();

// Trigger month-end automation for a specific user (manual trigger)
router.post('/month-end/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const results = await performMonthEndAutomation(userId);
        res.json(results);
    } catch (error) {
        console.error('Month-end automation error:', error);
        res.status(500).json({ error: 'Failed to perform month-end automation' });
    }
});

// Process recurring transactions for a specific user
router.post('/recurring-transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const results = await processUserRecurringTransactions(userId);
        res.json({ success: true, processed: results.length, results });
    } catch (error) {
        console.error('Recurring transactions error:', error);
        res.status(500).json({ error: 'Failed to process recurring transactions' });
    }
});

// Get current month budgets (auto-creates from previous month if needed)
router.get('/budgets/current/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const budgets = await getCurrentMonthBudgets(userId);
        res.json(budgets);
    } catch (error) {
        console.error('Get current budgets error:', error);
        res.status(500).json({ error: 'Failed to get current month budgets' });
    }
});

// Copy budgets to a specific month
router.post('/budgets/copy', async (req, res) => {
    try {
        const { userId, month, year } = req.body;
        const budgets = await copyBudgetsToNewMonth(userId, month, year);
        res.json({ success: true, count: budgets.length, budgets });
    } catch (error) {
        console.error('Copy budgets error:', error);
        res.status(500).json({ error: 'Failed to copy budgets' });
    }
});

export default router;
```

#### 5.2 Register Routes in Server

```typescript
// server/index.ts
import automationRoutes from './routes/automation';

// Add this with other route registrations
app.use('/api/automation', automationRoutes);
```

---

### Phase 6: Frontend Integration

#### 6.1 Add API Functions

```typescript
// services/api.ts

// Month-end automation
export const triggerMonthEndAutomation = async (userId: string) => {
    const response = await api.post(`/automation/month-end/${userId}`);
    return response.data;
};

export const processUserRecurringTransactions = async (userId: string) => {
    const response = await api.post(`/automation/recurring-transactions/${userId}`);
    return response.data;
};

export const getCurrentMonthBudgets = async (userId: string) => {
    const response = await api.get(`/automation/budgets/current/${userId}`);
    return response.data;
};
```

#### 6.2 Update Budget Fetching

```typescript
// In App.tsx, update the budget fetching logic

// Replace getBudgets call with getCurrentMonthBudgets
const bgs = await getCurrentMonthBudgets(clerkUser.id);
```

---

## Testing Guide

### 1. Test Budget Persistence

```bash
# Create a budget for current month
POST /api/budgets
{
  "userId": "user_123",
  "category": "Groceries",
  "limit": 5000,
  "month": 12,
  "year": 2024
}

# Trigger budget copy to next month
POST /api/automation/budgets/copy
{
  "userId": "user_123",
  "month": 1,
  "year": 2025
}

# Verify budgets were copied
GET /api/automation/budgets/current/user_123
```

### 2. Test Recurring Transactions

```bash
# Create a recurring transaction
POST /api/recurring-transactions
{
  "userId": "user_123",
  "amount": 50000,
  "category": "Salary",
  "description": "Monthly Salary",
  "type": "income",
  "frequency": "monthly",
  "startDate": "2024-01-01",
  "nextOccurrence": "2024-12-01",
  "isActive": true
}

# Process recurring transactions
POST /api/automation/recurring-transactions/user_123

# Check transactions were created
GET /api/transactions?userId=user_123
```

### 3. Test Month-End Automation

```bash
# Trigger full month-end automation
POST /api/automation/month-end/user_123

# Verify:
# 1. Current account balance is 0
# 2. Main account balance increased
# 3. Budgets were copied
# 4. Recurring transactions were processed
```

---

## Deployment Checklist

- [ ] Update Budget model with month/year fields
- [ ] Create budgetPersistenceService.ts
- [ ] Create recurringTransactionProcessor.ts
- [ ] Create monthEndAutomationService.ts
- [ ] Install node-cron
- [ ] Create cronService.ts
- [ ] Update server/index.ts to initialize cron jobs
- [ ] Create automation routes
- [ ] Update frontend API functions
- [ ] Update budget fetching in App.tsx
- [ ] Test all features in development
- [ ] Run database migration to add month/year to existing budgets
- [ ] Deploy to production
- [ ] Monitor cron job execution logs

---

## Database Migration Script

```javascript
// server/migrations/add-month-year-to-budgets.js
const mongoose = require('mongoose');
const Budget = require('../models/Budget').Budget;

async function migrateBudgets() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Update all existing budgets to have current month/year
    const result = await Budget.updateMany(
        { month: { $exists: false } },
        { 
            $set: { 
                month: currentMonth,
                year: currentYear,
                isTemplate: false
            }
        }
    );
    
    console.log(`Updated ${result.modifiedCount} budgets`);
    await mongoose.disconnect();
}

migrateBudgets().catch(console.error);
```

---

## Monitoring & Maintenance

### Logs to Monitor
- Cron job execution times
- Number of recurring transactions processed
- Month-end automation success/failure rates
- Budget copy operations

### Recommended Alerts
- Alert if month-end automation fails
- Alert if recurring transactions fail to process
- Alert if budget copy fails

### Performance Considerations
- For large user bases, consider processing users in batches
- Add database indexes for month/year queries
- Consider using a job queue (Bull, BullMQ) for better reliability

---

## Summary

This implementation provides:
1. ✅ **Automatic budget persistence** - Budgets copy from previous month
2. ✅ **Automatic balance rollover** - Current Account → Main Account at month-end
3. ✅ **Automatic recurring transactions** - Income/expenses added at start of month
4. ✅ **Manual triggers** - API endpoints for testing and manual execution
5. ✅ **Scheduled automation** - Cron jobs run automatically

The system is designed to be:
- **Reliable**: Error handling and logging throughout
- **Testable**: Manual trigger endpoints for development
- **Scalable**: Batch processing support for large user bases
- **Maintainable**: Clear separation of concerns and modular design
