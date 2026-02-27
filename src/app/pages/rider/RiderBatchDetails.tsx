import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import {
    ArrowLeft, Package, MapPin, Phone, CheckCircle, Truck,
    ChevronDown, ChevronUp, Download, FileText, X, Printer
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigate, useParams } from 'react-router';
import { subscribeToRiderOrders, subscribeToBatches, updateOrder, updateBatch, Batch } from '../../../services/db';
import { format } from 'date-fns';

export default function RiderBatchDetails() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { riderTheme } = useTheme();
    const { batchId } = useParams();
    const [orders, setOrders] = useState<any[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    const isDark = riderTheme === 'dark';

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToRiderOrders(user.uid, setOrders);
        const unsub2 = subscribeToBatches(user.uid, setBatches);
        return () => { unsub(); unsub2(); };
    }, [user]);

    const batch = batches.find(b => b.id === batchId);

    // We check either batch.orderIds.includes OR matched by batchId to fallback correctly.
    const batchOrders = batch ? orders.filter(o => batch.orderIds.includes(o.id) || o.batchId === batch.id) : [];

    const toggleOrder = (orderId: string) => {
        const next = new Set(expandedOrders);
        if (next.has(orderId)) {
            next.delete(orderId);
        } else {
            next.add(orderId);
        }
        setExpandedOrders(next);
    };

    const markOnTheWay = async (orderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await updateOrder(orderId, { status: 'ON_THE_WAY' });
    };

    const markDelivered = async (orderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await updateOrder(orderId, { status: 'DELIVERED' });

        // Check if all orders are now delivered
        const updatedBatchOrders = batchOrders.map(o => o.id === orderId ? { ...o, status: 'DELIVERED' } : o);
        const allDone = updatedBatchOrders.every(o => o.status === 'DELIVERED');
        if (allDone && batch) {
            await updateBatch(batch.id, { status: 'DELIVERED' });
        }
    };

    const markBatchDelivered = async () => {
        if (!batch) return;
        for (const orderId of batch.orderIds) {
            await updateOrder(orderId, { status: 'DELIVERED' });
        }
        await updateBatch(batch.id, { status: 'DELIVERED' });
    };

    const handlePrint = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Programmatically generate a completely distinct HTML window so styles do not conflict, completely matching the Admin layout as requested.
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for this site to print the manifest.');
            return;
        }

        const html = `
            <html>
                <head>
                    <title>Batch Manifest - ${batch?.hostelName}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Inter', sans-serif; background: white; color: #1A1A1A; padding: 40px; }
                        .header { border-bottom: 4px solid #1A1A1A; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #1A1A1A; }
                        .logo span { color: #7C3AED; }
                        .meta-value { font-size: 14px; font-weight: 700; color: #666; font-family: monospace; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; border-bottom: 2px solid #1A1A1A; }
                        td { padding: 16px 12px; border-bottom: 1px dashed #ccc; vertical-align: top; }
                        .student-name { font-weight: 900; font-size: 16px; margin-bottom: 4px; }
                        .room-badge { display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                        .phone { font-size: 12px; color: #666; margin-top: 4px; }
                        .item-summary { font-size: 14px; margin-bottom: 6px; }
                        .item-summary span.qty { font-weight: bold; color: #7C3AED; margin-right: 4px; }
                        .extras { font-size: 12px; color: #FCD34D; font-weight: bold; }
                        .notes { margin-top: 8px; padding: 6px; background: #fdfdfd; border-left: 2px solid #ccc; font-style: italic; font-size: 12px; color: #666; }
                        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
                        .summary-boxes { display: flex; gap: 20px; margin-bottom: 30px; }
                        .box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
                        .box .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; letter-spacing: 1px; }
                        .box .val { font-size: 24px; font-weight: 900; color: #1A1A1A; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="logo">CALEB<span>DECK</span></div>
                            <h1 style="font-size: 24px; font-weight: 900; margin-top: 10px;">${batch?.hostelName}</h1>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase;">Generated</div>
                            <div class="meta-value">${format(new Date(), 'MMM dd, yyyy - h:mm a')}</div>
                            <div class="meta-value" style="margin-top: 5px; font-size: 10px;">Batch ID: ${batch?.id.slice(-8) || ''}</div>
                        </div>
                    </div>
                    
                    <div class="summary-boxes">
                        <div class="box">
                            <div class="label">Total Orders</div>
                            <div class="val">${batchOrders.length}</div>
                        </div>
                        <div class="box">
                            <div class="label">Total Plates</div>
                            <div class="val">${batch?.plateCount || 0}</div>
                        </div>
                        <div class="box">
                            <div class="label">Rider Courier</div>
                            <div class="val">${user?.displayName || 'Rider'}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px">ID</th>
                                <th style="width: 200px">Student Info</th>
                                <th>Order Logistics Breakdown</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${batchOrders.map(order => `
                                <tr>
                                    <td style="font-family: monospace; font-size: 12px; color: #666; font-weight: bold;">
                                        ${order.orderId?.slice(-4) || order.id?.slice(-4)}
                                    </td>
                                    <td>
                                        <div class="student-name">${order.fullName || 'Student'}</div>
                                        <div class="room-badge">Room ${order.room || 'N/A'}</div>
                                        <div class="phone">${order.phone || 'No Phone provided'}</div>
                                    </td>
                                    <td>
                                        ${order.plates?.map((p: any, i: number) => `
                                            <div class="item-summary">
                                                <span class="qty">P${i + 1}</span>
                                                ${p.items?.map((item: any) => `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.item?.name || item.name}`).join(', ') || 'No Items'}
                                            </div>
                                        `).join('')}
                                        ${order.drinksSnacks?.length > 0 ? `
                                            <div class="extras">
                                                + ${order.drinksSnacks.map((d: any) => `${d.quantity > 1 ? `${d.quantity}x ` : ''}${d.name}`).join(', ')}
                                            </div>
                                        ` : ''}
                                        ${order.notes ? `
                                            <div class="notes">" ${order.notes} "</div>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        CalebDeck Logistics — Strictly Official Use Only
                    </div>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    };

    if (!batch) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-5 ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
                <Card className={`text-center py-16 max-w-sm mx-auto w-full shadow-none border ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                    <Package className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-[#333333]' : 'text-gray-300'}`} />
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{orders.length === 0 ? 'Loading Orders...' : 'Batch Dispatched or Completed'}</h3>
                    <p className={`text-sm mb-6 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>If you recently accepted this, we are pulling the server state.</p>
                    <button onClick={() => navigate('/rider')} className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl text-sm hover:bg-purple-700 transition-all w-full">
                        Return to Hub
                    </button>
                </Card>
            </div>
        );
    }

    const deliveredCount = batchOrders.filter(o => o.status === 'DELIVERED').length;
    const allDelivered = deliveredCount === batchOrders.length && batchOrders.length > 0;

    return (
        <div className={`min-h-screen pb-24 md:pb-8 transition-colors ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
            {/* Header */}
            <header className={`sticky top-0 backdrop-blur-xl border-b z-40 print:hidden ${isDark ? 'bg-[#0F0F0F]/90 border-[#222222]' : 'bg-[#FAF9F6]/90 border-gray-200'}`}>
                <div className="px-4 py-4 flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/rider')} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors shadow-sm ${isDark ? 'border-[#222222] text-[#9C8F7F] hover:text-[#FAF9F6] hover:bg-[#1A1A1A]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'}`}>
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className={`text-lg font-bold leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{batch.hostelName}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Batch Manifest</span>
                                <Badge variant={allDelivered ? 'green' : 'gold'} className="text-[9px] font-black uppercase tracking-widest">
                                    {allDelivered ? 'Done' : `${deliveredCount}/${batchOrders.length}`}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                    >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Export Setup PDF</span>
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto print:hidden">
                {/* Batch Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className={`text-center p-4 border shadow-none ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                        <div className={`text-3xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{batchOrders.length}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Orders</div>
                    </Card>
                    <Card className={`text-center p-4 relative overflow-hidden group border shadow-none ${isDark ? 'bg-[#1A1A1A] border-amber-500/20' : 'bg-white border-amber-200'}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50"></div>
                        <div className="relative z-10">
                            <div className="text-3xl font-black text-amber-500">{batch.plateCount}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Plates</div>
                        </div>
                    </Card>
                    <Card className={`text-center p-4 relative overflow-hidden group border shadow-none ${isDark ? 'bg-[#1A1A1A] border-green-500/20' : 'bg-white border-green-200'}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-50"></div>
                        <div className="relative z-10">
                            <div className="text-3xl font-black text-green-500">{deliveredCount}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Delivered</div>
                        </div>
                    </Card>
                </div>

                {/* Mark All Delivered */}
                {!allDelivered && batchOrders.length > 0 && (
                    <button
                        onClick={markBatchDelivered}
                        className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Mark Entire Batch Delivered
                    </button>
                )}

                {/* Orders List */}
                <div className="space-y-4">
                    <h2 className={`text-sm font-bold uppercase tracking-widest px-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Order Breakdown ({batchOrders.length})</h2>
                    {batchOrders.map(order => {
                        const isDelivered = order.status === 'DELIVERED';
                        const isExpanded = expandedOrders.has(order.id) || (!isDelivered && order.status !== 'PAID');
                        const isOtw = order.status === 'ON_THE_WAY' || order.status === 'OUT_FOR_DELIVERY';

                        const totalOrderPrice = (order.plates?.reduce((acc: number, p: any) => acc + (p.price || 0), 0) || 0)
                            + (order.drinksSnacks?.reduce((acc: number, d: any) => acc + (d.price || 0), 0) || 0);

                        return (
                            <Card
                                key={order.id}
                                className={`overflow-hidden border transition-all duration-300 shadow-sm ${isDelivered
                                        ? (isDark ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200 opacity-60')
                                        : (isDark ? 'bg-[#1A1A1A] border-[#222222] hover:border-[#333333]' : 'bg-white border-gray-200 hover:border-gray-300')
                                    }`}
                            >
                                {/* Header (Clickable for Expand/Collapse) */}
                                <div
                                    className="p-4 cursor-pointer flex items-center justify-between"
                                    onClick={() => toggleOrder(order.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isDelivered
                                                ? 'bg-green-500/10 text-green-500'
                                                : (isOtw ? 'bg-amber-500/10 text-amber-500' : 'bg-purple-600/10 text-purple-600')
                                            }`}>
                                            {isDelivered ? <CheckCircle className="w-6 h-6" /> : (isOtw ? <Truck className="w-6 h-6" /> : <Package className="w-6 h-6" />)}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || 'Student'}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant={isDelivered ? 'green' : (order.status === 'ON_THE_WAY' ? 'gold' : 'purple')} className="text-[9px] font-black uppercase">
                                                    {isDelivered ? 'Done' : (order.status === 'ON_THE_WAY' ? 'OTW' : 'Out')}
                                                </Badge>
                                                <span className={`text-[10px] font-bold tracking-widest font-mono ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                    CD-{order.orderId?.slice(-6) || order.id?.slice(-6)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <div className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.room ? `Room ${order.room}` : 'No Room'}</div>
                                            <div className="text-[10px] text-amber-500 font-bold uppercase">{order.plates?.length || 0} Plates</div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-[#222222] text-[#9C8F7F]' : 'bg-gray-100 text-gray-500'}`}>
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 animate-in slide-in-from-top-4 fade-in duration-200">
                                        <div className={`pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>

                                            {/* Left Col: Contents */}
                                            <div className="space-y-3">
                                                <div className={`flex items-center gap-2 text-sm mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                    <FileText className="w-4 h-4" /> <span className="font-bold uppercase tracking-widest text-[10px]">Order Contents</span>
                                                </div>

                                                {order.plates?.map((plate: any, i: number) => (
                                                    <div key={i} className={`rounded-xl p-3 border ${isDark ? 'bg-[#222222]/50 border-[#333333]' : 'bg-gray-50 border-gray-200'}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-black text-purple-600 uppercase tracking-widest">Plate {i + 1}</span>
                                                            <span className="text-xs font-bold text-amber-500">₦{(plate.total || plate.price || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className={`text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                            {plate.items ? plate.items.map((item: any) => `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.item?.name || item.name}`).join(', ') : 'No items'}
                                                        </div>
                                                    </div>
                                                ))}

                                                {order.drinksSnacks?.length > 0 && (
                                                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Extras</span>
                                                            <span className="text-xs font-bold text-amber-600">₦{order.drinksSnacks.reduce((a: number, b: any) => a + (b.total || b.price || 0), 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className={`text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                            {order.drinksSnacks.map((d: any) => `${d.quantity > 1 ? `${d.quantity}x ` : ''}${d.name}`).join(', ')}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>

                                            {/* Right Col: Delivery Details & Actions */}
                                            <div className="space-y-4">
                                                <div className={`rounded-xl p-4 border ${isDark ? 'bg-[#222222]/30 border-[#333333]' : 'bg-white border-gray-200'}`}>
                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-3 text-sm">
                                                            <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
                                                            <div>
                                                                <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Location</p>
                                                                <p className={`font-medium ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.hostelName || order.hostel} - Room {order.room}</p>
                                                            </div>
                                                        </div>

                                                        {order.notes && (
                                                            <div className="flex items-start gap-3 text-sm">
                                                                <FileText className="w-4 h-4 text-amber-500 mt-0.5" />
                                                                <div>
                                                                    <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Student Note</p>
                                                                    <p className={`font-medium italic border-l-2 pl-2 ${isDark ? 'text-[#FAF9F6] border-amber-500/50' : 'text-gray-900 border-amber-500'}`}>"{order.notes}"</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {order.phone ? (
                                                        <a href={`tel:${order.phone}`} onClick={e => e.stopPropagation()} className={`col-span-2 py-3.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm border ${isDark ? 'bg-[#222222] hover:bg-[#2A2A2A] text-purple-400 border-[#333333]' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'}`}>
                                                            <Phone className="w-4 h-4" /> Call {order.fullName?.split(' ')[0] || 'Student'}
                                                        </a>
                                                    ) : (
                                                        <button disabled className={`col-span-2 py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 text-sm border cursor-not-allowed ${isDark ? 'bg-[#1A1A1A] text-[#666666] border-[#333333]' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                                            No Phone Provided
                                                        </button>
                                                    )}

                                                    {!isDelivered && (
                                                        <>
                                                            {order.status !== 'ON_THE_WAY' ? (
                                                                <button onClick={(e) => markOnTheWay(order.id, e)} className="col-span-2 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20">
                                                                    <Truck className="w-5 h-5" /> Mark On The Way
                                                                </button>
                                                            ) : (
                                                                <button onClick={(e) => markDelivered(order.id, e)} className="col-span-2 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20">
                                                                    <CheckCircle className="w-5 h-5" /> Confirm Delivered
                                                                </button>
                                                            )}
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
            </main>
        </div>
    );
}
