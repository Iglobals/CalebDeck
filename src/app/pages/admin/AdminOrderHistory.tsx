import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { Download, Search, Filter, ChevronDown } from 'lucide-react';
import { subscribeToAllOrders } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';
import { format } from 'date-fns';

export default function AdminOrderHistory() {
    const [orders, setOrders] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const { adminTheme } = useTheme();

    useEffect(() => {
        const unsub = subscribeToAllOrders(setOrders);
        return () => unsub();
    }, []);

    const isDark = adminTheme === 'dark';

    const parseDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : d ? new Date(d) : null;

    const filteredOrders = orders
        .filter(o => {
            const matchesSearch = !searchQuery ||
                (o.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.hostel || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const da = parseDate(a.createdAt);
            const db2 = parseDate(b.createdAt);
            return (db2?.getTime() || 0) - (da?.getTime() || 0);
        });

    const handleDownloadPDF = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const date = parseDate(order.createdAt);
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
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">CALEB<span>DECK</span></div>
                    <div class="oid">ORD-${order.orderId?.slice(-6) || 'XXXXXX'}</div>
                </div>
                <div class="label">Student</div>
                <div class="value">${order.fullName || 'N/A'}</div>
                <div style="font-size:13px;font-weight:700;margin-top:4px">${order.phone || ''}</div>
                <div class="label">Delivery</div>
                <div class="value">${order.hostel || 'N/A'} — Room ${order.room || 'N/A'}</div>
                <div class="label">Date</div>
                <div class="value" style="font-size:14px">${date ? format(date, 'PPpp') : 'N/A'}</div>
                <div class="label">Status</div>
                <div class="value" style="font-size:14px;color:#7C3AED">${order.status || 'PENDING'}</div>
                <div class="label">Items</div>
                ${(order.plates || []).map((p: any, i: number) =>
            `<div style="font-size:11px;font-weight:900;color:#7C3AED;margin-top:10px">PLATE #${i + 1}</div>` +
            (p.items || []).map((it: any) =>
                `<div class="row"><span>${it.item?.name || 'Item'} × ${it.quantity}</span><span>₦${((it.item?.price || 0) * it.quantity).toLocaleString()}</span></div>`
            ).join('')
        ).join('')}
                ${(order.drinksSnacks || []).length > 0 ? `
                    <div style="font-size:11px;font-weight:900;color:#FCD34D;margin-top:10px">EXTRAS</div>
                    ${order.drinksSnacks.map((it: any) =>
            `<div class="row"><span>${it.name} × ${it.quantity || 1}</span><span>₦${((it.price || 0) * (it.quantity || 1)).toLocaleString()}</span></div>`
        ).join('')}
                ` : ''}
                <div class="total">Total: ₦${(order.total || 0).toLocaleString()}</div>
                <div class="footer">CalebDeck Order Receipt<br/>${date ? format(date, 'PPpp') : ''}</div>
                <script>window.print();</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const statusColors: Record<string, string> = {
        PENDING: isDark ? 'bg-yellow-500/10 text-yellow-500' : 'bg-yellow-50 text-yellow-600',
        CONFIRMED: isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
        PREPARING: isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
        OUT_FOR_DELIVERY: isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
        DELIVERED: isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        CANCELLED: isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600',
    };

    const allStatuses = ['all', ...Array.from(new Set(orders.map(o => o.status).filter(Boolean)))];

    return (
        <AdminLayout title="Order History">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by name, order ID, or hostel..."
                        className={`w-full pl-12 pr-6 py-4 rounded-xl border-2 outline-none text-sm transition-all ${isDark
                            ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                            : 'bg-white border-gray-100 text-gray-900 focus:border-[#7C3AED]/30 shadow-sm'}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                    <select
                        className={`pl-10 pr-10 py-4 rounded-xl border-2 outline-none text-sm font-bold appearance-none transition-all ${isDark
                            ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                            : 'bg-white border-gray-100 text-gray-900 focus:border-[#7C3AED]/30 shadow-sm'}`}
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        {allStatuses.map(s => (
                            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                </div>
            </div>

            {/* Summary */}
            <p className={`text-sm font-bold mb-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                Showing {filteredOrders.length} of {orders.length} orders
            </p>

            {/* Orders Table */}
            <Card className={`p-0 overflow-hidden ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={`text-left ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                                <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Order ID</th>
                                <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Student</th>
                                <th className={`hidden md:table-cell py-4 px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Hostel</th>
                                <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Total</th>
                                <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Status</th>
                                <th className={`hidden lg:table-cell py-4 px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Date</th>
                                <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Receipt</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-[#333333]' : 'divide-gray-50'}`}>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`py-16 text-center text-sm font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                        No orders found
                                    </td>
                                </tr>
                            ) : filteredOrders.map(order => {
                                const date = parseDate(order.createdAt);
                                return (
                                    <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}>
                                        <td className="py-4 px-6">
                                            <span className={`font-mono font-bold text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                                                CD-{order.orderId?.slice(-5) || '?????'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div>
                                                <p className={`font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || 'N/A'}</p>
                                                <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>{order.phone || ''}</p>
                                            </div>
                                        </td>
                                        <td className={`hidden md:table-cell py-4 px-6 font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-700'}`}>
                                            {order.hostel || 'N/A'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-bold text-sm text-[#10B981]">₦{(order.total || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <Badge className={`text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full ${statusColors[order.status] || (isDark ? 'bg-gray-500/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                                {(order.status || 'PENDING').replace(/_/g, ' ')}
                                            </Badge>
                                        </td>
                                        <td className={`hidden lg:table-cell py-4 px-6 text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                            {date ? format(date, 'MMM d, h:mm a') : 'N/A'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleDownloadPDF(order)}
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-[#9C8F7F] hover:text-[#7C3AED] hover:bg-[#7C3AED]/10' : 'text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50'}`}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AdminLayout>
    );
}
