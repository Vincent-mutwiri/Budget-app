# SmartWallet API Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the SmartWallet budget application. All endpoints require authentication via Clerk unless otherwise specified.

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.smartwallet.com/api
```

## Authentication

All API requests must include a valid Clerk session token in the Authorization header:

```
Authorization: Bearer <clerk_session_token>
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Recurring Transactions

### Create Recurring Transaction

Creates a new recurring transaction template.

**Endpoint:** `POST /api/recurring-transactions`

**Request Body:**
```json
{
  "amount": 1500.00,
  "category": "Salary",
  "description": "Monthly salary",
  "type": "income",
  "frequency": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "reminderEnabled": true,
  "reminderDaysBefore": 3
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "rec_123abc",
    "userId": "user_456def",
    "amount": 1500.00,
    "category": "Salary",
    "description": "Monthly salary",
    "type": "income",
    "frequency": "monthly",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "nextOccurrence": "2024-01-01",
    "isActive": true,
    "reminderEnabled": true,
    "reminderDaysBefore": 3,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### List Recurring Transactions

Retrieves all recurring transactions for the authenticated user.

**Endpoint:** `GET /api/recurring-transactions`

**Query Parameters:**
- `isActive` (optional): Filter by active status (true/false)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "rec_123abc",
      "amount": 1500.00,
      "category": "Salary",
      "description": "Monthly salary",
      "type": "income",
      "frequency": "monthly",
      "nextOccurrence": "2024-02-01",
      "isActive": true
    }
  ]
}
```

### Update Recurring Transaction

Updates an existing recurring transaction template.

**Endpoint:** `PUT /api/recurring-transactions/:id`

**Request Body:** Same as create, all fields optional

**Response:** `200 OK` - Returns updated transaction

### Toggle Recurring Transaction

Activates or deactivates a recurring transaction.

**Endpoint:** `PATCH /api/recurring-transactions/:id/toggle`

**Request Body:**
```json
{
  "isActive": false
}
```

**Response:** `200 OK`

### Delete Recurring Transaction

Deletes a recurring transaction template.

**Endpoint:** `DELETE /api/recurring-transactions/:id`

**Response:** `204 No Content`

---

## Notifications

### List Notifications

Retrieves notifications for the authenticated user.

**Endpoint:** `GET /api/notifications`

**Query Parameters:**
- `type` (optional): Filter by type (bill_reminder, budget_alert, goal_milestone, anomaly, gamification, system)
- `isRead` (optional): Filter by read status (true/false)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "notif_123",
      "type": "bill_reminder",
      "title": "Rent Payment Due",
      "message": "Your rent payment of $1200 is due in 3 days",
      "priority": "high",
      "isRead": false,
      "actionUrl": "/transactions/new",
      "createdAt": "2024-01-28T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### Mark Notification as Read

Marks a single notification as read.

**Endpoint:** `PATCH /api/notifications/:id/read`

**Response:** `200 OK`

### Mark All Notifications as Read

Marks all notifications as read for the authenticated user.

**Endpoint:** `PATCH /api/notifications/read-all`

**Response:** `200 OK`

### Get Notification Preferences

Retrieves notification preferences for the authenticated user.

**Endpoint:** `GET /api/notifications/preferences`

**Response:** `200 OK`
```json
{
  "data": {
    "budgetAlerts": true,
    "budgetThresholds": [80, 100],
    "billReminders": true,
    "reminderDaysBefore": [3, 7],
    "goalMilestones": true,
    "anomalyAlerts": true,
    "gamificationNotifications": true,
    "emailNotifications": true,
    "pushNotifications": false
  }
}
```

### Update Notification Preferences

Updates notification preferences.

**Endpoint:** `PUT /api/notifications/preferences`

**Request Body:** Same structure as GET response

**Response:** `200 OK`

---

## Budget Recommendations

### Generate Budget Recommendations

Generates AI-powered budget recommendations based on spending history.

