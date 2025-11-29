import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, Sparkles, TrendingUp, Wallet, Target, CreditCard } from 'lucide-react';
import { queryAIAssistant } from '../services/api';
import { ChatMessage, ContextualInsight } from '../types';
import ContextualInsightPanel from './ContextualInsightPanel';

interface AIAssistantViewProps {
    userId: string;
}

const AIAssistantView: React.FC<AIAssistantViewProps> = ({ userId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your AI financial assistant. I can help you understand your spending, budgets, investments, debts, and more. What would you like to know?",
            timestamp: new Date().toISOString()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contextualInsight, setContextualInsight] = useState<ContextualInsight | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const quickQuestions = [
        { icon: TrendingUp, text: "How much did I spend this month?", query: "How much did I spend this month?" },
        { icon: Wallet, text: "What's my budget status?", query: "What's my budget status?" },
        { icon: Target, text: "How are my investments performing?", query: "How are my investments performing?" },
        { icon: CreditCard, text: "What's my total debt?", query: "What's my total debt?" }
    ];

    const handleSendMessage = async (messageText?: string) => {
        const queryText = messageText || inputValue.trim();
        if (!queryText || isLoading) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: queryText,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Query AI assistant
            const response = await queryAIAssistant(userId, queryText);

            // Add assistant response
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.answer,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Update contextual insight if available
            if (response.contextualInsight) {
                setContextualInsight(response.contextualInsight);
            }
        } catch (error) {
            console.error('Error querying AI assistant:', error);

            // Add error message
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm sorry, I encountered an error processing your request. Please try again.",
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickQuestion = (query: string) => {
        handleSendMessage(query);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInsightAction = (action: string) => {
        // Handle quick actions from contextual insight panel
        console.log('Action triggered:', action);
        // You can implement navigation or other actions here
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Chat Section */}
            <div className="flex-1 flex flex-col bg-forest-800 border border-forest-700 rounded-3xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-forest-700 bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Sparkles className="text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">AI Financial Assistant</h2>
                            <p className="text-forest-400 text-sm">Ask me anything about your finances</p>
                        </div>
                    </div>
                </div>

                {/* Quick Questions */}
                {messages.length <= 1 && (
                    <div className="p-6 border-b border-forest-700">
                        <p className="text-forest-300 text-sm mb-3 font-medium">Quick Questions:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {quickQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickQuestion(q.query)}
                                    className="flex items-center gap-3 p-3 bg-forest-900 hover:bg-forest-950 border border-forest-700 hover:border-primary/50 rounded-xl transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <q.icon className="text-primary" size={16} />
                                    </div>
                                    <span className="text-forest-300 group-hover:text-white text-sm transition-colors">
                                        {q.text}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-forest-700">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl p-4 ${message.role === 'user'
                                        ? 'bg-primary text-forest-950'
                                        : 'bg-forest-900 text-white border border-forest-700'
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={16} className="text-primary" />
                                        <span className="text-xs font-semibold text-primary">AI Assistant</span>
                                    </div>
                                )}
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-forest-950/60' : 'text-forest-500'
                                    }`}>
                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-forest-900 border border-forest-700 rounded-2xl p-4">
                                <div className="flex items-center gap-2">
                                    <Loader className="animate-spin text-primary" size={16} />
                                    <span className="text-forest-400 text-sm">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-6 border-t border-forest-700 bg-forest-900/50">
                    <div className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about your spending, budgets, investments..."
                            className="flex-1 bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-forest-500"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                            className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-forest-700 disabled:cursor-not-allowed text-forest-950 font-bold rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Send size={18} />
                            <span className="hidden sm:inline">Send</span>
                        </button>
                    </div>
                    <p className="text-forest-500 text-xs mt-3 text-center">
                        AI responses are for informational purposes only. Not financial advice.
                    </p>
                </div>
            </div>

            {/* Contextual Insight Panel */}
            {contextualInsight && (
                <div className="lg:w-96 flex-shrink-0">
                    <ContextualInsightPanel
                        insight={contextualInsight}
                        onAction={handleInsightAction}
                    />
                </div>
            )}
        </div>
    );
};

export default AIAssistantView;
