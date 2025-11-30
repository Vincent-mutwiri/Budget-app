# Requirements Document

## Introduction

This document outlines the requirements for fixing critical bugs and implementing improvements to the Budget App. The focus is on enhancing budget management, transaction handling, gamification mechanics, goals management, and financial metrics calculations to provide users with accurate and reliable financial tracking capabilities.

## Glossary

- **Budget App**: The personal finance management application
- **Transaction**: A financial record of income or expense
- **Budget**: A spending limit set for a specific category
- **Goal**: A savings target with a deadline and optional image
- **Gamification System**: The XP, points, and rewards mechanism
- **Financial Metrics**: Calculated values like total income, spending, and savings
- **Contribute Button**: UI element for allocating funds toward a savings goal

## Requirements

### Requirement 1: Budget Management

**User Story:** As a user, I want to edit my existing budgets so that I can adjust spending limits as my financial situation changes

#### Acceptance Criteria

1. WHEN a user views their budget list, THE Budget App SHALL display an edit action for each budget item
2. WHEN a user clicks the edit action, THE Budget App SHALL present a form pre-filled with current budget values
3. WHEN a user submits updated budget values, THE Budget App SHALL persist the changes to the database
4. WHEN a user updates a budget limit, THE Budget App SHALL recalculate the budget utilization percentage
5. THE Budget App SHALL display a total planned budget that is the sum of all category budget limits

### Requirement 2: Bulk Transaction Entry

**User Story:** As a user, I want to add multiple transactions for a selected date so that I can efficiently log past expenses

#### Acceptance Criteria

1. WHEN a user selects a date in the transaction form, THE Budget App SHALL retain that date for subsequent transaction entries
2. WHEN a user submits a transaction, THE Budget App SHALL clear only the amount, category, and description fields
3. WHEN a user submits a transaction, THE Budget App SHALL keep the selected date unchanged
4. THE Budget App SHALL allow users to add multiple transactions without re-selecting the date

### Requirement 3: Same-Day Transaction Gamification

**User Story:** As a user, I want to earn bonus XP for logging transactions on the same day they occur so that I am incentivized to maintain timely records

#### Acceptance Criteria

1. WHEN a user logs a transaction where the transaction date equals the current date, THE Gamification System SHALL award bonus XP points
2. WHEN a user logs a transaction where the transaction date is before the current date, THE Gamification System SHALL award zero bonus XP points
3. THE Gamification System SHALL clearly indicate the bonus XP earned for same-day logging
4. THE Budget App SHALL track and display same-day logging streaks

### Requirement 4: Transaction Deletion Safety

**User Story:** As a user, I want to delete only the specific transaction I select so that I do not accidentally lose other transaction data

#### Acceptance Criteria

1. WHEN a user clicks delete on a transaction, THE Budget App SHALL delete only that specific transaction by its unique identifier
2. WHEN a user clicks delete on a transaction, THE Budget App SHALL prompt for confirmation before deletion
3. THE Budget App SHALL not delete multiple transactions when a single delete action is triggered
4. WHEN a transaction is deleted, THE Budget App SHALL update all related metrics and budgets

### Requirement 5: Goals Page UI Cleanup

**User Story:** As a user, I want to see only one "Add New Goal" button so that the interface is not confusing

#### Acceptance Criteria

1. THE Budget App SHALL display exactly one "Add New Goal" button on the goals page
2. THE Budget App SHALL remove any duplicate "Add New Goal" buttons from the goals interface
3. THE Budget App SHALL position the "Add New Goal" button in a prominent and accessible location

### Requirement 6: Goal Image Management

**User Story:** As a user, I want to remove an uploaded image from a goal so that I can change or remove goal visuals

#### Acceptance Criteria

1. WHEN a user views a goal with an uploaded image, THE Budget App SHALL display a remove image action
2. WHEN a user clicks the remove image action, THE Budget App SHALL delete the image and revert to the default image
3. THE Budget App SHALL update the goal record to reflect the image removal
4. WHEN an image is removed, THE Budget App SHALL display the default goal image

### Requirement 7: Goal Image Upload Fix

