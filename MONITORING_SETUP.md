# Monitoring and Analytics Setup Guide

This guide explains how to set up error tracking, performance monitoring, and analytics for the SmartWallet application.

## Table of Contents

1. [Error Tracking with Sentry](#error-tracking-with-sentry)
2. [Performance Monitoring](#performance-monitoring)
3. [Analytics with Google Analytics](#analytics-with-google-analytics)
4. [Custom Metrics](#custom-metrics)
5. [Alerts and Notifications](#alerts-and-notifications)
6. [Dashboard Setup](#dashboard-setup)

---

## Error Tracking with Sentry

### Installation

```bash
npm install @sentry/react @sentry/tracing
```

### Configuration

1. **Create a Sentry account** at https://sentry.io
2. **Create a new project** for SmartWallet
3. **Get your DSN** from project settings

### Frontend Setup

Update `Budget-app/index.tsx`:

```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_VERSION,
  
  // Performance Monitoring
  integrations: [
    new BrowserTracing({
      tracingOrigins: ["localhost", "api.smartwallet.com", /^\//],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Set tracesSampleRate to 1.0 to capture 100% of transactions
  // In production, reduce this to save on quota
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove sensitive financial data
    if (event.request) {
      delete event.request.cookies;
    }
    
    // Scrub financial amounts from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          const scrubbedData = { ...breadcrumb.data };
          ['amount', 'balance', 'value', 'salary'].forEach(key => {
            if (key in scrubbedData) {
              scrubbedData[key] = '[Filtered]';
            }
          });
          return { ...breadcrumb, data: scrubbedData };
        }
        return breadcrumb;
      });
    }
    
    return event;
  },
});

// Update monitoring service
import { monitoring } from './services/monitoring';

monitoring.initialize({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_VERSION,
});
```

### Backend Setup

Update `Budget-app/server/index.ts`:

```typescript
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
    new Tracing.Integrations.Postgres(),
  ],
  
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.data) {
      const sensitiveFields = ['password', 'token', 'ssn', 'accountNumber'];
      sensitiveFields.forEach(field => {
        if (event.request.data[field]) {
          event.request.data[field] = '[Filtered]';
        }
      });
    }
    return event;
  },
});

// Request handler must be the first middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... your routes ...

// Error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());
```

### Environment Variables

Add to `.env`:

```env
# Frontend
REACT_APP_SENTRY_DSN=https://your-dsn@sentry.io/project-id
REACT_APP_VERSION=2.0.0

# Backend
SENTRY_DSN=https://your-dsn@sentry.io/project-id
APP_VERSION=2.0.0
```

---

## Performance Monitoring

### Key Metrics to Track

1. **Page Load Time**: Time to interactive
2. **API Response Time**: Backend endpoint performance
3. **Component Render Time**: React component performance
4. **Database Query Time**: Database operation performance

### Frontend Performance Monitoring

```typescript
// Track page load performance
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  monitoring.trackPerformance({
    name: 'page_load',
    duration: perfData.loadEventEnd - perfData.fetchStart,
    metadata: {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
    },
  });
});

// Track API calls
import { monitoring } from './services/monitoring';

export const api = {
  async get(endpoint: string) {
    return monitoring.trackApiCall(endpoint, async () => {
      const response = await fetch(`/api${endpoint}`);
      return response.json();
    });
  },
};
```

### Backend Performance Monitoring

```typescript
// Middleware to track API response times
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Send to monitoring service
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${req.method} ${req.path}`,
      level: 'info',
      data: {
        duration,
        statusCode: res.statusCode,
      },
    });
  });
  
  next();
});
```

### Database Query Monitoring

```typescript
// Track slow queries
const originalQuery = db.query;
db.query = async function(...args) {
  const startTime = Date.now();
  const result = await originalQuery.apply(this, args);
  const duration = Date.now() - startTime;
  
  if (duration > 500) {
    console.warn(`Slow query: ${args[0]} took ${duration}ms`);
    Sentry.captureMessage(`Slow database query: ${duration}ms`, {
      level: 'warning',
      extra: { query: args[0], duration },
    });
  }
  
  return result;
};
```

---

## Analytics with Google Analytics

### Installation

```bash
npm install react-ga4
```

### Configuration

```typescript
// Budget-app/services/analytics.ts
import ReactGA from 'react-ga4';

export const initializeAnalytics = () => {
  if (process.env.REACT_APP_GA_TRACKING_ID) {
    ReactGA.initialize(process.env.REACT_APP_GA_TRACKING_ID, {
      gaOptions: {
        anonymizeIp: true,
      },
    });
  }
};

// Track page views
export const trackPageView = (path: string) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

// Track events
export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};
```

### Usage in App

```typescript
// Budget-app/App.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initializeAnalytics, trackPageView } from './services/analytics';

function App() {
  const location = useLocation();
  
  useEffect(() => {
    initializeAnalytics();
  }, []);
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);
  
  // ... rest of app
}
```

### Key Events to Track

```typescript
// Feature usage
trackEvent('Feature', 'Recurring Transaction Created');
trackEvent('Feature', 'Budget Recommendation Accepted');
trackEvent('Feature', 'Receipt Scanned');
trackEvent('Feature', 'Investment Added');
trackEvent('Feature', 'Debt Payment Recorded');

