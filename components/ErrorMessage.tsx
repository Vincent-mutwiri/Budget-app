import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    fullScreen?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    message,
    onRetry,
    fullScreen = false
}) => {
    const content = (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle size={32} className="text-rose-500" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2">Something went wrong</h3>
                <p className="text-sm text-forest-400 max-w-md">{message}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-forest-950 font-medium rounded-xl transition-colors"
                >
                    <RefreshCw size={16} />
                    Try Again
                </button>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-forest-950 flex items-center justify-center z-50">
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            {content}
        </div>
    );
};
