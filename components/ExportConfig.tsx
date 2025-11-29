import React, { useState } from 'react';
import { Download, Calendar, FileText, FileSpreadsheet } from 'lucide-react';
import { ExportConfig as ExportConfigType, Category, CategoriesList } from '../types';

interface ExportConfigProps {
    onExport: (config: ExportConfigType) => Promise<void>;
    isLoading?: boolean;
}

export const ExportConfig: React.FC<ExportConfigProps> = ({ onExport, isLoading = false }) => {
    const [exportType, setExportType] = useState<'transactions' | 'budgets' | 'investments' | 'debts' | 'summary'>('transactions');
    const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

    const handleCategoryToggle = (category: Category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleExport = async () => {
        const config: ExportConfigType = {
            type: exportType,
            format,
            dateRange: {
                start: startDate,
                end: endDate
            },
            filters: selectedCategories.length > 0 ? {
                categories: selectedCategories
            } : undefined
        };

        await onExport(config);
    };

    // Determine available formats based on export type
    const availableFormats = exportType === 'budgets' || exportType === 'summary'
        ? ['csv', 'pdf']
        : ['csv'];

    // Reset format if not available for selected type
    React.useEffect(() => {
        if (!availableFormats.includes(format)) {
            setFormat('csv');
        }
    }, [exportType]);

    return (
        <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <Download className="text-primary" size={24} />
                <h3 className="text-xl font-bold text-white">Export Configuration</h3>
            </div>

            <div className="space-y-6">
                {/* Export Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-forest-300 mb-3">
                        Export Type
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { value: 'transactions', label: 'Transactions' },
                            { value: 'budgets', label: 'Budgets' },
                            { value: 'investments', label: 'Investments' },
                            { value: 'debts', label: 'Debts' },
                            { value: 'summary', label: 'Summary' }
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setExportType(option.value as any)}
                                className={`px-4 py-3 rounded-xl font-medium transition-all ${exportType === option.value
                                        ? 'bg-primary text-white'
                                        : 'bg-forest-900 text-forest-300 hover:bg-forest-700'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Format Selection */}
                <div>
                    <label className="block text-sm font-medium text-forest-300 mb-3">
                        Format
                    </label>
                    <div className="flex gap-3">
                        {availableFormats.includes('csv') && (
                            <button
                                onClick={() => setFormat('csv')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${format === 'csv'
                                        ? 'bg-primary text-white'
                                        : 'bg-forest-900 text-forest-300 hover:bg-forest-700'
                                    }`}
                            >
                                <FileSpreadsheet size={20} />
                                CSV
                            </button>
                        )}
                        {availableFormats.includes('pdf') && (
                            <button
                                onClick={() => setFormat('pdf')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${format === 'pdf'
                                        ? 'bg-primary text-white'
                                        : 'bg-forest-900 text-forest-300 hover:bg-forest-700'
                                    }`}
                            >
                                <FileText size={20} />
                                PDF
                            </button>
                        )}
                    </div>
                </div>

                {/* Date Range */}
                <div>
                    <label className="block text-sm font-medium text-forest-300 mb-3">
                        Date Range
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-forest-400 mb-2">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-forest-400" size={18} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-forest-900 border border-forest-700 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-forest-400 mb-2">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-forest-400" size={18} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-forest-900 border border-forest-700 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => {
                                const end = new Date();
                                const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                                setStartDate(start.toISOString().split('T')[0]);
                                setEndDate(end.toISOString().split('T')[0]);
                            }}
                            className="px-3 py-1.5 text-xs bg-forest-900 text-forest-300 rounded-lg hover:bg-forest-700 transition-colors"
                        >
                            Last 30 Days
                        </button>
                        <button
                            onClick={() => {
                                const end = new Date();
                                const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
                                setStartDate(start.toISOString().split('T')[0]);
                                setEndDate(end.toISOString().split('T')[0]);
                            }}
                            className="px-3 py-1.5 text-xs bg-forest-900 text-forest-300 rounded-lg hover:bg-forest-700 transition-colors"
                        >
                            Last 3 Months
                        </button>
                        <button
                            onClick={() => {
                                const end = new Date();
                                const start = new Date(end.getFullYear(), 0, 1);
                                setStartDate(start.toISOString().split('T')[0]);
                                setEndDate(end.toISOString().split('T')[0]);
                            }}
                            className="px-3 py-1.5 text-xs bg-forest-900 text-forest-300 rounded-lg hover:bg-forest-700 transition-colors"
                        >
                            Year to Date
                        </button>
                    </div>
                </div>

                {/* Category Filters (only for transactions) */}
                {exportType === 'transactions' && (
                    <div>
                        <label className="block text-sm font-medium text-forest-300 mb-3">
                            Filter by Categories (Optional)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {CategoriesList.map(category => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryToggle(category)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategories.includes(category)
                                            ? 'bg-primary text-white'
                                            : 'bg-forest-900 text-forest-300 hover:bg-forest-700'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                        {selectedCategories.length > 0 && (
                            <button
                                onClick={() => setSelectedCategories([])}
                                className="mt-2 text-xs text-primary hover:underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* Export Button */}
                <div className="pt-4 border-t border-forest-700">
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Generating Export...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Export {exportType.charAt(0).toUpperCase() + exportType.slice(1)}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
