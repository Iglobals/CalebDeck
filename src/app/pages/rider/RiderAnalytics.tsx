import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, DollarSign, Package, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { subscribeToRiderOrders, subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { format, subDays, startOfDay, isAfter, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, isWithinInterval } from 'date-fns';

export default function RiderAnalytics() {
    const { user } = useAuth();
    const { riderTheme } = useTheme();
    const [orders, setOrders] = useState<any[]>([]);
    const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

    const [timeframe, setTimeframe] = useState<'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time'>('this_week');

    const isDark = riderTheme === 'dark';

    useEffect(() => {
        const unsub = subscribeToPlatformSettings(setPlatformSettings);
        return unsub;
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToRiderOrders(user.uid, setOrders);
        return unsub;
    }, [user]);

    const riderRate = platformSettings?.riderRatePerDelivery || 300;

    const getOrderEarnings = (o: any) => {
        const platesCount = o.type === 'combo' ? (o.quantity || 1) : (o.plates?.length || 1);
        const isCombo = o.type === 'combo';
        const isGroup = o.deliveryMode === 'group' || o.deliveryMode === 'GROUP';
        const rate = isCombo
            ? (platformSettings?.comboRatePerDelivery || 250)
            : isGroup
                ? (platformSettings?.groupRatePerDelivery || 200)
                : (platformSettings?.riderRatePerDelivery || 350);
        const earning = platesCount * rate;
        return o.isEmergency ? earning * 1.5 : earning;
    };

    const filteredOrders = orders.filter(o => {
        if (timeframe === 'all_time') return true;
        const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : o.createdAt ? new Date(o.createdAt) : null;
        if (!d) return false;

        const now = new Date();
        switch (timeframe) {
            case 'this_week':
                return isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) });
            case 'last_week':
                const lastWk = subWeeks(now, 1);
                return isWithinInterval(d, { start: startOfWeek(lastWk, { weekStartsOn: 0 }), end: endOfWeek(lastWk, { weekStartsOn: 0 }) });
            case 'this_month':
                return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
            case 'last_month':
                const lastMo = subMonths(now, 1);
                return isWithinInterval(d, { start: startOfMonth(lastMo), end: endOfMonth(lastMo) });
            case 'this_year':
                return isWithinInterval(d, { start: startOfYear(now), end: endOfYear(now) });
            default:
                return true;
        }
    });

    const deliveredOrders = filteredOrders.filter(o => o.status === 'DELIVERED');

    const totalEarnings = deliveredOrders.reduce((acc, o) => acc + getOrderEarnings(o), 0);
    const avgPerDelivery = riderRate;
    const completionRate = filteredOrders.length > 0 ? ((deliveredOrders.length / filteredOrders.length) * 100).toFixed(0) : '0';

    let chartData: any[] = [];
    const now = new Date();

    if (timeframe === 'this_week' || timeframe === 'last_week' || timeframe === 'this_month' || timeframe === 'last_month' || timeframe === 'all_time') {
        let startDate: Date, endDate: Date;
        if (timeframe === 'this_week') {
            startDate = startOfWeek(now, { weekStartsOn: 0 });
            endDate = endOfWeek(now, { weekStartsOn: 0 });
        } else if (timeframe === 'last_week') {
            const lastWk = subWeeks(now, 1);
            startDate = startOfWeek(lastWk, { weekStartsOn: 0 });
            endDate = endOfWeek(lastWk, { weekStartsOn: 0 });
        } else if (timeframe === 'this_month') {
            startDate = startOfMonth(now);
            endDate = now; // up to today is fine, or endOfMonth
        } else if (timeframe === 'last_month') {
            const lastMo = subMonths(now, 1);
            startDate = startOfMonth(lastMo);
            endDate = endOfMonth(lastMo);
        } else {
            startDate = subDays(now, 13);
            endDate = now;
        }

        let current = startOfDay(startDate);
        const end = startOfDay(endDate);

        while (!isAfter(current, end)) {
            const dayStr = format(current, 'MMM d');
            const nextDay = new Date(current.getTime() + 86400000);

            const dayOrders = deliveredOrders.filter(o => {
                const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : o.createdAt ? new Date(o.createdAt) : null;
                return d && !isAfter(d, nextDay) && (isAfter(d, current) || d.getTime() === current.getTime());
            });

            chartData.push({
                name: dayStr,
                deliveries: dayOrders.length,
                earnings: dayOrders.reduce((acc, o) => acc + getOrderEarnings(o), 0)
            });
            current = nextDay;
        }
    } else if (timeframe === 'this_year') {
        // Show by month
        for (let i = 0; i <= now.getMonth(); i++) {
            const monthStart = new Date(now.getFullYear(), i, 1);
            const monthEnd = endOfMonth(monthStart);
            const dayStr = format(monthStart, 'MMM');

            const monthOrders = deliveredOrders.filter(o => {
                const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : o.createdAt ? new Date(o.createdAt) : null;
                return d && isWithinInterval(d, { start: monthStart, end: monthEnd });
            });

            chartData.push({
                name: dayStr,
                deliveries: monthOrders.length,
                earnings: monthOrders.reduce((acc, o) => acc + getOrderEarnings(o), 0)
            });
        }
    }

    const timeframes = [
        { id: 'this_week', label: 'This Week' },
        { id: 'last_week', label: 'Last Week' },
        { id: 'this_month', label: 'This Month' },
        { id: 'last_month', label: 'Last Month' },
        { id: 'this_year', label: 'This Year' },
        { id: 'all_time', label: 'All Time' },
    ];

    return (
        <div className={`min-h-screen pb-24 md:pb-8 transition-colors overflow-x-hidden w-full ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
            {/* Header */}
            <header className={`sticky top-0 backdrop-blur-xl border-b z-40 md:hidden ${isDark ? 'bg-[#0F0F0F]/90 border-[#222222]' : 'bg-[#FAF9F6]/90 border-gray-200'}`}>
                <div className="px-5 py-4">
                    <h1 className={`text-xl font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Analytics</h1>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Performance Overview</p>
                </div>
            </header>

            <div className="p-5 space-y-6 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Your Analytics</h1>
                        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Track your earnings and delivery performance</p>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0">
                        {timeframes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTimeframe(t.id as any)}
                                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border ${timeframe === t.id
                                    ? (isDark ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-purple-600 text-white border-purple-600')
                                    : (isDark ? 'bg-[#1A1A1A] text-[#9C8F7F] border-[#222222] hover:bg-[#222222]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Card className={`border shadow-none ${isDark ? 'bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/5 border-[#10B981]/20' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-start justify-between mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-[#10B981]" />
                            </div>
                            <Badge variant="green" className="text-[9px] font-black uppercase">{timeframes.find(t => t.id === timeframe)?.label}</Badge>
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Total Earnings</p>
                        <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-green-700'}`}>₦{totalEarnings.toLocaleString()}</h2>
                    </Card>

                    <Card className={`border shadow-none ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${isDark ? 'bg-[#FCD34D]/10' : 'bg-amber-100'}`}>
                            <TrendingUp className="w-4 h-4 text-[#FCD34D]" />
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Avg/Delivery</p>
                        <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>₦{avgPerDelivery}</h3>
                    </Card>

                    <Card className={`border shadow-none ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${isDark ? 'bg-[#7C3AED]/10' : 'bg-purple-100'}`}>
                            <CheckCircle className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Completion</p>
                        <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{completionRate}%</h3>
                    </Card>
                </div>

                {/* Earnings Trend */}
                <Card className={`border shadow-none p-6 overflow-hidden min-w-0 ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                    <div className="mb-6">
                        <h3 className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Earnings Trend</h3>
                        <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Revenue over {timeframes.find(t => t.id === timeframe)?.label?.toLowerCase()}</p>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FCD34D" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FCD34D" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#222222" : "#f0f0f0"} vertical={false} />
                                <XAxis dataKey="name" stroke={isDark ? "#9C8F7F" : "#a1a1aa"} fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke={isDark ? "#9C8F7F" : "#a1a1aa"} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₦${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: isDark ? '#141414' : '#ffffff', border: `1px solid ${isDark ? '#333333' : '#e4e4e7'}`, borderRadius: '12px' }}
                                    itemStyle={{ color: '#FCD34D', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="earnings" stroke="#FCD34D" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Delivery Volume */}
                <Card className={`border shadow-none p-6 overflow-hidden min-w-0 ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                    <div className="mb-6">
                        <h3 className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Delivery Volume</h3>
                        <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Completed deliveries over {timeframes.find(t => t.id === timeframe)?.label?.toLowerCase()}</p>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#222222" : "#f0f0f0"} vertical={false} />
                                <XAxis dataKey="name" stroke={isDark ? "#9C8F7F" : "#a1a1aa"} fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke={isDark ? "#9C8F7F" : "#a1a1aa"} fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: isDark ? '#141414' : '#ffffff', border: `1px solid ${isDark ? '#333333' : '#e4e4e7'}`, borderRadius: '12px' }}
                                    itemStyle={{ color: '#7C3AED', fontWeight: 'bold' }}
                                    cursor={{ fill: isDark ? '#222222' : '#f4f4f5' }}
                                />
                                <Bar dataKey="deliveries" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}
