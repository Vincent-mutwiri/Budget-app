# Category Synchronization Debugging

## Issue Description
Categories created on the transaction page (especially via the category modal) do not reflect on the budget category page when creating a new budget.

## Expected Behavior
1. User creates a custom category on the transaction page
2. User navigates to the budget page
3. User clicks "Add New Budget"
4. The custom category should appear in the category dropdown

## Current Implementation

### Custom Category Flow
1. **Transaction Page**: User can create custom categories via:
   - Transaction form (select "custom" and enter name)
   - Category Manager modal (accessed via "Categories" button)

2. **Backend Storage**: Custom categories are stored in the User model:
   ```typescript
   customCategories: [{ 
     name: String, 
     type: { type: String, enum: ['income', 'expense'] }, 
     isDefault: { type: Boolean, default: false } 
   }]
   ```

3. **State Management**: Custom categories are:
   - Fetched on app load via `getCustomCategories(userId)`
   - Cached in local storage
   - Stored in React state (`customCategories`)
   - Passed as props to relevant components

4. **Budget Creation**: The AddBudgetForm receives:
   - `customCategories` prop
   - `onAddCategory` callback
   - Displays custom categories in dropdown

## Debugging Added

### 1. Transaction Page
- Added console log in `TransactionsView` to show custom categories received
- Location: `App.tsx` line 149

### 2. Category Addition
- Added logging in `handleAddCategory` function
- Logs: category name, type, and updated categories array
- Location: `App.tsx` around line 2646

### 3. Budget Modal
- Added console log when budget modal opens
- Shows custom categories available at modal open time
- Location: `App.tsx` around line 3429

### 4. AddBudgetForm
- Added logging to show:
  - All custom categories received
  - Filtered expense custom categories
- Location: `components/Forms.tsx` lines 14-16

### 5. Budget Creation
- Added logging when creating budget
- Shows category being used
- Location: `App.tsx` around line 2663

## Testing Steps

1. **Open browser console** (F12)

2. **Create a custom category on transaction page**:
   - Go to Transactions page
   - Click "Add New Transaction"
   - Select "Expense" type
   - In category dropdown, select "+ Add Custom Category"
   - Enter a custom category name (e.g., "Test Category")
   - Fill in other fields and submit
   - Check console for: "Adding custom category: Test Category (expense)"
   - Check console for: "Updated custom categories: [...]"

3. **Navigate to Budget page**:
   - Click on "Budgets" in sidebar
   - Click "Add New Budget" button
   - Check console for: "Budget modal opened with customCategories: [...]"
   - Check console for: "AddBudgetForm - customCategories: [...]"
   - Check console for: "AddBudgetForm - expense custom categories: [...]"

4. **Verify dropdown**:
   - Open the category dropdown in the budget form
   - The custom category should appear in the list
   - If it doesn't appear, check the console logs to see where the data is lost

## Potential Issues

### Issue 1: State Not Updating
**Symptom**: Custom category is added but `customCategories` state doesn't update
**Check**: Look for "Updated custom categories" log after adding category
**Solution**: Verify API response and state update in `handleAddCategory`

### Issue 2: Props Not Passed
**Symptom**: AddBudgetForm receives empty `customCategories` array
**Check**: Look for "Budget modal opened with customCategories" log
**Solution**: Verify props are passed correctly to AddBudgetForm

### Issue 3: Filtering Issue
**Symptom**: Custom categories exist but don't show in dropdown
**Check**: Compare "customCategories" vs "expense custom categories" logs
**Solution**: Verify the `type` field matches 'expense'

### Issue 4: Cache Issue
**Symptom**: Custom categories disappear after page refresh
**Check**: Verify cache is being set and retrieved
**Solution**: Check cache operations in `handleAddCategory` and initial load

## API Endpoints

### Get Custom Categories
```
GET /api/categories/custom?userId={userId}
Returns: Array<{ name: string, type: 'income' | 'expense', isDefault?: boolean }>
```

### Add Custom Category
```
POST /api/categories/custom
Body: { userId: string, category: string, type: 'income' | 'expense' }
Returns: Array<{ name: string, type: 'income' | 'expense', isDefault?: boolean }>
```

### Delete Custom Category
```
DELETE /api/categories/custom/:category?userId={userId}
Returns: Array<{ name: string, type: 'income' | 'expense', isDefault?: boolean }>
```

## Next Steps

1. Run the application and follow the testing steps
2. Review console logs to identify where the data flow breaks
3. If custom categories are not appearing:
   - Check if they're being saved to database
   - Check if they're being fetched on app load
   - Check if they're being passed to AddBudgetForm
   - Check if they're being filtered correctly

4. Common fixes:
   - Ensure backend is running and connected to database
   - Clear browser cache and local storage
   - Verify user is logged in with correct userId
   - Check network tab for API call responses
