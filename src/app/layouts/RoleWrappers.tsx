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

    return <div className="min-h-screen bg-background text-foreground transition-colors duration-300"><Outlet /></div>;
}
