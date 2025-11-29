# AI Assistant Integration - Implementation Notes

## Overview
This document describes the enhanced AI Assistant integration implemented for the SmartWallet budget application.

## Components Implemented

### 1. Backend Services

#### AI Query Processor (`server/services/aiQueryProcessor.ts`)
- **Purpose**: Parse natural language queries and extract intent/entities
- **Key Functions**:
  - `parseQuery()`: Extracts intent (spending, budget, investment, debt, savings, advice) and entities (categories, dates, amounts)
  - `queryFinancialData()`: Retrieves relevant financial data based on intent
  - `generateContextualInsights()`: Creates visualizations and summaries
  - `processAIQuery()`: Main entry point for processing queries
  - `getContextualData()`: Retrieves contextual data for specific types

#### Enhanced Gemini Service (`server/services/enhancedGeminiService.ts`)
- **Purpose**: Generate AI-powered financial advice with user context
- **Key Functions**:
  - `generateEnhancedFinancialAdvice()`: Provides personalized advice based on user data
  - `generateInvestmentRecommendations()`: Investment guidance with disclaimer
  - `generateSpendingInsights()`: Spending pattern analysis
  - `generateDebtPayoffStrategy()`: Debt management strategies

### 2. API Endpoints (`server/index.ts`)

#### POST `/api/ai-assistant/query`
- **Request**: `{ userId: string, query: string }`
- **Response**: `{ answer: string, contextualInsight?: ContextualInsight, supportingData?: any }`
- **Purpose**: Process natural language queries and return AI-generated responses

#### GET `/api/ai-assistant/context`
- **Query Params**: `userId: string, type?: string`
- **Response**: Contextual financial data
- **Purpose**: Retrieve contextual data for specific query types

### 3. Frontend Components

#### ContextualInsightPanel (`components/ContextualInsightPanel.tsx`)
- **Purpose**: Display data visualizations and summaries based on query context
- **Features**:
  - Spending summary with pie charts
  - Budget status with progress bars
  - Investment performance metrics
  - Debt overview
  - Quick action buttons
- **Props**:
  - `insight: ContextualInsight | null`
  - `onAction?: (action: string) => void`

#### AIAssistantView (`components/AIAssistantView.tsx`)
- **Purpose**: Main AI assistant chat interface
- **Features**:
  - Chat interface with message history
  - Quick question buttons for common queries
  - Real-time AI responses
  - Contextual insight panel integration
  - Loading states and error handling
- **Props**:
  - `userId: string`

### 4. API Client Functions (`services/api.ts`)

```typescript
// Query AI assistant
queryAIAssistant(userId: string, query: string)

// Get contextual data
getAIContext(userId: string, type?: string)
```

## Integration Guide

### Adding AI Assistant to App

1. Import the component:
```typescript
import AIAssistantView from './components/AIAssistantView';
```

2. Add to your view routing:
```typescript
{activeView === 'ai-assistant' && clerkUser && (
  <AIAssistantView userId={clerkUser.id} />
)}
```

3. Add navigation item:
```typescript
<SidebarItem
  id="ai-assistant"
  label="AI Assistant"
  icon={Brain}
  active={activeView === 'ai-assistant'}
  onClick={() => setActiveView('ai-assistant')}
/>
```

## Query Intent Types

The AI assistant recognizes the following query intents:

1. **spending**: Questions about expenses and spending patterns
   - Example: "How much did I spend this month?"
   
2. **budget**: Questions about budget status and limits
   - Example: "What's my budget status?"
   
3. **investment**: Questions about portfolio performance
   - Example: "How are my investments performing?"
   
4. **debt**: Questions about debt and loans
   - Example: "What's my total debt?"
   
5. **savings**: Questions about savings goals
   - Example: "How close am I to my savings goals?"
   
6. **advice**: Requests for financial advice
   - Example: "Should I increase my savings rate?"

## Entity Extraction

The system extracts the following entities from queries:

- **Categories**: Housing, Food, Transport, Utilities, Entertainment, Health, Shopping, Savings
- **Timeframes**: current_month, last_month, current_year, last_year, week
- **Date Ranges**: Automatically calculated based on timeframe

## Contextual Insights

The system generates four types of contextual insights:

1. **spending_summary**: Pie chart of spending by category
2. **budget_status**: Bar chart comparing spent vs budget
3. **investment_performance**: Pie chart of asset allocation
4. **debt_overview**: Bar chart of debt balances

## Quick Actions

The contextual insight panel provides quick action buttons:

- **Spending Summary**: View All Transactions, Set Budget
- **Budget Status**: Adjust Budgets, View Spending
- **Investment Performance**: View Portfolio, Add Investment
- **Debt Overview**: View Debts, Record Payment

## AI Response Features

- Personalized responses based on user's financial data
- Acknowledgment of gamification progress (level, XP, streak)
- Specific recommendations with numbers
- Investment disclaimer when discussing investments
- Friendly, conversational tone with emojis
- Concise responses (2-3 paragraphs max)

## Error Handling

- Network errors display user-friendly messages
- Failed AI queries show fallback responses
- Loading states prevent duplicate requests
- Graceful degradation when data is unavailable

## Security Considerations

- All queries require authenticated userId
- Server-side validation of user permissions
- No sensitive data in client-side logs
- Rate limiting on API endpoints (inherited from server config)

## Testing Recommendations

1. Test various query types (spending, budget, investment, debt, savings, advice)
2. Test entity extraction with different phrasings
3. Test contextual insight generation for each type
4. Test quick action buttons
5. Test error handling with network failures
6. Test loading states and message history
7. Test mobile responsiveness

## Future Enhancements

- Voice input support
- Multi-turn conversations with context retention
- Proactive insights and recommendations
- Integration with external financial data sources
- Advanced natural language understanding
- Personalized learning from user interactions
