import React, { useState, useRef } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';

interface ReceiptUploadProps {
    onUploadComplete: (receiptId: string, imageUrl: string) => void;
    onCancel: () => void;
    userId: string;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onUploadComplete, onCancel, userId }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Please upload a JPEG, PNG, or PDF file.');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size exceeds 10MB limit.');
            return;
        }

        setSelectedFile(file);
        setError(null);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file to upload.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Create form data
            const formData = new FormData();
            formData.append('receipt', selectedFile);
            formData.append('userId', userId);

            // Upload receipt
            const response = await fetch('/api/receipts/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload receipt');
            }

            const data = await response.json();

            // Trigger OCR processing
            await fetch(`/api/receipts/${data.receipt.id}/process`, {
                method: 'POST',
            });

            // Call success callback
            onUploadComplete(data.receipt.id, data.receipt.imageUrl);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload receipt');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Upload Receipt</h2>
                <button
                    onClick={onCancel}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    disabled={uploading}
                >
                    <X size={24} />
                </button>
            </div>

            {!selectedFile ? (
                <div>
                    {/* Drag and Drop Area */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-lg font-medium text-gray-700 mb-2">
                            Drag and drop your receipt here
                        </p>
                        <p className="text-sm text-gray-500 mb-4">or</p>

                        <div className="flex gap-4 justify-center">
                            {/* File Upload Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Choose File
                            </button>

                            {/* Camera Capture Button (Mobile) */}
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <Camera size={20} />
                                Take Photo
                            </button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />

                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />

                        <p className="text-xs text-gray-400 mt-4">
                            Supported formats: JPEG, PNG, PDF (Max 10MB)
                        </p>
                    </div>
                </div>
            ) : (
                <div>
                    {/* File Preview */}
                    <div className="mb-6">
                        {previewUrl ? (
                            <div className="relative">
                                <img
                                    src={previewUrl}
                                    alt="Receipt preview"
                                    className="w-full max-h-96 object-contain rounded-lg border border-gray-300"
                                />
                                <button
                                    onClick={handleRemoveFile}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                                    disabled={uploading}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gray-100 rounded-lg p-8 text-center">
                                <p className="text-gray-700 font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <button
                                    onClick={handleRemoveFile}
                                    className="mt-4 text-red-600 hover:text-red-700 transition-colors"
                                    disabled={uploading}
                                >
                                    Remove File
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Uploading & Processing...
                                </>
                            ) : (
                                'Upload & Process Receipt'
                            )}
                        </button>

                        <button
                            onClick={handleRemoveFile}
                            disabled={uploading}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            Change File
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Upload Progress Info */}
            {uploading && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm">
                        Uploading receipt and extracting data... This may take a few moments.
                    </p>
                </div>
            )}
        </div>
    );
};
