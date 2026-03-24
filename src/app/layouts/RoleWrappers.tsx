import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { requestNotificationPermissionAndSaveToken, onForegroundMessage } from '../../services/messaging';
import { Bell } from 'lucide-react';

export function AdminRoleWrapper() {
    const { user, loading } = useAuth();
    const { adminTheme, applyTheme } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        applyTheme('admin');
    }, [applyTheme]);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'ADMIN')) {
            navigate('/admin/login');
        }
    }, [user, loading, navigate]);

    if (loading) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
            <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading...</p>
        </div>
    );
    if (!user || user.role !== 'ADMIN') return null;

    return <div className="min-h-screen bg-background text-foreground transition-colors duration-300"><Outlet /></div>;
}

import { RiderSidebar } from '../components/design-system/RiderSidebar';
import { RiderBottomNav } from '../components/design-system/RiderBottomNav';

export function RiderRoleWrapper() {
    const { user, loading } = useAuth();
    const { riderTheme, applyTheme } = useTheme();
    const navigate = useNavigate();
    const [pushPermissionStatus, setPushPermissionStatus] = useState<string>('granted');

    useEffect(() => {
        applyTheme('rider');
    }, [applyTheme]);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'RIDER')) {
            navigate('/rider/login');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if ('Notification' in window) {
            setPushPermissionStatus(Notification.permission);
        }

        const unsub = onForegroundMessage((payload) => {
            console.log("Foreground Rider Push Received:", payload);
        });

        return () => unsub();
    }, [user]);

    if (loading) return (
        <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 rounded-full border-4 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
            <p className="text-sm font-semibold text-[#9C8F7F] animate-pulse">Loading...</p>
        </div>
    );
    if (!user || user.role !== 'RIDER') return null;

    const isDark = riderTheme === 'dark';

    return (
        <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0F0F0F] text-[#FAF9F6]' : 'bg-[#FAF9F6] text-gray-900'}`}>
            {/* Desktop Sidebar */}
            <div className="print:hidden">
                <RiderSidebar />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen relative w-full overflow-x-hidden max-w-[100vw] sm:max-w-full flex flex-col">
                {/* Push Notification Warning Banner Form Safari iOS */}
                {pushPermissionStatus === 'default' && (
                    <div className="bg-amber-500 text-white p-3 px-6 text-center text-sm font-bold flex flex-col sm:flex-row justify-center items-center gap-3 z-50 shadow-md shrink-0 print:hidden sticky top-0">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 animate-bounce" />
                            <span>Action Required: Please enable Push Notifications to receive new batch alerts.</span>
                        </div>
                        <button
                            onClick={async () => {
                                if (user?.uid) {
                                    await requestNotificationPermissionAndSaveToken(user.uid, 'riders');
                                    setPushPermissionStatus(Notification.permission);
                                }
                            }}
                            className="bg-white text-amber-600 px-4 py-1.5 rounded-full text-xs hover:bg-white/90 transition-colors shadow-sm ml-2 whitespace-nowrap"
                        >
                            Enable Now
                        </button>
                    </div>
                )}

                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden print:hidden">
                <RiderBottomNav />
            </div>
        </div>
    );
}