**Endpoint:** `POST /api/budget-recommendations/generate`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "rec_789",
      "category": "Groceries",
      "suggestedLimit": 450.00,
      "currentSpending": 520.00,
      "historicalAverage": 480.00,
      "potentialSavings": 70.00,
      "confidence": 0.85,
      "reasoning": "Based on 6 months of data, reducing grocery spending to $450 aligns with similar households",
      "status": "pending"
    }
  ]
}
```

### Accept Budget Recommendation

Accepts a recommendation and creates/updates the budget.

**Endpoint:** `POST /api/budget-recommendations/:id/accept`

**Response:** `200 OK`

### Dismiss Budget Recommendation

Dismisses a recommendation.

**Endpoint:** `DELETE /api/budget-recommendations/:id`

**Response:** `204 No Content`

---

## Financial Insights

### Get Dashboard Insights

Retrieves comprehensive financial insights.

**Endpoint:** `GET /api/insights/dashboard`

**Query Parameters:**
- `timeRange` (optional): 3m, 6m, 12m (default: 6m)

**Response:** `200 OK`
```json
{
  "data": {
    "healthScore": 75,
    "healthScoreComponents": {
      "savingsRate": 20,
      "debtToIncome": 15,
      "budgetAdherence": 85,
      "emergencyFund": 3
    },
    "spendingTrends": [
      {
        "category": "Groceries",
        "currentMonth": 450,
        "previousMonth": 480,
        "percentageChange": -6.25,
        "trend": "down"
      }
    ],
    "forecast": {
      "projectedIncome": 5000,
      "projectedExpenses": 4200,
      "confidence": 0.82
    },
    "anomalies": []
  }
}
```

### Get Financial Health Score

Calculates and returns the financial health score.

**Endpoint:** `GET /api/insights/health-score`

**Response:** `200 OK`
```json
{
  "data": {
    "score": 75,
    "components": {
      "savingsRate": 20,
      "debtToIncome": 15,
      "budgetAdherence": 85,
      "emergencyFund": 3
    }
  }
}
```

### Get Spending Trends

Retrieves spending trends by category.

**Endpoint:** `GET /api/insights/trends`

**Query Parameters:**
- `timeRange` (optional): 3m, 6m, 12m

**Response:** `200 OK`

### Get Income/Expense Forecast

Generates forecast for next month.

**Endpoint:** `GET /api/insights/forecast`

**Response:** `200 OK`

### Get Spending Anomalies

Detects unusual spending patterns.

**Endpoint:** `GET /api/insights/anomalies`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "transactionId": "txn_456",
      "category": "Dining",
      "amount": 250,
      "averageAmount": 80,
      "deviationPercentage": 212.5,
      "detectedAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

---

## Financial Metrics

### Get Financial Metrics

Calculates comprehensive financial metrics including income, spending, savings, and budget information.

**Endpoint:** `GET /api/metrics/:userId`

**Path Parameters:**
- `userId` (required): User's Clerk ID

**Query Parameters:**
- `month` (optional): ISO date string for target month (default: current month)

**Response:** `200 OK`
```json
{
  "metrics": {
    "currentMonthIncome": 5000,
    "overallTotalIncome": 5200,
    "previousMonthsRemainder": 200,
    "currentMonthSpending": 3500,
    "monthlySavings": 1500,
    "totalPlannedBudget": 4000,
    "remainingBudget": 500,
    "budgetUtilization": 87.5,
    "trendPositive": true,
    "trendPercentage": 87.5
  },
  "calculatedAt": "2024-01-15T10:30:00Z",
  "cached": false
}
```

**Caching:**
- Metrics are cached for 5 minutes per user per month
- Cache is automatically invalidated when transactions or budgets change
- Cached responses include `"cached": true` in the response

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `500 Internal Server Error` - Calculation error

---

## Receipt Scanning

### Upload Receipt

Uploads a receipt image for OCR processing.

**Endpoint:** `POST /api/receipts/upload`

**Request:** Multipart form data
- `file`: Image file (JPEG, PNG, PDF, max 10MB)

**Response:** `201 Created`
```json
{
  "data": {
    "id": "receipt_123",
    "imageUrl": "https://storage.example.com/receipts/receipt_123.jpg",
    "ocrStatus": "pending"
  }
}
```

### Process Receipt

Triggers OCR processing for an uploaded receipt.

**Endpoint:** `POST /api/receipts/:id/process`

**Response:** `200 OK`
```json
{
  "data": {
    "id": "receipt_123",
    "extractedData": {
      "merchantName": "Whole Foods",
      "date": "2024-01-15",
      "totalAmount": 87.50,
      "lineItems": [
        {
          "description": "Organic Bananas",
          "quantity": 2,
          "unitPrice": 3.99,
          "totalPrice": 7.98
        }
      ]
    },
    "confidence": {
      "merchantName": 0.95,
      "date": 0.98,
      "totalAmount": 0.92
    },
    "ocrStatus": "completed"
  }
}
```

### Get Receipt

Retrieves receipt details with extracted data.

**Endpoint:** `GET /api/receipts/:id`

**Response:** `200 OK`

---

## Investments

### Create Investment

Adds a new investment to the portfolio.

**Endpoint:** `POST /api/investments`

**Request Body:**
```json
{
  "name": "Apple Stock",
  "type": "stock",
  "symbol": "AAPL",
  "initialAmount": 10000,
  "currentValue": 12500,
  "ratePerAnnum": 8.5,
  "purchaseDate": "2023-01-01",
  "notes": "Long-term hold"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "inv_123",
    "name": "Apple Stock",
    "type": "stock",
    "symbol": "AAPL",
    "initialAmount": 10000,
    "currentValue": 12500,
    "ratePerAnnum": 8.5,
    "purchaseDate": "2023-01-01",
    "calculatedMetrics": {
      "totalReturn": 2500,
      "totalReturnPercentage": 25,
      "annualizedReturn": 23.5,
      "projectedValue1Year": 13562.50,
      "projectedValue3Years": 15875.32,
      "projectedValue5Years": 18756.89
    }
  }
}
```

### List Investments

Retrieves all investments for the authenticated user.

**Endpoint:** `GET /api/investments`

**Response:** `200 OK`

### Update Investment

Updates investment details.

**Endpoint:** `PUT /api/investments/:id`

**Request Body:** Same as create, all fields optional

**Response:** `200 OK`

### Update Investment Value

Updates the current value of an investment.

**Endpoint:** `PATCH /api/investments/:id/value`

**Request Body:**
```json
{
  "currentValue": 13000
}
```

**Response:** `200 OK`

### Delete Investment

Deletes an investment.

**Endpoint:** `DELETE /api/investments/:id`

**Response:** `204 No Content`

---

## Debts

### Create Debt

Adds a new debt to track.

**Endpoint:** `POST /api/debts`

**Request Body:**
```json
{
  "name": "Student Loan",
  "type": "student_loan",
  "originalAmount": 50000,
  "currentBalance": 42000,
  "interestRate": 5.5,
  "minimumPayment": 500,
  "dueDate": "2024-02-01"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "debt_123",
    "name": "Student Loan",
    "type": "student_loan",
    "originalAmount": 50000,
    "currentBalance": 42000,
    "interestRate": 5.5,
    "minimumPayment": 500,
    "dueDate": "2024-02-01",
    "calculatedMetrics": {
      "payoffDate": "2031-06-15",
      "totalInterest": 12500,
      "monthsRemaining": 90
    }
  }
}
```

### List Debts

Retrieves all debts for the authenticated user.

**Endpoint:** `GET /api/debts`

**Response:** `200 OK`

### Update Debt

Updates debt details.

**Endpoint:** `PUT /api/debts/:id`

**Request Body:** Same as create, all fields optional

**Response:** `200 OK`

### Record Debt Payment

Records a payment made toward a debt.

**Endpoint:** `POST /api/debts/:id/payment`

**Request Body:**
```json
{
  "amount": 600,
  "date": "2024-01-15"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "paymentId": "pay_456",
    "amount": 600,
    "principalPaid": 407.50,
    "interestPaid": 192.50,
    "newBalance": 41592.50
  }
}
```

### Delete Debt

Deletes a debt record.

**Endpoint:** `DELETE /api/debts/:id`

**Response:** `204 No Content`

---

## Gamification

### List Challenges

Retrieves available challenges for the user.

**Endpoint:** `GET /api/gamification/challenges`

**Query Parameters:**
- `type` (optional): daily, weekly, monthly

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "chal_123",
      "title": "Budget Master",
      "description": "Stay within budget for 7 days",
      "type": "weekly",
      "progress": 5,
      "target": 7,
      "xpReward": 100,
      "completed": false,
      "resetTime": "2024-02-01T00:00:00Z"
    }
  ]
}
```

