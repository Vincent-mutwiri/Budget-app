import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, AlertCircle, DollarSign, Target, TrendingUp, Trophy } from 'lucide-react';
import { NotificationExtended } from '../types';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';

interface NotificationCenterProps {
    userId: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId }) => {
    const [notifications, setNotifications] = useState<NotificationExtended[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        if (userId) {
            loadNotifications();
        }
    }, [userId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await getNotifications(userId, { limit: 50 });
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead(userId);
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'bill_reminder':
                return <AlertCircle size={20} className="text-orange-400" />;
            case 'budget_alert':
                return <DollarSign size={20} className="text-red-400" />;
            case 'goal_milestone':
                return <Target size={20} className="text-green-400" />;
            case 'anomaly':
                return <TrendingUp size={20} className="text-yellow-400" />;
            case 'gamification':
                return <Trophy size={20} className="text-purple-400" />;
            default:
                return <Bell size={20} className="text-blue-400" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'border-l-red-500';
            case 'medium':
                return 'border-l-yellow-500';
            case 'low':
                return 'border-l-blue-500';
            default:
                return 'border-l-forest-600';
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const filterNotifications = () => {
        if (activeFilter === 'all') return notifications;
        if (activeFilter === 'bills') return notifications.filter(n => n.type === 'bill_reminder');
        if (activeFilter === 'budgets') return notifications.filter(n => n.type === 'budget_alert');
        if (activeFilter === 'goals') return notifications.filter(n => n.type === 'goal_milestone');
        if (activeFilter === 'alerts') return notifications.filter(n => n.type === 'anomaly' || n.type === 'system');
        return notifications;
    };

    const filteredNotifications = filterNotifications();

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-forest-400 hover:text-white hover:bg-forest-800 rounded-lg transition-colors"
                title="Notifications"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-forest-900 border border-forest-700 rounded-xl shadow-2xl z-50 max-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-forest-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-semibold text-lg">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-xs text-primary hover:text-primary-light transition-colors flex items-center gap-1"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-forest-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-2 overflow-x-auto">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'bills', label: 'Bills' },
                                { id: 'budgets', label: 'Budgets' },
                                { id: 'goals', label: 'Goals' },
                                { id: 'alerts', label: 'Alerts' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeFilter === filter.id
                                        ? 'bg-primary text-white'
                                        : 'bg-forest-800 text-forest-400 hover:text-white'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-8 text-center text-forest-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm">Loading notifications...</p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell size={48} className="mx-auto text-forest-600 mb-3" />
                                <p className="text-forest-400">No notifications</p>
                                <p className="text-forest-500 text-sm mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-forest-800">
                                {filteredNotifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-forest-800/50 transition-colors cursor-pointer border-l-4 ${getPriorityColor(notification.priority)} ${!notification.isRead ? 'bg-forest-800/30' : ''
                                            }`}
                                        onClick={() => {
                                            if (!notification.isRead) {
                                                handleMarkAsRead(notification.id);
                                            }
                                            if (notification.actionUrl) {
                                                window.location.href = notification.actionUrl;
                                            }
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className={`font-semibold text-sm ${!notification.isRead ? 'text-white' : 'text-forest-300'
                                                        }`}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.isRead && (
                                                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-forest-400 mb-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-forest-500">
                                                        {formatTimeAgo(notification.createdAt)}
                                                    </span>
                                                    {!notification.isRead && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkAsRead(notification.id);
                                                            }}
                                                            className="text-xs text-primary hover:text-primary-light transition-colors flex items-center gap-1"
                                                        >
                                                            <Check size={12} />
                                                            Mark read
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
