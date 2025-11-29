import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Receipt, Category, CategoriesList } from '../types';

interface ReceiptPreviewProps {
    receiptId: string;
    onCreateTransaction: (transactionData: any) => void;
    onCancel: () => void;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
    receiptId,
    onCreateTransaction,
    onCancel,
}) => {
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showImage, setShowImage] = useState(false);

    // Form state
    const [merchantName, setMerchantName] = useState('');
    const [date, setDate] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<Category>(Category.Other);
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchReceipt();
        // Poll for OCR completion
        const pollInterval = setInterval(() => {
            if (receipt?.ocrStatus === 'processing') {
                fetchReceipt();
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [receiptId]);

    const fetchReceipt = async () => {
        try {
            const response = await fetch(`/api/receipts/${receiptId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch receipt');
            }

            const data = await response.json();
            setReceipt(data);

            // Pre-fill form with extracted data
            if (data.ocrStatus === 'completed') {
                setMerchantName(data.extractedData.merchantName || '');
                setDate(data.extractedData.date || '');
                setAmount(data.extractedData.totalAmount?.toString() || '');
                setDescription(data.extractedData.merchantName || '');
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching receipt:', err);
            setError(err instanceof Error ? err.message : 'Failed to load receipt');
            setLoading(false);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getConfidenceLabel = (confidence: number) => {
        if (confidence >= 0.8) return 'High';
        if (confidence >= 0.5) return 'Medium';
        return 'Low';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!merchantName || !date || !amount) {
            setError('Please fill in all required fields');
            return;
        }

        const transactionData = {
            description: description || merchantName,
            amount: parseFloat(amount),
            category,
            date,
            type: 'expense',
            receiptId: receipt?.id,
        };

        onCreateTransaction(transactionData);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="ml-4 text-gray-600">Loading receipt...</p>
                </div>
            </div>
        );
    }

    if (error && !receipt) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-center py-12">
                    <AlertCircle className="text-red-600" size={48} />
                    <p className="ml-4 text-red-600">{error}</p>
                </div>
                <div className="mt-6 text-center">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Receipt Preview</h2>
                <button
                    onClick={onCancel}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* OCR Status */}
            {receipt && (
                <div className="mb-6">
                    {receipt.ocrStatus === 'processing' && (
                        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <Loader2 className="animate-spin text-blue-600" size={20} />
                            <p className="text-blue-700">Processing receipt... Please wait.</p>
                        </div>
                    )}

                    {receipt.ocrStatus === 'completed' && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="text-green-600" size={20} />
                            <p className="text-green-700">Receipt processed successfully!</p>
                        </div>
                    )}

                    {receipt.ocrStatus === 'failed' && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="text-red-600" size={20} />
                            <p className="text-red-700">
                                Failed to extract data. Please enter details manually.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Receipt Image */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Receipt Image</h3>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                        {receipt?.imageUrl ? (
                            <div>
                                {!showImage ? (
                                    <button
                                        onClick={() => setShowImage(true)}
                                        className="w-full h-64 bg-gray-100 flex flex-col items-center justify-center hover:bg-gray-200 transition-colors"
                                    >
                                        <ImageIcon className="text-gray-400 mb-2" size={48} />
                                        <p className="text-gray-600">Click to view receipt</p>
                                    </button>
                                ) : (
                                    <img
                                        src={receipt.imageUrl}
                                        alt="Receipt"
                                        className="w-full h-auto max-h-96 object-contain"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                                <p className="text-gray-500">No image available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction Form */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Transaction Details</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Merchant Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Merchant Name *
                                {receipt?.ocrStatus === 'completed' && (
                                    <span
                                        className={`ml-2 text-xs ${getConfidenceColor(
                                            receipt.confidence.merchantName
                                        )}`}
                                    >
                                        ({getConfidenceLabel(receipt.confidence.merchantName)} confidence)
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                value={merchantName}
                                onChange={(e) => setMerchantName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter merchant name"
                                required
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date *
                                {receipt?.ocrStatus === 'completed' && (
                                    <span
                                        className={`ml-2 text-xs ${getConfidenceColor(
                                            receipt.confidence.date
                                        )}`}
                                    >
                                        ({getConfidenceLabel(receipt.confidence.date)} confidence)
                                    </span>
                                )}
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount *
                                {receipt?.ocrStatus === 'completed' && (
                                    <span
                                        className={`ml-2 text-xs ${getConfidenceColor(
                                            receipt.confidence.totalAmount
                                        )}`}
                                    >
                                        ({getConfidenceLabel(receipt.confidence.totalAmount)} confidence)
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as Category)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                {CategoriesList.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Optional description"
                            />
                        </div>

                        {/* Line Items (if available) */}
                        {receipt?.extractedData.lineItems &&
                            receipt.extractedData.lineItems.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Line Items
                                    </label>
                                    <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                                        {receipt.extractedData.lineItems.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex justify-between text-sm py-1"
                                            >
                                                <span className="text-gray-700">
                                                    {item.description}
                                                </span>
                                                <span className="text-gray-900 font-medium">
                                                    ${item.totalPrice.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                disabled={receipt?.ocrStatus === 'processing'}
                            >
                                Create Transaction
                            </button>
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
