import React, { useState } from 'react';
import { Eye, EyeOff, Check, X, Lock } from 'lucide-react';

interface PasswordChangeProps {
    userId: string;
    hasExistingPassword: boolean;
    onSuccess: () => void;
    onCancel: () => void;
}

export const PasswordChange: React.FC<PasswordChangeProps> = ({
    userId,
    hasExistingPassword,
    onSuccess,
    onCancel
}) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Password strength validation
    const passwordRequirements = [
        { label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
        { label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
        { label: 'One lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
        { label: 'One number', test: (pwd: string) => /[0-9]/.test(pwd) },
        { label: 'One special character', test: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) }
    ];

    const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
        const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;

        if (passedRequirements <= 2) return { score: passedRequirements, label: 'Weak', color: 'text-red-400' };
        if (passedRequirements <= 3) return { score: passedRequirements, label: 'Fair', color: 'text-yellow-400' };
        if (passedRequirements <= 4) return { score: passedRequirements, label: 'Good', color: 'text-blue-400' };
        return { score: passedRequirements, label: 'Strong', color: 'text-green-400' };
    };

    const strength = getPasswordStrength(newPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (hasExistingPassword && !currentPassword) {
            setError('Current password is required');
            return;
        }

        if (!newPassword) {
            setError('New password is required');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const allRequirementsMet = passwordRequirements.every(req => req.test(newPassword));
        if (!allRequirementsMet) {
            setError('Password does not meet all requirements');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/security/password/change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    currentPassword: hasExistingPassword ? currentPassword : undefined,
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to change password');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Lock className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">
                        {hasExistingPassword ? 'Change Password' : 'Set Password'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {hasExistingPassword && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Current Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-12"
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-12"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {newPassword && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Password Strength:</span>
                                    <span className={`text-sm font-semibold ${strength.color}`}>
                                        {strength.label}
                                    </span>
                                </div>
                                <div className="flex gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1 flex-1 rounded ${level <= strength.score
                                                    ? strength.score <= 2
                                                        ? 'bg-red-400'
                                                        : strength.score <= 3
                                                            ? 'bg-yellow-400'
                                                            : strength.score <= 4
                                                                ? 'bg-blue-400'
                                                                : 'bg-green-400'
                                                    : 'bg-gray-700'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-12"
                                placeholder="Confirm new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Password Requirements:</p>
                        <ul className="space-y-1">
                            {passwordRequirements.map((req, index) => {
                                const isMet = req.test(newPassword);
                                return (
                                    <li key={index} className="flex items-center gap-2 text-sm">
                                        {isMet ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <X className="w-4 h-4 text-gray-600" />
                                        )}
                                        <span className={isMet ? 'text-green-400' : 'text-gray-500'}>
                                            {req.label}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Changing...' : hasExistingPassword ? 'Change Password' : 'Set Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
