import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { getRecentOrderHistory, subscribeToPlatformSettings } from '../../../services/db';
import { resolveOrderVertical } from '../../../services/orderVertical';
import { resolveDeliveryFee } from '../../../services/orderFees';
import { TrendingUp, ShoppingBag, Users, DollarSign, CalendarDays, Shield, Truck, CheckCircle, Printer } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

type TimeRange = 'today' | 'week' | 'month';

export default function AdminAnalytics() {
    const [orders, setOrders] = useState<any[]>([]);
    const [platformSettings, setPlatformSettings] = useState<any>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [loading, setLoading] = useState(true);
    const { adminTheme } = useTheme();

    useEffect(() => {
        let mounted = true;
        getRecentOrderHistory(30, 200).then((data) => {
            if (mounted) setOrders(data);
        }).catch((error) => {
            console.error('AdminAnalytics order history read failed:', error);
            if (mounted) setOrders([]);
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        const unsubSettings = subscribeToPlatformSettings(setPlatformSettings);
        return () => {
            mounted = false;
            unsubSettings();
        };
    }, []);

    const isDark = adminTheme === 'dark';

    const parseDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : d ? new Date(d) : null;
    const now = new Date();
    const rangeOptions: TimeRange[] = ['today', 'week', 'month'];
    const excludedStatuses = ['REFUNDED', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED', 'TRASHED'];
    const isCalebDeckOrder = (order: any) => (
        order.type === 'mart' ||
        order.type === 'combo' ||
        order.type === 'fashion' ||
        Array.isArray(order.plates) ||
        Array.isArray(order.drinksSnacks) ||
        Array.isArray(order.items)
    );
    const getOrderAmount = (order: any) => order.totalAmount ?? order.total ?? order.amount ?? 0;
    const getOrderItemCount = (order: any) => {
        if (order.type === 'combo') return order.quantity || 1;
        if (order.type === 'mart' || resolveOrderVertical(order) === 'FASHION') return (order.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        return order.plates?.length || 0;
    };
    const getRangeBounds = (range: TimeRange) => {
        if (range === 'today') {
            return {
                start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
                end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
            };
        }
        if (range === 'week') {
            return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
        }
        return { start: startOfMonth(now), end: endOfMonth(now) };
    };
    const getDeliveryFee = (order: any) => {
        if (typeof order.deliveryFee === 'number') return order.deliveryFee;
        if (typeof order.breakdown?.delivery === 'number') return order.breakdown.delivery;
        return resolveDeliveryFee(order, platformSettings).deliveryFee;
    };

    const filteredOrders = useMemo(() => {
        const rangeBounds = getRangeBounds(timeRange);
        return orders.filter(o => {
            if (!isCalebDeckOrder(o)) return false;
            if (excludedStatuses.includes(o.status)) return false;
            const d = parseDate(o.createdAt);
            if (!d) return false;
            return isWithinInterval(d, rangeBounds);
        });
    }, [orders, timeRange, platformSettings]);

    const isGroupOrder = (o: any) => o.deliveryMode === 'group' || o.deliveryMode === 'GROUP';
    const isComboOrder = (o: any) => o.type === 'combo';
    const isMartOrder = (o: any) => resolveOrderVertical(o) === 'MART';

    // Order types are vertical-aware: Food splits Solo/Group, Combo is a Food
    // subtype, and Mart/Fashion are their own verticals (Fashion has no solo/group
    // concept — it must never be counted as a Food solo order).
    const orderTypeBreakdown = useMemo(() => {
        const foodOrders = filteredOrders.filter(o => resolveOrderVertical(o) === 'FOOD');
        const combo = foodOrders.filter(o => isComboOrder(o)).length;
        const solo = foodOrders.filter(o => !isComboOrder(o) && !isGroupOrder(o)).length;
        const group = foodOrders.filter(o => !isComboOrder(o) && isGroupOrder(o)).length;
        const mart = filteredOrders.filter(o => resolveOrderVertical(o) === 'MART').length;
        const fashion = filteredOrders.filter(o => resolveOrderVertical(o) === 'FASHION').length;

        return [
            { name: 'Food Solo', value: solo },
            { name: 'Food Group', value: group },
            { name: 'Combo Pack', value: combo },
            { name: 'Mart', value: mart },
            { name: 'Fashion', value: fashion },
        ].filter(d => d.value > 0);
    }, [filteredOrders]);

    // Top ordered menu items (across all plate orders)
    const topMenuItems = useMemo(() => {
        const itemCounts: Record<string, number> = {};

        filteredOrders.forEach(o => {
            const vertical = resolveOrderVertical(o);
            if (vertical === 'MART' || vertical === 'FASHION') {
                const items = o.items || [];
                items.forEach((item: any) => {
                    const name = (item.name || '').trim();
                    if (name) itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
                });
            } else if (isComboOrder(o)) {
                // Count combo items
                const comboItems = o.comboItems || o.items || [];
                const qty = o.quantity || 1;
                comboItems.forEach((ci: any) => {
                    const name = (ci.name || '').trim();
                    if (name) itemCounts[name] = (itemCounts[name] || 0) + (ci.quantity || 1) * qty;
                });
            } else {
                // Count plate-builder items
                const plates = o.plates || [];
                plates.forEach((plate: any) => {
                    const items = plate.items || [];
                    items.forEach((pi: any) => {
                        const name = (pi.item?.name || pi.name || '').trim();
                        if (name) itemCounts[name] = (itemCounts[name] || 0) + (pi.quantity || 1);
                    });
                });
            }
        });

        return Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredOrders]);

    const COLORS = ['#7C3AED', '#FCD34D', '#10B981', '#F87171', '#3B82F6', '#F97316'];

    const revenueData = useMemo(() => {
        let chartDays: Date[] = [];
        
        if (timeRange === 'today') {
            chartDays = [now];
        } else if (timeRange === 'week') {
            const { start, end } = getRangeBounds('week');
            const dayCount = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
            chartDays = Array.from({ length: dayCount }).map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
        } else {
            const start = startOfMonth(now);
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            chartDays = Array.from({ length: daysInMonth }).map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
        }

        return chartDays.map(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayOrders = orders.filter(o => {
                if (!isCalebDeckOrder(o)) return false;
                const od = parseDate(o.createdAt || o.date);
                if (!od) return false;
                return format(od, 'yyyy-MM-dd') === dateStr && !excludedStatuses.includes(o.status);
            });
            return {
                name: format(d, timeRange === 'week' ? 'EEE' : timeRange === 'month' ? 'MMM d' : 'HH:mm'),
                revenue: dayOrders.reduce((sum, o) => sum + getOrderAmount(o), 0),
                orders: dayOrders.length,
            };
        });
    }, [orders, timeRange, platformSettings]);

    const totalOrders = filteredOrders.length;
    const totalTotal = filteredOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
    const totalDeliveryFees = filteredOrders.reduce((sum, o) => sum + getDeliveryFee(o), 0);
    const totalRevenue = totalTotal;
    const totalItems = filteredOrders.reduce((sum, o) => sum + getOrderItemCount(o), 0);
    const deliveredOrders = filteredOrders.filter(o => o.status === 'DELIVERED').length;
    const fulfillmentRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(0) : '0';
    const uniqueCustomers = new Set(filteredOrders.map(o => o.phone).filter(Boolean)).size;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const timeRangeLabel = timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month';

    const cardBg = isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100 shadow-sm';
    const mutedText = isDark ? 'text-[#9C8F7F]' : 'text-gray-500';
    const headingText = isDark ? 'text-[#FAF9F6]' : 'text-gray-900';

    const escapeHtml = (value: any) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const openAnalyticsPrint = () => {
        const title = `CalebDeck Analytics: ${timeRangeLabel}`;
        const rangeBounds = getRangeBounds(timeRange);
        const trendRows = revenueData.map(day => `<tr><td>${escapeHtml(day.name)}</td><td>${day.orders}</td><td>NGN ${day.revenue.toLocaleString()}</td></tr>`).join('');
        const typeRows = orderTypeBreakdown.map(type => {
            const pct = totalOrders > 0 ? Math.round((type.value / totalOrders) * 100) : 0;
            return `<tr><td>${escapeHtml(type.name)}</td><td>${type.value}</td><td>${pct}%</td></tr>`;
        }).join('');
        const topRows = topMenuItems.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${item.count}x</td></tr>`).join('');
        const detailRows = filteredOrders.map(o => {
            const date = parseDate(o.createdAt);
            const verticalLabel = resolveOrderVertical(o) === 'FASHION' ? 'Fashion' : resolveOrderVertical(o) === 'MART' ? 'Mart' : (o.type === 'combo' ? 'Combo' : 'Food');
            return `<tr>
                <td>${date ? format(date, 'MMM d, h:mm a') : 'N/A'}</td>
                <td>${escapeHtml(o.orderId || o.id)}</td>
                <td>${escapeHtml(o.fullName || o.studentName || '')}</td>
                <td>${escapeHtml(o.phone || '')}</td>
                <td>${escapeHtml(o.hostelName || o.hostel || '')}</td>
                <td>${escapeHtml(verticalLabel)}</td>
                <td>${escapeHtml(o.status)}</td>
                <td>NGN ${getOrderAmount(o).toLocaleString()}</td>
            </tr>`;
        }).join('');
        const emptyRow = '<tr><td colspan="8" class="empty">No data for this period</td></tr>';
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
              <head>
                <title>${title}</title>
                <style>
                  * { box-sizing: border-box; }
                  body { font-family: Inter, Arial, sans-serif; padding: 28px; color: #141414; background: #fff; }
                  .topbar { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 3px solid #7C3AED; padding-bottom: 18px; }
                  .brand { font-size: 11px; text-transform: uppercase; letter-spacing: .18em; font-weight: 900; color: #7C3AED; }
                  h1 { margin: 6px 0 4px; font-size: 28px; letter-spacing: 0; }
                  h2 { font-size: 15px; margin: 26px 0 10px; }
                  .meta { color: #666; font-size: 12px; line-height: 1.55; }
                  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 22px 0; }
                  .card { border: 1px solid #e7e2f4; border-radius: 8px; padding: 12px; background: #fbfaff; min-height: 82px; }
                  .label { font-size: 9px; text-transform: uppercase; letter-spacing: .12em; color: #665a77; font-weight: 900; }
                  .value { font-size: 20px; font-weight: 900; margin-top: 6px; color: #171021; }
                  .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
                  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
                  th, td { border-bottom: 1px solid #ececec; padding: 8px; text-align: left; vertical-align: top; }
                  th { background: #f7f5fb; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; color: #6b5b7e; }
                  .empty { text-align: center; color: #777; padding: 18px; }
                  .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
                  .print-btn, .close-btn { margin-top: 18px; padding: 12px 16px; border: 0; border-radius: 8px; color: #fff; font-weight: 900; cursor: pointer; }
                  .print-btn { background: #7C3AED; }
                  .close-btn { background: #171717; }
                  @media print {
                    body { padding: 0; }
                    .actions { display: none; }
                    .card { break-inside: avoid; }
                    h2 { break-after: avoid; }
                  }
                  @media (max-width: 720px) {
                    .grid, .section-grid { grid-template-columns: 1fr; }
                  }
                </style>
              </head>
              <body>
                <div class="topbar">
                  <div>
                    <div class="brand">CalebDeck Admin Report</div>
                    <h1>${title}</h1>
                    <div class="meta">${format(rangeBounds.start, 'MMM d, yyyy')} - ${format(rangeBounds.end, 'MMM d, yyyy')}<br/>Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
                  </div>
                  <div class="actions">
                    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
                    <button class="close-btn" onclick="closeReport()">Close Report</button>
                  </div>
                </div>
                <div class="grid">
                  <div class="card"><div class="label">Total Orders</div><div class="value">${totalOrders}</div></div>
                  <div class="card"><div class="label">Gross Revenue</div><div class="value">NGN ${totalRevenue.toLocaleString()}</div></div>
                  <div class="card"><div class="label">Delivery Fees</div><div class="value">NGN ${totalDeliveryFees.toLocaleString()}</div></div>
                  <div class="card"><div class="label">Delivered</div><div class="value">${deliveredOrders} (${fulfillmentRate}%)</div></div>
                  <div class="card"><div class="label">Average Order Value</div><div class="value">NGN ${avgOrderValue.toLocaleString()}</div></div>
                  <div class="card"><div class="label">Mart Orders</div><div class="value">${filteredOrders.filter(o => resolveOrderVertical(o) === 'MART').length}</div></div>
                  <div class="card"><div class="label">Fashion Orders</div><div class="value">${filteredOrders.filter(o => resolveOrderVertical(o) === 'FASHION').length}</div></div>
                  <div class="card"><div class="label">Customers / Items</div><div class="value">${uniqueCustomers} / ${totalItems}</div></div>
                </div>
                <div class="section-grid">
                  <section>
                    <h2>Revenue Trend</h2>
                    <table><thead><tr><th>Period</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>${trendRows || '<tr><td colspan="3" class="empty">No trend data</td></tr>'}</tbody></table>
                  </section>
                  <section>
                    <h2>Order Types</h2>
                    <table><thead><tr><th>Type</th><th>Orders</th><th>Share</th></tr></thead><tbody>${typeRows || '<tr><td colspan="3" class="empty">No order type data</td></tr>'}</tbody></table>
                  </section>
                </div>
                <h2>Top Ordered Items</h2>
                <table><thead><tr><th>#</th><th>Item</th><th>Quantity</th></tr></thead><tbody>${topRows || '<tr><td colspan="3" class="empty">No item data</td></tr>'}</tbody></table>
                <h2>Detailed Orders</h2>
                <table>
                  <thead><tr><th>Date</th><th>Order</th><th>Student</th><th>Phone</th><th>Hostel</th><th>Type</th><th>Status</th><th>Amount</th></tr></thead>
                  <tbody>${detailRows || emptyRow}</tbody>
                </table>
                <script>
                  function closeReport() {
                    try { window.close(); } catch (error) {}
                    setTimeout(function () {
                      if (!window.closed) {
                        if (window.history.length > 1) {
                          window.history.back();
                        } else {
                          window.location.replace('/admin/analytics');
                        }
                      }
                    }, 150);
                  }
                </script>
              </body>
            </html>
        `);
        printWindow.document.close();
    };

    const SkeletonCard = () => (
        <Card className={`${cardBg} border`}>
            <div className={`h-10 w-10 rounded-xl animate-pulse ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`} />
            <div className={`mt-4 h-3 w-24 rounded animate-pulse ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`} />
            <div className={`mt-3 h-7 w-20 rounded animate-pulse ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`} />
        </Card>
    );

    return (
        <AdminLayout title="Analytics">
            {/* Time Range Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <div className="flex flex-wrap items-center gap-2">
                {rangeOptions.map(range => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === range
                            ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                            : isDark
                                ? 'bg-[#2A2A2A] text-[#9C8F7F] hover:bg-[#333333]'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
                    </button>
                ))}
              </div>
              <button
                onClick={openAnalyticsPrint}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest ${isDark ? 'bg-[#2A2A2A] text-[#FAF9F6] hover:bg-[#333333]' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Printer className="h-4 w-4" />
                Print Analytics
              </button>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />) : [
                    { label: 'Total Orders', value: totalOrders.toString(), icon: <ShoppingBag className="w-5 h-5" />, color: '#7C3AED' },
                    { label: 'Gross Revenue', value: `₦${totalRevenue.toLocaleString()}` , icon: <DollarSign className="w-5 h-5" />, color: '#10B981' },
                    { label: 'Delivery Revenue', value: `₦${totalDeliveryFees.toLocaleString()}` , icon: <Truck className="w-5 h-5" />, color: '#F97316' },
                    { label: 'Unique Customers', value: uniqueCustomers.toString(), icon: <Shield className="w-5 h-5" />, color: '#F43F5E' },
                    { label: 'Orders Delivered', value: `${deliveredOrders} (${fulfillmentRate}%)`, icon: <CheckCircle className="w-5 h-5" />, color: '#3B82F6' },
                ].map((kpi, i) => (
                    <Card key={i} className={`${cardBg} border`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                                {kpi.icon}
                            </div>
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>{kpi.label}</p>
                        <p className={`text-2xl font-black tracking-tight ${headingText}`}>{kpi.value}</p>
                    </Card>
                ))}
            </div>

            {/* Main charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Revenue Chart */}
                <Card className={`lg:col-span-2 p-6 lg:p-8 border ${cardBg}`}>
                    <div className="mb-6">
                        <h3 className={`text-lg font-black ${headingText}`}>Revenue Trend</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${mutedText}`}>{timeRangeLabel} performance</p>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="none" fontSize={10} fontWeight="bold" tick={{ fill: isDark ? '#9C8F7F' : '#6B7280' }} />
                                <YAxis stroke="none" fontSize={10} fontWeight="bold" tickFormatter={(v) => `₦${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fill: isDark ? '#9C8F7F' : '#6B7280' }} />
                                <Tooltip
                                    cursor={{ stroke: isDark ? '#333333' : '#E5E7EB', strokeWidth: 2 }}
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1A1A1A' : '#ffffff',
                                        border: isDark ? '1px solid #333333' : '1px solid #e5e7eb',
                                        borderRadius: '1rem',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                                        padding: '12px 16px',
                                    }}
                                    labelStyle={{ fontWeight: 900, fontSize: 11, color: isDark ? '#FAF9F6' : '#111' }}
                                    formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Order Type Pie Chart */}
                <Card className={`p-6 lg:p-8 border ${cardBg}`}>
                    <div className="mb-6">
                        <h3 className={`text-lg font-black ${headingText}`}>Order Types</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${mutedText}`}>What customers order most</p>
                    </div>
                    {orderTypeBreakdown.length > 0 ? (
                        <>
                            <div className="h-52 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={orderTypeBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            cornerRadius={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {orderTypeBreakdown.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDark ? '#1A1A1A' : '#ffffff',
                                                border: isDark ? '1px solid #333333' : '1px solid #e5e7eb',
                                                borderRadius: '0.75rem',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                                padding: '8px 14px',
                                            }}
                                            formatter={(value: number, name: string) => [`${value} orders`, name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className={`text-3xl font-black tracking-tighter ${headingText}`}>
                                        {totalOrders}
                                    </span>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${mutedText}`}>Orders</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-3 mt-4">
                                {orderTypeBreakdown.map((type, idx) => {
                                    const pct = totalOrders > 0 ? ((type.value / totalOrders) * 100).toFixed(0) : '0';
                                    return (
                                        <div key={idx} className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                <span className={`text-xs font-bold ${mutedText}`}>{type.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black ${headingText}`}>{type.value}</span>
                                                <span className={`text-[10px] font-bold ${mutedText}`}>{pct}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className={`flex flex-col items-center justify-center py-16 ${mutedText}`}>
                            <ShoppingBag className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-xs font-bold">No orders {timeRangeLabel.toLowerCase()}</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Bottom stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Avg Order Value */}
                <Card className={`p-6 border ${cardBg}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-[#7C3AED]" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>Avg. Order Value</p>
                            <p className={`text-2xl font-black tracking-tight ${headingText}`}> ₦{avgOrderValue.toLocaleString()}</p>
                        </div>
                    </div>
                </Card>

                {/* Fulfillment */}
                <Card className={`p-6 border ${cardBg}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-[#10B981]" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>Fulfillment Rate</p>
                            <div className="flex items-baseline gap-2">
                                <p className={`text-2xl font-black tracking-tight ${headingText}`}>{fulfillmentRate}%</p>
                                {Number(fulfillmentRate) >= 90 && (
                                    <Badge variant="green" className="text-[9px] font-black uppercase tracking-widest border-none">Excellent</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Mart Orders */}
                <Card className={`p-6 border ${cardBg}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F97316]/10 flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-[#F97316]" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>Mart Orders</p>
                            <p className={`text-2xl font-black tracking-tight ${headingText}`}>
                                {filteredOrders.filter(o => isMartOrder(o)).length}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Period info */}
                <Card className={`p-6 border ${cardBg}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FCD34D]/10 flex items-center justify-center">
                            <CalendarDays className="w-6 h-6 text-[#FCD34D]" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>Period</p>
                            <p className={`text-lg font-black tracking-tight ${headingText}`}>{timeRangeLabel}</p>
                            <p className={`text-[10px] font-bold ${mutedText}`}>{filteredOrders.length} orders, {totalItems} items</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Top ordered items */}
            <Card className={`p-6 lg:p-8 border ${cardBg}`}>
                <div className="mb-6">
                    <h3 className={`text-lg font-black ${headingText}`}>Top Ordered Items</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${mutedText}`}>Most ordered items {timeRangeLabel.toLowerCase()} - use this data to stock and package smarter</p>
                </div>
                {topMenuItems.length > 0 ? (
                    <div className="space-y-3">
                        {topMenuItems.map((item, idx) => {
                            const maxCount = topMenuItems[0]?.count || 1;
                            const pct = Math.round((item.count / maxCount) * 100);
                            return (
                                <div key={idx} className="flex items-center gap-4">
                                    <span className={`text-xs font-black w-6 text-center ${idx < 3 ? 'text-[#7C3AED]' : mutedText}`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-sm font-bold truncate ${headingText}`}>{item.name}</span>
                                            <span className={`text-xs font-black ml-3 flex-shrink-0 ${mutedText}`}>{item.count}x</span>
                                        </div>
                                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: idx === 0 ? '#7C3AED' : idx === 1 ? '#FCD34D' : idx === 2 ? '#10B981' : isDark ? '#555' : '#D1D5DB'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`flex flex-col items-center justify-center py-12 ${mutedText}`}>
                        <ShoppingBag className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-xs font-bold">No item data available {timeRangeLabel.toLowerCase()}</p>
                    </div>
                )}
            </Card>
        </AdminLayout>
    );
}
