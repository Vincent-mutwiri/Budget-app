# Design Document

## Overview

This design document outlines the technical approach for fixing critical bugs and implementing improvements to the Budget App. The solution focuses on enhancing existing components, adding new API endpoints, implementing proper state management, and ensuring data consistency across the application.

The design addresses 14 key requirements organized into 5 main areas:
1. Budget Management (editing and calculations)
2. Transaction Management (bulk entry, deletion safety, gamification)
3. Goals Management (UI cleanup, image handling, contributions)
4. Financial Metrics (income, spending, savings calculations)
5. Gamification Integration (budget adherence rewards)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  App.tsx                                                     │
│  ├── DashboardView (Financial Metrics Display)              │
│  ├── TransactionsView (Bulk Entry, Deletion)                │
│  ├── BudgetsView (Edit, Total Planned Budget)               │
│  ├── GoalsView (Image Management, Contributions)            │
│  └── GamificationView (XP Rewards, Streaks)                 │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                              │
│  ├── api.ts (API calls)                                     │
│  ├── gamificationService.ts (XP calculations)               │
│  └── metricsCalculator.ts (Financial calculations)          │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express + MongoDB)               │
├─────────────────────────────────────────────────────────────┤
│  API Endpoints                                               │
│  ├── PUT /api/budgets/:id (Update budget)                   │
│  ├── DELETE /api/transactions/:id (Delete single)           │
│  ├── POST /api/transactions (With gamification)             │
│  ├── PUT /api/goals/:id (Update goal)                       │
│  ├── POST /api/goals/:id/contribute (Contribute to goal)    │
│  ├── DELETE /api/goals/:id/image (Remove goal image)        │
│  └── GET /api/metrics/:userId (Financial metrics)           │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  ├── gamificationEngine.ts (XP rewards logic)               │
│  ├── metricsService.ts (Calculations)                       │
│  └── imageService.ts (S3 image management)                  │
├─────────────────────────────────────────────────────────────┤
│  Models                                                      │
│  ├── Budget (with updatedAt)                                │
│  ├── Transaction (with createdAt tracking)                  │
│  ├── SavingsGoal (with contributions array)                 │
│  └── User (with totalBalance, lastTransactionDate)          │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                          │
│  Collections: users, transactions, budgets, goals            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Budget Management

#### Frontend Components

**BudgetsView Component Enhancement**
- Add edit mode state for each budget item
- Display total planned budget (sum of all limits)
- Show remaining budget calculation

```typescript
interface BudgetEditState {
  budgetId: string;
  isEditing: boolean;
  editedLimit: number;
}

interface BudgetsViewProps {
  budgets: Budget[];
  onUpdateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  totalPlannedBudget: number;
  remainingBudget: number;
}
```

#### Backend API Endpoints

**PUT /api/budgets/:id**
- Update budget limit and recalculate spent percentage
- Validate that limit is positive
- Return updated budget with calculations

```typescript
interface UpdateBudgetRequest {
  limit?: number;
  category?: string;
  icon?: string;
}

interface UpdateBudgetResponse {
  budget: Budget;
  totalPlannedBudget: number;
  utilizationPercentage: number;
}
```

#### Database Schema Updates

```typescript
// Budget Model Enhancement
const BudgetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  icon: { type: String, default: 'tag' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // NEW
});
```

### 2. Transaction Management

#### Bulk Entry Enhancement

**TransactionsView Component**
- Persist date field after form submission
- Clear only amount, category, and description
- Add visual indicator for retained date

```typescript
interface TransactionFormState {
  type: TransactionType;
  amount: string;
  category: Category | '';
  date: string; // Persisted across submissions
  description: string;
  retainDate: boolean; // User preference
}
```

#### Deletion Safety

**Transaction Deletion Flow**
- Add confirmation modal before deletion
- Use transaction ID for precise deletion
- Update all related metrics after deletion

```typescript
interface DeleteTransactionRequest {
  transactionId: string; // Unique identifier
  userId: string; // For validation
}

interface DeleteTransactionResponse {
  success: boolean;
  updatedMetrics: {
    budgets: Budget[];
    monthlySpending: number;
    totalIncome: number;
  };
}
```

