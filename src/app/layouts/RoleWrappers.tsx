import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

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

    if (loading) return null;
    if (!user || user.role !== 'ADMIN') return null;

    return <div className="min-h-screen bg-background text-foreground transition-colors duration-300"><Outlet /></div>;
}

import { RiderSidebar } from '../components/design-system/RiderSidebar';
import { RiderBottomNav } from '../components/design-system/RiderBottomNav';

export function RiderRoleWrapper() {
    const { user, loading } = useAuth();
    const { riderTheme, applyTheme } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        applyTheme('rider');
    }, [applyTheme]);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'RIDER')) {
            navigate('/rider/login');
        }
    }, [user, loading, navigate]);

    if (loading) return null;
    if (!user || user.role !== 'RIDER') return null;

    return (
        <div className="flex min-h-screen bg-[#0F0F0F] text-[#FAF9F6] transition-colors duration-300">
            {/* Desktop Sidebar */}
            <div className="print:hidden">
                <RiderSidebar />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen relative w-full overflow-x-hidden max-w-[100vw] sm:max-w-full">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden print:hidden">
                <RiderBottomNav />
            </div>
        </div>
    );
}
