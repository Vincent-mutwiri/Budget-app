import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
    generateBudgetRecommendations,
    getBudgetRecommendations,
    acceptBudgetRecommendation,
    dismissBudgetRecommendation
} from '../services/api';
import { BudgetRecommendation } from '../types';
import {
    Sparkles,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    XCircle,
    AlertCircle,
    DollarSign,
    Target,
    BarChart3
} from 'lucide-react';

const BudgetRecommendations: React.FC = () => {
    const { user } = useUser();
    const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchRecommendations();
        }
    }, [user]);

    const fetchRecommendations = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getBudgetRecommendations(user.id, 'pending');
            setRecommendations(data);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError('Failed to load recommendations');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!user) return;

        setGenerating(true);
        setError(null);

        try {
            const data = await generateBudgetRecommendations(user.id);
            setRecommendations(data);
        } catch (err) {
            console.error('Error generating recommendations:', err);
            setError('Failed to generate recommendations. Make sure you have at least 30 days of transaction history.');
        } finally {
            setGenerating(false);
        }
    };

    const handleAccept = async (id: string) => {
        try {
            await acceptBudgetRecommendation(id);
            setRecommendations(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error('Error accepting recommendation:', err);
            setError('Failed to accept recommendation');
        }
    };

    const handleDismiss = async (id: string) => {
        try {
            await dismissBudgetRecommendation(id);
            setRecommendations(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error('Error dismissing recommendation:', err);
            setError('Failed to dismiss recommendation');
        }
    };

    const handleAcceptAll = async () => {
        try {
            await Promise.all(recommendations.map(r => acceptBudgetRecommendation(r.id)));
            setRecommendations([]);
        } catch (err) {
            console.error('Error accepting all recommendations:', err);
            setError('Failed to accept all recommendations');
        }
    };

    const getConfidenceLabel = (confidence: number): { label: string; color: string } => {
        if (confidence >= 0.7) return { label: 'High', color: 'text-green-600' };
        if (confidence >= 0.4) return { label: 'Medium', color: 'text-yellow-600' };
        return { label: 'Low', color: 'text-red-600' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Smart Budget Recommendations</h2>
                        <p className="text-sm text-gray-600">AI-powered suggestions based on your spending patterns</p>
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {generating ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Generate Recommendations
                        </>
                    )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Error</p>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* Bulk Actions */}
            {recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-blue-800">
                            You have {recommendations.length} pending recommendation{recommendations.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={handleAcceptAll}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                        Accept All
                    </button>
                </div>
            )}

            {/* Recommendations Grid */}
            {recommendations.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Available</h3>
                    <p className="text-gray-600 mb-6">
                        Click "Generate Recommendations" to get AI-powered budget suggestions based on your spending patterns.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommendations.map((recommendation) => {
                        const confidenceInfo = getConfidenceLabel(recommendation.confidence);
                        const savingsPercentage = recommendation.historicalAverage > 0
                            ? (recommendation.potentialSavings / recommendation.historicalAverage) * 100
                            : 0;

                        return (
                            <div
                                key={recommendation.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                {/* Category Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {recommendation.category}
                                    </h3>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${confidenceInfo.color} bg-opacity-10`}>
                                        {confidenceInfo.label} Confidence
                                    </span>
                                </div>

                                {/* Spending Comparison */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Current Spending</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            ${recommendation.currentSpending.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Historical Average</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            ${recommendation.historicalAverage.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                        <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                            <Target className="w-4 h-4 text-purple-600" />
                                            Suggested Limit
                                        </span>
                                        <span className="text-lg font-bold text-purple-600">
                                            ${recommendation.suggestedLimit.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Potential Savings */}
                                {recommendation.potentialSavings > 0 && (
                                    <div className="bg-green-50 rounded-lg p-3 mb-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-medium text-green-800">Potential Savings</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-green-600">
                                                ${recommendation.potentialSavings.toFixed(2)}
                                            </span>
                                            <span className="text-sm text-green-600">
                                                ({savingsPercentage.toFixed(1)}% reduction)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* AI Reasoning */}
                                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {recommendation.reasoning}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAccept(recommendation.id)}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDismiss(recommendation.id)}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BudgetRecommendations;
