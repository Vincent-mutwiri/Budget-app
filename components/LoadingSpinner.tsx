import React from 'react';
import { Loader } from 'lucide-react';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message,
    fullScreen = false
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader className={`${sizeClasses[size]} text-primary animate-spin`} />
            {message && <p className="text-sm text-forest-400">{message}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-forest-950/80 backdrop-blur-sm flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message }) => {
    return (
        <div className="absolute inset-0 bg-forest-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-3xl">
            <LoadingSpinner size="lg" message={message} />
        </div>
    );
};
