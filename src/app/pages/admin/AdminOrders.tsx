import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    ShoppingBag,
    Search,
    MapPin,
    ChevronDown,
    ChevronUp,
    Printer,
    Clock,
    X,
    Package,
    RotateCcw,
    Zap,
    AlertTriangle,
    Wallet,
    CreditCard
} from 'lucide-react';
import { subscribeToAllOrders, subscribeToHostels, Hostel, subscribeToRiders, Rider, dispatchBatch, markOrderRefunded, orderMatchesHostel, subscribeTodayBatchDays, advanceFashionBatch, FoodBatchDay, subscribeToPlatformSettings } from '../../../services/db';
import { resolveOrderVertical } from '../../../services/orderVertical';
import { resolveDeliveryFee } from '../../../services/orderFees';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../context/ThemeContext';
import { BatchOrderInfo, resolveOrderBatchInfo } from '../../components/BatchOrderInfo';

type AdminOrdersProps = {
    orderType?: 'food' | 'mart' | 'fashion';
    title?: string;
};

export default function AdminOrders({ orderType = 'food', title = "Today's Orders" }: AdminOrdersProps = {}) {
    const [orders, setOrders] = useState<any[]>([]);
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedHostels, setExpandedHostels] = useState<Set<string>>(new Set());
    const [riders, setRiders] = useState<Rider[]>([]);
    const [batchDays, setBatchDays] = useState<FoodBatchDay[]>([]);
    const [dispatching, setDispatching] = useState<string | null>(null);
    const [emergencyDispatch, setEmergencyDispatch] = useState<{ hostel: Hostel, orders: any[] } | null>(null);
    const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'ALL' | 'INSTANT' | 'BATCH'>('ALL');
    const [platformSettings, setPlatformSettings] = useState<any>(null);
    const { adminTheme } = useTheme();

    useEffect(() => {
        const unsub = subscribeToAllOrders((newOrders) => {
            setOrders(newOrders);
            setLoading(false);
        });
        const unsubHostels = subscribeToHostels(setHostels);
        const unsubRiders = subscribeToRiders(setRiders);
        const unsubBatchDays = subscribeTodayBatchDays(setBatchDays);
        const unsubSettings = subscribeToPlatformSettings(setPlatformSettings);
        return () => { unsub(); unsubHostels(); unsubRiders(); unsubBatchDays(); unsubSettings(); };
    }, []);

    const isDark = adminTheme === 'dark';

    const parseDate = (date: any) => {
        if (!date) return null;
        return date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    };

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return formatDistanceToNow(d, { addSuffix: true });
    };

    const getOrderAmount = (order: any) => order.totalAmount ?? order.total ?? 0;
    const isFashionOrder = (order: any) => resolveOrderVertical(order) === 'FASHION';
    const isMartVertical = (order: any) => resolveOrderVertical(order) === 'MART';
    const getOrderItemCount = (order: any) => {
        if (isFashionOrder(order) || isMartVertical(order)) return (order.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        if (order.type === 'combo') return order.quantity || 1;
        return order.plates?.length || 0;
    };
    const getOrderDeliveryFee = (order: any) => {
        if (typeof order.deliveryFee === 'number') return order.deliveryFee;
        if (typeof order.breakdown?.delivery === 'number') return order.breakdown.delivery;
        return resolveDeliveryFee(order, platformSettings).deliveryFee;
    };
    const getOrderServiceFee = (order: any) => {
        if (typeof order.serviceProcessingFee === 'number') return order.serviceProcessingFee;
        return (order.breakdown?.processing || 200) + (order.breakdown?.platform || 100);
    };

    const getStudentNumber = (order: any) => (
        order.studentNumber ||
        order.studentNo ||
        order.matricNumber ||
        order.matricNo ||
        order.phone ||
        ''
    );

    const today = new Date().toLocaleDateString();
    const visibleStatuses = ['PENDING_PAYMENT', 'PAID', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'PREPARING', 'DELIVERED', 'FAILED', 'CANCELLED', 'REFUNDED', 'CONSOLIDATING', 'PROCUREMENT', 'ARRIVING_AT_CAMPUS', 'READY_FOR_DELIVERY'];

    const todayOrders = orders.filter(o => {
        const vertical = resolveOrderVertical(o);
        if (orderType === 'food' && vertical !== 'FOOD') return false;
        if (orderType === 'mart' && vertical !== 'MART') return false;
        if (orderType === 'fashion' && vertical !== 'FASHION') return false;
        if (o.status === 'TRASHED' || !visibleStatuses.includes(o.status)) return false;
        
        // Treat old PENDING_PAYMENT as failed
        const d = parseDate(o.createdAt);
        if (o.status === 'PENDING_PAYMENT') {
            const ageInMinutes = (new Date().getTime() - (d?.getTime() || 0)) / 60000;
            if (ageInMinutes > 30) return false;
        }

        if (orderType !== 'fashion' && (!d || d.toLocaleDateString() !== today)) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!(
                o.fullName?.toLowerCase().includes(q) ||
                o.orderId?.toLowerCase().includes(q) ||
                o.hostel?.toLowerCase().includes(q) ||
                o.hostelName?.toLowerCase().includes(q)
            )) {
                return false;
            }
        }
        if (deliveryTypeFilter !== 'ALL') {
            // Fashion has no instant/batch delivery types — its pipeline is separate
            if (resolveOrderVertical(o) === 'FASHION') return false;
            const type = o.deliveryType || 'INSTANT';
            if (type !== deliveryTypeFilter) return false;
        }
        return true;
    });

    const hostelGroups = hostels.map(hostel => {
        const hostelOrders = todayOrders.filter(o => orderMatchesHostel(o, hostel));
        return { hostel, orders: hostelOrders };
    }).filter(g => g.orders.length > 0);

    const unmatchedOrders = todayOrders.filter(o => {
        return !hostels.some(h => orderMatchesHostel(o, h));
    });

    const failedOrders = orders.filter(o => {
        const vertical = resolveOrderVertical(o);
        if (orderType === 'food' && vertical !== 'FOOD') return false;
        if (orderType === 'mart' && vertical !== 'MART') return false;
        if (orderType === 'fashion' && vertical !== 'FASHION') return false;
        const d = parseDate(o.createdAt);
        if (orderType !== 'fashion' && (!d || d.toLocaleDateString() !== today)) return false;
        
        if (o.status === 'FAILED' || o.status === 'CANCELLED') return true;
        if (o.status === 'PENDING_PAYMENT') {
            const ageInMinutes = (new Date().getTime() - (d?.getTime() || 0)) / 60000;
            return ageInMinutes > 30;
        }
        return false;
    });

    const toggleHostel = (hostelId: string) => {
        setExpandedHostels(prev => {
            const next = new Set(prev);
            if (next.has(hostelId)) next.delete(hostelId);
            else next.add(hostelId);
            return next;
        });
    };

    const handleDispatch = async (hostel: Hostel, paidOrders: any[], isEmergency: boolean) => {
        if (dispatching) return;

        // Food dispatches while PAID; Fashion only once its batch is READY_FOR_DELIVERY
        const dispatchableStatus = orderType === 'fashion' ? 'READY_FOR_DELIVERY' : 'PAID';
        const dispatchableOrders = paidOrders.filter(o => o.status === dispatchableStatus && !o.batchId && !o.assignedRiderId);
        if (!dispatchableOrders.length) return;

        if (isEmergency) {
            setEmergencyDispatch({ hostel, orders: dispatchableOrders });
            return;
        }

        setDispatching(hostel.id);

        try {
            let riderToAssign: Rider | undefined;

            riderToAssign = riders.find(r =>
                (r.id === hostel.defaultRiderId || r.id === hostel.assistantRiderId) &&
                r.status === 'available' &&
                r.isActive === true
            );

            if (!riderToAssign) return;

            await dispatchBatch(hostel.id, hostel.name, riderToAssign, dispatchableOrders, false);
        } catch (err) {
            console.error(err);
            alert("Failed to dispatch batch");
        } finally {
            setDispatching(null);
        }
    };

    const handleEmergencyDispatchSubmit = async (rider: Rider) => {
        if (!emergencyDispatch || dispatching) return;
        const { hostel, orders: paidOrders } = emergencyDispatch;
        const dispatchableStatus = orderType === 'fashion' ? 'READY_FOR_DELIVERY' : 'PAID';
        const dispatchableOrders = paidOrders.filter(o => o.status === dispatchableStatus && !o.batchId && !o.assignedRiderId);
        if (!dispatchableOrders.length) {
            setEmergencyDispatch(null);
            return;
        }
        setDispatching(hostel.id);
        setEmergencyDispatch(null);

        try {
            await dispatchBatch(hostel.id, hostel.name, rider, dispatchableOrders, true);
        } catch (err) {
            console.error(err);
            alert("Failed to emergency dispatch batch");
        } finally {
            setDispatching(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { variant: string; label: string }> = {
            PENDING_PAYMENT: { variant: 'amber', label: 'Payment Pending' },
            FAILED: { variant: 'gray', label: 'Failed' },
            PAID: { variant: 'gold', label: 'Paid' },
            PREPARING: { variant: 'purple', label: 'Preparing' },
            OUT_FOR_DELIVERY: { variant: 'purple', label: 'Out for Delivery' },
            ON_THE_WAY: { variant: 'amber', label: 'On The Way' },
            DELIVERED: { variant: 'green', label: 'Delivered' },
            REFUNDED: { variant: 'red', label: 'Refunded' },
            CANCELLED: { variant: 'gray', label: 'Cancelled' },
            CONSOLIDATING: { variant: 'purple', label: 'Consolidating' },
            PROCUREMENT: { variant: 'amber', label: 'Procurement' },
            ARRIVING_AT_CAMPUS: { variant: 'purple', label: 'Arriving at Campus' },
            READY_FOR_DELIVERY: { variant: 'green', label: 'Ready for Delivery' },
        };
        let s = map[status];
        if (status === 'PENDING_PAYMENT') {
            const d = parseDate(selectedOrder?.createdAt || new Date());
            const ageInMinutes = (new Date().getTime() - (d?.getTime() || 0)) / 60000;
            if (ageInMinutes > 30) s = { variant: 'red', label: 'Abandoned / Failed' };
            else s = map.PENDING_PAYMENT;
        }
        if (!s) s = { variant: 'gray', label: status };
        return <Badge variant={s.variant as any} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 text-nowrap">{s.label}</Badge>;
    };

    const handlePrint = (order: any) => {
        const batchInfo = resolveOrderBatchInfo(order, batchDays);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for this site to print tickets.');
            return;
        }
        const studentNote = (order.notes || order.instructions || '').trim();
        const studentNumber = getStudentNumber(order);
        const cafeName = order.type === 'mart' ? '' : (order.cafeteria || (order.cafeteriaId === 'old' ? 'Old Cafeteria' : order.cafeteriaId === 'new' ? 'New Cafeteria' : ''));
        const cafeId = order.type === 'mart' ? '' : (order.cafeteriaId || '');

        const html = `
            <html>
                <head>
                    <title>Order Ticket - ${order.orderId}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Inter', sans-serif; background: white; color: #1A1A1A; padding: 40px; max-width: 480px; margin: 0 auto; }
                        .header { border-bottom: 4px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
                        .logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #1A1A1A; }
                        .logo span { color: #7C3AED; }
                        .order-id { font-family: monospace; font-weight: 900; background: #f0f0f0; padding: 4px 12px; border-radius: 6px; font-size: 14px; margin-top: 10px; display: inline-block; }
                        .section { margin-bottom: 25px; }
                        .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #9C8F7F; margin-bottom: 8px; }
                        .value { font-size: 18px; font-weight: 900; }
                        .note-box { padding: 12px; background: #fffbeb; border-left: 4px solid #FCD34D; border-radius: 6px; }
                        .note-text { font-size: 13px; font-weight: 600; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
                        .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee; font-size: 14px; }
                        .plate-header { font-size: 11px; font-weight: 900; color: #7C3AED; text-transform: uppercase; letter-spacing: 2px; margin: 14px 0 8px; }
                        .footer { margin-top: 40px; border-top: 2px solid #7C3AED; padding-top: 20px; text-align: center; font-size: 12px; font-weight: 700; color: #9C8F7F; }
                        .total { font-size: 24px; font-weight: 900; color: #7C3AED; display: block; margin-top: 20px; text-align: right; }
                        .close-btn { display: block; width: 100%; padding: 14px; margin-top: 30px; background: #1A1A1A; color: white; border: none; border-radius: 8px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
                        @media print { .close-btn { display: none !important; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">CALEB<span>DECK</span></div>
                        <div class="order-id">
                            ORD-${order.orderId?.slice(-6) || 'XXXXXX'}
                            ${(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') ? '  -  GROUP' : ''}
                            ${isFashionOrder(order)
                                ? `  -  ${(order.fashionBatchName || 'Fashion Batch').toUpperCase()}`
                                : batchInfo ? `  -  ${batchInfo.batchName.toUpperCase()}` : '  -  INSTANT'}
                        </div>
                    </div>
                    <div class="section">
                        <div class="label">Student</div>
                        <div class="value">${order.fullName}</div>
                        ${studentNumber ? `<div style="font-size:13px;font-weight:700;margin-top:6px;color:#555;">Student No: ${studentNumber}</div>` : ''}
                    </div>
                    <div class="section">
                        <div class="label">Delivery</div>
                        <div class="value">${order.hostelName || order.hostel}</div>
                    </div>
                    ${batchInfo ? `
                    <div class="section" style="padding:14px;background:#f5f3ff;border-left:4px solid #7C3AED;border-radius:6px;">
                        <div class="label">Scheduled Delivery Batch</div>
                        <div class="value">${batchInfo.batchName}</div>
                        ${batchInfo.orderWindowStart && batchInfo.orderWindowEnd ? `<div style="font-size:13px;font-weight:700;margin-top:8px;color:#555;">Ordering window: ${batchInfo.orderWindowStart} - ${batchInfo.orderWindowEnd}</div>` : ''}
                        ${batchInfo.deliveryWindowStart && batchInfo.deliveryWindowEnd ? `<div style="font-size:13px;font-weight:900;margin-top:5px;color:#7C3AED;">Delivery window: ${batchInfo.deliveryWindowStart} - ${batchInfo.deliveryWindowEnd}</div>` : ''}
                        ${batchInfo.batchDayId || batchInfo.batchId ? `<div style="font-family:monospace;font-size:10px;font-weight:700;margin-top:7px;color:#777;">Batch reference: ${batchInfo.batchDayId || batchInfo.batchId}</div>` : ''}
                    </div>
                    ` : ''}
                    ${cafeName || cafeId ? `
                    <div class="section">
                        <div class="label">Cafe Source</div>
                        ${cafeName ? `<div class="value">${cafeName}</div>` : ''}
                        ${cafeId ? `<div style="font-size:13px;font-weight:700;margin-top:6px;color:#555;">Cafe ID: ${cafeId}</div>` : ''}
                    </div>
                    ` : ''}
                    ${studentNote ? `
                    <div class="section note-box">
                        <div class="label">Student Note</div>
                        <div class="note-text">${studentNote}</div>
                    </div>
                    ` : ''}
                    <div class="section">
                        <div class="label">Items</div>
                        ${isFashionOrder(order) ? `
                            ${(order.items || []).map((item: any) => `
                                <div class="item-row">
                                    <span>${item.name}</span>
                                    <span>x${item.quantity || 1}</span>
                                </div>
                            `).join('')}
                        ` : order.type === 'combo' ? `
                            <div class="plate-header">${order.comboName} x ${order.quantity || 1}</div>
                            ${(order.comboItems || []).map((item: any) => `
                                <div class="item-row">
                                    <span>${item.name}</span>
                                    <span>x${item.quantity}</span>
                                </div>
                            `).join('')}
                        ` : (order.plates?.map((p: any, i: number) => `
                            <div class="plate-header">Plate #${i + 1} - ${p.type || ''}</div>
                            ${p.items?.map((item: any) => `
                                <div class="item-row">
                                    <span>${item.item?.name || item.name}</span>
                                    <span>x${item.quantity}</span>
                                </div>
                            `).join('')}
                        `).join('') || '')}
                        
                        ${(() => {
                            const hasBreakdown = !!order.breakdown;
                            const vertical = resolveOrderVertical(order);
                            const isFood = vertical === 'FOOD';
                            const isGroup = order.deliveryMode === 'group' || order.deliveryMode === 'GROUP';
                            const feeInfo = resolveDeliveryFee(order, platformSettings);
                            const deliveryFee = isFood && hasBreakdown ? order.breakdown.delivery : feeInfo.deliveryFee;
                            const discount = isFood && hasBreakdown ? (order.breakdown.discount || 0) : 0;
                            const takeawayAmount = isFood && order.type !== 'combo' ? (order.plates?.length || 0) * 200 : 0;

                            return `
                                <div class="plate-header">Fees</div>
                                ${takeawayAmount > 0 ? `
                                <div class="item-row">
                                    <span>Takeaway Pack (₦200/plate)</span>
                                    <span>₦${takeawayAmount.toLocaleString()}</span>
                                </div>
                                ` : ''}
                                <div class="item-row">
                                    <span>Delivery Fee${isFood ? (isGroup ? ' (Group)' : ' (Solo)') : ''}</span>
                                    <span>₦${deliveryFee.toLocaleString()}</span>
                                </div>
                                ${discount > 0 ? `
                                <div class="item-row" style="color: #10B981;">
                                    <span>Group Discount</span>
                                    <span>-₦${discount.toLocaleString()}</span>
                                </div>
                                ` : ''}
                            `;
                        })()}
                        ${order.drinksSnacks?.length > 0 ? `
                            <div class="plate-header">Add-ons</div>
                            ${order.drinksSnacks.map((item: any) => `
                                <div class="item-row">
                                    <span>${item.item?.name || item.name}</span>
                                    <span>x${item.quantity}</span>
                                </div>
                            `).join('')}
                        ` : ''}
                    </div>
                    <span class="total">₦${getOrderAmount(order).toLocaleString()}</span>
                    <div class="footer">CalebDeck - ${new Date().toLocaleDateString()}</div>
                    <button class="close-btn" onclick="closeReceipt()">Close Receipt</button>
                    <script>
                        function closeReceipt() {
                            try { window.close(); } catch (error) {}
                            setTimeout(function () {
                                if (!window.closed) {
                                    if (window.history.length > 1) {
                                        window.history.back();
                                    } else {
                                        window.location.replace('/admin/orders');
                                    }
                                }
                            }, 150);
                        }
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 800);
    };

    return (
        <AdminLayout title={title}>
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#7C3AED]' : 'border-purple-600'}`}></div>
                    <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Loading Orders...</p>
                </div>
            ) : (<>
                <div className="space-y-6">
                    {/* Search */}
                    <Card className={`border ${isDark ? 'border-[#333333] bg-[#222222]' : 'border-gray-100 bg-white shadow-sm'}`}>
                        <div className="relative">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                placeholder="Search student name, order ID, or hostel..."
                                className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none text-sm ${isDark
                                    ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                                    : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#7C3AED]/30'
                                    }`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </Card>

                    {/* Summary */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 overflow-x-auto pb-2 -mb-2 scrollbar-none">
                        <Badge variant="purple" className="text-xs font-black px-3 py-1.5 shrink-0">
                            {todayOrders.length} orders today
                        </Badge>
                                                        <Badge variant="gold" className="text-xs font-black px-3 py-1.5 shrink-0">
                                                            {todayOrders.filter(o => orderType === 'fashion' ? o.status === 'READY_FOR_DELIVERY' : o.status === 'PAID').length} {orderType === 'fashion' ? 'ready' : 'pending'}
                                                        </Badge>
                        <Badge variant="purple" className="text-xs font-black px-3 py-1.5 shrink-0 bg-[#7C3AED]/20">
                            {todayOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length} out
                        </Badge>
                        <Badge variant="amber" className="text-xs font-black px-3 py-1.5 shrink-0 text-amber-600 bg-amber-500/20 border-amber-500/30">
                            {todayOrders.filter(o => o.status === 'ON_THE_WAY').length} otw
                        </Badge>
                        <Badge variant="green" className="text-xs font-black px-3 py-1.5 shrink-0">
                            {todayOrders.filter(o => o.status === 'DELIVERED').length} delivered
                        </Badge>
                        <Badge variant="red" className="text-xs font-black px-3 py-1.5 shrink-0">
                            {todayOrders.filter(o => ['FAILED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length} review
                        </Badge>
                    </div>

                    {/* Delivery Type Tabs (food/mart only — fashion has no instant/batch delivery types) */}
                    {orderType !== 'fashion' && (
                        <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'} w-fit`}>
                            {(['ALL', 'INSTANT', 'BATCH'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setDeliveryTypeFilter(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                        deliveryTypeFilter === tab
                                            ? (isDark ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20' : 'bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/20')
                                            : (isDark ? 'text-[#9C8F7F] hover:bg-[#333333]' : 'text-gray-500 hover:bg-gray-100')
                                    }`}
                                >
                                    {tab === 'ALL' ? 'All Orders' : tab === 'INSTANT' ? <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</span> : <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Batch</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {orderType === 'fashion' && (
                        <div className={`mt-6 p-6 rounded-2xl border ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'} shadow-sm`}>
                            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Fashion Batch Pipeline</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Button 
                                    onClick={() => advanceFashionBatch('PAID', 'CONSOLIDATING')}
                                    disabled={todayOrders.filter(o => o.status === 'PAID').length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center text-center h-24"
                                >
                                    <span className="text-sm">Close & Consolidate</span>
                                    <span className="text-xl font-black mt-1">{todayOrders.filter(o => o.status === 'PAID').length}</span>
                                    <span className="text-[10px] opacity-75 uppercase tracking-widest mt-1">Pending</span>
                                </Button>
                                
                                <Button 
                                    onClick={() => advanceFashionBatch('CONSOLIDATING', 'PROCUREMENT')}
                                    disabled={todayOrders.filter(o => o.status === 'CONSOLIDATING').length === 0}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center text-center h-24"
                                >
                                    <span className="text-sm">Procure Items</span>
                                    <span className="text-xl font-black mt-1">{todayOrders.filter(o => o.status === 'CONSOLIDATING').length}</span>
                                    <span className="text-[10px] opacity-75 uppercase tracking-widest mt-1">Consolidating</span>
                                </Button>
                                
                                <Button 
                                    onClick={() => advanceFashionBatch('PROCUREMENT', 'ARRIVING_AT_CAMPUS')}
                                    disabled={todayOrders.filter(o => o.status === 'PROCUREMENT').length === 0}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center text-center h-24"
                                >
                                    <span className="text-sm">Ship to Campus</span>
                                    <span className="text-xl font-black mt-1">{todayOrders.filter(o => o.status === 'PROCUREMENT').length}</span>
                                    <span className="text-[10px] opacity-75 uppercase tracking-widest mt-1">In Procurement</span>
                                </Button>
                                
                                <Button 
                                    onClick={() => advanceFashionBatch('ARRIVING_AT_CAMPUS', 'READY_FOR_DELIVERY')}
                                    disabled={todayOrders.filter(o => o.status === 'ARRIVING_AT_CAMPUS').length === 0}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center text-center h-24"
                                >
                                    <span className="text-sm">Arrived & Ready</span>
                                    <span className="text-xl font-black mt-1">{todayOrders.filter(o => o.status === 'ARRIVING_AT_CAMPUS').length}</span>
                                    <span className="text-[10px] opacity-75 uppercase tracking-widest mt-1">In Transit</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Hostel Groups */}
                    {hostelGroups.length > 0 ? (
                        <div className="space-y-4">
                            {hostelGroups.map(({ hostel, orders: hostelOrders }) => {
                                const isExpanded = expandedHostels.has(hostel.id);
                                // "pending" = what the Dispatch button will send: PAID for food, READY_FOR_DELIVERY for fashion
                                const dispatchableStatus = orderType === 'fashion' ? 'READY_FOR_DELIVERY' : 'PAID';
                                const paidCount = hostelOrders.filter(o => o.status === dispatchableStatus).length;
                                const outCount = hostelOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;
                                const otwCount = hostelOrders.filter(o => o.status === 'ON_THE_WAY').length;
                                const deliveredCount = hostelOrders.filter(o => o.status === 'DELIVERED').length;
                                const reviewCount = hostelOrders.filter(o => ['FAILED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length;

                                return (
                                    <Card key={hostel.id} className={`overflow-hidden border ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        {/* Hostel Header - always visible, clickable */}
                                        <button
                                            onClick={() => toggleHostel(hostel.id)}
                                            className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-[#7C3AED]/5"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                                                    <MapPin className="w-5 h-5 text-[#7C3AED]" />
                                                </div>
                                                <div>
                                                    <h3 className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{hostel.name}</h3>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1">
                                                        <span className={`text-xs font-bold shrink-0 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{hostelOrders.length} orders</span>
                                                        {paidCount > 0 && <span className="text-xs font-black text-[#FCD34D] shrink-0">{paidCount} pending</span>}
                                                        {outCount > 0 && <span className="text-xs font-black text-[#7C3AED] shrink-0">{outCount} out</span>}
                                                        {otwCount > 0 && <span className="text-xs font-black text-amber-500 shrink-0">{otwCount} otw</span>}
                                                        {deliveredCount > 0 && <span className="text-xs font-black text-[#10B981] shrink-0">{deliveredCount} done</span>}
                                                        {reviewCount > 0 && <span className="text-xs font-black text-red-500 shrink-0">{reviewCount} review</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {paidCount > 0 && (
                                                    <div onClick={e => e.stopPropagation()}>
                                                        {(() => {
                                                            const onlineDesignated = riders.filter(r =>
                                                                (r.id === hostel.defaultRiderId || r.id === hostel.assistantRiderId) &&
                                                                r.status === 'available'
                                                            );
                                                            const isEmergency = onlineDesignated.length === 0;

                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    disabled={dispatching === hostel.id}
                                                                    onClick={() => handleDispatch(hostel, hostelOrders.filter(o => o.status === dispatchableStatus), isEmergency)}
                                                                    className={`h-9 px-4 text-[10px] font-black tracking-widest uppercase ${isEmergency ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[#7C3AED] hover:bg-purple-600 text-white'}`}
                                                                >
                                                                    {dispatching === hostel.id ? 'Dispatching...' : isEmergency ? 'Emergency Dispatch' : 'Dispatch Batch'}
                                                                </Button>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronUp className={`w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                                ) : (
                                                    <ChevronDown className={`w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                                )}
                                            </div>
                                        </button>

                                        {/* Orders inside hostel - collapsible */}
                                        {isExpanded && (
                                            <div className={`border-t ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                                                {hostelOrders.map((order) => (
                                                    <div
                                                        key={order.id}
                                                        className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'} border-b last:border-0 ${isDark ? 'border-[#333333]' : 'border-gray-50'}`}
                                                        onClick={() => setSelectedOrder(order)}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                                                                <Package className={`w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className={`text-sm font-bold truncate ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName}</p>
                                                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                    <span className={`font-mono text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                                        CD-{order.orderId?.slice(-6) || 'N/A'}
                                                                    </span>
                                                                    {order.cafeteria && (
                                                                        <Badge variant="amber" className="text-[9px] uppercase font-black px-1.5 py-0.5">{order.cafeteria}</Badge>
                                                                    )}
                                                                    {(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') && (
                                                                        <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5">Group</Badge>
                                                                    )}
                                                                    {isFashionOrder(order) ? (
                                                                        <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 flex items-center gap-1"><Package className="w-3 h-3" /> Fashion</Badge>
                                                                    ) : (!order.deliveryType || order.deliveryType === 'INSTANT') ? (
                                                                        <Badge variant="amber" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-amber-500/30 flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</Badge>
                                                                    ) : (
                                                                        <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 flex items-center gap-1"><Package className="w-3 h-3" /> {resolveOrderBatchInfo(order, batchDays)?.batchName || 'Scheduled Batch'}</Badge>
                                                                    )}
                                                                    {order.paymentMethod === 'WALLET' ? (
                                                                        <Badge variant="green" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-green-500/30 flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet</Badge>
                                                                    ) : order.paymentMethod === 'PAYSTACK' ? (
                                                                        <Badge variant="blue" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-blue-500/30 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Paystack</Badge>
                                                                    ) : null}
                                                                    <span className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                                        {' - '}{isFashionOrder(order) ? `${getOrderItemCount(order)} fashion items` : order.type === 'combo' ? `${order.quantity || 1} combos` : isMartVertical(order) ? `${getOrderItemCount(order)} mart items` : `${order.plates?.length || 0} plates`}
                                                                    </span>
                                                                </div>
                                                                <BatchOrderInfo order={order} batchDays={batchDays} compact />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3 shrink-0 ml-2">
                                                            <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>₦{getOrderAmount(order).toLocaleString()}</span>
                                                            {getStatusBadge(order.status)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}

                            {/* Unmatched orders */}
                            {unmatchedOrders.length > 0 && (
                                <Card className={`overflow-hidden border ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className="p-5">
                                        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Other Orders</h3>
                                        {unmatchedOrders.map((order) => (
                                            <div
                                                key={order.id}
                                                className={`flex items-center justify-between py-4 cursor-pointer transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'} border-b last:border-0 ${isDark ? 'border-[#333333]' : 'border-gray-50'}`}
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                <div>
                                                    <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName}</p>
                                                    <span className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                        {order.hostelName || order.hostel}
                                                    </span>
                                                    {order.cafeteria && (
                                                        <Badge variant="amber" className="text-[9px] uppercase font-black px-1.5 py-0.5 ml-2 mt-1">{order.cafeteria}</Badge>
                                                    )}
                                                    {(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') && (
                                                        <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 ml-2 mt-1">Group</Badge>
                                                    )}
                                                    {isFashionOrder(order) ? (
                                                        <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 ml-2 mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> Fashion</Badge>
                                                    ) : (!order.deliveryType || order.deliveryType === 'INSTANT') ? (
                                                        <Badge variant="amber" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-amber-500/30 ml-2 mt-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</Badge>
                                                    ) : (
                                                        <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 ml-2 mt-1 flex items-center gap-1"><Package className="w-3 h-3" /> {resolveOrderBatchInfo(order, batchDays)?.batchName || 'Scheduled Batch'}</Badge>
                                                    )}
                                                    {order.paymentMethod === 'WALLET' ? (
                                                        <Badge variant="green" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-green-500/30 ml-2 mt-1 flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet</Badge>
                                                    ) : order.paymentMethod === 'PAYSTACK' ? (
                                                        <Badge variant="blue" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-blue-500/30 ml-2 mt-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Paystack</Badge>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>₦{getOrderAmount(order).toLocaleString()}</span>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {failedOrders.length > 0 && (
                                <div className="mt-16 pt-8 border-t border-dashed border-red-500/20">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Failed / Abandoned Orders</h3>
                                            <Badge variant="red" className="ml-2 text-xs font-black">{failedOrders.length}</Badge>
                                            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Attempts that never succeeded today</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-70 hover:opacity-100 transition-opacity">
                                        {failedOrders.map(order => (
                                            <Card key={order.id} onClick={() => setSelectedOrder(order)} className={`p-5 border cursor-pointer hover:border-red-500/30 transition-all ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="min-w-0">
                                                        <h4 className={`text-sm font-bold truncate ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || 'Guest'}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[10px] font-mono text-[#9C8F7F]">CD-{order.orderId?.slice(-6) || 'N/A'}</p>
                                                            {isFashionOrder(order) ? (
                                                                <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 flex items-center gap-1"><Package className="w-3 h-3" /></Badge>
                                                            ) : (!order.deliveryType || order.deliveryType === 'INSTANT') ? (
                                                                <Badge variant="amber" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-amber-500/30 flex items-center gap-1"><Zap className="w-3 h-3" /></Badge>
                                                            ) : (
                                                                <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 flex items-center gap-1"><Package className="w-3 h-3" /></Badge>
                                                            )}
                                                            {order.paymentMethod === 'WALLET' ? (
                                                                <Badge variant="green" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-green-500/30 flex items-center gap-1"><Wallet className="w-3 h-3" /></Badge>
                                                            ) : order.paymentMethod === 'PAYSTACK' ? (
                                                                <Badge variant="blue" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-blue-500/30 flex items-center gap-1"><CreditCard className="w-3 h-3" /></Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    {getStatusBadge(order.status)}
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="space-y-1"><p className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{order.hostelName || order.hostel || 'Unknown'}</p><p className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{formatDate(order.createdAt)}</p></div>
                                                    <span className={`text-xs font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>₦{getOrderAmount(order).toLocaleString()}</span>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card className={`text-center py-20 border ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                            <ShoppingBag className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-[#333333]' : 'text-gray-200'}`} />
                            <p className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>No orders today</p>
                            <p className={`text-sm mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Orders will appear here once students place them</p>
                        </Card>
                    )}
                </div>

                {/* Order Details Modal - READ ONLY, no dispatch */}
                {selectedOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-all" onClick={() => setSelectedOrder(null)}></div>
                        <Card className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'
                            }`}>
                            {/* Header */}
                            <div className={`p-8 flex items-center justify-between border-b ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className="w-14 h-14 rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center shadow-2xl shadow-[#7C3AED]/30 shrink-0">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`text-lg lg:text-xl font-black tracking-tight mb-1 truncate ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Order Details</h3>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className={`text-xs font-black uppercase tracking-[0.2em] shrink-0 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{selectedOrder.orderId}</p>
                                            {selectedOrder.cafeteria && (
                                                <Badge variant="amber" className="text-[9px] uppercase font-black px-1.5 py-0.5 shrink-0">{selectedOrder.cafeteria}</Badge>
                                            )}
                                            {(selectedOrder.deliveryMode === 'group' || selectedOrder.deliveryMode === 'GROUP') && (
                                                <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 shrink-0">Group</Badge>
                                            )}
                                            {isFashionOrder(selectedOrder) ? (
                                                <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 shrink-0 flex items-center gap-1"><Package className="w-3 h-3" /> Fashion</Badge>
                                            ) : (!selectedOrder.deliveryType || selectedOrder.deliveryType === 'INSTANT') ? (
                                                <Badge variant="amber" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-amber-500/30 shrink-0 flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</Badge>
                                            ) : (
                                                <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-[#7C3AED]/30 shrink-0 flex items-center gap-1"><Package className="w-3 h-3" /> {resolveOrderBatchInfo(selectedOrder, batchDays)?.batchName || 'Scheduled Batch'}</Badge>
                                            )}
                                            {selectedOrder.paymentMethod === 'WALLET' ? (
                                                <Badge variant="green" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-green-500/30 shrink-0 flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet</Badge>
                                            ) : selectedOrder.paymentMethod === 'PAYSTACK' ? (
                                                <Badge variant="blue" className="text-[9px] uppercase font-black px-1.5 py-0.5 border border-blue-500/30 shrink-0 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Paystack</Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className={`p-3 rounded-xl transition-all shrink-0 ${isDark ? 'hover:bg-[#2A2A2A] text-white' : 'hover:bg-gray-100 text-black'}`}>
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12">
                                <BatchOrderInfo order={selectedOrder} batchDays={batchDays} />
                                <div className="grid md:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.3em]">Student</p>
                                            <h4 className={`text-2xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{selectedOrder.fullName}</h4>
                                            <p className="text-sm font-bold text-[#7C3AED]">{selectedOrder.phone}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.3em]">Delivery Location</p>
                                            <h4 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{selectedOrder.hostelName || selectedOrder.hostel}</h4>
                                        </div>
                                    </div>

                                    <Card className={`p-8 border-none ${isDark ? 'bg-[#222222]' : 'bg-gray-50'} min-w-0`}>
                                        <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.3em] mb-4">Payment Info</p>
                                        <div className="flex flex-col gap-6">
                                            <div className="min-w-0">
                                                <p className={`text-xs font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Paid</p>
                                                <h3 className="text-3xl font-black text-[#10B981]">₦{getOrderAmount(selectedOrder).toLocaleString()}</h3>
                                            </div>
                                            <div className="w-fit">
                                                {getStatusBadge(selectedOrder.status)}
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className={`flex-1 h-px ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}></div>
                                        <h4 className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.4em]">Order Items</h4>
                                        <div className={`flex-1 h-px ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}></div>
                                    </div>

                                    {/* Order Items breakdown */}
                                    {isMartVertical(selectedOrder) ? (
                                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                            <div className="flex justify-between items-center mb-6">
                                                <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#10B981]">Mart Items</h5>
                                                <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-black'}`}>
                                                    ₦{(selectedOrder.subtotal || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="space-y-4">
                                                {(selectedOrder.items || []).map((item: any, iidx: number) => (
                                                    <div key={iidx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                                        <div>
                                                            <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.name}</p>
                                                            <p className="text-[10px] font-bold text-[#9C8F7F] mt-1">{item.category}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black px-2 py-1 rounded bg-[#10B981]/10 text-[#10B981]">x{item.quantity || 1}</span>
                                                            <span className={`text-xs font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : selectedOrder.type === 'combo' ? (
                                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                            <div className="flex justify-between items-center mb-6">
                                                <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED]">{selectedOrder.comboName} x {selectedOrder.quantity || 1}</h5>
                                                <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-black'}`}>
                                                    ₦{((selectedOrder.basePrice || (getOrderAmount(selectedOrder) / (selectedOrder.quantity || 1))) * (selectedOrder.quantity || 1)).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="space-y-4">
                                                {selectedOrder.comboItems?.map((item: any, iidx: number) => (
                                                    <div key={iidx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                                        <div>
                                                            <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.name}</p>
                                                        </div>
                                                        <span className="text-xs font-black px-2 py-1 rounded bg-[#7C3AED]/10 text-[#7C3AED]">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : isFashionOrder(selectedOrder) ? (
                                        <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                            <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED] mb-2">Fashion Items</h5>
                                            {(selectedOrder.fashionBatchName || selectedOrder.expectedArrivalDate) && (
                                                <p className={`text-[11px] font-bold mb-6 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                    {selectedOrder.fashionBatchName ? `Batch: ${selectedOrder.fashionBatchName}` : 'Batch: Scheduled Batch'}
                                                    {selectedOrder.expectedArrivalDate ? ` · Expected on campus ${new Date(selectedOrder.expectedArrivalDate).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
                                                </p>
                                            )}
                                            <div className="space-y-4">
                                                {selectedOrder.items?.map((item: any, iidx: number) => (
                                                    <div key={iidx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                                        <div>
                                                            <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.name}</p>
                                                            {item.category && (
                                                                <p className="text-[10px] font-bold text-[#9C8F7F] mt-1 uppercase">{item.category}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs font-black px-2 py-1 rounded bg-[#7C3AED]/10 text-[#7C3AED]">x{item.quantity}</span>
                                                            <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-black'}`}>₦{(item.price * item.quantity).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {selectedOrder.plates?.map((plate: any, pidx: number) => (
                                                <div key={pidx} className={`p-8 rounded-3xl border transition-all ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED]">Plate #{pidx + 1} - {plate.type}</h5>
                                                        <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-black'}`}>₦{plate.total?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {plate.items?.map((item: any, iidx: number) => (
                                                            <div key={iidx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                                                <div>
                                                                    <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.item?.name || item.name}</p>
                                                                    {item.options?.length > 0 && (
                                                                        <p className="text-[10px] font-bold text-[#9C8F7F] mt-1">{item.options.join(', ')}</p>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs font-black px-2 py-1 rounded bg-[#7C3AED]/10 text-[#7C3AED]">x{item.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Takeaway Fee for non-combos */}
                                            <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Package className="w-5 h-5 text-amber-500 shrink-0" />
                                                        <div className="min-w-0">
                                                            <h5 className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 truncate">Takeaway Fee</h5>
                                                            <p className={`text-[10px] font-bold mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>₦200 per plate</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm sm:text-base font-black text-amber-600 sm:ml-auto whitespace-nowrap`}>
                                                        ₦{((selectedOrder.plates?.length || 0) * 200).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedOrder.drinksSnacks?.length > 0 && (
                                        <div className={`p-8 rounded-3xl border ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white'}`}>
                                            <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#FCD34D] mb-6">Add-ons</h5>
                                            <div className="space-y-4">
                                                {selectedOrder.drinksSnacks.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                                        <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.item?.name || item.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black px-2 py-1 rounded bg-[#FCD34D]/10 text-[#FCD34D]">x{item.quantity}</span>
                                                            <span className={`text-xs font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>₦{((item.item?.price || item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Breakdown of Fees */}
                                    <div className={`p-8 rounded-3xl border ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white shadow-sm'}`}>
                                        <h5 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 mb-6">Fee Breakdown</h5>
                                        <div className="space-y-4">
                                            {(() => {
                                                const hasBreakdown = !!selectedOrder.breakdown;
                                                const vertical = resolveOrderVertical(selectedOrder);
                                                const isFood = vertical === 'FOOD';
                                                const plateCount = getOrderItemCount(selectedOrder) || 1;
                                                const isGroup = selectedOrder.deliveryMode === 'group' || selectedOrder.deliveryMode === 'GROUP';
                                                const feeInfo = resolveDeliveryFee(selectedOrder, platformSettings);
                                                let calculatedDeliveryAmount = feeInfo.deliveryFee;
                                                let calculatedDiscount = 0;
                                                if (isGroup && isFood) {
                                                    const foodGroupFee = Number(platformSettings?.foodGroupDeliveryFee) || 580;
                                                    const groupDiscount = feeInfo.isPremium
                                                        ? (feeInfo.baseDeliveryFee - Math.round(feeInfo.baseDeliveryFee * 0.8))
                                                        : (feeInfo.baseDeliveryFee - foodGroupFee);
                                                    calculatedDiscount = groupDiscount * plateCount;
                                                }

                                                const deliveryFee = hasBreakdown ? selectedOrder.breakdown.delivery : calculatedDeliveryAmount;
                                                const processingFee = getOrderServiceFee(selectedOrder);
                                                const discount = hasBreakdown ? selectedOrder.breakdown.discount : calculatedDiscount;

                                                return (
                                                    <>
                                                        <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10">
                                                            <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Delivery Fee{isFood ? (isGroup ? ' (Group)' : ' (Solo)') : ''}</p>
                                                            <span className={`text-xs font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>
                                                                ₦{deliveryFee.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        {discount > 0 && (
                                                            <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 text-green-500">
                                                                <p className={`text-sm font-bold`}>Group Discount</p>
                                                                <span className={`text-xs font-bold`}>-₦{discount.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {!hasBreakdown && isFood && (() => {
                                                            const takeawayAmount = selectedOrder.type !== 'combo' ? (selectedOrder.plates?.length || 0) * 200 : 0;
                                                            let foodAmount = 0;
                                                            if (selectedOrder.type === 'combo') {
                                                                foodAmount = (selectedOrder.basePrice || (getOrderAmount(selectedOrder) / (selectedOrder.quantity || 1))) * (selectedOrder.quantity || 1);
                                                            } else {
                                                                foodAmount += selectedOrder.plates?.reduce((acc: number, p: any) => acc + (p.total || 0), 0) || 0;
                                                                foodAmount += selectedOrder.drinksSnacks?.reduce((acc: number, a: any) => acc + ((a.item?.price || a.price || 0) * (a.quantity || 1)), 0) || 0;
                                                            }
                                                            const predictedBase = foodAmount + deliveryFee + takeawayAmount + processingFee - discount;
                                                            const difference = getOrderAmount(selectedOrder) - predictedBase;
                                                            if (difference >= 40 && difference <= 60) {
                                                                return (
                                                                    <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10">
                                                                        <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Cafe Charge</p>
                                                                        <span className={`text-xs font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>₦50</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {(selectedOrder.notes || selectedOrder.instructions) && (selectedOrder.notes || selectedOrder.instructions).trim() !== '' && (
                                        <div className={`p-8 rounded-3xl border ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white'}`}>
                                            <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#10B981] mb-4">Student Note</h5>
                                            <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap break-words ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>{(selectedOrder.notes || selectedOrder.instructions)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer - Print only, no dispatch */}
                            <div className={`p-8 flex items-center justify-between border-t ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-[#9C8F7F]" />
                                        <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                            Placed {formatDate(selectedOrder.createdAt)}
                                        </span>
                                    </div>
                                    {selectedOrder.status !== 'REFUNDED' && (
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm('Are you sure you want to mark this order as REFUNDED? This will exclude it from analytics and deduct payout from the rider.')) {
                                                    await markOrderRefunded(selectedOrder.id);
                                                    setSelectedOrder(null);
                                                }
                                            }}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-red-500 hover:text-red-400 transition-colors"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Refund Order
                                        </button>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => handlePrint(selectedOrder)}
                                    className={`px-6 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest ${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500'}`}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Ticket
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </>)}

            {/* Emergency Dispatch Modal */}
            {emergencyDispatch && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className={`w-full max-w-lg shadow-2xl overflow-hidden ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-white border-gray-100'}`}>
                        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Emergency Dispatch</h3>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                        {emergencyDispatch.hostel.name} · {emergencyDispatch.orders.length} Orders
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEmergencyDispatch(null)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#333333] text-[#9C8F7F] hover:text-[#FAF9F6]' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className={`text-sm mb-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>
                                Both assigned riders are currently unavailable. Select any online rider below to aggressively dispatch this batch.
                            </p>

                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {riders.filter(r => r.status === 'available' && r.isActive === true).length > 0 ? riders.filter(r => r.status === 'available' && r.isActive === true).map(rider => (
                                    <div key={rider.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isDark ? 'bg-[#222222] border-[#333333] hover:border-[#7C3AED]/50' : 'bg-gray-50 border-gray-100 hover:border-primary/50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-700'}`}>
                                                    {rider.name.charAt(0)}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#1A1A1A]"></div>
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.name}</p>
                                                <p className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                    {rider.dept}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="primary"
                                            onClick={() => handleEmergencyDispatchSubmit(rider)}
                                            className="px-4 py-2 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20"
                                        >
                                            Assign Batch
                                        </Button>
                                    </div>
                                )) : (
                                    <div className={`p-6 text-center border-2 border-dashed rounded-xl ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                                        <AlertTriangle className={`w-8 h-8 mx-auto mb-3 opacity-50 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                                        <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>No Riders Online</p>
                                        <p className={`text-[11px] mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>There are absolutely no active riders online right now.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={`p-4 border-t flex justify-end gap-3 bg-opacity-50 ${isDark ? 'border-[#333333] bg-[#0F0F0F]' : 'border-gray-100 bg-gray-50'}`}>
                            <Button onClick={() => setEmergencyDispatch(null)} variant="ghost" className={isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}>
                                Cancel
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </AdminLayout>
    );
}
