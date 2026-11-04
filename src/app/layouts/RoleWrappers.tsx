import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { requestNotificationPermissionAndSaveToken, onForegroundMessage } from '../../services/messaging';
import { Bell } from 'lucide-react';
import { toast } from 'react-toastify';

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
    const [enablingPush, setEnablingPush] = useState(false);
    const [showBlockedPushNotice, setShowBlockedPushNotice] = useState(false);

    const handleEnablePush = async () => {
        if (!user?.uid) return;
        setEnablingPush(true);
        try {
            const res = await requestNotificationPermissionAndSaveToken(user.uid, 'riders');
            if (typeof window !== 'undefined' && 'Notification' in window) {
                setPushPermissionStatus(Notification.permission);
            }
            if (res.success) {
                toast.success('Rider push notifications enabled successfully!');
                setShowBlockedPushNotice(false);
            } else if (res.needsInstallToHomeScreen) {
                toast.info('On iPhone, tap Share (square with arrow) > "Add to Home Screen" first, then open CalebDeck from your Home Screen to enable alerts.', { autoClose: 9000 });
            } else if (res.isBlocked || res.permission === 'denied') {
                setShowBlockedPushNotice(true);
                toast.error('Notifications are blocked in your device settings. Allow notifications to receive new batch alerts.', { autoClose: 7000 });
            } else {
                toast.warn(res.error || 'Could not enable push notifications.');
            }
        } catch (err: any) {
            toast.error(err.message || 'Notification setup failed.');
        } finally {
            setEnablingPush(false);
        }
    };

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
                {/* Push Notification Warning Banner */}
                {pushPermissionStatus === 'default' && (
                    <div className="bg-amber-500 text-white p-3 px-6 text-center text-sm font-bold flex flex-col sm:flex-row justify-center items-center gap-3 z-50 shadow-md shrink-0 print:hidden sticky top-0">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 animate-bounce" />
                            <span>Action Required: Please enable Push Notifications to receive new batch alerts.</span>
                        </div>
                        <button
                            onClick={handleEnablePush}
                            disabled={enablingPush}
                            className="bg-white text-amber-600 px-4 py-1.5 rounded-full text-xs hover:bg-white/90 disabled:opacity-50 transition-colors shadow-sm ml-2 whitespace-nowrap"
                        >
                            {enablingPush ? 'Enabling...' : 'Enable Now'}
                        </button>
                    </div>
                )}

                {/* Blocked Notification Guidance Banner */}
                {showBlockedPushNotice && (
                    <div className="bg-amber-700 text-white p-3 px-6 text-center text-xs sm:text-sm font-medium flex justify-between items-center gap-3 z-50 shadow-md shrink-0 print:hidden sticky top-0">
                        <div className="flex items-center gap-2 text-left">
                            <Bell className="w-4 h-4 shrink-0" />
                            <span>Rider notifications are blocked. Please enable Notifications in your iPhone Settings &gt; Notifications &gt; CalebDeck.</span>
                        </div>
                        <button 
                            onClick={() => setShowBlockedPushNotice(false)}
                            className="text-white hover:text-white/80 p-1 rounded-full text-base font-bold shrink-0"
                            aria-label="Dismiss"
                        >
                            ✕
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
