import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    onClose: (id: string) => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ id, type, message, onClose, duration = 5000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, onClose, duration]);

    const icons = {
        success: <CheckCircle2 size={20} className="text-primary" />,
        error: <AlertCircle size={20} className="text-rose-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const bgColors = {
        success: 'bg-primary/10 border-primary/20',
        error: 'bg-rose-500/10 border-rose-500/20',
        info: 'bg-blue-500/10 border-blue-500/20'
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-xl border ${bgColors[type]} bg-forest-800 shadow-lg min-w-[300px] max-w-md animate-slide-in`}
        >
            <div className="shrink-0 mt-0.5">{icons[type]}</div>
            <p className="flex-1 text-sm text-white leading-relaxed">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="shrink-0 text-forest-400 hover:text-white transition-colors"
            >
                <X size={18} />
            </button>
        </div>
    );
};

export interface ToastContainerProps {
    toasts: ToastProps[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>
    );
};
