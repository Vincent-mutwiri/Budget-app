# Testing Custom Categories Flow

## Main Issue
Custom categories created on the transaction page should appear in the budget creation form dropdown.

## Test Scenario

### Step 1: Create a Custom Category on Transaction Page
1. Navigate to the Transactions page
2. Click "Add New Transaction"
3. Select "Expense" type
4. In the Category dropdown, scroll down and select "+ Add Custom Category"
5. Enter a custom category name (e.g., "Groceries")
6. Fill in amount, date, and description
7. Click "Add Transaction"

**Expected Console Logs:**
```
Adding custom category: Groceries (expense)
Updated custom categories: [{name: "Groceries", type: "expense"}]
Category "Groceries" added successfully!
```

### Step 2: Verify Category is Saved
1. Open browser DevTools → Application → Local Storage
2. Look for key containing `customCategories_`
3. Verify the category is in the cached data

**OR**

1. Refresh the page
2. Check console for initial data load
3. Should see custom categories being fetched

### Step 3: Create a Budget with Custom Category
1. Navigate to the Budgets page
2. Click "Add New Budget" button
3. Check console for:
   ```
   Budget modal opened with customCategories: [{name: "Groceries", type: "expense"}]
   AddBudgetForm - customCategories: [{name: "Groceries", type: "expense"}]
   AddBudgetForm - expense custom categories: [{name: "Groceries", type: "expense"}]
   ```
4. Open the Category dropdown
5. **VERIFY**: "Groceries" should appear in the list above "+ Add Custom Category"

### Step 4: Create the Budget
1. Select "Groceries" from dropdown
2. Enter a monthly limit (e.g., 5000)
3. Click "Create Budget"

**Expected Console Logs:**
```
Creating budget with category: Groceries
Budget created successfully: {category: "Groceries", limit: 5000, ...}
```

## Alternative: Using Category Manager

### Step 1: Open Category Manager
1. Go to Transactions page
2. Click the "Categories" button (gear icon)
3. Category Manager modal opens

### Step 2: Add Custom Category
1. Click "Add Another Category" or "Add Custom Category"
2. Enter category name (e.g., "Entertainment")
3. Select type: "Expense"
4. Click "Add"

**Expected Console Logs:**
```
Adding custom category: Entertainment (expense)
Updated custom categories: [{name: "Groceries", type: "expense"}, {name: "Entertainment", type: "expense"}]
```

### Step 3: Verify in Budget Form
1. Close Category Manager
2. Navigate to Budgets page
3. Click "Add New Budget"
4. Open Category dropdown
5. **VERIFY**: Both "Groceries" and "Entertainment" should appear

## Troubleshooting

### Issue: Custom category doesn't appear in budget dropdown

**Check 1: Is the category being saved?**
- Look for "Updated custom categories" log after adding
- Check if the array contains your category
- Verify the `type` field is "expense" (budgets only show expense categories)

**Check 2: Is the category being passed to AddBudgetForm?**
- Look for "Budget modal opened with customCategories" log
- Check if the array is empty or contains your category
- If empty, there's a state management issue

**Check 3: Is the category being filtered correctly?**
- Look for "AddBudgetForm - expense custom categories" log
- This shows categories after filtering by type
- If your category is missing here, check its `type` field

**Check 4: Is the dropdown rendering correctly?**
- Open browser DevTools → Elements
- Inspect the dropdown when open
- Look for your category in the DOM
- If it's in the DOM but not visible, it's a CSS issue

### Issue: Category appears but can't be selected

**Check 1: Verify the option value**
- The option should have `value={cat.name}`
- Check if the name matches exactly (case-sensitive)

**Check 2: Check for duplicate keys**
- Each option needs a unique key
- Look for React warnings in console

### Issue: Category disappears after page refresh

**Check 1: Verify backend persistence**
- Open Network tab in DevTools
- Refresh the page
- Look for GET request to `/api/categories/custom`
- Check the response - should contain your category

**Check 2: Check database**
- Connect to MongoDB
- Find your user document
- Check the `customCategories` array
- Verify your category is there

## Known Issues

### Promote Endpoint Error
The promote endpoint (`/api/categories/custom/:category/promote`) is currently returning 400 errors. This is a separate feature for promoting custom categories to default categories and doesn't affect the main flow of creating and using custom categories.

**Workaround**: Don't use the "+" button in Category Manager to promote categories. Just use custom categories directly in transactions and budgets.

## Success Criteria

✅ Custom category created on transaction page
✅ Custom category appears in budget form dropdown
✅ Budget can be created with custom category
✅ Custom category persists after page refresh
✅ Multiple custom categories can be created and used

## Additional Notes

- Custom categories are stored per user in the User model
- They are cached in local storage for performance
- Income categories won't appear in budget form (budgets are expense-only)
- Custom categories can be deleted from Category Manager
- Deleting a custom category doesn't delete existing transactions/budgets using it
