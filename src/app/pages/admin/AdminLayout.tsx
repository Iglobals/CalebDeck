import React, { useState } from 'react';
import { Logo } from '../../components/design-system/Logo';
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    BarChart3,
    Settings,
    Search,
    Bell,
    Menu as MenuIcon,
    X as CloseIcon,
    UtensilsCrossed,
    LogOut
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { adminTheme, toggleAdminTheme } = useTheme();

    const menuItems = [
        { id: 'dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
        { id: 'orders', path: '/admin/orders', icon: <ShoppingBag className="w-5 h-5" />, label: 'Orders' },
        { id: 'riders', path: '/admin/riders', icon: <Users className="w-5 h-5" />, label: 'Riders' },
        { id: 'menu', path: '/admin/menu', icon: <UtensilsCrossed className="w-5 h-5" />, label: 'Menu Management' },
        { id: 'analytics', path: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
    ];

    const isDark = adminTheme === 'dark';

    return (
        <div className={`min-h-screen font-sans flex flex-col lg:flex-row ${isDark ? 'bg-[#1A1A1A]' : 'bg-[#FAF9F6]'}`}>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform duration-300 ease-in-out lg:transform-none
                ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-200'}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                    <div>
                        <Logo size="md" />
                        <p className={`text-xs mt-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Admin Dashboard</p>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 hover:bg-[#333333] rounded-lg"
                    >
                        <CloseIcon className={`w-5 h-5 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-600'}`} />
                    </button>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-1">
                        {menuItems.map(item => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                                        : isDark
                                            ? 'text-[#FAF9F6] hover:bg-[#2A2A2A]'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {item.icon}
                                    <span className="font-medium text-sm">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <div className={`p-4 border-t ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold text-sm">
                            AD
                        </div>
                        <div>
                            <p className={`font-semibold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Admin User</p>
                            <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>admin@caleb.edu</p>
                        </div>
                    </div>
                    {/* Theme Toggle in sidebar for convenience */}
                    <button
                        onClick={toggleAdminTheme}
                        className={`w-full mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? 'text-[#9C8F7F] hover:bg-[#2A2A2A]' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        {isDark ? <Bell className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
                {/* Top Bar */}
                <header className={`px-4 lg:px-8 py-4 sticky top-0 z-30 transition-all border-b ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-200 shadow-sm'
                    }`}>
                    <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-[#333333] rounded-lg"
                        >
                            <MenuIcon className={`w-6 h-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-600'}`} />
                        </button>

                        <div className="flex-1 max-w-2xl">
                            <div className="relative">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                <input
                                    type="text"
                                    placeholder="Search orders, riders, hostels..."
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 outline-none transition-all text-sm ${isDark
                                        ? 'border-[#333333] bg-[#2A2A2A] text-[#FAF9F6] placeholder:text-[#9C8F7F] focus:border-[#7C3AED]'
                                        : 'border-gray-100 bg-gray-50 text-gray-900 focus:border-[#7C3AED]/30'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className={`relative p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}`}>
                                <Bell className={`w-6 h-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-600'}`} />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-[#FCD34D] rounded-full"></span>
                            </button>
                            <div className="hidden sm:block w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FCD34D]"></div>
                        </div>
                    </div>
                </header>

                {/* Main Area */}
                <main className="flex-1 p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Page Title */}
                        <div className="mb-6 lg:mb-8">
                            <h1 className={`text-2xl lg:text-3xl font-bold mb-2 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                                {title}
                            </h1>
                            <p className={`${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                Manage your campus food delivery operations
                            </p>
                        </div>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
