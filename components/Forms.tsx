import React, { useState } from 'react';
import { Category, CategoriesList } from '../types';
import { uploadFile } from '../services/api';
import { Loader2 } from 'lucide-react';

// --- Add Budget Form ---
export const AddBudgetForm = ({ onAdd, onClose }: { onAdd: (budget: any) => Promise<void>, onClose: () => void }) => {
    const [category, setCategory] = useState<Category | ''>('');
    const [limit, setLimit] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!category || !limit) return;

        const limitValue = parseFloat(limit);

        // Validate limit is a valid number
        if (isNaN(limitValue)) {
            alert('Please enter a valid budget limit');
            return;
        }

        // Validate limit is positive
        if (limitValue <= 0) {
            alert('Budget limit must be greater than zero');
            return;
        }

        setIsSubmitting(true);
        try {
            await onAdd({
                category,
                limit: limitValue,
                icon: 'tag' // Default icon
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to create budget. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Category</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                    required
                >
                    <option value="" disabled>Select a category</option>
                    {CategoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Monthly Limit</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">KSh</span>
                    <input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                    />
                </div>
            </div>
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
            >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                Create Budget
            </button>
        </form>
    );
};

// --- Add Goal Form ---
export const AddGoalForm = ({ onAdd, onClose }: { onAdd: (goal: any) => Promise<void>, onClose: () => void }) => {
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setError('');

        if (!selectedFile) {
            setFile(null);
            setFilePreview(null);
            return;
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(selectedFile.type.toLowerCase())) {
            setError(`Invalid file type: ${selectedFile.type}. Please upload a JPG, PNG, or WebP image.`);
            setFile(null);
            setFilePreview(null);
            e.target.value = ''; // Clear the input
            return;
        }

        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE) {
            const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
            setError(`File size (${sizeMB}MB) exceeds the maximum limit of 5MB. Please choose a smaller image.`);
            setFile(null);
            setFilePreview(null);
            e.target.value = ''; // Clear the input
            return;
        }

        setFile(selectedFile);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !targetAmount || !deadline) return;

        const targetValue = parseFloat(targetAmount);

        // Validate target amount is a valid number
        if (isNaN(targetValue)) {
            setError('Please enter a valid target amount');
            return;
        }

        // Validate target amount is positive
        if (targetValue <= 0) {
            setError('Target amount must be greater than zero');
            return;
        }

        // Validate deadline is in the future
        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadlineDate < today) {
            setError('Target date must be in the future');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setUploadProgress(0);

        try {
            let imageUrl = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=600&fit=crop'; // Default

            if (file) {
                try {
                    setUploadProgress(30);
                    const uploadRes = await uploadFile(file);
                    setUploadProgress(80);

                    if (uploadRes && uploadRes.url) {
                        imageUrl = uploadRes.url;
                        setUploadProgress(100);
                    } else {
                        throw new Error('Upload failed');
                    }
                } catch (uploadError) {
                    console.error('Image upload failed:', uploadError);
                    setError('Image upload failed. Using default image instead.');
                    // Continue with default image
                }
            }

            await onAdd({
                title,
                targetAmount: targetValue,
                deadline,
                imageUrl,
                currentAmount: 0,
                status: 'in-progress'
            });
            onClose();
        } catch (error) {
            console.error('Failed to create goal:', error);
            setError('Failed to create goal. Please try again.');
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Goal Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Emergency Fund"
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                />
            </div>
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Target Amount</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400">KSh</span>
                    <input
                        type="number"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">Target Date</label>
                <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                    required
                />
            </div>
            <div>
                <label className="block text-forest-300 text-sm font-medium mb-2">
                    Cover Image (Optional - Max 5MB, JPG/PNG/WebP)
                </label>
                <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-forest-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-forest-800 file:text-primary hover:file:bg-forest-700"
                />
                {filePreview && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-forest-700">
                        <img src={filePreview} alt="Preview" className="w-full h-32 object-cover" />
                    </div>
                )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-forest-900 rounded-full h-2 overflow-hidden">
                    <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                {isSubmitting ? (uploadProgress > 0 ? 'Uploading...' : 'Creating...') : 'Create Goal'}
            </button>
        </form>
    );
};
