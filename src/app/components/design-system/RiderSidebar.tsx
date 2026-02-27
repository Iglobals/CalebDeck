import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Home, History, User, BarChart2, Package, Sun, Moon } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

export function RiderSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { riderTheme, toggleRiderTheme } = useTheme();

    const isDark = riderTheme === 'dark';

    const navItems = [
        { path: '/rider', icon: <Home className="w-5 h-5" />, label: 'Dashboard' },
        { path: '/rider/batches', icon: <Package className="w-5 h-5" />, label: 'Batch Orders' },
        { path: '/rider/analytics', icon: <BarChart2 className="w-5 h-5" />, label: 'Analytics' },
        { path: '/rider/history', icon: <History className="w-5 h-5" />, label: 'Order History' },
    ];

    return (
        <aside className={`hidden md:flex flex-col w-64 h-screen border-r fixed top-0 left-0 z-50 transition-colors ${isDark ? 'bg-[#141414] border-[#222222]' : 'bg-white border-gray-200'}`}>
            {/* Logo Area */}
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-[#222222]' : 'border-gray-200'}`}>
                <Logo size="md" />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path === '/rider/batches' && location.pathname.startsWith('/rider/batch'));
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm
                                ${isActive
                                    ? (isDark ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20' : 'bg-purple-50 text-purple-700 border border-purple-200')
                                    : (isDark ? 'text-[#9C8F7F] hover:bg-[#222222] hover:text-[#FAF9F6] border border-transparent' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent')
                                }`}
                        >
                            <div className={isActive ? (isDark ? 'text-[#7C3AED]' : 'text-purple-600') : (isDark ? 'text-[#9C8F7F]' : 'text-gray-500')}>
                                {item.icon}
                            </div>
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Footer Area */}
            <div className={`p-4 border-t space-y-2 ${isDark ? 'border-[#222222]' : 'border-gray-200'}`}>
                <button
                    onClick={toggleRiderTheme}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${isDark ? 'text-[#9C8F7F] hover:bg-[#222222] hover:text-[#FAF9F6]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    Toggle Theme
                </button>
            </div>
        </aside>
    );
}
