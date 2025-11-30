# AI Financial Advisor Setup Guide

## Issue
The AI financial advisor is not working because the Gemini API key is missing.

## Solution

### Step 1: Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Step 2: Add the API Key to .env

Open the `.env` file in the root of your Budget-app folder and replace:

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

with your actual API key:

```
GEMINI_API_KEY=your-actual-key-here
```

### Step 3: Restart the Server

```bash
cd server
npm run dev
```

## How It Works

The AI financial advisor uses a two-tier system:

1. **Primary**: Inflection AI (already configured)
2. **Fallback**: Gemini AI (needs configuration)

When Inflection AI fails or is unavailable, the system automatically falls back to Gemini AI. This ensures the AI advisor keeps working even if one service has issues.

## Testing

After setup, test the AI advisor by:

1. Opening your app
2. Going to the AI Assistant section
3. Asking a question like: "How can I reduce my spending?"

## Troubleshooting

### Error: "AI Financial Advisor is not configured"
- Make sure you added the GEMINI_API_KEY to the .env file
- Restart the server after adding the key

### Error: "Invalid API key"
- Double-check that you copied the entire API key correctly
- Make sure there are no extra spaces or quotes around the key

### Still not working?
- Check the server console for error messages
- Verify your Gemini API key is active at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Make sure you have internet connectivity