#### Same-Day Gamification

**Gamification Logic**
- Compare transaction date with current date
- Award bonus XP for same-day logging
- Track same-day logging streak

```typescript
interface TransactionGamificationReward {
  baseXP: number;
  sameDayBonus: number;
  totalXP: number;
  streakBonus: number;
  newStreak: number;
}

function calculateTransactionXP(
  transactionDate: Date,
  currentDate: Date,
  userStreak: number
): TransactionGamificationReward {
  const baseXP = 10;
  const isSameDay = isSameDateAs(transactionDate, currentDate);
  const sameDayBonus = isSameDay ? 15 : 0;
  const streakBonus = isSameDay ? userStreak * 2 : 0;
  
  return {
    baseXP,
    sameDayBonus,
    totalXP: baseXP + sameDayBonus + streakBonus,
    streakBonus,
    newStreak: isSameDay ? userStreak + 1 : 0
  };
}
```

### 3. Goals Management

#### UI Cleanup

**GoalsView Component**
- Remove duplicate "Add New Goal" button
- Consolidate to single button in header
- Ensure consistent styling

#### Image Management

**Goal Image Upload Fix**
- Validate file type (jpg, png, webp)
- Validate file size (max 5MB)
- Handle upload errors gracefully
- Store image URL in database

```typescript
interface GoalImageUpload {
  file: File;
  goalId: string;
}

interface GoalImageResponse {
  imageUrl: string;
  thumbnailUrl?: string;
}
```

**Goal Image Removal**
- Add remove button on goal cards with images
- Delete image from S3
- Revert to default image URL
- Update database record

```typescript
interface RemoveGoalImageRequest {
  goalId: string;
  userId: string;
}

interface RemoveGoalImageResponse {
  success: boolean;
  defaultImageUrl: string;
}
```

#### Goal Contributions

**Contribution Flow**
- Display contribution modal with input
- Validate contribution amount against available balance
- Deduct from user's total balance
- Add to goal's current amount
- Track contribution history

```typescript
interface GoalContribution {
  goalId: string;
  userId: string;
  amount: number;
  date: Date;
}

interface ContributeToGoalRequest {
  goalId: string;
  userId: string;
  amount: number;
}

interface ContributeToGoalResponse {
  success: boolean;
  updatedGoal: SavingsGoal;
  newBalance: number;
  contribution: GoalContribution;
}
```

#### Database Schema Updates

```typescript
// SavingsGoal Model Enhancement
const SavingsGoalSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline: { type: Date, required: true },
  imageUrl: { type: String },
  status: { type: String, enum: ['in-progress', 'completed', 'archived'], default: 'in-progress' },
  contributions: [{ // NEW
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // NEW
});
```

### 4. Financial Metrics

#### Metrics Calculator Service

**Core Calculations**

```typescript
interface FinancialMetrics {
  // Income
  currentMonthIncome: number;
  overallTotalIncome: number; // Includes previous months' remainders
  previousMonthsRemainder: number;
  
  // Spending
  currentMonthSpending: number;
  
  // Savings
  monthlySavings: number; // currentMonthIncome - currentMonthSpending
  
  // Budget
  totalPlannedBudget: number; // Sum of all budget limits
  remainingBudget: number; // totalPlannedBudget - currentMonthSpending
  budgetUtilization: number; // (currentMonthSpending / totalPlannedBudget) * 100
  
  // Trend
  trendPositive: boolean; // currentMonthSpending <= totalPlannedBudget
  trendPercentage: number;
}

class MetricsCalculator {
  async calculateMetrics(userId: string, month: Date): Promise<FinancialMetrics> {
    // Implementation details in next section
  }
}
```

#### Metrics API Endpoint

**GET /api/metrics/:userId**
- Calculate all financial metrics
- Support optional month parameter
- Cache results for performance

```typescript
interface MetricsRequest {
  userId: string;
  month?: string; // ISO date string, defaults to current month
}

interface MetricsResponse {
  metrics: FinancialMetrics;
  calculatedAt: Date;
}
```

