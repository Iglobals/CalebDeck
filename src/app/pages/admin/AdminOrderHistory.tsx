import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { Download, Search, Filter, ChevronDown, Trash2, RotateCcw, AlertTriangle, CheckCircle, Package, Clock, Users, Loader2 } from 'lucide-react';
import { getRecentOrderHistory, subscribeToRiders, trashOrder, recoverOrder, permanentlyDeleteOrder, Rider } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';
import { format } from 'date-fns';

type ViewMode = 'active' | 'trash';

export default function AdminOrderHistory() {
    const [orders, setOrders] = useState<any[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<ViewMode>('active');
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; status: string } | null>(null);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
    const [loading, setLoading] = useState(true);
    const { adminTheme } = useTheme();

    useEffect(() => {
        let ordersLoaded = false, ridersLoaded = false;
        let mounted = true;
        const checkDone = () => { if (ordersLoaded && ridersLoaded) setLoading(false); };
        getRecentOrderHistory(30, 200).then((data) => {
            if (!mounted) return;
            setOrders(data);
            ordersLoaded = true;
            checkDone();
        }).catch((error) => {
            console.error('AdminOrderHistory read failed:', error);
            if (!mounted) return;
            setOrders([]);
            ordersLoaded = true;
            checkDone();
        });
        const unsubRiders = subscribeToRiders((data) => { setRiders(data); ridersLoaded = true; checkDone(); });
        return () => { mounted = false; unsubRiders(); };
    }, []);

    const isDark = adminTheme === 'dark';
    const parseDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : d ? new Date(d) : null;
    const getOrderAmount = (order: any) => order.totalAmount ?? order.total ?? 0;

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3000);
    };

    const limitDate = new Date('2026-04-07T00:00:00Z');
    const activeOrders = orders.filter(o => {
        if (o.status === 'TRASHED') return false;
        const d = parseDate(o.createdAt);
        return d && d >= limitDate;
    });
    const trashedOrders = orders.filter(o => o.status === 'TRASHED');
    const currentOrders = viewMode === 'active' ? activeOrders : trashedOrders;

    const filteredOrders = currentOrders
        .filter(o => {
            const matchesSearch = !searchQuery ||
                (o.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.hostel || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = viewMode === 'trash' || statusFilter === 'all' || o.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const da = parseDate(a.createdAt);
            const db2 = parseDate(b.createdAt);
            return (db2?.getTime() || 0) - (da?.getTime() || 0);
        });

    const getTimePeriod = (date: Date | null): string => {
        if (!date) return 'Older';
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Sunday start

        if (date >= today) return 'Today';
        if (date >= weekStart) return 'This Week';
        if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) return 'This Month';
        return 'Older';
    };

    const timePeriods = ['Today', 'This Week', 'This Month', 'Older'];
    const groupedOrders = timePeriods.map(period => ({
        period,
        orders: filteredOrders.filter(o => getTimePeriod(parseDate(o.createdAt)) === period),
    })).filter(g => g.orders.length > 0);

    const handleTrash = async (orderId: string, currentStatus: string) => {
        try {
            await trashOrder(orderId, currentStatus);
            showToast('Order moved to trash');
            setDeleteConfirm(null);
        } catch (e) { console.error(e); }
    };

    const handleRecover = async (orderId: string) => {
        try {
            await recoverOrder(orderId);
            showToast('Order recovered');
        } catch (e) { console.error(e); }
    };

    const handlePermanentDelete = async (orderId: string) => {
        try {
            await permanentlyDeleteOrder(orderId);
            showToast('Order permanently deleted');
            setDeleteConfirm(null);
        } catch (e) { console.error(e); }
    };

    const handleDownloadPDF = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const date = parseDate(order.createdAt);
        const riderName = order.assignedRiderId ? (riders.find(r => r.id === order.assignedRiderId)?.name || 'Unknown') : 'Unassigned';
        const html = `
            <html>
            <head>
                <title>Receipt - ${order.orderId}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 480px; margin: 0 auto; color: #1A1A1A; }
                    .header { text-align: center; border-bottom: 3px solid #7C3AED; padding-bottom: 20px; margin-bottom: 24px; }
                    .logo { font-size: 24px; font-weight: 900; } .logo span { color: #7C3AED; }
                    .oid { font-family: monospace; font-size: 13px; padding: 4px 10px; background: #f0f0f0; border-radius: 6px; margin-top: 8px; display: inline-block; }
                    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
                    .label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 6px; margin-top: 18px; }
                    .value { font-size: 16px; font-weight: 900; }
                    .total { text-align: right; font-size: 22px; font-weight: 900; color: #7C3AED; margin-top: 20px; }
                    .footer { text-align: center; font-size: 11px; color: #999; margin-top: 30px; border-top: 2px solid #7C3AED; padding-top: 16px; }
                    .close-btn { display: block; width: 100%; padding: 14px; margin-top: 30px; background: #1A1A1A; color: white; border: none; border-radius: 8px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
                    @media print { .close-btn { display: none !important; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">CALEB<span>DECK</span></div>
                    <div class="oid">
                        ORD-${order.orderId?.slice(-6) || 'XXXXXX'}
                        ${(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') ? '  -  GROUP' : ''}
                        ${order.deliveryType === 'BATCH' ? `  -  ${(order.foodBatchName || 'BATCH').toUpperCase()}` : '  -  INSTANT'}
                    </div>
                </div>
                <div class="label">Student</div>
                <div class="value">${order.fullName || 'N/A'}</div>
                <div style="font-size:13px;font-weight:700;margin-top:4px">${order.phone || ''}</div>
                <div class="label">Delivery</div>
                <div class="value">${order.hostel || 'N/A'}</div>
                <div class="label">Date</div>
                <div class="value" style="font-size:14px">${date ? format(date, 'PPpp') : 'N/A'}</div>
                <div class="label">Status</div>
                <div class="value" style="font-size:14px;color:#7C3AED">${order.status || 'PENDING'}</div>
                <div class="label">Fulfilled By</div>
                <div class="value" style="font-size:14px">${riderName}</div>
                <div class="label">Items</div>
                ${order.type === 'combo' ? (
                    `<div style="font-size:11px;font-weight:900;color:#7C3AED;margin-top:10px">${order.comboName} x ${order.quantity || 1}</div>` +
                    (order.comboItems || []).map((it: any) =>
                        `<div class="row"><span>${it.name} x ${it.quantity}</span></div>`
                    ).join('')
                ) : (
                    (order.plates || []).map((p: any, i: number) =>
                        `<div style="font-size:11px;font-weight:900;color:#7C3AED;margin-top:10px">PLATE #${i + 1}</div>` +
                        (p.items || []).map((it: any) =>
                            `<div class="row"><span>${it.item?.name || 'Item'} x ${it.quantity}</span><span>₦${((it.item?.price || 0) * it.quantity).toLocaleString()}</span></div>`
                        ).join('')
                    ).join('')
                )}
                
                ${(() => {
                    const hasBreakdown = !!order.breakdown;
                    const plateCount = order.quantity || order.plates?.length || 1;
                    const isGroup = order.deliveryMode === 'group' || order.deliveryMode === 'GROUP';
                    const isPremiumHostel = ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'].includes((order.hostel || order.hostelName || '').toString().toLowerCase());
                    const baseDeliveryRate = isPremiumHostel ? 1250 : 750;
                    let calculatedDeliveryAmount = baseDeliveryRate * plateCount;
                    let calculatedDiscount = 0;
                    if (isGroup) {
                        const groupDiscount = isPremiumHostel ? (1250 - Math.round(1250 * 0.8)) : (750 - 580);
                        calculatedDiscount = groupDiscount * plateCount;
                    }
                    const deliveryFee = hasBreakdown ? order.breakdown.delivery : calculatedDeliveryAmount;
                    const processingFee = hasBreakdown ? (order.breakdown.processing + order.breakdown.platform) : 300;
                    const discount = hasBreakdown ? order.breakdown.discount : calculatedDiscount;
                    const takeawayAmount = order.type !== 'combo' ? (order.plates?.length || 0) * 200 : 0;
                    
                    return `
                        <div style="font-size:11px;font-weight:900;color:#999;margin-top:10px;text-transform:uppercase">FEES</div>
                        ${order.type !== 'combo' ? `
                        <div class="row">
                            <span>Takeaway Pack x ${order.plates?.length || 0}</span>
                            <span>₦${takeawayAmount.toLocaleString()}</span>
                        </div>
                        ` : ''}
                        <div class="row">
                            <span>Delivery Fee ${isGroup ? '(Group)' : '(Solo)'}</span>
                            <span>₦${deliveryFee.toLocaleString()}</span>
                        </div>
                        <div class="row">
                            <span>Service & Processing</span>
                            <span>₦${processingFee.toLocaleString()}</span>
                        </div>
                        ${discount > 0 ? `
                        <div class="row" style="color: #10B981;">
                            <span>Group Discount</span>
                            <span>-₦${discount.toLocaleString()}</span>
                        </div>
                        ` : ''}
                    `;
                })()}
                ${(order.drinksSnacks || []).length > 0 ? `
                    <div style="font-size:11px;font-weight:900;color:#FCD34D;margin-top:10px">EXTRAS</div>
                    ${order.drinksSnacks.map((it: any) =>
            `<div class="row"><span>${it?.item?.name || it?.name || 'Add-on'} x ${it?.quantity || 1}</span><span>₦${((it?.item?.price || it?.price || 0) * (it?.quantity || 1)).toLocaleString()}</span></div>`
        ).join('')}
                ` : ''}
                <div class="total">Total: ₦${getOrderAmount(order).toLocaleString()}</div>
                <div class="footer">CalebDeck Order Receipt<br/>${date ? format(date, 'PPpp') : ''}</div>
                <button class="close-btn" onclick="closeReceipt()">Close Receipt</button>
                <script>
                    function closeReceipt() {
                        try { window.close(); } catch (error) {}
                        setTimeout(function () {
                            if (!window.closed) {
                                if (window.history.length > 1) {
                                    window.history.back();
                                } else {
                                    window.location.replace('/admin/history');
                                }
                            }
                        }, 150);
                    }
                    window.print();
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const statusColors: Record<string, string> = {
        PENDING_PAYMENT: isDark ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600',
        FAILED: isDark ? 'bg-gray-500/10 text-gray-400' : 'bg-gray-100 text-gray-500',
        PENDING: isDark ? 'bg-yellow-500/10 text-yellow-500' : 'bg-yellow-50 text-yellow-600',
        PAID: isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
        CONFIRMED: isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
        PREPARING: isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
        OUT_FOR_DELIVERY: isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
        ON_THE_WAY: isDark ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600',
        DELIVERED: isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        CANCELLED: isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600',
        TRASHED: isDark ? 'bg-gray-500/10 text-gray-400' : 'bg-gray-100 text-gray-500',
    };

    const activeStatuses = ['all', 'PENDING_PAYMENT', 'PAID', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'DELIVERED', 'FAILED', 'CANCELLED'];

    return (
        <AdminLayout title="Order History">
            {/* Toast */}
            {toast.visible && (
                <div className="fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl bg-[#7C3AED] text-white"
                    style={{ animation: 'slideInDown 0.3s ease-out' }}>
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED] mb-3" />
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Loading order history...</p>
                </div>
            ) : (
            <>

            {/* Active / Trash Tab Toggle */}
            <div className={`flex gap-2 mb-8 p-1.5 rounded-2xl w-fit ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-100'}`}>
                <button
                    onClick={() => { setViewMode('active'); setStatusFilter('all'); }}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'active'
                        ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                        : isDark ? 'text-[#9C8F7F] hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Clock className="w-4 h-4" />
                    Orders ({activeOrders.length})
                </button>
                <button
                    onClick={() => { setViewMode('trash'); setStatusFilter('all'); }}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'trash'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : isDark ? 'text-[#9C8F7F] hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <Trash2 className="w-4 h-4" />
                    Trash ({trashedOrders.length})
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                    <input type="text" placeholder="Search by name, order ID, or hostel..."
                        className={`w-full pl-12 pr-6 py-4 rounded-xl border-2 outline-none text-sm transition-all ${isDark
                            ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                            : 'bg-white border-gray-100 text-gray-900 focus:border-[#7C3AED]/30 shadow-sm'}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {viewMode === 'active' && (
                    <div className="relative">
                        <Filter className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                        <select
                            className={`pl-10 pr-10 py-4 rounded-xl border-2 outline-none text-sm font-bold appearance-none transition-all ${isDark
                                ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                                : 'bg-white border-gray-100 text-gray-900 focus:border-[#7C3AED]/30 shadow-sm'}`}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            {activeStatuses.map(s => (
                                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                        <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                    </div>
                )}
            </div>

            {/* Summary */}
            <p className={`text-sm font-bold mb-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                {viewMode === 'active'
                    ? `Showing ${filteredOrders.length} of ${activeOrders.length} orders`
                    : `${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} in trash`}
            </p>

            {/* Table */}
            <Card className={`p-0 overflow-hidden ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={`text-left ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                                <th className={`py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Order ID</th>
                                <th className={`py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Student</th>
                                <th className={`hidden md:table-cell py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Hostel</th>
                                <th className={`py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Total</th>
                                <th className={`py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Status</th>
                                <th className={`py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Date</th>
                                <th className={`hidden md:table-cell py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Rider</th>
                                <th className={`py-4 px-4 lg:px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-[#333333]' : 'divide-gray-50'}`}>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={`py-16 text-center ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                        <div className="flex flex-col items-center gap-3">
                                            {viewMode === 'trash' ? (
                                                <>
                                                    <Trash2 className="w-10 h-10 opacity-20" />
                                                    <p className="text-sm font-bold">Trash is empty</p>
                                                    <p className="text-xs opacity-60">Deleted orders will appear here</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Package className="w-10 h-10 opacity-20" />
                                                    <p className="text-sm font-bold">No orders found</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                viewMode === 'active' ? (
                                    /* Grouped by time period for active orders */
                                    groupedOrders.map(({ period, orders: periodOrders }) => (
                                        <React.Fragment key={period}>
                                            <tr>
                                                <td colSpan={8} className={`py-3 px-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${period === 'Today' ? 'text-[#7C3AED]' :
                                                            period === 'This Week' ? 'text-[#FCD34D]' :
                                                                period === 'This Month' ? 'text-[#10B981]' : isDark ? 'text-[#9C8F7F]' : 'text-gray-400'
                                                            }`}>
                                                            {period}
                                                        </span>
                                                        <span className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                                            ({periodOrders.length})
                                                        </span>
                                                        <div className={`flex-1 h-px ${isDark ? 'bg-[#333333]' : 'bg-gray-200'}`}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {periodOrders.map(order => {
                                                const date = parseDate(order.createdAt);
                                                return (
                                                    <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}>
                                                        <td className="py-4 px-4 lg:px-6">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <span className={`font-mono font-bold text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                                                                    CD-{order.orderId?.slice(-5) || '?????'}
                                                                </span>
                                                                {(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') && (
                                                                    <Badge variant="purple" className="text-[10px] uppercase font-black px-2 py-0.5">Group</Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 lg:px-6">
                                                            <div>
                                                                <p className={`font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || 'N/A'}</p>
                                                                <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>{order.phone || ''}</p>
                                                            </div>
                                                        </td>
                                                        <td className={`hidden md:table-cell py-4 px-4 lg:px-6 font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>
                                                            {order.hostelName || order.hostel || 'N/A'}
                                                        </td>
                                                        <td className="py-4 px-4 lg:px-6">
                                                            <span className="font-bold text-sm text-[#10B981]">₦{getOrderAmount(order).toLocaleString()}</span>
                                                        </td>
                                                        <td className="py-4 px-4 lg:px-6">
                                                            <Badge className={`text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full ${statusColors[order.status] || (isDark ? 'bg-gray-500/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                                                {(order.status || 'PENDING').replace(/_/g, ' ')}
                                                            </Badge>
                                                        </td>
                                                        <td className={`py-4 px-4 lg:px-6 text-xs font-bold whitespace-nowrap ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                                            {date ? format(date, 'MMM d, yyyy') : 'N/A'}
                                                            <br />
                                                            <span className="text-[10px] opacity-70">{date ? format(date, 'h:mm a') : ''}</span>
                                                        </td>
                                                        <td className={`hidden md:table-cell py-4 px-4 lg:px-6`}>
                                                            {order.assignedRiderId ? (
                                                                <span className={`text-xs font-bold ${isDark ? 'text-[#FCD34D]' : 'text-purple-600'}`}>
                                                                    {riders.find(r => r.id === order.assignedRiderId)?.name || 'Unknown'}
                                                                </span>
                                                            ) : (
                                                                <span className={`text-[10px] font-bold ${isDark ? 'text-[#666666]' : 'text-gray-300'}`}>-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-4 lg:px-6">
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => handleDownloadPDF(order)} title="Download receipt"
                                                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'text-[#9C8F7F] hover:text-[#7C3AED] hover:bg-[#7C3AED]/10' : 'text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50'}`}>
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => setDeleteConfirm({ id: order.id, status: order.status })} title="Move to trash"
                                                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-50'}`}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    /* Flat list for trash */
                                    filteredOrders.map(order => {
                                        const date = parseDate(order.createdAt);
                                        return (
                                            <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}>
                                                <td className="py-4 px-4 lg:px-6">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`font-mono font-bold text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                                                            CD-{order.orderId?.slice(-5) || '?????'}
                                                        </span>
                                                        {(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') && (
                                                            <Badge variant="purple" className="text-[10px] uppercase font-black px-2 py-0.5">Group</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 lg:px-6">
                                                    <div>
                                                        <p className={`font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || 'N/A'}</p>
                                                        <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>{order.phone || ''}</p>
                                                    </div>
                                                </td>
                                                <td className={`hidden md:table-cell py-4 px-4 lg:px-6 font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>
                                                    {order.hostelName || order.hostel || 'N/A'}
                                                </td>
                                                <td className="py-4 px-4 lg:px-6">
                                                    <span className="font-bold text-sm text-[#10B981]">₦{getOrderAmount(order).toLocaleString()}</span>
                                                </td>
                                                <td className="py-4 px-4 lg:px-6">
                                                    <Badge className={`text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
                                                        {order.previousStatus?.replace(/_/g, ' ') || 'DELETED'}
                                                    </Badge>
                                                </td>
                                                <td className={`py-4 px-4 lg:px-6 text-xs font-bold whitespace-nowrap ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                                    {date ? format(date, 'MMM d, yyyy') : 'N/A'}
                                                    <br />
                                                    <span className="text-[10px] opacity-70">{date ? format(date, 'h:mm a') : ''}</span>
                                                </td>
                                                <td className={`hidden md:table-cell py-4 px-4 lg:px-6`}>
                                                    {order.assignedRiderId ? (
                                                        <span className={`text-xs font-bold ${isDark ? 'text-[#FCD34D]' : 'text-purple-600'}`}>
                                                            {riders.find(r => r.id === order.assignedRiderId)?.name || 'Unknown'}
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[10px] font-bold ${isDark ? 'text-[#666666]' : 'text-gray-300'}`}>-</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 lg:px-6">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleRecover(order.id)} title="Recover order"
                                                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-[#10B981] hover:bg-[#10B981]/10' : 'text-green-500 hover:bg-green-50'}`}>
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm({ id: order.id, status: 'TRASHED' })} title="Delete permanently"
                                                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-50'}`}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Delete Confirm Dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
                    <div className={`relative w-full max-w-sm rounded-3xl p-8 shadow-2xl ${isDark ? 'bg-[#222222]' : 'bg-white'}`}>
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <h3 className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {deleteConfirm.status === 'TRASHED' ? 'Delete Permanently?' : 'Move to Trash?'}
                            </h3>
                            <p className={`text-sm mt-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                {deleteConfirm.status === 'TRASHED'
                                    ? 'This order will be permanently removed and cannot be recovered.'
                                    : 'This order will be moved to the Trash tab. You can recover it later.'}
                            </p>
                        </div>
                        <div className="space-y-3">
                            {deleteConfirm.status === 'TRASHED' ? (
                                <button onClick={() => handlePermanentDelete(deleteConfirm.id)}
                                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all">
                                    Delete Permanently
                                </button>
                            ) : (
                                <button onClick={() => handleTrash(deleteConfirm.id, deleteConfirm.status)}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-[#2A2A2A] text-[#FCD34D] hover:bg-[#333333]' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>
                                    Move to Trash
                                </button>
                            )}
                            <button onClick={() => setDeleteConfirm(null)}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${isDark ? 'text-[#9C8F7F] hover:bg-[#2A2A2A]' : 'text-gray-500 hover:bg-gray-50'}`}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            </>
            )}
        </AdminLayout>
    );
}
