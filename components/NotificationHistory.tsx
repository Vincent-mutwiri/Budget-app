import React, { useState, useEffect } from 'react';
import { X, Bell, DollarSign, Target, AlertTriangle, Trophy, Info, Filter, CheckCircle, Circle } from 'lucide-react';
import { NotificationExtended } from '../types';
import { getNotifications, markNotificationAsRead } from '../services/api';

interface NotificationHistoryProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

type NotificationFilter = 'all' | 'bill_reminder' | 'budget_alert' | 'goal_milestone' | 'anomaly' | 'gamification' | 'system';

export const NotificationHistory: React.FC<NotificationHistoryProps> = ({
    userId,
    isOpen,
    onClose
}) => {
    const [notifications, setNotifications] = useState<NotificationExtended[]>([]);
    const [filteredNotifications, setFilteredNotifications] = useState<NotificationExtended[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<NotificationFilter>('all');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            loadNotifications();
        }
    }, [isOpen, userId]);

    useEffect(() => {
        applyFilters();
    }, [notifications, filter, showUnreadOnly]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await getNotifications(userId);
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...notifications];

        // Apply type filter
        if (filter !== 'all') {
            filtered = filtered.filter(n => n.type === filter);
        }

        // Apply read/unread filter
        if (showUnreadOnly) {
            filtered = filtered.filter(n => !n.isRead);
        }

        setFilteredNotifications(filtered);
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'bill_reminder':
                return <AlertTriangle size={20} className="text-orange-400" />;
            case 'budget_alert':
                return <DollarSign size={20} className="text-red-400" />;
            case 'goal_milestone':
                return <Target size={20} className="text-green-400" />;
            case 'anomaly':
                return <AlertTriangle size={20} className="text-yellow-400" />;
            case 'gamification':
                return <Trophy size={20} className="text-purple-400" />;
            case 'system':
                return <Info size={20} className="text-blue-400" />;
            default:
                return <Bell size={20} className="text-forest-400" />;
        }
    };

    const getNotificationTypeLabel = (type: string) => {
        switch (type) {
            case 'bill_reminder':
                return 'Bill Reminder';
            case 'budget_alert':
                return 'Budget Alert';
            case 'goal_milestone':
                return 'Goal Milestone';
            case 'anomaly':
                return 'Unusual Spending';
            case 'gamification':
                return 'Achievement';
            case 'system':
                return 'System';
            default:
                return 'Notification';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'border-red-500/30 bg-red-500/5';
            case 'medium':
                return 'border-yellow-500/30 bg-yellow-500/5';
            case 'low':
                return 'border-forest-700 bg-forest-800/30';
            default:
                return 'border-forest-700 bg-forest-800/30';
        }
    };

    const filterOptions: { value: NotificationFilter; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'bill_reminder', label: 'Bills' },
        { value: 'budget_alert', label: 'Budgets' },
        { value: 'goal_milestone', label: 'Goals' },
        { value: 'anomaly', label: 'Alerts' },
        { value: 'gamification', label: 'Achievements' },
        { value: 'system', label: 'System' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-forest-900 border border-forest-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-forest-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Bell size={24} className="text-primary" />
                            <h2 className="text-2xl font-bold text-white">Notification History</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-forest-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-forest-400" />
                            <span className="text-forest-400 text-sm font-medium">Filter:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filterOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setFilter(option.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === option.value
                                        ? 'bg-primary text-white'
                                        : 'bg-forest-800 text-forest-400 hover:bg-forest-700'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <label className="flex items-center gap-2 ml-auto cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showUnreadOnly}
                                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                                className="w-4 h-4 rounded border-forest-600 bg-forest-800 text-primary focus:ring-primary focus:ring-offset-0"
                            />
                            <span className="text-forest-300 text-sm">Unread only</span>
                        </label>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-forest-400">Loading notifications...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell size={48} className="text-forest-600 mx-auto mb-4" />
                            <p className="text-forest-400 text-lg">
                                {showUnreadOnly ? 'No unread notifications' : 'No notifications found'}
                            </p>
                            <p className="text-forest-500 text-sm mt-2">
                                {filter !== 'all' ? 'Try changing the filter' : 'Notifications will appear here'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNotifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`border rounded-lg p-4 transition-all ${getPriorityColor(notification.priority)} ${!notification.isRead ? 'border-l-4 border-l-primary' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3 mb-1">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-white font-semibold">
                                                            {notification.title}
                                                        </h3>
                                                        {!notification.isRead && (
                                                            <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-forest-300 text-sm">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                {!notification.isRead && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                        className="flex-shrink-0 text-forest-400 hover:text-primary transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs text-forest-500 font-medium">
                                                    {getNotificationTypeLabel(notification.type)}
                                                </span>
                                                <span className="text-xs text-forest-500">
                                                    {formatTimestamp(notification.createdAt)}
                                                </span>
                                                {notification.priority === 'high' && (
                                                    <span className="text-xs text-red-400 font-medium">
                                                        High Priority
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-forest-700 flex items-center justify-between">
                    <p className="text-forest-400 text-sm">
                        {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                        {showUnreadOnly && ` (${notifications.filter(n => !n.isRead).length} unread)`}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