// User engagement
trackEvent('Engagement', 'Challenge Completed', 'Daily Challenge');
trackEvent('Engagement', 'Badge Earned', 'Super Saver');
trackEvent('Engagement', 'Level Up', undefined, 5);

// Conversions
trackEvent('Conversion', 'MFA Enabled');
trackEvent('Conversion', 'Export Generated', 'PDF');
```

---

## Custom Metrics

### Business Metrics to Track

1. **User Engagement**
   - Daily Active Users (DAU)
   - Weekly Active Users (WAU)
   - Monthly Active Users (MAU)
   - Average session duration
   - Feature adoption rates

2. **Financial Metrics**
   - Average savings rate across users
   - Budget adherence percentage
   - Debt reduction progress
   - Investment portfolio growth

3. **Feature Usage**
   - Recurring transactions created
   - Receipts scanned
   - AI queries made
   - Budget recommendations accepted
   - Challenges completed

### Implementation

```typescript
// Budget-app/services/metrics.ts
export const trackBusinessMetric = async (metric: string, value: number, metadata?: any) => {
  // Send to your analytics backend
  await fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric, value, metadata, timestamp: Date.now() }),
  });
};

// Usage
trackBusinessMetric('savings_rate', 25.5, { userId: 'user_123' });
trackBusinessMetric('budget_adherence', 85, { category: 'Groceries' });
```

---

## Alerts and Notifications

### Sentry Alerts

Configure alerts in Sentry dashboard:

1. **Error Rate Spike**: Alert when error rate exceeds 1% of requests
2. **New Issue**: Notify on first occurrence of new error
3. **Regression**: Alert when resolved issue reoccurs
4. **Performance Degradation**: Alert when API response time > 2s

### Custom Alerts

```typescript
// Backend monitoring
const checkSystemHealth = async () => {
  const metrics = {
    errorRate: await getErrorRate(),
    avgResponseTime: await getAvgResponseTime(),
    activeUsers: await getActiveUserCount(),
  };
  
  // Alert on high error rate
  if (metrics.errorRate > 0.01) {
    await sendAlert({
      severity: 'high',
      message: `Error rate spike: ${(metrics.errorRate * 100).toFixed(2)}%`,
      metrics,
    });
  }
  
  // Alert on slow performance
  if (metrics.avgResponseTime > 2000) {
    await sendAlert({
      severity: 'medium',
      message: `Slow API performance: ${metrics.avgResponseTime}ms average`,
      metrics,
    });
  }
};

// Run health check every 5 minutes
setInterval(checkSystemHealth, 5 * 60 * 1000);
```

---

## Dashboard Setup

### Recommended Dashboards

1. **Application Health Dashboard**
   - Error rate over time
   - API response times
   - Active users
   - System uptime

2. **Feature Usage Dashboard**
   - Feature adoption rates
   - Most used features
   - User engagement metrics
   - Conversion funnels

3. **Performance Dashboard**
   - Page load times
   - API endpoint performance
   - Database query performance
   - Resource utilization

4. **Business Metrics Dashboard**
   - User growth
   - Average savings rate
   - Budget adherence
   - Financial health scores

### Tools

- **Sentry**: Error tracking and performance
- **Google Analytics**: User behavior and engagement
- **Grafana**: Custom metrics visualization
- **DataDog**: Infrastructure monitoring
- **New Relic**: Application performance monitoring

### Example Grafana Dashboard

```json
{
  "dashboard": {
    "title": "SmartWallet Metrics",
    "panels": [
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "sum(active_users_total)"
          }
        ]
      },
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, api_response_time_bucket)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(errors_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## Testing Monitoring Setup

### Test Error Tracking

```typescript
// Trigger a test error
try {
  throw new Error('Test error for Sentry');
} catch (error) {
  monitoring.captureError(error, {
    feature: 'monitoring_test',
    action: 'test_error',
  });
}
```

### Test Performance Tracking

```typescript
// Test performance measurement
const endMeasure = monitoring.startPerformanceMeasure('test_operation');
await someAsyncOperation();
endMeasure();
```

### Test Analytics

```typescript
// Test analytics event
analytics.trackEvent({
  category: 'test',
  action: 'test_event',
  label: 'monitoring_setup',
});
```

---

## Best Practices

1. **Privacy First**
   - Never log sensitive financial data
   - Anonymize user identifiers
   - Filter PII from error reports

2. **Performance**
   - Sample production traffic (10-20%)
   - Use async logging
   - Batch analytics events

3. **Alert Fatigue**
   - Set appropriate thresholds
   - Group similar errors
   - Use severity levels

4. **Data Retention**
   - Keep error logs for 90 days
   - Archive performance data monthly
   - Comply with data regulations

5. **Regular Review**
   - Weekly error review
   - Monthly performance analysis
   - Quarterly metrics review

---

## Troubleshooting

### Sentry Not Capturing Errors

- Verify DSN is correct
- Check environment variables
- Ensure `Sentry.init()` is called before app renders
- Check network tab for blocked requests

### Analytics Not Tracking

- Verify tracking ID is correct
- Check ad blockers aren't blocking requests
- Ensure consent is obtained (GDPR)
- Check browser console for errors

### Performance Data Missing

- Verify tracesSampleRate is > 0
- Check that integrations are properly configured
- Ensure performance API is available

---

## Support

For monitoring setup assistance:
- Sentry Documentation: https://docs.sentry.io
- Google Analytics: https://developers.google.com/analytics
- Internal Support: devops@smartwallet.com
