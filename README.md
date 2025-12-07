<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SmartWallet - AI-Powered Budget App

A comprehensive personal finance management application with AI-powered insights using Inflection AI.

View your app in AI Studio: https://ai.studio/apps/drive/1acdPYrbUY9-A-fKgBfgBy8ih7hx7SjDZ

## 🚀 Quick Start

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   ```

2. **Configure environment variables:**
   
   Create/update `.env` file in the root directory:
   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string
   
   # Inflection AI (Primary)
   INFLECTION_API_URL=https://api.inflection.ai/external/api/inference
   INFLECTION_API_KEY=dQ7nIYhuMxnYWsnLSt635pOWyqA31oWyPleNJoUJM
   
   # Gemini AI (Fallback)
   GEMINI_API_KEY=your_gemini_api_key
   
   # AWS S3
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_S3_REGION=your_region
   AWS_S3_BUCKET_NAME=your_bucket
   
   # Clerk Authentication
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   CLERK_SECRET_KEY=your_clerk_secret
   ```

3. **Verify Inflection AI setup:**
   ```bash
   node verify-inflection.js
   ```

4. **Run the app:**
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev
   
   # Terminal 2 - Frontend
   npm run dev
   ```

## 🤖 AI Features

This app uses **Inflection AI (Pi-3.1)** for intelligent financial advice:

- ✅ **Verified & Working** - See [INFLECTION_AI_SETUP.md](INFLECTION_AI_SETUP.md)
- 💬 Natural language financial queries
- 📊 Context-aware advice using RAG (Retrieval Augmented Generation)
- 💰 Personalized budgeting recommendations
- 📈 Investment guidance
- 💳 Debt management strategies
- 🔄 Automatic fallback to Gemini AI

**Quick Reference:** [INFLECTION_QUICK_REFERENCE.md](INFLECTION_QUICK_REFERENCE.md)

## 📚 Documentation

- [Inflection AI Setup Guide](INFLECTION_AI_SETUP.md) - Complete integration documentation
- [Quick Reference](INFLECTION_QUICK_REFERENCE.md) - API endpoints and examples
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment instructions

## 🧪 Testing

```bash
# Test Inflection AI integration
node test-inflection.js

# Verify complete setup
node verify-inflection.js

# Run backend tests
cd server && npm test
```
