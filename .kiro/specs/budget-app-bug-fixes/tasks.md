# Implementation Plan

- [x] 1. Database Schema Updates and Migrations
  - Add `updatedAt` field to Budget model
  - Add `contributions` array and `updatedAt` field to SavingsGoal model
  - Add `totalBalance`, `lastTransactionDate`, `previousMonthsBalance`, and `monthlyBalanceHistory` fields to User model
  - Add `xpAwarded` field to Transaction model
  - Create database indexes for performance optimization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3, 14.1, 14.2, 14.3_

- [x] 2. Backend API - Budget Management
- [x] 2.1 Implement PUT /api/budgets/:id endpoint
  - Create endpoint to update budget limit and other fields
  - Validate user ownership and input data
  - Recalculate budget utilization percentage
  - Return updated budget with calculations
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 Implement GET /api/budgets/total endpoint
  - Calculate sum of all budget limits for a user
  - Return total planned budget
  - _Requirements: 1.5_

- [x] 3. Backend API - Transaction Management
- [x] 3.1 Fix DELETE /api/transactions/:id endpoint
  - Ensure deletion uses unique transaction ID
  - Add confirmation requirement
  - Update related budgets and metrics after deletion
  - Return updated metrics
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.2 Enhance POST /api/transactions endpoint with gamification
  - Calculate same-day bonus XP when transaction date equals current date
  - Update user XP, streak, and lastTransactionDate
  - Return transaction with XP reward details
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Backend API - Goals Management
- [x] 4.1 Implement PUT /api/goals/:id endpoint
  - Create endpoint to update goal details
  - Validate user ownership
  - Handle image URL updates
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4.2 Implement DELETE /api/goals/:id/image endpoint
  - Remove image from S3 storage
  - Update goal record with default image URL
  - Return success response with default image
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.3 Implement POST /api/goals/:id/contribute endpoint
  - Validate contribution amount against user balance
  - Deduct amount from user's totalBalance
  - Add amount to goal's currentAmount
  - Record contribution in contributions array
  - Award XP for contribution
  - Return updated goal and balance
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 5. Backend API - Financial Metrics
- [x] 5.1 Create metrics calculation service
  - Implement function to calculate current month income
  - Implement function to calculate overall total income with previous months' remainders
  - Implement function to calculate current month spending
  - Implement function to calculate monthly savings
  - Implement function to calculate total planned budget
  - Implement function to calculate remaining budget
  - Implement function to determine budget trend
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4, 13.1, 13.2, 13.3, 13.4_

- [x] 5.2 Implement GET /api/metrics/:userId endpoint
  - Call metrics calculation service
  - Support optional month parameter
  - Implement caching for performance
  - Return all financial metrics
  - _Requirements: 8.1, 8.2, 9.1, 10.1, 11.1, 13.1_

- [x] 6. Backend Services - Gamification Engine
- [x] 6.1 Implement same-day transaction XP calculation
  - Compare transaction date with current date
  - Calculate base XP, same-day bonus, and streak bonus
  - Update user streak if same-day
  - Return XP reward breakdown
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6.2 Implement budget adherence rewards
  - Check if user is within budget for categories
  - Award XP for staying within budget
  - Track budget adherence streaks
  - Create achievements for budget milestones
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 7. Backend Services - Image Management
- [x] 7.1 Enhance image upload validation
  - Validate file type (jpg, jpeg, png, webp)
  - Validate file size (max 5MB)
  - Generate unique filename
  - Upload to S3 with proper permissions
  - Return image URL
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7.2 Implement image deletion from S3
  - Extract S3 key from image URL
  - Delete file from S3 bucket
  - Handle deletion errors gracefully
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Frontend - Budget Management UI
- [x] 8.1 Add edit functionality to BudgetsView
  - Add edit button to each budget item
  - Create inline edit form with current values
  - Implement save and cancel actions
  - Call PUT /api/budgets/:id on save
  - Update local state optimistically
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8.2 Display total planned budget
  - Calculate sum of all budget limits
  - Display prominently on budgets page
  - Update in real-time when budgets change
  - _Requirements: 1.5_

