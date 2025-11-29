import React, { useState } from 'react';
import { Download, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ExportConfig as ExportConfigType } from '../types';
import { ExportConfig } from './ExportConfig';
import { exportTransactions, exportBudgets, exportInvestments, exportSummary } from '../services/api';

interface ExportReportsProps {
    userId: string;
}

interface ExportHistoryItem {
    id: string;
    type: string;
    format: string;
    dateRange: { start: string; end: string };
    timestamp: string;
    status: 'success' | 'error';
    filename: string;
}

export const ExportReports: React.FC<ExportReportsProps> = ({ userId }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleExport = async (config: ExportConfigType) => {
        setIsExporting(true);

        try {
            let response: any;
            let filename: string;
            const timestamp = new Date().toISOString().split('T')[0];

            // Prepare request body
            const requestBody = {
                userId,
                format: config.format,
                dateRange: config.dateRange,
                filters: config.filters
            };

            // Call appropriate export API
            switch (config.type) {
                case 'transactions':
                    response = await exportTransactions(requestBody);
                    filename = `transactions_${timestamp}.${config.format}`;
                    break;
                case 'budgets':
                    response = await exportBudgets(requestBody);
                    filename = `budgets_${timestamp}.${config.format === 'pdf' ? 'html' : config.format}`;
                    break;
                case 'investments':
                    response = await exportInvestments(requestBody);
                    filename = `investments_${timestamp}.csv`;
                    break;
                case 'debts':
                    // Note: Debts export not implemented in API yet, using investments as placeholder
                    response = await exportInvestments(requestBody);
                    filename = `debts_${timestamp}.csv`;
                    break;
                case 'summary':
                    response = await exportSummary(requestBody);
                    filename = `financial_summary_${timestamp}.html`;
                    break;
                default:
                    throw new Error('Invalid export type');
            }

            // Download the file
            if (response instanceof Blob) {
                downloadBlob(response, filename);
            } else if (typeof response === 'string') {
                // For HTML/text responses
                const blob = new Blob([response], { type: 'text/html' });
                downloadBlob(blob, filename);
            }

            // Add to history
            const historyItem: ExportHistoryItem = {
                id: Date.now().toString(),
                type: config.type,
                format: config.format,
                dateRange: config.dateRange,
                timestamp: new Date().toISOString(),
                status: 'success',
                filename
            };
            setExportHistory(prev => [historyItem, ...prev]);

            showNotification('success', `Successfully exported ${config.type}!`);
        } catch (error: any) {
            console.error('Export error:', error);
            showNotification('error', `Failed to export: ${error.message || 'Unknown error'}`);

            // Add failed export to history
            const historyItem: ExportHistoryItem = {
                id: Date.now().toString(),
                type: config.type,
                format: config.format,
                dateRange: config.dateRange,
                timestamp: new Date().toISOString(),
                status: 'error',
                filename: ''
            };
            setExportHistory(prev => [historyItem, ...prev]);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Notification */}
            {notification && (
                <div
                    className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${notification.type === 'success'
                            ? 'bg-primary text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                >
                    {notification.type === 'success' ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <span className="font-medium">{notification.message}</span>
                </div>
            )}

            {/* Export Configuration */}
            <ExportConfig onExport={handleExport} isLoading={isExporting} />

            {/* Export History */}
            {exportHistory.length > 0 && (
                <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Clock className="text-primary" size={24} />
                        <h3 className="text-xl font-bold text-white">Export History</h3>
                    </div>

                    <div className="space-y-3">
                        {exportHistory.map(item => (
                            <div
                                key={item.id}
                                className="bg-forest-900 border border-forest-700 rounded-xl p-4 flex items-center justify-between hover:border-forest-600 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`p-2 rounded-lg ${item.status === 'success'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-rose-500/10 text-rose-500'
                                            }`}
                                    >
                                        {item.status === 'success' ? (
                                            <CheckCircle size={20} />
                                        ) : (
                                            <AlertCircle size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-white">
                                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Export
                                            </h4>
                                            <span className="px-2 py-0.5 bg-forest-700 text-forest-300 text-xs rounded-full">
                                                {item.format.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-sm text-forest-400 mt-1">
                                            {new Date(item.dateRange.start).toLocaleDateString()} -{' '}
                                            {new Date(item.dateRange.end).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-forest-500 mt-1">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                {item.status === 'success' && (
                                    <div className="flex items-center gap-2">
                                        <FileText className="text-forest-400" size={18} />
                                        <span className="text-sm text-forest-300">{item.filename}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Section */}
            <div className="bg-forest-800 border border-forest-700 rounded-3xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">About Exports</h3>
                <div className="space-y-3 text-sm text-forest-300">
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        <p>
                            <strong className="text-white">Transactions:</strong> Export all your transactions in CSV format for analysis in spreadsheet applications.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        <p>
                            <strong className="text-white">Budgets:</strong> Generate detailed budget reports in CSV or PDF format with spending analysis.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        <p>
                            <strong className="text-white">Investments:</strong> Export your investment portfolio with performance metrics in CSV format.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        <p>
                            <strong className="text-white">Summary:</strong> Get a comprehensive financial summary report in PDF format including income, expenses, investments, and debts.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                        <p>
                            <strong className="text-white">Note:</strong> PDF exports are generated as HTML files that can be printed or converted to PDF using your browser's print function.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
