import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div
                ref={modalRef}
                className="bg-forest-900 border border-forest-700 rounded-3xl w-full max-w-lg my-8 shadow-2xl animate-in fade-in zoom-in duration-200"
            >
                <div className="flex items-center justify-between p-6 border-b border-forest-800 sticky top-0 bg-forest-900 z-10 rounded-t-3xl">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-forest-400 hover:text-white hover:bg-forest-800 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
