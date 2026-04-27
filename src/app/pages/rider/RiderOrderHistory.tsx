import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { useAuth } from '../../../context/AuthContext';
import { CheckCircle, MapPin, DollarSign, Calendar, ChevronDown, ChevronUp, Search, Filter, FileText, ChevronRight, History, Package, RotateCcw } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { subscribeToRiderOrders, PlatformSettings, subscribeToPlatformSettings } from '../../../services/db';
import { format } from 'date-fns';

export default function RiderOrderHistory() {
    const { user } = useAuth();
    const { riderTheme } = useTheme();
    const [orders, setOrders] = useState<any[]>([]);
    const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

    const parseDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : d ? new Date(d) : null;
    const riderRate = platformSettings?.riderRatePerDelivery || 300;

    const deliveredOrders = useMemo(() => {
        return orders.filter(o => o.status === 'DELIVERED' || o.status === 'REFUNDED').sort((a, b) => {
            return (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0);
        });
    }, [orders]);

    const filteredOrders = useMemo(() => {
        if (!searchQuery) return deliveredOrders;
        const lower = searchQuery.toLowerCase();
        return deliveredOrders.filter(o =>
            (o.fullName || '').toLowerCase().includes(lower) ||
            (o.hostelName || o.hostel || '').toLowerCase().includes(lower) ||
            (o.orderId || o.id || '').toLowerCase().includes(lower)
        );
    }, [deliveredOrders, searchQuery]);

    const getDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
    const getDateLabel = (date: Date) => {
        const today = new Date();
        const todayKey = format(today, 'yyyy-MM-dd');
        const yesterdayKey = format(new Date(today.getTime() - 86400000), 'yyyy-MM-dd');
        const key = getDateKey(date);
        if (key === todayKey) return 'Today';
        if (key === yesterdayKey) return 'Yesterday';
        return format(date, 'MMM dd, yyyy');
    };

    const grouped: Record<string, any[]> = {};
    filteredOrders.forEach(order => {
        const d = parseDate(order.createdAt);
        if (!d) return;
        const key = getDateKey(d);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(order);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    const getOrderEarnings = (o: any) => {
        const platesCount = o.type === 'combo' ? (o.quantity || 1) : (o.plates?.length || 1);
        const isCombo = o.type === 'combo';
        const isGroup = o.deliveryMode === 'group' || o.deliveryMode === 'GROUP';
        const rate = isCombo
            ? (platformSettings?.comboRatePerDelivery || 250)
            : isGroup
                ? (platformSettings?.groupRatePerDelivery || 200)
                : riderRate;
        const earning = platesCount * rate;
        const total = o.isEmergency ? earning * 1.5 : earning;
        return o.status === 'REFUNDED' ? -total : total;
    };

    const totalEarnings = deliveredOrders.reduce((acc, o) => acc + getOrderEarnings(o), 0);

    const toggleRow = (id: string) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    return (
        <div className={`min-h-screen pb-24 md:pb-8 transition-colors ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
            <header className={`sticky top-0 backdrop-blur-xl border-b z-40 md:hidden flex justify-between items-center ${isDark ? 'bg-[#0F0F0F]/90 border-[#222222]' : 'bg-[#FAF9F6]/90 border-gray-200'}`}>
                <div className="px-5 py-4">
                    <h1 className={`text-xl font-bold leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Order History</h1>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Past Deliveries</p>
                </div>
                <div className="px-5">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold">
                        {deliveredOrders.length}
                    </div>
                </div>
            </header>

            <main className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
                <div className="hidden md:flex items-center justify-between mb-8">
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Delivery History</h1>
                        <p className={`text-sm font-medium mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Review your completed orders and earnings.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className={`col-span-1 md:col-span-2 flex items-center justify-between p-6 shadow-none border ${isDark ? 'bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/5 border-[#10B981]/20' : 'bg-green-50 border-green-200'}`}>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Lifetime Earnings</p>
                            <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${isDark ? 'text-[#10B981]' : 'text-green-700'}`}>₦{totalEarnings.toLocaleString()}</h2>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-[#10B981]/20 flex items-center justify-center">
                            <DollarSign className="w-7 h-7 text-[#10B981]" />
                        </div>
                    </Card>

                    <Card className={`p-6 flex items-center justify-between shadow-none border ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Total Deliveries</p>
                            <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{deliveredOrders.length}</h2>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#7C3AED]/10' : 'bg-purple-100'}`}>
                            <CheckCircle className="w-7 h-7 text-purple-600" />
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#666666]' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Search by ID, hostel, or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none transition-colors text-sm border ${isDark
                                ? 'bg-[#1A1A1A] border-[#222222] text-[#FAF9F6] focus:border-[#7C3AED]'
                                : 'bg-white border-gray-200 text-gray-900 focus:border-purple-400 shadow-sm'
                                }`}
                        />
                    </div>
                </div>

                {/* Orders List / Table */}
                <div className="space-y-6">
                    {sortedKeys.length > 0 ? sortedKeys.map(dateKey => {
                        const dateOrders = grouped[dateKey];
                        const firstDate = parseDate(dateOrders[0].createdAt)!;
                        const dayEarnings = dateOrders.reduce((acc, o) => acc + getOrderEarnings(o), 0);

                        return (
                            <div key={dateKey} className="space-y-3">
                                <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-[#222222]' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                        <h3 className={`text-base font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{getDateLabel(firstDate)}</h3>
                                        <Badge variant="purple" className="text-[9px] font-black">{dateOrders.length}</Badge>
                                    </div>
                                    <div className="text-sm font-black text-green-500">₦{dayEarnings.toLocaleString()}</div>
                                </div>

                                <div className="space-y-3">
                                    {dateOrders.map(order => {
                                        const d = parseDate(order.createdAt);
                                        const isExpanded = expandedRows.has(order.id);

                                        return (
                                            <Card
                                                key={order.id}
                                                className={`overflow-hidden border transition-all duration-300 shadow-none hover:shadow-sm ${isDark
                                                    ? 'bg-[#1A1A1A] border-[#222222] hover:border-[#333333]'
                                                    : 'bg-white border-gray-100 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="p-4 cursor-pointer flex flex-wrap sm:flex-nowrap items-center justify-between gap-4" onClick={() => toggleRow(order.id)}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${order.status === 'REFUNDED' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                                            {order.status === 'REFUNDED' ? <RotateCcw className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <h3 className={`font-bold text-base leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || 'Student'}</h3>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] font-bold tracking-widest font-mono ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>CD-{order.orderId?.slice(-6) || 'N/A'}</span>
                                                                <span className={isDark ? 'text-[#333333]' : 'text-gray-300'}>|</span>
                                                                <span className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{format(d!, 'h:mm a')}</span>
                                                                {order.isEmergency && <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-1">1.5x RUSH</span>}
                                                                {(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') && (
                                                                    <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 ml-1">Group</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                                            <div className="text-left sm:text-right">
                                                                <div className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.hostelName || order.hostel}</div>
                                                                <div className="flex items-center gap-2 justify-end">
                                                                    <div className="text-[10px] text-amber-500 font-bold uppercase">{order.type === 'combo' ? `${order.quantity || 1} Combos` : `${order.plates?.length || 0} Plates`}</div>
                                                                    {order.status === 'REFUNDED' && (
                                                                        <Badge variant="red" className="text-[9px] font-black uppercase">Refunded</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-[#222222] text-[#9C8F7F]' : 'bg-gray-100 text-gray-500'}`}>
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </div>
                                                        </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 animate-in slide-in-from-top-4 fade-in duration-200">
                                                        <div className={`pt-4 border-t gap-4 grid grid-cols-1 md:grid-cols-2 ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                                                            <div className="space-y-4">
                                                                <div className={`rounded-xl p-4 border flex items-start gap-3 ${isDark ? 'bg-[#222222]/30 border-[#333333]' : 'bg-gray-50 border-gray-200'}`}>
                                                                    <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
                                                                    <div>
                                                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Full Address</p>
                                                                        <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.hostelName || order.hostel}</p>
                                                                    </div>
                                                                </div>

                                                                {order.notes && (
                                                                    <div className={`rounded-xl p-4 border flex items-start gap-3 ${isDark ? 'bg-[#222222]/30 border-[#333333]' : 'bg-amber-50 border-amber-200'}`}>
                                                                        <FileText className="w-4 h-4 text-amber-500 mt-0.5" />
                                                                        <div>
                                                                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Student Note</p>
                                                                            <p className={`text-sm font-medium italic border-l-2 pl-2 ${isDark ? 'text-[#FAF9F6] border-amber-500/50' : 'text-gray-900 border-amber-400'}`}>"{order.notes}"</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className={`rounded-xl p-4 border ${isDark ? 'bg-[#222222]/30 border-[#333333]' : 'bg-gray-50 border-gray-200'}`}>
                                                                <div className={`flex items-center gap-2 text-sm mb-3 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                                    <Package className="w-4 h-4" /> <span className="font-bold uppercase tracking-widest text-[10px]">Order Snapshot</span>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {order.type === 'combo' ? (
                                                                        <div className={`flex justify-between items-center py-2 border-b last:border-0 ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                                                                            <div className="flex-1 overflow-hidden">
                                                                                <span className="text-xs font-black text-purple-600 mr-2">{order.comboName} × {order.quantity || 1}:</span>
                                                                                <span className={`text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                                                    {order.comboItems ? order.comboItems.map((it: any) => `${it.quantity > 1 ? `${it.quantity}x ` : ''}${it.name}`).join(', ') : 'No items'}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-amber-500 ml-2">₦{((order.basePrice || 0) * (order.quantity || 1)).toLocaleString()}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {order.plates?.map((plate: any, i: number) => (
                                                                                <div key={i} className={`flex justify-between items-center py-2 border-b last:border-0 ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                                                                                    <div className="flex-1 overflow-hidden">
                                                                                        <span className="text-xs font-black text-purple-600 mr-2">P{i + 1}:</span>
                                                                                        <span className={`text-xs truncate ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                                                            {plate.items ? plate.items.map((it: any) => `${it.quantity > 1 ? `${it.quantity}x ` : ''}${it.item?.name || it.name}`).join(', ') : 'No items'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-xs font-bold text-amber-500 ml-2">₦{(plate.total || 0).toLocaleString()}</span>
                                                                                </div>
                                                                            ))}

                                                                            <div className={`flex justify-between items-center py-2 border-b last:border-0 ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                                                                                <div className="flex-1 overflow-hidden flex items-center gap-1.5">
                                                                                    <Package className="w-3.5 h-3.5 text-amber-500" />
                                                                                    <span className={`text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                                                        Takeaway Pack × {order.plates?.length || 0}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-xs font-bold text-amber-500 ml-2">₦{((order.plates?.length || 0) * 200).toLocaleString()}</span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-20">
                            <History className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-[#333333]' : 'text-gray-300'}`} />
                            <h3 className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>No deliveries found</h3>
                            <p className={`text-sm mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Try changing your search filters.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
