import { Router } from 'express';
import { processAIQuery } from '../services/aiQueryProcessor';
import {
    generateEnhancedFinancialAdvice,
    generateInvestmentRecommendations,
    generateSpendingInsights,
    generateDebtPayoffStrategy,
    callInflectionAI
} from '../services/inflectionAIService';

const router = Router();

// Chat with AI - supports conversation history
router.post('/chat', async (req, res) => {
    const { message, userId, conversationHistory } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Build context from conversation history
        const context = conversationHistory || [];
        context.push({ text: message, type: 'Human' });

        let response = await callInflectionAI(context);
        
        // Decode HTML entities
        response = response
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
            
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
        // Decode HTML entities in the response
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