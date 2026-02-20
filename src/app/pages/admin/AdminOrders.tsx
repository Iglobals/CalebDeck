import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    ShoppingBag,
    Search,
    MapPin,
    Users,
    ChevronRight,
    Printer,
    CheckCircle2,
    Clock,
    CircleDollarSign,
    X
} from 'lucide-react';
import { subscribeToAllOrders, updateOrder } from '../../../services/db';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../context/ThemeContext';

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { adminTheme } = useTheme();

    useEffect(() => {
        const unsub = subscribeToAllOrders((newOrders) => {
            setOrders(newOrders);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const isDark = adminTheme === 'dark';

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return formatDistanceToNow(d, { addSuffix: true });
    };

    const handlePrint = (order: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const isDark = adminTheme === 'dark';

        const html = `
            <html>
                <head>
                    <title>Order ${order.orderId}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        body { 
                            font-family: 'Inter', sans-serif; 
                            background: white; 
                            color: #1A1A1A; 
                            padding: 40px;
                            max-width: 500px;
                            margin: 0 auto;
                        }
                        .header { border-bottom: 4px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
                        .logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #1A1A1A; }
                        .logo span { color: #7C3AED; }
                        .order-id { font-family: monospace; font-weight: 900; background: #f0f0f0; padding: 4px 12px; border-radius: 6px; font-size: 14px; margin-top: 10px; display: inline-block; }
                        .section { margin-bottom: 25px; }
                        .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #9C8F7F; margin-bottom: 8px; }
                        .value { font-size: 18px; font-weight: 900; }
                        .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee; font-size: 14px; }
                        .footer { margin-top: 40px; border-top: 2px solid #7C3AED; padding-top: 20px; text-align: center; font-size: 12px; font-weight: 700; color: #9C8F7F; }
                        .total { font-size: 24px; font-weight: 900; color: #7C3AED; display: block; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">CALEB<span>DECK</span></div>
                        <div class="order-id">ORD-${order.orderId?.slice(-6) || 'XXXXXX'}</div>
                    </div>
                    
                    <div class="section">
                        <div class="label">Client</div>
                        <div class="value">${order.fullName}</div>
                        <div style="font-size: 14px; font-weight: 700;">${order.phone}</div>
                    </div>

                    <div class="section">
                        <div class="label">Drop-off Point</div>
                        <div class="value">${order.hostel}</div>
                        <div style="font-size: 14px; font-weight: 700;">Room ${order.room}</div>
                    </div>

                    <div class="section">
                        <div class="label">Order Manifest</div>
                        ${(order.plates || []).map((p: any, i: number) => `
                            <div style="margin-top: 15px;">
                                <div style="font-size: 12px; font-weight: 900; color: #7C3AED;">PLATE #${i + 1} - ${p.type}</div>
                                ${p.items.map((it: any) => `
                                    <div class="item-row">
                                        <span>${it.item.name} x${it.quantity}</span>
                                        <span>₦${(it.item.price * it.quantity).toLocaleString()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                        
                        ${(order.drinksSnacks || []).length > 0 ? `
                            <div style="margin-top: 15px;">
                                <div style="font-size: 12px; font-weight: 900; color: #FCD34D;">SUPPLEMENTAL ITEMS</div>
                                ${order.drinksSnacks.map((it: any) => `
                                    <div class="item-row">
                                        <span>${it.name} x${it.quantity}</span>
                                        <span>₦${(it.price * it.quantity).toLocaleString()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="total text-right">
                        <div class="label">Settlement Total</div>
                        ₦${(order.total || 0).toLocaleString()}
                    </div>

                    <div class="footer">
                        THANK YOU FOR ORDERING WITH CALEBDECK<br>
                        ${new Date().toLocaleString()}
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleFinalizeDispatch = async (orderId: string) => {
        try {
            await updateOrder(orderId, { status: 'OUT_FOR_DELIVERY' });
            alert("Order dispatched and status updated in Firestore.");
        } catch (error) {
            console.error(error);
        }
    };

    const filteredOrders = orders.filter(o =>
        o.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.hostel?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout title="Orders">
            <div className="space-y-6">
                {/* Search & Actions */}
                <Card className={`border ${isDark ? 'border-[#333333] bg-[#222222]' : 'border-gray-100 bg-white shadow-sm'}`}>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                placeholder="Search client name, ID, or hostel..."
                                className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all outline-none text-sm ${isDark
                                    ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                                    : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#7C3AED]/30'
                                    }`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest ${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500'}`}>
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">Export CSV</span>
                            </Button>
                            <Button variant="primary" className="px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20">
                                Dispatch Batch
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Orders Table */}
                <Card className={`p-0 overflow-hidden border ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`border-b ${isDark ? 'border-[#333333]' : 'border-gray-50'}`}>
                                    <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>ID</th>
                                    <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Client</th>
                                    <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Location</th>
                                    <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'} text-center`}>Items</th>
                                    <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Total</th>
                                    <th className={`py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Status</th>
                                    <th className="py-4 px-6"></th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-[#333333]' : 'divide-gray-50'}`}>
                                {filteredOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className={`transition-colors group cursor-pointer ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <td className="py-5 px-6">
                                            <span className={`font-mono font-bold text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>CD-{order.orderId?.slice(-6) || 'N/A'}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName}</p>
                                            <p className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{order.phone}</p>
                                        </td>
                                        <td className="py-5 px-6">
                                            <p className={`text-xs font-black uppercase tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.hostel || (order.hostelId === 'old' ? 'Old Cafeteria' : order.hostelId)}</p>
                                            <p className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Room {order.room}</p>
                                        </td>
                                        <td className={`py-5 px-6 text-center text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.plates?.length || 0}</td>
                                        <td className={`py-5 px-6 text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>₦{order.total?.toLocaleString()}</td>
                                        <td className="py-5 px-6">
                                            <Badge
                                                variant={order.status === 'DELIVERED' ? 'green' : (order.status === 'PAID' ? 'gold' : 'purple')}
                                                className="text-[9px] font-black uppercase tracking-widest px-3 py-1"
                                            >
                                                {order.status?.toLowerCase().replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="py-5 px-6 text-right">
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7C3AED] transition-all group-hover:translate-x-1" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-all" onClick={() => setSelectedOrder(null)}></div>
                    <Card className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'
                        }`}>
                        {/* Header */}
                        <div className={`p-8 flex items-center justify-between border-b ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center shadow-2xl shadow-[#7C3AED]/30">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className={`text-lg lg:text-xl font-black tracking-tight mb-1 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Order Logistics</h3>
                                    <p className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{selectedOrder.orderId}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className={`p-3 rounded-xl transition-all ${isDark ? 'hover:bg-[#2A2A2A] text-white' : 'hover:bg-gray-100 text-black'}`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12">
                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.3em]">Client Recipient</p>
                                        <h4 className={`text-2xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{selectedOrder.fullName}</h4>
                                        <p className="text-sm font-bold text-[#7C3AED]">{selectedOrder.phone}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.3em]">Drop-off Point</p>
                                        <h4 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{selectedOrder.hostel}</h4>
                                        <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Room {selectedOrder.room}</p>
                                    </div>
                                </div>

                                <Card className={`p-8 border-none ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                                    <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.3em] mb-4">Financial Status</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Settlement Total</p>
                                            <h3 className="text-3xl font-black text-[#10B981]">₦{selectedOrder.total?.toLocaleString()}</h3>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="gold" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-[#FCD34D]/20 text-[#FCD34D] border-[#FCD34D]/30">PAID</Badge>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className={`flex-1 h-px ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}></div>
                                    <h4 className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.4em]">Order Manifest</h4>
                                    <div className={`flex-1 h-px ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}></div>
                                </div>

                                {selectedOrder.plates?.map((plate: any, pidx: number) => (
                                    <div key={pidx} className={`p-8 rounded-3xl border transition-all hover:bg-[#2A2A2A]/5 ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white shadow-sm'
                                        }`}>
                                        <div className="flex justify-between items-center mb-6">
                                            <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#7C3AED]">Plate #{pidx + 1} — {plate.type}</h5>
                                            <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-black'}`}>₦{plate.total?.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-4">
                                            {plate.items?.map((item: any, iidx: number) => (
                                                <div key={iidx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                                    <div>
                                                        <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.item.name}</p>
                                                        {item.options?.length > 0 && (
                                                            <p className="text-[10px] font-bold text-[#9C8F7F] mt-1">{item.options.join(', ')}</p>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs font-black px-2 py-1 rounded bg-[#7C3AED]/10 text-[#7C3AED]`}>×{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {selectedOrder.drinksSnacks?.length > 0 && (
                                    <div className={`p-8 rounded-3xl border ${isDark ? 'border-[#333333] bg-[#222222]/50' : 'border-gray-100 bg-white'}`}>
                                        <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#FCD34D] mb-6">Supplemental Items</h5>
                                        <div className="space-y-4">
                                            {selectedOrder.drinksSnacks.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                                    <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{item.name}</p>
                                                    <span className="text-xs font-black px-2 py-1 rounded bg-[#FCD34D]/10 text-[#FCD34D]">×{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-gray-50 border-gray-100'
                            }`}>
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-[#9C8F7F]" />
                                <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                    Placed {formatDate(selectedOrder.createdAt)}
                                </span>
                            </div>
                            <div className="flex gap-4 w-full sm:w-auto">
                                <Button
                                    variant="ghost"
                                    onClick={() => handlePrint(selectedOrder)}
                                    className={`flex-1 sm:flex-initial px-6 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest ${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500'
                                        }`}>
                                    Print Ticket
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => handleFinalizeDispatch(selectedOrder.id)}
                                    className="flex-1 sm:flex-initial px-10 py-4 rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-2xl shadow-[#7C3AED]/20">
                                    Finalize Dispatch
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </AdminLayout>
    );
}
