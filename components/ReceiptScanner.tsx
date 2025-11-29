import React, { useState } from 'react';
import { ReceiptUpload } from './ReceiptUpload';
import { ReceiptPreview } from './ReceiptPreview';

interface ReceiptScannerProps {
    userId: string;
    onTransactionCreated: (transaction: any) => void;
    onClose: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
    userId,
    onTransactionCreated,
    onClose,
}) => {
    const [receiptId, setReceiptId] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const handleUploadComplete = (id: string, url: string) => {
        setReceiptId(id);
        setImageUrl(url);
    };

    const handleCreateTransaction = (transactionData: any) => {
        onTransactionCreated(transactionData);
        onClose();
    };

    if (!receiptId) {
        return (
            <ReceiptUpload
                userId={userId}
                onUploadComplete={handleUploadComplete}
                onCancel={onClose}
            />
        );
    }

    return (
        <ReceiptPreview
            receiptId={receiptId}
            onCreateTransaction={handleCreateTransaction}
            onCancel={onClose}
        />
    );
};
