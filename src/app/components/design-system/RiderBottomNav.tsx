import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Home, History, Package, BarChart2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export function RiderBottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { riderTheme, toggleRiderTheme } = useTheme();

    const navItems = [
        { path: '/rider', icon: <Home className="w-5 h-5" />, label: 'Home' },
        { path: '/rider/batches', icon: <Package className="w-5 h-5" />, label: 'Batches' },
        { path: '/rider/analytics', icon: <BarChart2 className="w-5 h-5" />, label: 'Analytics' },
        { path: '/rider/history', icon: <History className="w-5 h-5" />, label: 'History' },
    ];

    const isDark = riderTheme === 'dark';

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t pb-safe ${isDark ? 'bg-[#141414]/95 border-[#222222]' : 'bg-white/95 border-gray-200'}`}>
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 relative">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path === '/rider/batches' && location.pathname.startsWith('/rider/batch'));
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive
                                ? 'text-green-500'
                                : (isDark ? 'text-[#9C8F7F] hover:text-[#FAF9F6]' : 'text-gray-500 hover:text-gray-900')
                                }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-green-500/10' : 'bg-transparent'}`}>
                                {item.icon}
                            </div>
                            <span className={`text-[9px] font-bold tracking-widest uppercase ${isActive ? 'text-green-500' : (isDark ? 'text-[#9C8F7F]' : 'text-gray-500')}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