### Claim Challenge Reward

Claims XP reward for a completed challenge.

**Endpoint:** `POST /api/gamification/challenges/:id/claim`

**Response:** `200 OK`
```json
{
  "data": {
    "xpAwarded": 100,
    "newXP": 1250,
    "newLevel": 5
  }
}
```

### List Badges

Retrieves user's earned and available badges.

**Endpoint:** `GET /api/gamification/badges`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "badge_saver",
      "name": "Super Saver",
      "description": "Save $1000 in a month",
      "icon": "💰",
      "earned": true,
      "earnedAt": "2024-01-20T00:00:00Z"
    }
  ]
}
```

### Get Leaderboard

Retrieves leaderboard rankings.

**Endpoint:** `GET /api/gamification/leaderboard`

**Query Parameters:**
- `limit` (optional): Number of results (default: 100)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "rank": 1,
      "username": "User_abc123",
      "xp": 5000,
      "level": 12,
      "streak": 45
    }
  ]
}
```

---

## AI Assistant

### Process Query

Processes a natural language query about financial data.

**Endpoint:** `POST /api/ai-assistant/query`

**Request Body:**
```json
{
  "message": "How much did I spend on groceries last month?"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "response": "You spent $480 on groceries last month, which is 5% less than your average of $505.",
    "contextualData": {
      "type": "spending_summary",
      "data": {
        "category": "Groceries",
        "amount": 480,
        "average": 505,
        "percentageChange": -5
      }
    }
  }
}
```

