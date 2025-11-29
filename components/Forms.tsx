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

        setIsSubmitting(true);
        try {
            await onAdd({
                category,
                limit: parseFloat(limit),
                icon: 'tag' // Default icon
            });
            onClose();
        } catch (error) {
            console.error(error);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !targetAmount || !deadline) return;

        setIsSubmitting(true);
        try {
            let imageUrl = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=600&fit=crop'; // Default

            if (file) {
                const uploadRes = await uploadFile(file);
                imageUrl = uploadRes.url;
            }

            await onAdd({
                title,
                targetAmount: parseFloat(targetAmount),
                deadline,
                imageUrl,
                currentAmount: 0,
                status: 'in-progress'
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                <label className="block text-forest-300 text-sm font-medium mb-2">Cover Image (Optional)</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl py-3 px-4 text-forest-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-forest-800 file:text-primary hover:file:bg-forest-700"
                />
            </div>
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-forest-950 font-bold py-3.5 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
            >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                Create Goal
            </button>
        </form>
    );
};
