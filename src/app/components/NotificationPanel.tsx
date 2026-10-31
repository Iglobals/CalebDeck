import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from './design-system/Badge';
import { Notification, subscribeToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/db';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router';

export function NotificationPanel() {
    const { user } = useAuth();
    const { adminTheme, riderTheme, studentTheme } = useTheme();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Determine current theme context
    let isDark = false;
    if (user?.role === 'ADMIN') isDark = adminTheme === 'dark';
    else if (user?.role === 'RIDER') isDark = riderTheme === 'dark';
    else isDark = studentTheme === 'dark';

    useEffect(() => {
        if (!user) return;
        const targetId = user.role === 'ADMIN' ? 'admin' : user.uid;
        const unsubscribe = subscribeToUserNotifications(targetId, setNotifications);
        return unsubscribe;
    }, [user]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
    };

    const handleMarkAllRead = async () => {
        if (user) {
            const targetId = user.role === 'ADMIN' ? 'admin' : user.uid;
            await markAllNotificationsAsRead(targetId);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'order': return <Package className="w-4 h-4 text-purple-500" />;
            case 'batch': return <Package className="w-4 h-4 text-amber-500" />;
            case 'system': return <AlertCircle className="w-4 h-4 text-blue-500" />;
            case 'incident': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-[#222222]' : 'hover:bg-gray-100'}`}
            >
                <Bell className={`w-6 h-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-600'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-background">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl z-50 border overflow-hidden transition-all transform origin-top-right ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-200'}`}>
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-[#222222]' : 'border-gray-100'}`}>
                        <h3 className={`font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className={`text-xs font-semibold flex items-center gap-1 transition-colors ${isDark ? 'text-[#9C8F7F] hover:text-[#FAF9F6]' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <CheckCircle className="w-3 h-3" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDark ? 'bg-[#222222]' : 'bg-gray-100'}`}>
                                    <Bell className={`w-6 h-6 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                </div>
                                <p className={`text-sm font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-[#222222]">
                                {notifications.map(notif => {
                                    const isIncident = notif.type === 'incident';
                                    return (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.isRead && handleMarkAsRead(notif.id!)}
                                        className={`px-4 py-3 transition-colors cursor-pointer border-b last:border-0 ${isIncident ? 'border-l-4 border-l-red-500' : ''} ${isDark ? 'border-[#222222] hover:bg-[#222222]' : 'border-gray-100 hover:bg-gray-50'} ${!notif.isRead ? (isIncident ? (isDark ? 'bg-red-500/10' : 'bg-red-50') : (isDark ? 'bg-[#7C3AED]/5' : 'bg-purple-50/50')) : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncident ? (isDark ? 'bg-red-500/20' : 'bg-red-100') : (isDark ? 'bg-[#222222]' : 'bg-white shadow-sm border border-gray-100')}`}>
                                                    {getIcon(notif.type)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-semibold truncate ${!notif.isRead ? (isDark ? 'text-[#FAF9F6]' : 'text-gray-900') : (isDark ? 'text-[#9C8F7F]' : 'text-gray-600')}`}>
                                                        {notif.title}
                                                    </p>
                                                    {notif.createdAt && (
                                                        <span className={`text-[10px] whitespace-nowrap mt-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                                            {formatDistanceToNow(notif.createdAt.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt), { addSuffix: true })}
                                                        </span>
                                                    )}
                                                </div>
                                                {isIncident && (
                                                    <span className="mt-1 inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                                                        Incident
                                                    </span>
                                                )}
                                                <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                    {notif.message}
                                                </p>
                                                {notif.link && (
                                                    <Link to={notif.link} className={`inline-block mt-2 text-xs font-bold ${isIncident ? 'text-red-600 hover:text-red-700' : (isDark ? 'text-[#7C3AED] hover:text-[#6D28D9]' : 'text-purple-600 hover:text-purple-700')}`}>
                                                        {isIncident ? 'Open incident →' : 'View details →'}
                                                    </Link>
                                                )}
                                            </div>
                                            {!notif.isRead && (
                                                <div className="flex-shrink-0 mt-1.5 pl-2">
                                                    <div className={`w-2 h-2 rounded-full ${isIncident ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
