import { Router } from 'express';
import { processAIQuery } from '../services/aiQueryProcessor';
import {
    generateEnhancedFinancialAdvice,
    generateInvestmentRecommendations,
    generateSpendingInsights,
    generateDebtPayoffStrategy,
    callInflectionAI,
    retrieveFinancialContext,
    buildRAGContext
} from '../services/inflectionAIService';
import { ChatMessage } from '../models/ChatMessage';

const router = Router();

// Chat with AI - supports conversation history
router.post('/chat', async (req, res) => {
    const { message, userId, conversationHistory } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }

    try {
        // 1. Fetch recent conversation history from DB
        const recentMessages = await ChatMessage.find({ userId })
            .sort({ timestamp: -1 })
            .limit(10);

        // Convert to context format (reverse since we fetched latest first)
        const dbContext = recentMessages.reverse().map(msg => ({
            text: msg.message,
            type: msg.sender === 'user' ? 'Human' : 'AI'
        }));

        // 2. Add current message to context
        const context = [...dbContext, { text: message, type: 'Human' }];

        // 3. Save User Message
        await ChatMessage.create({
            userId,
            message,
            sender: 'user'
        });

        // 4. Inject Financial Context if needed
        // We inject it into the prompt sent to AI, but don't save the massive context to DB
        let promptContext = context;
        try {
            console.log(`Retrieving financial context for user ${userId}...`);
            const financialData = await retrieveFinancialContext(userId);
            console.log('Financial Data Retrieved:', {
                user: !!financialData.user,
                txCount: financialData.transactions.length,
                monthlyMetrics: !!financialData.monthlyMetrics
            });

            const ragString = buildRAGContext(financialData);
            console.log('RAG String Length:', ragString.length);

            // Create a system-like instruction prepended to the user's message
            const systemInstruction = `
You are Pi, an expert financial advisor. Here is the user's real-time financial data:
${ragString}

INSTRUCTIONS:
- Use this data to answer the user's questions accurately.
- If they ask about spending, income, or budgets, use the numbers provided above.
- Distinguish between [INCOME] and [EXPENSE].
- Use the currency symbol provided in the data (e.g. KES, Ksh, $).
`;

            // Replace the last message (current user message) with the context-enhanced version
            const lastMsg = promptContext[promptContext.length - 1];
            promptContext = [
                ...promptContext.slice(0, -1),
                { text: `${systemInstruction}\n\nUser Message: ${lastMsg.text}`, type: 'Human' }
            ];
            console.log('Context injected successfully');
        } catch (err) {
            console.error('Error retrieving financial context for chat:', err);
            // Continue without context if it fails
        }

        let response = await callInflectionAI(promptContext as any);

        // Decode HTML entities and replace $ with Ksh
        response = response
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        // 5. Save AI Response
        await ChatMessage.create({
            userId,
            message: response,
            sender: 'ai'
        });

        res.json({ response, conversationHistory: [...context, { text: response, type: 'AI' }] });
    } catch (error) {
        console.error('Error processing AI chat:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

// Get chat history
router.get('/chat/history', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }

    try {
        const history = await ChatMessage.find({ userId })
            .sort({ timestamp: 1 }) // Oldest first for display
            .limit(50); // Limit to last 50 messages

        res.json(history);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Process natural language query
router.post('/query', async (req, res) => {
    const { userId, query } = req.body;

    if (!userId || !query) {
        return res.status(400).json({ error: 'UserId and query required' });
    }

    try {
        const response = await processAIQuery(userId, query);
        // Decode HTML entities and replace $ with Ksh
        if (response.answer) {
            response.answer = response.answer
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        }
        res.json(response);
    } catch (error) {
        console.error('Error processing AI query:', error);
        res.status(500).json({ error: 'AI service error' });
    }
});

// Generate financial advice
router.post('/advice', async (req, res) => {
    const { userId, financialData, query } = req.body;

    if (!userId || !query) {
        return res.status(400).json({ error: 'UserId and query required' });
    }

    try {
        const advice = await generateEnhancedFinancialAdvice(
            { userId, level: 1, xp: 0, streak: 0 },
            financialData || {},
            query
        );
        res.json({ advice });
    } catch (error) {
        console.error('Error generating advice:', error);
        res.status(500).json({ error: 'AI service error' });
    }
});

export default router;