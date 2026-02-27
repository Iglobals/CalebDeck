import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    LogOut,
    ArrowRight
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { NotificationPanel } from '../../components/NotificationPanel';
import { requestNotificationPermissionAndSaveToken, onForegroundMessage } from '../../../services/messaging';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

// Define searchable routes for global search
const SEARCHABLE_ITEMS = [
    { label: 'Dashboard', keywords: ['dashboard', 'home', 'overview', 'kpi', 'stats'], path: '/admin', icon: '📊' },
    { label: 'Orders', keywords: ['orders', 'pending', 'dispatch', 'paid', 'confirmed', 'preparing', 'delivery', 'batch'], path: '/admin/orders', icon: '🛒' },
    { label: 'Riders', keywords: ['riders', 'driver', 'delivery', 'available', 'online', 'offline', 'busy'], path: '/admin/riders', icon: '🏍️' },
    { label: 'Menu Management', keywords: ['menu', 'food', 'item', 'rice', 'pasta', 'swallow', 'protein', 'price', 'available', 'unavailable', 'cafeteria', 'section'], path: '/admin/menu', icon: '🍽️' },
    { label: 'Analytics', keywords: ['analytics', 'revenue', 'chart', 'report', 'trend', 'profit', 'sales'], path: '/admin/analytics', icon: '📈' },
    { label: 'Order History', keywords: ['history', 'past', 'old', 'receipt', 'date', 'archive', 'delete', 'trash', 'recover'], path: '/admin/history', icon: '📋' },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [pushPermissionStatus, setPushPermissionStatus] = useState<string>('granted');
    const location = useLocation();
    const navigate = useNavigate();
    const { adminTheme, toggleAdminTheme } = useTheme();
    const { user } = useAuth();
    const searchRef = useRef<HTMLDivElement>(null);

    const menuItems = [
        { id: 'dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
        { id: 'orders', path: '/admin/orders', icon: <ShoppingBag className="w-5 h-5" />, label: 'Orders' },
        { id: 'riders', path: '/admin/riders', icon: <Users className="w-5 h-5" />, label: 'Riders' },
        { id: 'menu', path: '/admin/menu', icon: <UtensilsCrossed className="w-5 h-5" />, label: 'Menu Management' },
        { id: 'analytics', path: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
        { id: 'history', path: '/admin/history', icon: <Package className="w-5 h-5" />, label: 'Order History' },
    ];

    const isDark = adminTheme === 'dark';
    const isDashboard = location.pathname === '/admin';

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Initialize Push Notifications
    useEffect(() => {
        if ('Notification' in window) {
            setPushPermissionStatus(Notification.permission);
        }

        if (user && user.uid) {
            // Save admin token to the user document
            requestNotificationPermissionAndSaveToken(user.uid, 'users');
        }

        // Listen for foreground pushes
        const unsub = onForegroundMessage((payload) => {
            console.log("Foreground Admin Push Received:", payload);
            // The unread badge will automatically update via Firestore, 
            // but we could also trigger a toast here if desired.
        });

        return () => unsub();
    }, [user]);

    // Global search suggestions
    const searchResults = useMemo(() => {
        if (!globalSearch || globalSearch.length < 2) return [];
        const q = globalSearch.toLowerCase();
        return SEARCHABLE_ITEMS.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.keywords.some(k => k.includes(q))
        );
    }, [globalSearch]);

    const handleSearchSelect = (path: string) => {
        navigate(path);
        setGlobalSearch('');
        setSearchFocused(false);
    };

    return (
        <div className={`h-screen w-full overflow-hidden font-sans flex flex-col lg:flex-row ${isDark ? 'bg-[#1A1A1A]' : 'bg-[#FAF9F6]'}`}>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen flex flex-col border-r transition-transform duration-300 ease-in-out lg:transform-none
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
                        <img
                            src="/calebdeck-logo.jpeg"
                            alt="CalebDeck"
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#7C3AED]"
                        />
                        <div className="min-w-0">
                            <p className={`font-semibold text-sm truncate ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{user?.fullName || user?.displayName || 'Admin'}</p>
                            <p className={`text-xs truncate ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{user?.email || 'admin@calebdeck.com'}</p>
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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden relative">

                {/* Push Notification Warning Banner Form Safari iOS */}
                {pushPermissionStatus === 'default' && (
                    <div className="bg-blue-600 text-white p-3 px-6 text-center text-sm font-bold flex flex-col sm:flex-row justify-center items-center gap-3 z-50 shadow-md">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 animate-bounce" />
                            <span>Action Required: Please enable Push Notifications to receive live order updates.</span>
                        </div>
                        <button
                            onClick={async () => {
                                if (user?.uid) {
                                    await requestNotificationPermissionAndSaveToken(user.uid, 'users');
                                    setPushPermissionStatus(Notification.permission);
                                }
                            }}
                            className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-xs hover:bg-white/90 transition-colors shadow-sm ml-2"
                        >
                            Enable Now
                        </button>
                    </div>
                )}

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

                        {/* Global Search - only on dashboard */}
                        {isDashboard ? (
                            <div className="flex-1 max-w-2xl relative" ref={searchRef}>
                                <div className="relative">
                                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search pages — orders, menu, analytics..."
                                        value={globalSearch}
                                        onChange={(e) => setGlobalSearch(e.target.value)}
                                        onFocus={() => setSearchFocused(true)}
                                        className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 outline-none transition-all text-sm ${isDark
                                            ? 'border-[#333333] bg-[#2A2A2A] text-[#FAF9F6] placeholder:text-[#9C8F7F] focus:border-[#7C3AED]'
                                            : 'border-gray-100 bg-gray-50 text-gray-900 focus:border-[#7C3AED]/30'
                                            }`}
                                    />
                                </div>
                                {/* Search Results Dropdown */}
                                {searchFocused && searchResults.length > 0 && (
                                    <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border-2 overflow-hidden shadow-2xl z-50 ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                                        {searchResults.map((item) => (
                                            <button
                                                key={item.path}
                                                onClick={() => handleSearchSelect(item.path)}
                                                className={`w-full text-left px-5 py-3.5 flex items-center justify-between group transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{item.icon}</span>
                                                    <div>
                                                        <span className={`font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.label}</span>
                                                        <p className={`text-[10px] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>{item.path}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-[#7C3AED]' : 'text-purple-500'}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {searchFocused && globalSearch.length >= 2 && searchResults.length === 0 && (
                                    <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border-2 overflow-hidden shadow-2xl z-50 px-5 py-6 text-center ${isDark ? 'bg-[#222222] border-[#333333] text-[#9C8F7F]' : 'bg-white border-gray-100 text-gray-400'}`}>
                                        <p className="text-sm font-bold">No matching pages found</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1" /> /* Spacer on non-dashboard pages */
                        )}

                        <div className="flex items-center gap-4">
                            <NotificationPanel />
                            <div className="hidden sm:block w-10 h-10 rounded-full overflow-hidden border-2 border-[#7C3AED]">
                                <img src="/calebdeck-logo.jpeg" alt="CalebDeck" className="w-full h-full object-cover" />
                            </div>
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