#### User Model Enhancement

```typescript
// User Model Enhancement
const UserSchema = new mongoose.Schema({
  // ... existing fields
  totalBalance: { type: Number, default: 0 }, // NEW - for goal contributions
  lastTransactionDate: { type: Date }, // NEW - for streak tracking
  previousMonthsBalance: { type: Number, default: 0 }, // NEW - carried forward
  monthlyBalanceHistory: [{ // NEW
    month: { type: Date },
    income: { type: Number },
    expenses: { type: Number },
    balance: { type: Number }
  }]
});
```

### 5. Gamification Integration

#### Budget Adherence Rewards

**Reward Triggers**
- Daily: Stay within any category budget
- Weekly: Stay within 3+ category budgets
- Monthly: Stay within total planned budget

```typescript
interface BudgetAdherenceReward {
  type: 'daily' | 'weekly' | 'monthly';
  xpAwarded: number;
  categoriesWithinBudget: string[];
  achievementUnlocked?: string;
}

class GamificationEngine {
  async checkBudgetAdherence(userId: string): Promise<BudgetAdherenceReward[]> {
    // Check budget status
    // Award XP based on adherence
    // Update user XP and level
    // Return rewards
  }
}
```

#### XP Calculation Rules

```typescript
const XP_REWARDS = {
  TRANSACTION_BASE: 10,
  SAME_DAY_BONUS: 15,
  STREAK_MULTIPLIER: 2,
  BUDGET_ADHERENCE_DAILY: 20,
  BUDGET_ADHERENCE_WEEKLY: 50,
  BUDGET_ADHERENCE_MONTHLY: 150,
  GOAL_CONTRIBUTION: 25,
  GOAL_COMPLETED: 200
};
```

## Data Models

### Updated Models

#### Budget Model
```typescript
interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent: number;
  icon: string;
  createdAt: Date;
  updatedAt: Date; // NEW
}
```

#### Transaction Model
```typescript
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  type: 'income' | 'expense';
  createdAt: Date; // Used for same-day detection
  xpAwarded?: number; // NEW - track XP from this transaction
}
```

#### SavingsGoal Model
```typescript
interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  imageUrl: string;
  status: 'in-progress' | 'completed' | 'archived';
  contributions: GoalContribution[]; // NEW
  createdAt: Date;
  updatedAt: Date; // NEW
}

interface GoalContribution {
  amount: number;
  date: Date;
  note?: string;
}
```

#### User Model
```typescript
interface User {
  clerkId: string;
  email: string;
  fullName: string;
  xp: number;
  level: number;
  streak: number;
  totalBalance: number; // NEW
  lastTransactionDate: Date; // NEW
  previousMonthsBalance: number; // NEW
  monthlyBalanceHistory: MonthlyBalance[]; // NEW
}

interface MonthlyBalance {
  month: Date;
  income: number;
  expenses: number;
  balance: number;
}
```

## Error Handling

### Validation Rules

**Budget Updates**
- Limit must be positive number
- Category must exist
- User must own the budget

**Transaction Deletion**
- Transaction ID must exist
- User must own the transaction
- Confirm before deletion

**Goal Contributions**
- Amount must be positive
- Amount must not exceed available balance
- Goal must be in 'in-progress' status
- User must own the goal

**Image Uploads**
- File type: jpg, jpeg, png, webp only
- Max size: 5MB
- Valid image format

### Error Responses

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}

