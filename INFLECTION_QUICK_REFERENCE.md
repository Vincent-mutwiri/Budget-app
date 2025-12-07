# Inflection AI - Quick Reference Card

## ⚡ Quick Start

```bash
# Verify setup
node verify-inflection.js

# Test API
node test-inflection.js

# Start server
cd server && npm run dev
```

## 🔑 API Key

```env
INFLECTION_API_KEY=dQ7nIYhuMxnYWsnLSt635pOWyqA31oWyPleNJoUJM
```

## 📡 Endpoint

```
POST https://api.inflection.ai/external/api/inference
```

## 📝 Request Format

```javascript
{
  context: [
    { text: "message", type: "Human" },
    { text: "response", type: "AI" }
  ],
  config: "Pi-3.1"
}
```

## 🎯 Valid Types

- `"Human"` - User messages
- `"AI"` - Assistant responses  
- `"System"` - System messages
- `"Retrieval"` - Context data

## 🔧 Server Endpoints

```
POST /api/ai/query       - Natural language queries
POST /api/ai/advice      - Financial advice
```

## 📦 Key Files

```
server/services/inflectionAIService.ts  - Main service
server/routes/ai.ts                     - API routes
.env                                    - Configuration
```

## 🧪 Test Commands

```bash
# Direct API test
curl -X POST https://api.inflection.ai/external/api/inference \
  -H "Authorization: Bearer dQ7nIYhuMxnYWsnLSt635pOWyqA31oWyPleNJoUJM" \
  -H "Content-Type: application/json" \
  -d '{"context":[{"text":"Hi","type":"Human"}],"config":"Pi-3.1"}'

# Local server test
curl -X POST http://localhost:5000/api/ai/advice \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","query":"Help me budget"}'
```

## ⚠️ Common Mistakes

❌ Using `messages` instead of `context`
❌ Using `model` instead of `config`
❌ Using `role: "user"` instead of `type: "Human"`
❌ Using `type: "Pi"` instead of `type: "AI"`

## ✅ Correct Format

```javascript
✅ { context: [...], config: "Pi-3.1" }
✅ { text: "...", type: "Human" }
✅ { text: "...", type: "AI" }
```

## 🔄 Fallback

Inflection AI → Gemini AI (automatic)

## 📊 RAG Features

- User profile & balance
- Monthly income/expenses
- Budget status
- Investment portfolio
- Debt overview
- Recent transactions
- Spending trends

## 🎯 Functions

```typescript
generateEnhancedFinancialAdvice()    // General advice
generateInvestmentRecommendations()  // Investment tips
generateSpendingInsights()           // Spending analysis
generateDebtPayoffStrategy()         // Debt management
```

## 🐛 Debug

```bash
# Check env vars
cat .env | grep INFLECTION

# Check server logs
cd server && npm run dev

# Run verification
node verify-inflection.js
```

## 📞 Support

- Check `INFLECTION_AI_SETUP.md` for detailed docs
- Run verification script for diagnostics
- Check server logs for errors
