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
    const [initialized, setInitialized] = useState(false);
    const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

    const isDark = riderTheme === 'dark';

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToRiderOrders(user.uid, setOrders);
        const unsub2 = subscribeToBatches(user.uid, setBatches);
        return () => { unsub(); unsub2(); };
    }, [user]);

    const batch = batches.find(b => b.id === batchId);

    const batchOrders = batch ? orders.filter(o => batch.orderIds.includes(o.id) || o.batchId === batch.id) : [];

    useEffect(() => {
        if (!initialized && batchOrders.length > 0) {
            const initial = new Set<string>();
            batchOrders.forEach(o => {
                if (o.status !== 'DELIVERED' && o.status !== 'PAID') {
                    initial.add(o.id);
                }
            });
            setExpandedOrders(initial);
            setInitialized(true);
        }
    }, [batchOrders, initialized]);

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
        setLoadingActions(prev => ({ ...prev, [`on_the_way_${orderId}`]: true }));
        try {
            await updateOrder(orderId, { status: 'ON_THE_WAY' });
        } finally {
            setLoadingActions(prev => ({ ...prev, [`on_the_way_${orderId}`]: false }));
        }
    };



    const markDelivered = async (orderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setLoadingActions(prev => ({ ...prev, [`delivered_${orderId}`]: true }));
        try {
            await updateOrder(orderId, { status: 'DELIVERED' });

            const updatedBatchOrders = batchOrders.map(o => o.id === orderId ? { ...o, status: 'DELIVERED' } : o);
            const allDone = updatedBatchOrders.every(o => o.status === 'DELIVERED');
            if (allDone && batch) {
                await updateBatch(batch.id, { status: 'DELIVERED' });
            }
        } finally {
            setLoadingActions(prev => ({ ...prev, [`delivered_${orderId}`]: false }));
        }
    };

    const markBatchOnTheWay = async () => {
        if (!batch) return;
        setLoadingActions(prev => ({ ...prev, batch_on_the_way: true }));
        try {
            for (const orderId of batch.orderIds) {
                const order = batchOrders.find(o => o.id === orderId);
                if (order && order.status !== 'DELIVERED' && order.status !== 'ON_THE_WAY') {
                    await updateOrder(orderId, { status: 'ON_THE_WAY' });
                }
            }
        } finally {
            setLoadingActions(prev => ({ ...prev, batch_on_the_way: false }));
        }
    };

    const markBatchDelivered = async () => {
        if (!batch) return;
        setLoadingActions(prev => ({ ...prev, batch_delivered: true }));
        try {
            for (const orderId of batch.orderIds) {
                const order = batchOrders.find(o => o.id === orderId);
                if (order && order.status !== 'DELIVERED') {
                    await updateOrder(orderId, { status: 'DELIVERED' });
                }
            }
            await updateBatch(batch.id, { status: 'DELIVERED' });
        } finally {
            setLoadingActions(prev => ({ ...prev, batch_delivered: false }));
        }
    };

    const handlePrint = (e: React.MouseEvent) => {
        e.stopPropagation();
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for this site to print tickets.');
            return;
        }

        const html = `
            <html>
                <head>
                    <title>Batch Manifest - ${batch?.hostelName || 'Hostel'}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Inter', sans-serif; background: white; color: #1A1A1A; padding: 40px; max-width: 480px; margin: 0 auto; }
                        .header { border-bottom: 4px solid #FCD34D; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
                        .logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #1A1A1A; }
                        .logo span { color: #FCD34D; }
                        .order-id { font-family: monospace; font-weight: 900; background: #f0f0f0; padding: 4px 12px; border-radius: 6px; font-size: 14px; margin-top: 10px; display: inline-block; }
                        .section { margin-bottom: 25px; border-bottom: 2px dashed #eee; padding-bottom: 20px; }
                        .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #9C8F7F; margin-bottom: 8px; }
                        .value { font-size: 18px; font-weight: 900; }
                        .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee; font-size: 14px; }
                        .plate-header { font-size: 11px; font-weight: 900; color: #d97706; text-transform: uppercase; letter-spacing: 2px; margin: 14px 0 8px; }
                        .footer { margin-top: 40px; border-top: 2px solid #FCD34D; padding-top: 20px; text-align: center; font-size: 12px; font-weight: 700; color: #9C8F7F; }
                        .total { font-size: 24px; font-weight: 900; color: #1A1A1A; display: block; margin-top: 10px; text-align: right; }
                        .close-btn { display: block; width: 100%; padding: 14px; margin-top: 30px; background: #1A1A1A; color: white; border: none; border-radius: 8px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
                        @media print { .close-btn { display: none !important; } }
                        .page-break { page-break-after: always; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">CALEB<span>DECK</span> RIDER</div>
                        <div class="order-id">BATCH — ${batch?.hostelName || 'N/A'}</div>
                        <div style="margin-top: 10px; font-size: 12px; font-weight: 700; color: #666;">${batchOrders.length} Orders Total</div>
                    </div>
                    
                    ${batchOrders.map((order: any, index: number) => `
                        <div class="section ${index < batchOrders.length - 1 ? 'page-break' : ''}">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <div class="order-id" style="margin-top: 0; background: #FCD34D; color: #1A1A1A;">#${index + 1} • CD-${order.orderId?.slice(-6) || 'XXXXXX'}</div>
                            </div>
                            
                            <div class="label">Student Details</div>
                            <div class="value" style="margin-bottom: 5px;">${order.fullName}</div>
                            <div style="font-weight: 700; color: #666; font-size: 14px; margin-bottom: 15px;">📞 ${order.phone || 'N/A'}</div>

                            <div class="label">Order Items</div>
                            ${order.type === 'combo' ? (
                                `<div class="plate-header">${order.comboName} × ${order.quantity || 1}</div>` +
                                (order.comboItems || []).map((item: any) => `
                                    <div class="item-row">
                                        <span>${item.name}</span>
                                        <span style="font-weight: 900;">×${item.quantity}</span>
                                    </div>
                                `).join('')
                            ) : (
                                (order.plates || []).map((p: any, i: number) => `
                                    <div class="plate-header">Plate #${i + 1} — ${p.type || ''}</div>
                                    ${(p.items || []).map((item: any) => `
                                        <div class="item-row">
                                            <span>${item.item?.name || item.name}</span>
                                            <span style="font-weight: 900;">×${item.quantity}</span>
                                        </div>
                                    `).join('')}
                                `).join('')
                            )}
                            
                            ${order.type !== 'combo' ? `
                            <div class="plate-header">Fees</div>
                            <div class="item-row">
                                <span>Takeaway Pack</span>
                                <span style="font-weight: 900;">×${order.plates?.length || 0}</span>
                            </div>
                            ` : ''}
                            
                            ${order.drinksSnacks?.length > 0 ? `
                                <div class="plate-header">Add-ons</div>
                                ${order.drinksSnacks.map((item: any) => `
                                    <div class="item-row">
                                        <span>${item.item?.name || item.name}</span>
                                        <span style="font-weight: 900;">×${item.quantity}</span>
                                    </div>
                                `).join('')}
                            ` : ''}
                            
                            ${(order.notes || order.instructions) ? `
                                <div style="margin-top: 15px; padding: 10px; background: #fffbeb; border-left: 3px solid #FCD34D; border-radius: 4px;">
                                    <div class="label" style="color: #d97706;">Student Note</div>
                                    <div style="font-size: 13px; font-weight: 600; font-style: italic; white-space: pre-wrap; word-break: break-word;">"${(order.notes || order.instructions)}"</div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}

                    <div class="footer">CalebDeck Rider Operations — ${new Date().toLocaleDateString()}</div>
                    <button class="close-btn" onclick="window.close()">Close Receipt</button>
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

                {/* Mark All Actions */}
                {!allDelivered && batchOrders.length > 0 && (
                    <div className="flex gap-3 mt-4">
                        <button
                            disabled={loadingActions['batch_on_the_way']}
                            onClick={markBatchOnTheWay}
                            className={`flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20 ${loadingActions['batch_on_the_way'] ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <Truck className={`w-5 h-5 ${loadingActions['batch_on_the_way'] ? 'animate-pulse' : ''}`} />
                            {loadingActions['batch_on_the_way'] ? 'Updating...' : 'Mark All On The Way'}
                        </button>
                        <button
                            disabled={loadingActions['batch_delivered']}
                            onClick={markBatchDelivered}
                            className={`flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20 ${loadingActions['batch_delivered'] ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <CheckCircle className={`w-5 h-5 ${loadingActions['batch_delivered'] ? 'animate-pulse' : ''}`} />
                            {loadingActions['batch_delivered'] ? 'Updating...' : 'Mark All Delivered'}
                        </button>
                    </div>
                )}

                {/* Orders List */}
                <div className="space-y-4">
                    <h2 className={`text-sm font-bold uppercase tracking-widest px-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Order Breakdown ({batchOrders.length})</h2>
                    {batchOrders.map(order => {
                        const isDelivered = order.status === 'DELIVERED';
                        const isExpanded = expandedOrders.has(order.id);
                        const isOtw = order.status === 'ON_THE_WAY' || order.status === 'OUT_FOR_DELIVERY';

                        const totalOrderPrice = order.type === 'combo' 
                            ? ((order.basePrice || 0) * (order.quantity || 1)) 
                            : ((order.plates?.reduce((acc: number, p: any) => acc + (p.price || p.total || 0), 0) || 0)
                                + (order.drinksSnacks?.reduce((acc: number, d: any) => acc + (d.price || d.total || 0), 0) || 0));

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
                                                {(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') && (
                                                    <Badge variant="purple" className="text-[9px] uppercase font-black px-1.5 py-0.5">Group</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-[10px] text-amber-500 font-bold uppercase">{order.type === 'combo' ? `${order.quantity || 1} Combos` : `${order.plates?.length || 0} Plates`}</div>
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

                                                {order.type === 'combo' ? (
                                                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-[#222222]/50 border-[#333333]' : 'bg-gray-50 border-gray-200'}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-black text-purple-600 uppercase tracking-widest">{order.comboName} × {order.quantity || 1}</span>
                                                            <span className="text-xs font-bold text-amber-500">₦{((order.basePrice || 0) * (order.quantity || 1)).toLocaleString()}</span>
                                                        </div>
                                                        <div className={`text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                            {order.comboItems?.map((item: any) => `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.name}`).join(', ') || 'No items'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
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

                                                        <div className={`rounded-xl p-3 border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#FAF9F6] border-gray-200'}`}>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Fees</span>
                                                                <span className="text-xs font-bold text-amber-600">₦{((order.plates?.length || 0) * 200).toLocaleString()}</span>
                                                            </div>
                                                            <div className={`text-sm font-medium flex items-center gap-1.5 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                                <Package className="w-3.5 h-3.5 text-amber-500" />
                                                                Takeaway Pack × {order.plates?.length || 0}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {order.drinksSnacks?.length > 0 && (
                                                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Extras</span>
                                                            <span className="text-xs font-bold text-amber-600">₦{order.drinksSnacks.reduce((a: number, b: any) => a + (b.total || b.price || 0), 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className={`text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-800'}`}>
                                                            {order.drinksSnacks.map((d: any) => `${d.quantity > 1 ? `${d.quantity}x ` : ''}${d.item?.name || d.name}`).join(', ')}
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
                                                                <p className={`font-medium ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.hostelName || order.hostel}</p>
                                                            </div>
                                                        </div>

                                                        {(order.notes || order.instructions) && (
                                                            <div className="flex items-start gap-3 text-sm">
                                                                <FileText className="w-4 h-4 text-amber-500 mt-0.5" />
                                                                <div>
                                                                    <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Student Note</p>
                                                                    <p className={`font-medium italic border-l-2 pl-2 whitespace-pre-wrap break-words ${isDark ? 'text-[#FAF9F6] border-amber-500/50' : 'text-gray-900 border-amber-500'}`}>"{(order.notes || order.instructions)}"</p>
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
                                                                <button
                                                                    disabled={loadingActions[`on_the_way_${order.id}`]}
                                                                    onClick={(e) => markOnTheWay(order.id, e)}
                                                                    className={`col-span-2 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20 ${loadingActions[`on_the_way_${order.id}`] ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <Truck className={`w-5 h-5 ${loadingActions[`on_the_way_${order.id}`] ? 'animate-pulse' : ''}`} />
                                                                    {loadingActions[`on_the_way_${order.id}`] ? 'Updating...' : 'Mark On The Way'}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    disabled={loadingActions[`delivered_${order.id}`]}
                                                                    onClick={(e) => markDelivered(order.id, e)}
                                                                    className={`col-span-2 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20 ${loadingActions[`delivered_${order.id}`] ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <CheckCircle className={`w-5 h-5 ${loadingActions[`delivered_${order.id}`] ? 'animate-pulse' : ''}`} />
                                                                    {loadingActions[`delivered_${order.id}`] ? 'Confirming...' : 'Confirm Delivered'}
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

            {/* Print Manifest HTML Overlay (Hidden normally, visible only when printing) */}
            <div className="hidden print:block bg-white text-black p-8 font-sans absolute inset-0 z-50 min-h-screen">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: portrait; margin: 1cm; }
                        body { background: white !important; font-family: 'Inter', sans-serif; }
                    }
                    .print-table th { text-align: left; border-bottom: 2px solid #000; padding-bottom: 8px; font-size: 12px; text-transform: uppercase; }
                    .print-table td { padding: 12px 0; border-bottom: 1px dashed #ccc; vertical-align: top; }
                `}} />

                <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-8">
                    <div>
                        <div className="text-3xl font-black tracking-tighter">CALEB<span className="text-[#7C3AED]">DECK</span></div>
                        <h1 className="text-2xl font-black mt-2">{batch.hostelName}</h1>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generated</div>
                        <div className="font-mono font-bold">{format(new Date(), 'MMM dd, yyyy - h:mm a')}</div>
                        <div className="text-[10px] text-gray-400 mt-1 font-mono">Batch ID: {batch.id.slice(-8)}</div>
                    </div>
                </div>

                <div className="flex gap-4 mb-8">
                    <div className="flex-1 border border-gray-300 rounded-lg p-4 text-center">
                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Total Orders</div>
                        <div className="text-2xl font-black mt-1">{batchOrders.length}</div>
                    </div>
                    <div className="flex-1 border border-gray-300 rounded-lg p-4 text-center">
                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Total Plates</div>
                        <div className="text-2xl font-black mt-1">{batch.plateCount}</div>
                    </div>
                    <div className="flex-1 border border-gray-300 rounded-lg p-4 text-center">
                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Rider Courier</div>
                        <div className="text-xl font-black mt-2 leading-none truncate">{user?.displayName || 'Rider'}</div>
                    </div>
                </div>

                <table className="w-full print-table mb-12">
                    <thead>
                        <tr>
                            <th className="w-16">ID</th>
                            <th className="w-48">Student Info</th>
                            <th>Order Logistics Breakdown</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batchOrders.map(order => (
                            <tr key={order.id}>
                                <td className="font-mono text-xs font-bold text-gray-500">
                                    {order.orderId?.slice(-4) || order.id?.slice(-4)}
                                </td>
                                <td>
                                    <div className="font-black text-base">{order.fullName || 'Student'}</div>
                                    <div className="text-xs font-bold text-gray-800 mt-1">{order.hostelName || order.hostel}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{order.phone || 'No Phone'}</div>
                                </td>
                                <td>
                                    {order.type === 'combo' ? (
                                        <div className="text-sm mb-1.5 flex flex-col gap-1">
                                            <span className="font-black text-[#7C3AED]">{order.comboName} × {order.quantity || 1}</span>
                                            <span>{order.comboItems?.map((item: any) => `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.name}`).join(', ') || 'No Items'}</span>
                                        </div>
                                    ) : (
                                        order.plates?.map((p: any, i: number) => (
                                            <div key={i} className="text-sm mb-1.5 flex items-start gap-2">
                                                <span className="font-black text-[#7C3AED]">Plate {i + 1}:</span>
                                                <span>{p.items?.map((item: any) => `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.item?.name || item.name}`).join(', ') || 'No Items'}</span>
                                            </div>
                                        ))
                                    )}
                                    {order.drinksSnacks?.length > 0 && (
                                        <div className="text-xs font-bold text-amber-500 mt-1">
                                            + {order.drinksSnacks.map((d: any) => `${d.quantity > 1 ? `${d.quantity}x ` : ''}${d.item?.name || d.name}`).join(', ')}
                                        </div>
                                    )}
                                    {(order.notes || order.instructions) && (
                                        <div className="mt-2 p-2 bg-gray-50 border-l-2 border-gray-300 italic text-xs text-gray-600 whitespace-pre-wrap break-words">
                                            "{(order.notes || order.instructions)}"
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-t-2 border-gray-100 pt-8 mt-auto">
                    CalebDeck Logistics — Strictly Official Use Only
                </div>
            </div>
        </div>
    );
}
