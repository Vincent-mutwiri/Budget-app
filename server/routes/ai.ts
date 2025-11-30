import { Router } from 'express';
import { processAIQuery } from '../services/aiQueryProcessor';
import { 
    generateEnhancedFinancialAdvice,
    generateInvestmentRecommendations,
    generateSpendingInsights,
    generateDebtPayoffStrategy
} from '../services/inflectionAIService';

const router = Router();

// Process natural language query
router.post('/query', async (req, res) => {
    const { userId, query } = req.body;

    if (!userId || !query) {
        return res.status(400).json({ error: 'UserId and query required' });
    }

    try {
        const response = await processAIQuery(userId, query);
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