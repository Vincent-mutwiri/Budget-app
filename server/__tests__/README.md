# Integration Tests

This directory contains integration tests for the Budget App backend.

## Test Structure

### Integration Tests

The integration tests are organized by feature flow:

1. **transaction-flow.test.ts** - Tests the complete transaction lifecycle
   - Create transaction with same-day date
   - Verify XP reward calculation
   - Verify budget updates
   - Verify metrics recalculation
   - Delete transaction and verify cleanup

2. **goal-contribution-flow.test.ts** - Tests the complete goal contribution lifecycle
   - Create goal
   - Upload custom image
   - Make contribution
   - Verify balance deduction
   - Verify goal progress update
   - Verify XP reward
   - Remove image

3. **budget-management-flow.test.ts** - Tests the complete budget management lifecycle
   - Create budget
   - Edit budget limit
   - Verify total planned budget updates
   - Add transactions
   - Verify remaining budget calculation
   - Verify trend indicator

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Set up test database:
   - Ensure MongoDB is running
   - Set `MONGODB_URI` in your `.env` file or use the default test database

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- transaction-flow.test.ts
```

## Test Database

The tests use a separate test database to avoid affecting production data. By default, tests connect to:

```
mongodb://localhost:27017/budget-app-test
```

You can override this by setting the `MONGODB_URI` environment variable.

## Test Data Cleanup

Each test suite automatically:
- Creates test data before each test
- Cleans up test data after each test
- Uses unique user IDs to avoid conflicts

## Writing New Tests

When adding new integration tests:

1. Create a new test file in `__tests__/integration/`
2. Follow the existing test structure
3. Use descriptive test names
4. Clean up test data in `afterEach` hooks
5. Test the complete flow from start to finish

## Troubleshooting

### Tests Timeout

If tests timeout, increase the timeout in `jest.config.js`:

```javascript
testTimeout: 60000 // 60 seconds
```

### Database Connection Issues

Ensure MongoDB is running and accessible:

```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"
```

### Test Data Not Cleaning Up

Check that your `afterEach` hooks are properly cleaning up test data using regex patterns:

```typescript
await User.deleteMany({ clerkId: { $regex: /^test-user-/ } });
```

## Coverage Goals

Aim for:
- 80%+ line coverage
- 70%+ branch coverage
- 100% coverage of critical paths (transactions, budgets, goals)

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. Ensure:
- MongoDB is available in the CI environment
- Environment variables are properly set
- Tests run with `--runInBand` flag to avoid race conditions