- [x] 8.3 Display remaining budget
  - Calculate as total planned budget minus current spending
  - Show with positive/negative styling
  - Update in real-time
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 9. Frontend - Transaction Management UI
- [x] 9.1 Implement date persistence in transaction form
  - Keep date field value after form submission
  - Clear only amount, category, and description fields
  - Add visual indicator for retained date
  - Add toggle to enable/disable date retention
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 9.2 Add deletion confirmation modal
  - Show confirmation dialog before deleting transaction
  - Display transaction details in confirmation
  - Implement confirm and cancel actions
  - Call DELETE /api/transactions/:id with specific ID
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9.3 Display same-day XP rewards
  - Show XP reward notification after transaction creation
  - Highlight bonus XP for same-day logging
  - Display streak information
  - Animate XP gain
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10. Frontend - Goals Management UI
- [x] 10.1 Remove duplicate "Add New Goal" button
  - Identify and remove duplicate button from GoalsView
  - Ensure single button is prominently placed
  - Verify button functionality
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 10.2 Add image removal functionality
  - Add remove image button to goal cards with custom images
  - Implement confirmation before removal
  - Call DELETE /api/goals/:id/image
  - Update UI to show default image
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10.3 Fix goal image upload
  - Validate file before upload
  - Show upload progress indicator
  - Handle upload errors with clear messages
  - Display uploaded image immediately
  - Fall back to default image on failure
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10.4 Implement goal contribution functionality
  - Add contribute button to goal cards
  - Create contribution modal with amount input
  - Validate amount against available balance
  - Call POST /api/goals/:id/contribute
  - Update goal progress and user balance in UI
  - Show success notification with XP reward
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 11. Frontend - Financial Metrics Dashboard
- [x] 11.1 Create metrics display component
  - Display current month income
  - Display overall total income
  - Display current month spending
  - Display monthly savings with positive/negative styling
  - Display total planned budget
  - Display remaining budget with positive/negative styling
  - Display budget trend indicator
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4, 13.1, 13.2, 13.3, 13.4_

- [x] 11.2 Integrate metrics API call
  - Call GET /api/metrics/:userId on dashboard load
  - Implement loading states
  - Handle errors gracefully
  - Refresh metrics when transactions/budgets change
  - _Requirements: 8.1, 9.1, 10.1, 11.1, 13.1_

- [ ] 12. Frontend - Gamification UI Enhancements
- [ ] 12.1 Display budget adherence rewards
  - Show XP rewards for staying within budget
  - Display budget adherence achievements
  - Track and show budget adherence streaks
  - Add visual indicators for budget progress
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 12.2 Enhance XP notification system
  - Show detailed XP breakdown (base, bonus, streak)
  - Animate XP gains
  - Display level-up notifications
  - Show achievement unlocks
  - _Requirements: 3.3, 12.1, 12.2_

- [ ] 13. Frontend Services - API Integration
- [ ] 13.1 Add new API methods to services/api.ts
  - Add updateBudget method
  - Add deleteTransaction method
  - Add updateGoal method
  - Add removeGoalImage method
  - Add contributeToGoal method
  - Add getMetrics method
  - _Requirements: 1.1, 4.1, 6.1, 7.1, 14.1, 8.1_

- [ ] 13.2 Implement optimistic updates
  - Update local state before API response
  - Rollback on error
  - Show loading indicators
  - Handle network errors
  - _Requirements: 1.4, 4.4, 14.5_

- [ ] 14. Error Handling and Validation
- [ ] 14.1 Implement frontend validation
  - Validate budget limit is positive
  - Validate contribution amount is positive and within balance
  - Validate image file type and size
  - Show validation errors to user
  - _Requirements: 1.1, 7.1, 7.4, 14.4_

- [ ] 14.2 Implement backend error responses
  - Return consistent error format
  - Include error codes for client handling
  - Log errors for monitoring
  - _Requirements: 1.1, 4.1, 6.1, 7.1, 14.1_

- [ ] 15. Performance Optimization
- [ ] 15.1 Implement metrics caching
  - Cache metrics results for 5 minutes
  - Invalidate cache on data changes
  - Use Redis or in-memory cache
  - _Requirements: 8.1, 9.1, 10.1, 11.1, 13.1_

- [ ] 15.2 Add database indexes
  - Create compound index on transactions (userId, date)
  - Create compound index on budgets (userId, category)
  - Create index on goals (userId, status)
  - _Requirements: 8.1, 9.1, 11.1_

- [ ] 16. Integration and End-to-End Testing
- [ ] 16.1 Test complete transaction flow
  - Create transaction with same-day date
  - Verify XP reward is calculated correctly
  - Verify budgets are updated
  - Verify metrics are recalculated
  - Delete transaction and verify cleanup
  - _Requirements: 2.1, 3.1, 4.1, 8.1, 9.1_

- [ ] 16.2 Test complete goal contribution flow
  - Create goal
  - Upload custom image
  - Make contribution
  - Verify balance deduction
  - Verify goal progress update
  - Verify XP reward
  - Remove image
  - _Requirements: 6.1, 7.1, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 16.3 Test budget management flow
  - Create budget
  - Edit budget limit
  - Verify total planned budget updates
  - Add transactions
  - Verify remaining budget calculation
  - Verify trend indicator
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 13.1_

- [ ] 17. Documentation and Cleanup
- [ ] 17.1 Update API documentation
  - Document new endpoints
  - Document request/response formats
  - Document error codes
  - Add usage examples
  - _Requirements: All_

- [ ] 17.2 Update user guide
  - Document budget editing feature
  - Document bulk transaction entry
  - Document goal contributions
  - Document XP rewards system
  - _Requirements: 1.1, 2.1, 3.1, 12.1, 14.1_
