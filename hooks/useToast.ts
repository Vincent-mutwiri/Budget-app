import { useState, useCallback } from 'react';
import { ToastType, ToastProps } from '../components/Toast';

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
        const id = Date.now().toString();
        const newToast: ToastProps = {
            id,
            type,
            message,
            duration,
            onClose: (toastId: string) => {
                setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }
        };
        setToasts((prev) => [...prev, newToast]);
    }, []);

    const success = useCallback((message: string, duration?: number) => {
        showToast('success', message, duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        showToast('error', message, duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number) => {
        showToast('info', message, duration);
    }, [showToast]);

    const closeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return {
        toasts,
        success,
        error,
        info,
        closeToast
    };
};