### Get Context

Retrieves contextual data for AI queries.

**Endpoint:** `GET /api/ai-assistant/context`

**Query Parameters:**
- `type`: spending, budget, investment, debt

**Response:** `200 OK`

---

## Security

### Setup MFA

Initiates multi-factor authentication setup.

**Endpoint:** `POST /api/security/mfa/setup`

**Request Body:**
```json
{
  "method": "app"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["123456", "789012"]
  }
}
```

### Verify MFA

Verifies MFA code during setup or login.

**Endpoint:** `POST /api/security/mfa/verify`

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:** `200 OK`

### Disable MFA

Disables multi-factor authentication.

**Endpoint:** `POST /api/security/mfa/disable`

**Request Body:**
```json
{
  "password": "current_password"
}
```

**Response:** `200 OK`

### Change Password

Changes user password.

**Endpoint:** `POST /api/security/password/change`

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response:** `200 OK`

### List Active Sessions

Retrieves all active sessions for the user.

**Endpoint:** `GET /api/security/sessions`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "sess_123",
      "device": "Chrome on Windows",
      "ipAddress": "192.168.1.1",
      "lastActive": "2024-01-15T10:30:00Z",
      "current": true
    }
  ]
}
```

### Logout Session

Logs out a specific session.

**Endpoint:** `DELETE /api/security/sessions/:id`

**Response:** `204 No Content`

---

## Export and Reporting

### Export Transactions

Generates a transaction export file.

**Endpoint:** `POST /api/export/transactions`

**Request Body:**
```json
{
  "format": "csv",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "categories": ["Groceries", "Dining"]
  }
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "downloadUrl": "https://storage.example.com/exports/transactions_2024-01.csv",
    "expiresAt": "2024-01-16T00:00:00Z"
  }
}
```

### Export Budgets

Generates a budget report.

**Endpoint:** `POST /api/export/budgets`

**Request Body:**
```json
{
  "format": "pdf",
  "month": "2024-01"
}
```

**Response:** `200 OK`

### Export Investments

Generates an investment portfolio export.

**Endpoint:** `POST /api/export/investments`

**Request Body:**
```json
{
  "format": "csv"
}
```

**Response:** `200 OK`

### Export Financial Summary

Generates a comprehensive financial summary report.

**Endpoint:** `POST /api/export/summary`

**Request Body:**
```json
{
  "format": "pdf",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  }
}
```

**Response:** `200 OK`

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute per user
- **OCR endpoints**: 10 requests per minute per user
- **Export endpoints**: 5 requests per minute per user

When rate limit is exceeded, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

## Webhooks

SmartWallet supports webhooks for real-time notifications:

### Webhook Events

- `transaction.created`
- `budget.exceeded`
- `goal.achieved`
- `debt.paid_off`
- `challenge.completed`

### Webhook Payload

```json
{
  "event": "budget.exceeded",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "userId": "user_123",
    "category": "Dining",
    "budgetLimit": 300,
    "currentSpending": 320
  }
}
```

## Support

For API support, contact: api-support@smartwallet.com

## Changelog

### Version 2.0 (2024-01)
- Added recurring transactions endpoints
- Added notification system
- Added budget recommendations
- Added financial insights dashboard
- Added receipt scanning with OCR
- Added investment tracking
- Added debt management
- Added gamification features
- Enhanced AI assistant
- Added security features (MFA)
- Added export and reporting

### Version 1.0 (2023-06)
- Initial API release
- Basic transaction management
- Budget tracking
- Savings goals
