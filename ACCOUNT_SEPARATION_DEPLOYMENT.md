# Account Separation Feature - Deployment Checklist

## Pre-Deployment Checklist

### 1. Database Preparation
- [ ] **Backup Production Database**
  ```bash
  # Create full backup before migration
  mongodump --uri="mongodb://..." --out=backup-$(date +%Y%m%d)
  ```

- [ ] **Test Migration Script on Staging**
  ```bash
  cd server
  npm run migrate:account-separation
  ```

- [ ] **Verify Migration Results**
  - [ ] All users have both Main and Current accounts
  - [ ] Transactions are properly classified
  - [ ] Account balances are accurate
  - [ ] No data loss occurred

### 2. Code Quality & Testing
- [ ] **Run All Tests**
  ```bash
  npm run test
  npm run test:integration
  npm run test:coverage
  ```

- [ ] **Code Coverage > 80%**
  - [ ] Account Service tests pass
  - [ ] Transfer Service tests pass
  - [ ] Rollover Service tests pass
  - [ ] Integration tests pass

- [ ] **Performance Testing**
  - [ ] API response times < 500ms
  - [ ] Database queries optimized
  - [ ] Indexes created and working

### 3. API Validation
- [ ] **Account Endpoints**
  - [ ] `GET /api/accounts/main/:userId` - Returns main account
  - [ ] `GET /api/accounts/current/:userId` - Returns current account
  - [ ] `GET /api/accounts/summary/:userId` - Returns both accounts
  - [ ] `POST /api/accounts/rollover` - Performs month-end rollover

- [ ] **Transfer Endpoints**
  - [ ] `POST /api/transfers/borrow` - Borrow from main
  - [ ] `POST /api/transfers/repay` - Repay to main
  - [ ] `POST /api/transfers/withdraw` - Withdraw from special
  - [ ] `POST /api/transfers/contribute` - Contribute to special
  - [ ] `GET /api/transfers/:userId` - Get transfer history

- [ ] **Transaction Endpoints**
  - [ ] `GET /api/transactions/visible/:userId` - Get visible transactions
  - [ ] `GET /api/transactions/special/:userId` - Get special transactions
  - [ ] `POST /api/transactions/special` - Create special transaction

### 4. Frontend Validation
- [ ] **UI Components Working**
  - [ ] AccountSummary displays both accounts
  - [ ] TransferModal allows borrowing/repaying
  - [ ] SpecialTransactionsView shows categorized transactions
  - [ ] Transaction filters work correctly

- [ ] **User Experience**
  - [ ] Visual indicators for account types
  - [ ] Error messages are clear
  - [ ] Loading states work properly
  - [ ] Mobile responsiveness maintained

## Deployment Steps

### Phase 1: Backend Deployment
1. **Deploy Backend Code**
   ```bash
   # Build and deploy server
   npm run build
   # Deploy to production environment
   ```

2. **Run Database Migration**
   ```bash
   # In production environment
   NODE_ENV=production npm run migrate:account-separation
   ```

3. **Verify Migration Success**
   - [ ] Check migration logs for errors
   - [ ] Validate sample user accounts
   - [ ] Confirm balance calculations

### Phase 2: Frontend Deployment
1. **Deploy Frontend Code**
   ```bash
   # Build and deploy client
   npm run build
   # Deploy to CDN/hosting
   ```

2. **Verify Frontend Integration**
   - [ ] Account summary loads correctly
   - [ ] Transfer functionality works
   - [ ] Special transactions display properly

### Phase 3: Monitoring & Validation
1. **Monitor System Health**
   - [ ] API response times normal
   - [ ] Database performance stable
   - [ ] Error rates within acceptable limits

2. **User Acceptance Testing**
   - [ ] Test with real user accounts
   - [ ] Verify transaction flows
   - [ ] Confirm balance accuracy

## Post-Deployment Validation

### 1. Smoke Tests
Run these tests immediately after deployment:

```bash
# Test account creation
curl -X GET "https://api.yourapp.com/api/accounts/summary/test-user-id"

# Test transfer functionality
curl -X POST "https://api.yourapp.com/api/transfers/borrow" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","amount":100,"description":"Test"}'

# Test rollover
curl -X POST "https://api.yourapp.com/api/accounts/rollover" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id"}'
```

