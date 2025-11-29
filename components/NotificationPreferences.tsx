import React, { useState, useEffect } from 'react';
import { X, Bell, DollarSign, Target, AlertTriangle, Trophy, Mail, Smartphone, Save } from 'lucide-react';
import { NotificationPreferences as NotificationPreferencesType } from '../types';
import { getNotificationPreferences, updateNotificationPreferences } from '../services/api';

interface NotificationPreferencesProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
    userId,
    isOpen,
    onClose
}) => {
    const [preferences, setPreferences] = useState<NotificationPreferencesType>({
        budgetAlerts: true,
        budgetThresholds: [80, 100],
        billReminders: true,
        reminderDaysBefore: [1, 3, 7],
        goalMilestones: true,
        anomalyAlerts: true,
        gamificationNotifications: true,
        emailNotifications: false,
        pushNotifications: true
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            loadPreferences();
        }
    }, [isOpen, userId]);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            const data = await getNotificationPreferences(userId);
            setPreferences(data);
        } catch (error) {
            console.error('Error loading preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await updateNotificationPreferences(userId, preferences);
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleThreshold = (threshold: number) => {
        setPreferences(prev => ({
            ...prev,
            budgetThresholds: prev.budgetThresholds.includes(threshold)
                ? prev.budgetThresholds.filter(t => t !== threshold)
                : [...prev.budgetThresholds, threshold].sort((a, b) => a - b)
        }));
    };

    const toggleReminderDay = (day: number) => {
        setPreferences(prev => ({
            ...prev,
            reminderDaysBefore: prev.reminderDaysBefore.includes(day)
                ? prev.reminderDaysBefore.filter(d => d !== day)
                : [...prev.reminderDaysBefore, day].sort((a, b) => a - b)
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-forest-900 border border-forest-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-forest-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell size={24} className="text-primary" />
                        <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-forest-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-forest-400">Loading preferences...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Budget Alerts */}
                            <div className="bg-forest-800/50 rounded-lg p-5 border border-forest-700">
                                <div className="flex items-start gap-3 mb-4">
                                    <DollarSign size={24} className="text-red-400 mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-white font-semibold text-lg">Budget Alerts</h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.budgetAlerts}
                                                    onChange={(e) => setPreferences(prev => ({ ...prev, budgetAlerts: e.target.checked }))}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-forest-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        <p className="text-forest-400 text-sm mb-3">
                                            Get notified when your spending reaches certain thresholds
                                        </p>
                                        {preferences.budgetAlerts && (
                                            <div>
                                                <p className="text-forest-300 text-sm mb-2 font-medium">Alert me at:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {[50, 75, 80, 90, 100].map(threshold => (
                                                        <button
                                                            key={threshold}
                                                            onClick={() => toggleThreshold(threshold)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${preferences.budgetThresholds.includes(threshold)
                                                                ? 'bg-primary text-white'
                                                                : 'bg-forest-700 text-forest-400 hover:bg-forest-600'
                                                                }`}
                                                        >
                                                            {threshold}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bill Reminders */}
                            <div className="bg-forest-800/50 rounded-lg p-5 border border-forest-700">
                                <div className="flex items-start gap-3 mb-4">
                                    <AlertTriangle size={24} className="text-orange-400 mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-white font-semibold text-lg">Bill Reminders</h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.billReminders}
                                                    onChange={(e) => setPreferences(prev => ({ ...prev, billReminders: e.target.checked }))}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-forest-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        <p className="text-forest-400 text-sm mb-3">
                                            Receive reminders before your bills are due
                                        </p>
                                        {preferences.billReminders && (
                                            <div>
                                                <p className="text-forest-300 text-sm mb-2 font-medium">Remind me:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {[1, 3, 7, 14].map(days => (
                                                        <button
                                                            key={days}
                                                            onClick={() => toggleReminderDay(days)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${preferences.reminderDaysBefore.includes(days)
                                                                ? 'bg-primary text-white'
                                                                : 'bg-forest-700 text-forest-400 hover:bg-forest-600'
                                                                }`}
                                                        >
                                                            {days} day{days !== 1 ? 's' : ''} before
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Goal Milestones */}
                            <div className="bg-forest-800/50 rounded-lg p-5 border border-forest-700">
                                <div className="flex items-start gap-3">
                                    <Target size={24} className="text-green-400 mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-white font-semibold text-lg">Goal Milestones</h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.goalMilestones}
                                                    onChange={(e) => setPreferences(prev => ({ ...prev, goalMilestones: e.target.checked }))}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-forest-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        <p className="text-forest-400 text-sm">
                                            Celebrate when you reach savings goal milestones (25%, 50%, 75%, 100%)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Anomaly Alerts */}
                            <div className="bg-forest-800/50 rounded-lg p-5 border border-forest-700">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={24} className="text-yellow-400 mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-white font-semibold text-lg">Unusual Spending Alerts</h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.anomalyAlerts}
                                                    onChange={(e) => setPreferences(prev => ({ ...prev, anomalyAlerts: e.target.checked }))}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-forest-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        <p className="text-forest-400 text-sm">
                                            Get notified about transactions that are significantly higher than your average
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Gamification Notifications */}
                            <div className="bg-forest-800/50 rounded-lg p-5 border border-forest-700">
                                <div className="flex items-start gap-3">
                                    <Trophy size={24} className="text-purple-400 mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-white font-semibold text-lg">Achievements & Rewards</h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.gamificationNotifications}
                                                    onChange={(e) => setPreferences(prev => ({ ...prev, gamificationNotifications: e.target.checked }))}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-forest-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        <p className="text-forest-400 text-sm">
                                            Receive notifications for XP earned, level ups, and badge unlocks
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Methods */}
                            <div className="bg-forest-800/50 rounded-lg p-5 border border-forest-700">
                                <h3 className="text-white font-semibold text-lg mb-4">Delivery Methods</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Mail size={20} className="text-blue-400" />
                                            <div>
                                                <p className="text-white font-medium">Email Notifications</p>
                                                <p className="text-forest-400 text-sm">Receive notifications via email</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={preferences.emailNotifications}
                                                onChange={(e) => setPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-forest-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Smartphone size={20} className="text-green-400" />
                                            <div>
                                                <p className="text-white font-medium">Push Notifications</p>
                                                <p className="text-forest-400 text-sm">Receive browser push notifications</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={preferences.pushNotifications}
                                                onChange={(e) => setPreferences(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-forest-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-forest-700 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-forest-800 text-white rounded-lg hover:bg-forest-700 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || saveSuccess}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${saveSuccess
                            ? 'bg-green-600 text-white'
                            : 'bg-primary text-white hover:bg-primary-light'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Save size={18} />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Preferences
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
