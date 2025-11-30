# SmartWallet Deployment Guide

This guide covers deployment procedures for staging and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migrations](#database-migrations)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- PostgreSQL client (psql)
- AWS CLI (if using AWS)
- kubectl (if using Kubernetes)

### Access Requirements

- SSH access to servers
- Database credentials
- Cloud provider credentials (AWS/GCP/Azure)
- CI/CD pipeline access
- Monitoring dashboard access

---

## Environment Setup

### Environment Variables

Create environment-specific `.env` files:

#### Staging Environment (`.env.staging`)

```env
# Application
NODE_ENV=staging
PORT=5000
FRONTEND_URL=https://staging.smartwallet.com
API_URL=https://api-staging.smartwallet.com

# Database
MONGODB_URI=mongodb+srv://user:password@staging-cluster.mongodb.net/smartwallet_staging

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Google Gemini AI
GEMINI_API_KEY=xxxxx

# Google Vision API (OCR)
GOOGLE_VISION_API_KEY=xxxxx
GOOGLE_CLOUD_PROJECT=smartwallet-staging

# Cloud Storage (AWS S3)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET_NAME=smartwallet-receipts-staging
AWS_S3_REGION=us-east-1

# Email Service (SendGrid)
SENDGRID_API_KEY=xxxxx
SENDGRID_FROM_EMAIL=noreply@staging.smartwallet.com

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=staging
REACT_APP_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Analytics
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX

# Feature Flags
ENABLE_RECEIPT_SCANNING=true
ENABLE_AI_ASSISTANT=true
ENABLE_GAMIFICATION=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=xxxxx
SESSION_TIMEOUT_MINUTES=30

# Encryption
ENCRYPTION_KEY=xxxxx
```

#### Production Environment (`.env.production`)

```env
# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://smartwallet.com
API_URL=https://api.smartwallet.com

# Database
MONGODB_URI=mongodb+srv://user:password@prod-cluster.mongodb.net/smartwallet_prod

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Google Gemini AI
GEMINI_API_KEY=xxxxx

# Google Vision API (OCR)
GOOGLE_VISION_API_KEY=xxxxx
GOOGLE_CLOUD_PROJECT=smartwallet-prod

# Cloud Storage (AWS S3)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET_NAME=smartwallet-receipts-prod
AWS_S3_REGION=us-east-1

# Email Service (SendGrid)
SENDGRID_API_KEY=xxxxx
SENDGRID_FROM_EMAIL=noreply@smartwallet.com

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
REACT_APP_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Analytics
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX

# Feature Flags
ENABLE_RECEIPT_SCANNING=true
ENABLE_AI_ASSISTANT=true
ENABLE_GAMIFICATION=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=xxxxx
SESSION_TIMEOUT_MINUTES=30

# Encryption
ENCRYPTION_KEY=xxxxx
```

---

## Database Schema Management

Since the application uses MongoDB with Mongoose, schema definitions are handled within the application code (`server/models`).

### Schema Updates

1.  **Modify Mongoose Models**: Update the schema definitions in `server/models/`.
2.  **Data Migration**: If existing data needs to be transformed, create a one-off script in `server/scripts/` (e.g., `migrate_users.ts`) to update documents.

### Example Migration Script

Create `server/scripts/migrate_example.ts`:

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to MongoDB');

        // Example: Add a new field to all users
        const result = await User.updateMany(
            { newField: { $exists: false } },
            { $set: { newField: 'defaultValue' } }
        );

        console.log(`Updated ${result.modifiedCount} users`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
```

Run with `ts-node server/scripts/migrate_example.ts`.


## Staging Deployment

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

### Deployment Steps

#### 1. Build Application

```bash
# Frontend build
cd Budget-app
npm install
npm run build

# Backend build
cd server
npm install
npm run build
```

#### 2. Run Database Migrations

```bash
./scripts/migrate.sh staging
```

#### 3. Deploy Backend

```bash
# Using Docker
docker build -t smartwallet-api:staging -f Dockerfile.server .
docker push registry.example.com/smartwallet-api:staging

# Deploy to server
ssh staging-server
docker pull registry.example.com/smartwallet-api:staging
docker-compose -f docker-compose.staging.yml up -d api

# Or using PM2
pm2 stop smartwallet-api
pm2 start server/dist/index.js --name smartwallet-api
pm2 save
```

#### 4. Deploy Frontend

```bash
# Upload to S3 + CloudFront
aws s3 sync dist/ s3://staging.smartwallet.com --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"

# Or deploy to server
scp -r dist/* staging-server:/var/www/smartwallet
ssh staging-server "sudo systemctl reload nginx"
```

#### 5. Verify Deployment

```bash
# Check API health
curl https://api-staging.smartwallet.com/health

# Check frontend
curl https://staging.smartwallet.com

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Automated Deployment with CI/CD

#### GitHub Actions Workflow (`.github/workflows/deploy-staging.yml`)

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd Budget-app
          npm ci
          cd server
          npm ci
      
      - name: Run tests
        run: |
          cd Budget-app
          npm test
          cd server
          npm test
      
      - name: Run linter
        run: |
          cd Budget-app
          npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build frontend
        run: |
          cd Budget-app
          npm ci
          npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.STAGING_API_URL }}
          REACT_APP_CLERK_PUBLISHABLE_KEY: ${{ secrets.STAGING_CLERK_KEY }}
      
      - name: Build backend
        run: |
          cd Budget-app/server
          npm ci
          npm run build
      
      - name: Run database migrations
        run: |
          cd Budget-app
          ./scripts/migrate.sh staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      
      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: staging.smartwallet.com
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: 'Budget-app/dist'
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.STAGING_CLOUDFRONT_ID }} \
            --paths "/*"
      
      - name: Deploy backend
        run: |
          # Deploy to your backend infrastructure
          # This could be AWS ECS, Kubernetes, or traditional servers
          echo "Deploying backend..."
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Staging deployment successful
- [ ] QA testing completed
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Database backup created
- [ ] Rollback plan tested
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled (if needed)

### Blue-Green Deployment Strategy

#### Setup

1. **Blue Environment**: Current production
2. **Green Environment**: New version

#### Deployment Process

```bash
# 1. Deploy to green environment
./scripts/deploy.sh production green

# 2. Run smoke tests on green
./scripts/smoke-test.sh green

# 3. Switch traffic to green (gradual rollout)
# Route 10% of traffic to green
./scripts/traffic-split.sh blue:90 green:10

# Monitor for 15 minutes
sleep 900

# Route 50% of traffic to green
./scripts/traffic-split.sh blue:50 green:50

# Monitor for 15 minutes
sleep 900

# Route 100% of traffic to green
./scripts/traffic-split.sh green:100

# 4. Keep blue environment for quick rollback
# After 24 hours of stable operation, decommission blue
```

### Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/bin/bash

set -e

ENVIRONMENT=$1
SLOT=$2  # blue or green

if [ -z "$ENVIRONMENT" ] || [ -z "$SLOT" ]; then
  echo "Usage: ./scripts/deploy.sh [staging|production] [blue|green]"
  exit 1
fi

echo "Deploying to $ENVIRONMENT ($SLOT slot)..."

# 1. Build application
echo "Building application..."
cd Budget-app
npm ci
npm run build

cd server
npm ci
npm run build
cd ../..

# 2. Run migrations (production only, after approval)
if [ "$ENVIRONMENT" = "production" ]; then
  read -p "Run database migrations? (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    ./scripts/migrate.sh production
  fi
fi

# 3. Deploy backend
echo "Deploying backend to $SLOT..."
docker build -t smartwallet-api:$ENVIRONMENT-$SLOT -f Dockerfile.server .
docker push registry.example.com/smartwallet-api:$ENVIRONMENT-$SLOT

# Update deployment
kubectl set image deployment/smartwallet-api-$SLOT \
  api=registry.example.com/smartwallet-api:$ENVIRONMENT-$SLOT \
  -n $ENVIRONMENT

# Wait for rollout
kubectl rollout status deployment/smartwallet-api-$SLOT -n $ENVIRONMENT

# 4. Deploy frontend
echo "Deploying frontend..."
aws s3 sync Budget-app/dist/ s3://$ENVIRONMENT-$SLOT.smartwallet.com --delete
aws cloudfront create-invalidation \
  --distribution-id $(get_cloudfront_id $ENVIRONMENT $SLOT) \
  --paths "/*"

echo "Deployment to $ENVIRONMENT ($SLOT) completed!"
```

### Feature Flags

Use feature flags for gradual rollout:

```typescript
// Budget-app/services/featureFlags.ts
export const featureFlags = {
  receiptScanning: process.env.ENABLE_RECEIPT_SCANNING === 'true',
  aiAssistant: process.env.ENABLE_AI_ASSISTANT === 'true',
  gamification: process.env.ENABLE_GAMIFICATION === 'true',
  
  // Gradual rollout flags
  newInsightsDashboard: {
    enabled: true,
    rolloutPercentage: 50, // 50% of users
  },
};

export const isFeatureEnabled = (feature: string, userId?: string): boolean => {
  const flag = featureFlags[feature];
  
  if (typeof flag === 'boolean') {
    return flag;
  }
  
  if (flag?.enabled && flag?.rolloutPercentage) {
    // Consistent hash-based rollout
    if (userId) {
      const hash = hashCode(userId);
      return (hash % 100) < flag.rolloutPercentage;
    }
    return Math.random() * 100 < flag.rolloutPercentage;
  }
  
  return false;
};
```

---

## Rollback Procedures

### Quick Rollback (Blue-Green)

```bash
# Switch traffic back to blue environment
./scripts/traffic-split.sh blue:100

# Verify rollback
curl https://api.smartwallet.com/health
```

### Database Rollback

```bash
# Restore from backup
pg_restore -d smartwallet_prod backup_YYYYMMDD.dump

# Or run rollback migrations
psql $DATABASE_URL -f server/migrations/rollback/009_indexes_rollback.sql
```

### Application Rollback

```bash
# Revert to previous version
kubectl rollout undo deployment/smartwallet-api -n production

# Or deploy previous version
./scripts/deploy.sh production blue
```

---

## Post-Deployment Verification

### Automated Smoke Tests

Create `scripts/smoke-test.sh`:

```bash
#!/bin/bash

ENVIRONMENT=$1
BASE_URL="https://api-$ENVIRONMENT.smartwallet.com"

echo "Running smoke tests for $ENVIRONMENT..."

# Test health endpoint
echo "Testing health endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
if [ $response -eq 200 ]; then
  echo "✓ Health check passed"
else
  echo "✗ Health check failed (HTTP $response)"
  exit 1
fi

# Test authentication
echo "Testing authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/user/profile \
  -H "Authorization: Bearer $TEST_TOKEN")
if [ $response -eq 200 ]; then
  echo "✓ Authentication test passed"
else
  echo "✗ Authentication test failed (HTTP $response)"
  exit 1
fi

# Test database connection
echo "Testing database connection..."
response=$(curl -s $BASE_URL/api/health/db | jq -r '.status')
if [ "$response" = "ok" ]; then
  echo "✓ Database connection test passed"
else
  echo "✗ Database connection test failed"
  exit 1
fi

# Test key features
echo "Testing key features..."
# Add more feature-specific tests here

echo "All smoke tests passed!"
```

### Manual Verification Checklist

- [ ] Homepage loads correctly
- [ ] User can log in
- [ ] Dashboard displays data
- [ ] Transactions can be created
- [ ] Budgets can be viewed/edited
- [ ] Recurring transactions work
- [ ] Notifications appear
- [ ] Receipt scanning works
- [ ] AI Assistant responds
- [ ] Export functionality works
- [ ] No console errors
- [ ] Performance is acceptable

### Monitoring Checks

```bash
# Check error rate
curl https://api.smartwallet.com/metrics/errors

# Check response times
curl https://api.smartwallet.com/metrics/performance

# Check active users
curl https://api.smartwallet.com/metrics/users
```

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database connection pool
pm2 restart smartwallet-api
```

#### High Memory Usage

```bash
# Check memory usage
docker stats

# Restart with memory limit
docker run -m 512m smartwallet-api

# Check for memory leaks
node --inspect server/dist/index.js
```

#### Slow API Responses

```bash
# Check database query performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Enable query logging
psql $DATABASE_URL -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Check API logs
pm2 logs smartwallet-api --lines 100
```

#### Frontend Not Loading

```bash
# Check CloudFront distribution
aws cloudfront get-distribution --id XXXXX

# Check S3 bucket
aws s3 ls s3://smartwallet.com

# Clear browser cache
# Check browser console for errors
```

### Emergency Contacts

- **DevOps Lead**: devops@smartwallet.com
- **Database Admin**: dba@smartwallet.com
- **Security Team**: security@smartwallet.com
- **On-Call Engineer**: +1-555-0123

---

## Deployment Schedule

### Staging Deployments

- **Frequency**: Continuous (on every merge to develop)
- **Time**: Anytime during business hours
- **Notification**: Slack #staging-deploys channel

### Production Deployments

- **Frequency**: Weekly (Tuesdays)
- **Time**: 10:00 AM EST (low traffic period)
- **Notification**: Email to all stakeholders 24 hours in advance
- **Maintenance Window**: 30 minutes

### Hotfix Deployments

- **Approval**: CTO or Engineering Manager
- **Process**: Expedited review and deployment
- **Notification**: Immediate Slack notification

---

## Compliance and Security

### Pre-Deployment Security Checks

- [ ] Dependency vulnerability scan
- [ ] OWASP security scan
- [ ] Secrets not committed to repository
- [ ] SSL certificates valid
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation in place

### Compliance Requirements

- [ ] GDPR compliance verified
- [ ] Data encryption enabled
- [ ] Audit logging configured
- [ ] Backup retention policy followed
- [ ] Incident response plan updated

---

## Documentation Updates

After each deployment:

1. Update CHANGELOG.md
2. Update API documentation
3. Update user guide if needed
4. Document any configuration changes
5. Update runbooks for new features

---

## Success Metrics

Track these metrics post-deployment:

- Error rate < 0.1%
- API response time < 500ms (p95)
- Page load time < 2s
- Zero critical bugs
- User satisfaction score > 4.5/5

---

For deployment support, contact: devops@smartwallet.com
