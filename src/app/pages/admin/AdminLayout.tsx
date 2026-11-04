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
    ArrowRight,
    Star,
    Store,
    Shirt,
    Activity,
    Clock
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { NotificationPanel } from '../../components/NotificationPanel';
import { requestNotificationPermissionAndSaveToken, onForegroundMessage, checkNotificationSupport } from '../../../services/messaging';
import { subscribeToOpenIncidentCount } from '../../../services/monitoring';
import { toast } from 'react-toastify';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

// Define searchable routes for global search
const SEARCHABLE_ITEMS = [
    { label: 'Dashboard', keywords: ['dashboard', 'home', 'overview', 'kpi', 'stats'], path: '/admin', icon: '📊' },
    { label: 'System Health', keywords: ['health', 'monitoring', 'logs', 'errors', 'incidents', 'status', 'paystack'], path: '/admin/monitoring', icon: '🩺' },
    { label: 'Orders', keywords: ['orders', 'pending', 'dispatch', 'paid', 'confirmed', 'preparing', 'delivery', 'batch'], path: '/admin/orders', icon: '🛒' },
    { label: 'Food Batches', keywords: ['batches', 'batch', 'window', 'schedule', 'delivery window', 'food batch'], path: '/admin/batches', icon: '⏱️' },
    { label: 'Riders', keywords: ['riders', 'driver', 'delivery', 'available', 'online', 'offline', 'busy'], path: '/admin/riders', icon: '🏍️' },
    { label: 'Menu Management', keywords: ['menu', 'food', 'item', 'rice', 'pasta', 'swallow', 'protein', 'price', 'available', 'unavailable', 'cafeteria', 'section'], path: '/admin/menu', icon: '🍽️' },
    { label: 'Analytics', keywords: ['analytics', 'revenue', 'chart', 'report', 'trend', 'profit', 'sales'], path: '/admin/analytics', icon: '📈' },
    { label: 'Reviews', keywords: ['reviews', 'star', 'feedback', 'student', 'rating', 'comment'], path: '/admin/reviews', icon: '⭐' },
    { label: 'i-CON Directory', keywords: ['users', 'students', 'icons', 'directory', 'wallet', 'ecosystem', 'accounts'], path: '/admin/directory', icon: '👥' },
    { label: 'Order History', keywords: ['history', 'past', 'old', 'receipt', 'date', 'archive', 'delete', 'trash', 'recover'], path: '/admin/history', icon: '📋' },
    { label: 'CalebNet', keywords: ['calebnet', 'clubkonnect', 'nellobyte', 'airtime', 'data', 'recharge', 'topup'], path: '/admin/calebnet', icon: '📶' },
    { label: 'Fashion Inventory', keywords: ['fashion', 'clothes', 'shoes', 'apparel', 'merch', 'brand', 'clothing'], path: '/admin/fashion', icon: '👕' },
    { label: 'Fashion Orders', keywords: ['fashion', 'orders', 'batch', 'delivery'], path: '/admin/fashion/orders', icon: '🛍️' },
    { label: 'Business Vendors', keywords: ['business', 'vendor', 'subscription', 'campus brand', 'referral'], path: '/admin/business', icon: '🏪' },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [pushPermissionStatus, setPushPermissionStatus] = useState<string>('granted');
    const [enablingPush, setEnablingPush] = useState(false);
    const [showBlockedPushNotice, setShowBlockedPushNotice] = useState(false);
    const [openIncidentCount, setOpenIncidentCount] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    const { adminTheme, toggleAdminTheme } = useTheme();
    const { user } = useAuth();
    const searchRef = useRef<HTMLDivElement>(null);

    // Listen for foreground push notifications
    useEffect(() => {
        const unsub = onForegroundMessage((payload) => {
            console.log('Admin foreground push received:', payload);
        });
        return () => unsub();
    }, []);

    const menuItems = [
        { id: 'dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
        { id: 'monitoring', path: '/admin/monitoring', icon: <Activity className="w-5 h-5" />, label: 'System Health' },
        { id: 'orders', path: '/admin/orders', icon: <ShoppingBag className="w-5 h-5" />, label: 'Food Orders' },
        { id: 'batches', path: '/admin/batches', icon: <Clock className="w-5 h-5" />, label: 'Food Batches' },
        { id: 'mart-orders', path: '/admin/mart/orders', icon: <Store className="w-5 h-5" />, label: 'Mart Orders' },
        { id: 'mart-inventory', path: '/admin/mart/inventory', icon: <Package className="w-5 h-5" />, label: 'Mart Inventory' },
        { id: 'fashion-orders', path: '/admin/fashion/orders', icon: <ShoppingBag className="w-5 h-5" />, label: 'Fashion Orders' },
        { id: 'fashion-inventory', path: '/admin/fashion', icon: <Shirt className="w-5 h-5" />, label: 'Fashion Inventory' },
        { id: 'business', path: '/admin/business', icon: <Store className="w-5 h-5" />, label: 'Business Vendors' },
        { id: 'calebnet', path: '/admin/calebnet', icon: <Bell className="w-5 h-5" />, label: 'CalebNet' },
        { id: 'menu', path: '/admin/menu', icon: <UtensilsCrossed className="w-5 h-5" />, label: 'Menu Management' },
        { id: 'riders', path: '/admin/riders', icon: <Users className="w-5 h-5" />, label: 'Riders' },
        { id: 'analytics', path: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
        { id: 'directory', path: '/admin/directory', icon: <Users className="w-5 h-5" />, label: 'i-CON Directory' },
        { id: 'reviews', path: '/admin/reviews', icon: <Star className="w-5 h-5" />, label: 'Reviews' },
        { id: 'history', path: '/admin/history', icon: <Package className="w-5 h-5" />, label: 'Order History' },
        { id: 'settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" />, label: 'Platform Settings' },
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

        // Listen for foreground pushes
        const unsub = onForegroundMessage((payload) => {
            console.log("Foreground Admin Push Received:", payload);
            // The unread badge will automatically update via Firestore, 
            // but we could also trigger a toast here if desired.
        });

        return () => unsub();
    }, [user]);

    useEffect(() => {
        const unsub = subscribeToOpenIncidentCount(setOpenIncidentCount);
        return () => unsub();
    }, []);

    const handleEnablePush = async () => {
        if (!user?.uid) return;
        setEnablingPush(true);
        try {
            const res = await requestNotificationPermissionAndSaveToken(user.uid, 'users');
            if (typeof window !== 'undefined' && 'Notification' in window) {
                setPushPermissionStatus(Notification.permission);
            }
            if (res.success) {
                toast.success('Push notifications enabled successfully!');
                setShowBlockedPushNotice(false);
            } else if (res.needsInstallToHomeScreen) {
                toast.info('On iPhone, tap Share (square with arrow) > "Add to Home Screen" first, then open CalebDeck from your Home Screen to enable notifications.', { autoClose: 9000 });
            } else if (res.isBlocked || res.permission === 'denied') {
                setShowBlockedPushNotice(true);
                toast.error('Notifications are blocked in your device settings. Allow notifications to receive alerts.', { autoClose: 7000 });
            } else {
                toast.warn(res.error || 'Could not enable push notifications.');
            }
        } catch (err: any) {
            toast.error(err.message || 'Notification setup failed.');
        } finally {
            setEnablingPush(false);
        }
    };

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
        <div className={`h-[100dvh] w-full overflow-hidden font-sans flex flex-col lg:flex-row ${isDark ? 'bg-[#1A1A1A]' : 'bg-[#FAF9F6]'}`}>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 h-[100dvh] flex flex-col border-r transition-transform duration-300 ease-in-out lg:transform-none
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
                                    {item.id === 'monitoring' && openIncidentCount > 0 && (
                                        <span className="ml-auto min-w-[18px] rounded-full bg-red-500 px-1.5 text-center text-[10px] font-bold text-white">
                                            {openIncidentCount}
                                        </span>
                                    )}
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
            <div className="flex-1 flex flex-col h-[100dvh] overflow-y-auto overflow-x-hidden relative">

                {/* Push Notification Warning Banner */}
                {pushPermissionStatus === 'default' && (
                    <div className="bg-blue-600 text-white p-3 px-6 text-center text-sm font-bold flex flex-col sm:flex-row justify-center items-center gap-3 z-50 shadow-md">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 animate-bounce" />
                            <span>Action Required: Please enable Push Notifications to receive live order updates.</span>
                        </div>
                        <button
                            onClick={handleEnablePush}
                            disabled={enablingPush}
                            className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-xs hover:bg-white/90 disabled:opacity-50 transition-colors shadow-sm ml-2"
                        >
                            {enablingPush ? 'Enabling...' : 'Enable Now'}
                        </button>
                    </div>
                )}

                {/* Blocked Notification Guidance Banner */}
                {showBlockedPushNotice && (
                    <div className="bg-amber-600 text-white p-3 px-6 text-center text-xs sm:text-sm font-medium flex justify-between items-center gap-3 z-50 shadow-md">
                        <div className="flex items-center gap-2 text-left">
                            <Bell className="w-4 h-4 shrink-0" />
                            <span>Push notifications are blocked in your browser or device settings. Open iPhone Settings &gt; Notifications &gt; CalebDeck to allow.</span>
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
