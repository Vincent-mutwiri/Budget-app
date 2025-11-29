import React, { useState, useEffect } from 'react';
import { Shield, Lock, Smartphone, Monitor, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { MFASetup } from './MFASetup';
import { PasswordChange } from './PasswordChange';
import { UserSession } from '../types';

interface SecuritySettingsProps {
    userId: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ userId }) => {
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);
    const [lastPasswordChange, setLastPasswordChange] = useState<string>('');
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [showMFASetup, setShowMFASetup] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchSecurityData();
        fetchSessions();
    }, [userId]);

    const fetchSecurityData = async () => {
        try {
            const response = await fetch(`/api/user/${userId}`);
            const data = await response.json();

            setMfaEnabled(data.mfaEnabled || false);
            setHasPassword(!!data.passwordHash);
            setLastPasswordChange(data.lastPasswordChange || '');
            setLoading(false);
        } catch (err) {
            console.error('Error fetching security data:', err);
            setError('Failed to load security settings');
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const response = await fetch(`/api/security/sessions?userId=${userId}`);
            const data = await response.json();
            setSessions(data);
        } catch (err) {
            console.error('Error fetching sessions:', err);
        }
    };

    const handleDisableMFA = async () => {
        if (!confirm('Are you sure you want to disable two-factor authentication?')) {
            return;
        }

        try {
            const response = await fetch('/api/security/mfa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to disable MFA');
            }

            setMfaEnabled(false);
            showSuccess('Two-factor authentication disabled');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleLogoutSession = async (sessionId: string) => {
        try {
            const response = await fetch(`/api/security/sessions/${sessionId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to logout session');
            }

            setSessions(sessions.filter(s => s.id !== sessionId));
            showSuccess('Session logged out successfully');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleLogoutAllSessions = async () => {
        if (!confirm('Are you sure you want to logout all other sessions?')) {
            return;
        }

        try {
            const response = await fetch('/api/security/sessions/logout-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to logout sessions');
            }

            fetchSessions();
            showSuccess(`Logged out ${data.count} session(s)`);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading security settings...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-blue-400" />
                <h1 className="text-3xl font-bold text-white">Security Settings</h1>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Two-Factor Authentication Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Smartphone className="w-6 h-6 text-blue-400" />
                        <div>
                            <h2 className="text-xl font-semibold text-white">Two-Factor Authentication</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Add an extra layer of security to your account
                            </p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${mfaEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                        }`}>
                        {mfaEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                </div>

                {mfaEnabled ? (
                    <button
                        onClick={handleDisableMFA}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Disable 2FA
                    </button>
                ) : (
                    <button
                        onClick={() => setShowMFASetup(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Enable 2FA
                    </button>
                )}
            </div>

            {/* Password Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Lock className="w-6 h-6 text-purple-400" />
                        <div>
                            <h2 className="text-xl font-semibold text-white">Password</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                {hasPassword
                                    ? `Last changed: ${formatDate(lastPasswordChange)}`
                                    : 'No password set'}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowPasswordChange(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                    {hasPassword ? 'Change Password' : 'Set Password'}
                </button>
            </div>

            {/* Active Sessions Section */}
            <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Monitor className="w-6 h-6 text-green-400" />
                        <div>
                            <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Manage devices that are currently logged into your account
                            </p>
                        </div>
                    </div>
                    {sessions.length > 1 && (
                        <button
                            onClick={handleLogoutAllSessions}
                            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            Logout All
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {sessions.length === 0 ? (
                        <p className="text-gray-400 text-sm">No active sessions</p>
                    ) : (
                        sessions.map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center justify-between p-4 bg-gray-900 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <Monitor className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-white font-medium">
                                            {session.deviceInfo.browser} on {session.deviceInfo.os}
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            IP: {session.deviceInfo.ip} • Last active: {formatDate(session.lastActivity)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleLogoutSession(session.id)}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Logout this session"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Account Deletion Section */}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-red-500/20">
                <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <div>
                        <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Permanently delete your account and all associated data
                        </p>
                    </div>
                </div>

                {showDeleteConfirm ? (
                    <div className="space-y-3">
                        <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                            <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Implement account deletion
                                    alert('Account deletion not yet implemented');
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                            >
                                Yes, Delete My Account
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Delete Account
                    </button>
                )}
            </div>

            {/* Modals */}
            {showMFASetup && (
                <MFASetup
                    userId={userId}
                    onComplete={() => {
                        setShowMFASetup(false);
                        setMfaEnabled(true);
                        showSuccess('Two-factor authentication enabled successfully');
                    }}
                    onCancel={() => setShowMFASetup(false)}
                />
            )}

            {showPasswordChange && (
                <PasswordChange
                    userId={userId}
                    hasExistingPassword={hasPassword}
                    onSuccess={() => {
                        setShowPasswordChange(false);
                        setHasPassword(true);
                        fetchSecurityData();
                        showSuccess('Password changed successfully');
                    }}
                    onCancel={() => setShowPasswordChange(false)}
                />
            )}
        </div>
    );
};
