import React, { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useTheme } from '../../context/ThemeContext';

export function AdminRoleWrapper() {
    const { adminTheme, applyTheme } = useTheme();
    useEffect(() => applyTheme('admin'), [adminTheme, applyTheme]);
    return <div className="min-h-screen bg-background text-foreground transition-colors duration-300"><Outlet /></div>;
}

export function RiderRoleWrapper() {
    const { riderTheme, applyTheme } = useTheme();
    useEffect(() => applyTheme('rider'), [riderTheme, applyTheme]);
    return <div className="min-h-screen bg-background text-foreground transition-colors duration-300"><Outlet /></div>;
}
