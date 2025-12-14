import { Router } from 'express';
import { processAIQuery } from '../services/aiQueryProcessor';
import {
    generateEnhancedFinancialAdvice,
    generateInvestmentRecommendations,
    generateSpendingInsights,
    generateDebtPayoffStrategy,
    callInflectionAI
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

        let response = await callInflectionAI(context as any);

        // Decode HTML entities and replace $ with Ksh
        response = response
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        // 4. Save AI Response
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