### 2. Data Integrity Checks
```javascript
// Run these queries in MongoDB to verify data integrity

// Check all users have both account types
db.accounts.aggregate([
  { $group: { 
    _id: "$userId", 
    accountTypes: { $addToSet: "$accountCategory" },
    count: { $sum: 1 }
  }},
  { $match: { 
    $or: [
      { count: { $ne: 2 } },
      { accountTypes: { $ne: ["main", "current"] } }
    ]
  }}
])

// Check for unclassified transactions
db.transactions.countDocuments({ accountType: { $exists: false } })

// Verify balance consistency
db.accounts.find({ accountCategory: "main" }).forEach(function(account) {
  var income = db.transactions.aggregate([
    { $match: { userId: account.userId, accountType: "main", type: "income" }},
    { $group: { _id: null, total: { $sum: "$amount" }}}
  ]).toArray()[0]?.total || 0;
  
  var expenses = db.transactions.aggregate([
    { $match: { userId: account.userId, accountType: "main", type: "expense" }},
    { $group: { _id: null, total: { $sum: "$amount" }}}
  ]).toArray()[0]?.total || 0;
  
  var expectedBalance = income - expenses;
  if (Math.abs(account.balance - expectedBalance) > 0.01) {
    print("Balance mismatch for user " + account.userId + 
          ": expected " + expectedBalance + ", got " + account.balance);
  }
});
```

### 3. Performance Monitoring
- [ ] **Database Query Performance**
  - Monitor slow query logs
  - Check index usage
  - Verify query execution times

- [ ] **API Response Times**
  - Account summary endpoint < 200ms
  - Transfer endpoints < 300ms
  - Transaction endpoints < 250ms

- [ ] **Memory Usage**
  - Server memory usage stable
  - No memory leaks detected
  - Database connection pool healthy

## Rollback Plan

If issues are detected, follow this rollback procedure:

### 1. Immediate Rollback (< 1 hour)
```bash
# Rollback frontend to previous version
# Rollback backend to previous version
# Database remains migrated (data is safe)
```

### 2. Database Rollback (if necessary)
```bash
# Restore from backup (LAST RESORT)
mongorestore --uri="mongodb://..." backup-YYYYMMDD/
```

### 3. Partial Rollback
- Keep migrated data
- Disable new features in frontend
- Use feature flags to control access

## Success Criteria

### Technical Metrics
- [ ] **Zero Data Loss**: All existing transactions preserved
- [ ] **Performance**: API response times within SLA
- [ ] **Reliability**: Error rate < 0.1%
- [ ] **Test Coverage**: > 80% code coverage maintained

### Business Metrics
- [ ] **User Adoption**: Users can access both accounts
- [ ] **Functionality**: All transfer operations work
- [ ] **Accuracy**: Balance calculations are correct
- [ ] **Usability**: No increase in support tickets

## Monitoring & Alerts

Set up these alerts post-deployment:

### 1. Error Alerts
- API error rate > 1%
- Database connection failures
- Migration script failures

### 2. Performance Alerts
- API response time > 1s
- Database query time > 500ms
- Memory usage > 80%

### 3. Business Logic Alerts
- Balance calculation mismatches
- Failed transfer operations
- Rollover process failures

## Documentation Updates

After successful deployment:

- [ ] Update API documentation
- [ ] Update user guide
- [ ] Create troubleshooting guide
- [ ] Document new monitoring procedures

## Team Communication

### Pre-Deployment
- [ ] Notify all stakeholders 24h before
- [ ] Schedule deployment window
- [ ] Prepare rollback team

### During Deployment
- [ ] Real-time status updates
- [ ] Monitor system metrics
- [ ] Validate each phase

### Post-Deployment
- [ ] Success confirmation to stakeholders
- [ ] Performance report
- [ ] Lessons learned documentation

---

## Emergency Contacts

- **Technical Lead**: [Name] - [Contact]
- **Database Admin**: [Name] - [Contact]
- **DevOps Engineer**: [Name] - [Contact]
- **Product Manager**: [Name] - [Contact]

## Deployment Sign-off

- [ ] **Technical Lead**: _________________ Date: _______
- [ ] **QA Lead**: _________________ Date: _______
- [ ] **Product Manager**: _________________ Date: _______
- [ ] **DevOps Lead**: _________________ Date: _______