**User Story:** As a user, I want to successfully upload custom images for my goals so that I can personalize my savings targets

#### Acceptance Criteria

1. WHEN a user uploads an image file for a goal, THE Budget App SHALL validate the file type and size
2. WHEN a user uploads a valid image, THE Budget App SHALL store the image and associate it with the goal
3. WHEN a goal is created with a custom image, THE Budget App SHALL display the custom image instead of the default
4. IF an image upload fails, THEN THE Budget App SHALL display a clear error message and use the default image

### Requirement 8: Total Income Calculation

**User Story:** As a user, I want to see my total income split between current month and overall total so that I can track my earnings over time

#### Acceptance Criteria

1. THE Budget App SHALL calculate and display total income for the current month
2. THE Budget App SHALL calculate and display overall total income including previous months' remainders
3. WHEN a new month begins, THE Budget App SHALL carry forward the previous month's remaining balance
4. THE Budget App SHALL clearly label the current month income and overall total income separately

### Requirement 9: Monthly Spending Display

**User Story:** As a user, I want to see the total amount I have spent in the current month so that I can monitor my monthly expenses

#### Acceptance Criteria

1. THE Budget App SHALL calculate total spending for the current calendar month
2. THE Budget App SHALL include only expense transactions in the monthly spending calculation
3. THE Budget App SHALL update the monthly spending display in real-time when transactions are added or deleted
4. THE Budget App SHALL display monthly spending prominently on the dashboard

### Requirement 10: Savings Calculation

**User Story:** As a user, I want to see how much I have saved this month so that I can track my progress toward financial goals

#### Acceptance Criteria

1. THE Budget App SHALL calculate monthly savings as current month income minus current month expenses
2. THE Budget App SHALL display the monthly savings amount on the dashboard
3. WHEN monthly savings is positive, THE Budget App SHALL display it with positive styling
4. WHEN monthly savings is negative, THE Budget App SHALL display it with warning styling

### Requirement 11: Budget Trend Indicator

**User Story:** As a user, I want to see a positive trend indicator when I stay within budget so that I receive positive reinforcement

#### Acceptance Criteria

1. WHEN a user's spending is below or equal to their total planned budget, THE Budget App SHALL display a positive trend indicator
2. WHEN a user's spending exceeds their total planned budget, THE Budget App SHALL display a negative trend indicator
3. THE Budget App SHALL calculate the trend based on total spending versus total planned budget
4. THE Budget App SHALL update the trend indicator in real-time as transactions are added

### Requirement 12: Budget Progress Gamification

**User Story:** As a user, I want to earn gamification points as I stay within budget so that I am rewarded for good financial behavior

#### Acceptance Criteria

1. WHEN a user stays within budget for a category, THE Gamification System SHALL award XP points
2. WHEN a user completes a month within total budget, THE Gamification System SHALL award bonus XP points
3. THE Gamification System SHALL track budget adherence streaks
4. THE Budget App SHALL display budget-related achievements and rewards

### Requirement 13: Remaining Budget Calculation

**User Story:** As a user, I want to see my remaining budget so that I know how much I can still spend

#### Acceptance Criteria

1. THE Budget App SHALL calculate remaining budget as total planned budget minus current month spending
2. THE Budget App SHALL display the remaining budget prominently on the dashboard
3. WHEN remaining budget is positive, THE Budget App SHALL display it with positive styling
4. WHEN remaining budget is negative, THE Budget App SHALL display it with warning styling

### Requirement 14: Goal Contribution Functionality

**User Story:** As a user, I want the contribute button to deduct the contribution amount from my total balance so that my savings goals are properly tracked

#### Acceptance Criteria

1. WHEN a user clicks the contribute button, THE Budget App SHALL display a contribution amount input
2. WHEN a user submits a contribution amount, THE Budget App SHALL deduct that amount from the user's total balance
3. WHEN a contribution is made, THE Budget App SHALL add the amount to the goal's current amount
4. THE Budget App SHALL validate that the contribution amount does not exceed the available balance
5. WHEN a contribution is successful, THE Budget App SHALL update both the goal progress and total balance displays