// Example error codes
const ERROR_CODES = {
  BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE'
};
```

## Testing Strategy

### Unit Tests

**Metrics Calculator**
- Test income calculations (current month, overall)
- Test spending calculations
- Test savings calculations
- Test budget calculations
- Test trend calculations
- Test edge cases (no transactions, negative values)

**Gamification Engine**
- Test same-day XP calculation
- Test streak tracking
- Test budget adherence rewards
- Test XP accumulation and leveling

**API Endpoints**
- Test budget update endpoint
- Test transaction deletion endpoint
- Test goal contribution endpoint
- Test image upload/removal endpoints
- Test metrics endpoint

### Integration Tests

**Transaction Flow**
- Create transaction → Update budgets → Award XP → Update metrics
- Delete transaction → Update budgets → Recalculate metrics

**Goal Contribution Flow**
- Contribute to goal → Deduct from balance → Update goal progress → Award XP

**Budget Update Flow**
- Update budget limit → Recalculate utilization → Update trend

### End-to-End Tests

**User Scenarios**
1. User adds multiple transactions for same date
2. User edits budget and sees updated metrics
3. User contributes to goal and sees balance decrease
4. User deletes transaction and sees metrics update
5. User uploads goal image successfully
6. User earns XP for same-day transaction logging

### Manual Testing Checklist

- [ ] Budget edit form displays current values
- [ ] Total planned budget updates when budgets change
- [ ] Transaction date persists after submission
- [ ] Only selected transaction is deleted
- [ ] Only one "Add New Goal" button visible
- [ ] Goal image upload works with valid files
- [ ] Goal image removal works and shows default
- [ ] Contribute button deducts from balance
- [ ] Same-day transactions award bonus XP
- [ ] Monthly spending shows correct amount
- [ ] Savings calculation is accurate
- [ ] Trend indicator shows correct status
- [ ] Remaining budget calculates correctly

## Performance Considerations

### Caching Strategy

**Metrics Caching**
- Cache financial metrics for 5 minutes
- Invalidate cache on transaction/budget changes
- Use Redis or in-memory cache

```typescript
const CACHE_KEYS = {
  METRICS: (userId: string, month: string) => `metrics:${userId}:${month}`,
  BUDGETS: (userId: string) => `budgets:${userId}`,
  GOALS: (userId: string) => `goals:${userId}`
};

const CACHE_TTL = {
  METRICS: 300, // 5 minutes
  BUDGETS: 600, // 10 minutes
  GOALS: 600 // 10 minutes
};
```

### Database Optimization

**Indexes**
- Add compound index on transactions: `{ userId: 1, date: -1 }`
- Add compound index on budgets: `{ userId: 1, category: 1 }`
- Add index on goals: `{ userId: 1, status: 1 }`

**Query Optimization**
- Use aggregation pipeline for metrics calculations
- Batch update operations where possible
- Use lean() for read-only queries

### Frontend Optimization

**State Management**
- Use React Query for server state
- Implement optimistic updates
- Debounce form inputs
- Lazy load images

## Security Considerations

**Authorization**
- Verify user owns resource before updates
- Validate all user inputs
- Sanitize file uploads
- Rate limit API endpoints

**Data Validation**
- Validate amounts are positive numbers
- Validate dates are valid
- Validate file types and sizes
- Prevent SQL/NoSQL injection

**Image Upload Security**
- Scan uploaded files for malware
- Generate unique filenames
- Store in secure S3 bucket
- Use signed URLs for access

## Deployment Strategy

### Database Migrations

1. Add new fields to User model
2. Add new fields to SavingsGoal model
3. Add new fields to Budget model
4. Create indexes
5. Backfill existing data with defaults

### Feature Flags

```typescript
const FEATURE_FLAGS = {
  BUDGET_EDITING: true,
  SAME_DAY_GAMIFICATION: true,
  GOAL_CONTRIBUTIONS: true,
  ENHANCED_METRICS: true
};
```

### Rollout Plan

1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Monitor error rates
5. Gradually enable features
6. Collect user feedback

## Monitoring and Observability

### Metrics to Track

- Budget update success rate
- Transaction deletion errors
- Goal contribution success rate
- Image upload success rate
- Metrics calculation time
- XP award accuracy

### Logging

```typescript
logger.info('Budget updated', { userId, budgetId, oldLimit, newLimit });
logger.info('Transaction deleted', { userId, transactionId });
logger.info('Goal contribution', { userId, goalId, amount });
logger.error('Image upload failed', { userId, error, fileSize });
```

### Alerts

- High error rate on any endpoint
- Slow metrics calculations (>2s)
- Failed image uploads
- Negative balance errors
- XP calculation errors
