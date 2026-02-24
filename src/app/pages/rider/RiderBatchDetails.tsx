import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import {
    ArrowLeft, Package, MapPin, Phone, CheckCircle, Truck, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, useParams } from 'react-router';
import { subscribeToRiderOrders, subscribeToBatches, updateOrder, updateBatch, Batch } from '../../../services/db';

export default function RiderBatchDetails() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { batchId } = useParams();
    const [orders, setOrders] = useState<any[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToRiderOrders(user.uid, setOrders);
        const unsub2 = subscribeToBatches(user.uid, setBatches);
        return () => { unsub(); unsub2(); };
    }, [user]);

    const batch = batches.find(b => b.id === batchId);
    const batchOrders = batch ? orders.filter(o => batch.orderIds.includes(o.id)) : [];

    const toggleOrder = (orderId: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    };

    const markOnTheWay = async (orderId: string) => {
        await updateOrder(orderId, { status: 'ON_THE_WAY' });
    };

    const markDelivered = async (orderId: string) => {
        await updateOrder(orderId, { status: 'DELIVERED' });
    };

    const markBatchDelivered = async () => {
        if (!batch) return;
        for (const orderId of batch.orderIds) {
            await updateOrder(orderId, { status: 'DELIVERED' });
        }
        await updateBatch(batch.id, { status: 'DELIVERED' });
    };

    if (!batch) {
        return (
            <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
                <Card className="text-center py-16 bg-[#1A1A1A] border-[#222222] max-w-sm mx-auto">
                    <Package className="w-12 h-12 text-[#333333] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#FAF9F6] mb-2">Batch Not Found</h3>
                    <p className="text-sm text-[#9C8F7F] mb-4">This batch may have been completed or doesn't exist.</p>
                    <button onClick={() => navigate('/rider')} className="px-6 py-3 bg-[#7C3AED] text-white font-bold rounded-xl text-sm hover:bg-[#6D28D9] transition-all">
                        Back to Dashboard
                    </button>
                </Card>
            </div>
        );
    }

    const deliveredCount = batchOrders.filter(o => o.status === 'DELIVERED').length;
    const allDelivered = deliveredCount === batchOrders.length && batchOrders.length > 0;

    return (
        <div className="min-h-screen bg-[#0F0F0F]">
            {/* Header */}
            <header className="sticky top-0 bg-[#141414]/95 backdrop-blur-xl border-b border-[#222222] z-50">
                <div className="px-5 py-4 flex items-center gap-4">
                    <button onClick={() => navigate('/rider')} className="w-10 h-10 rounded-xl bg-[#222222] flex items-center justify-center text-[#9C8F7F] hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-[#FAF9F6]">{batch.hostelName}</h1>
                        <p className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Batch Manifest</p>
                    </div>
                    <Badge variant={allDelivered ? 'green' : 'gold'} className="text-[9px] font-black uppercase tracking-widest">
                        {allDelivered ? 'Completed' : `${deliveredCount}/${batchOrders.length}`}
                    </Badge>
                </div>
            </header>

            <main className="p-5 space-y-4 max-w-4xl mx-auto">
                {/* Batch Summary */}
                <Card className="bg-[#1A1A1A] border-[#222222]">
                    <div className="grid grid-cols-3 text-center divide-x divide-[#333333]">
                        <div className="py-2">
                            <div className="text-2xl font-black text-[#FAF9F6]">{batchOrders.length}</div>
                            <div className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Orders</div>
                        </div>
                        <div className="py-2">
                            <div className="text-2xl font-black text-[#FCD34D]">{batch.plateCount}</div>
                            <div className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Plates</div>
                        </div>
                        <div className="py-2">
                            <div className="text-2xl font-black text-[#10B981]">{deliveredCount}</div>
                            <div className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Delivered</div>
                        </div>
                    </div>
                </Card>

                {/* Mark All Delivered */}
                {!allDelivered && (
                    <button
                        onClick={markBatchDelivered}
                        className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Mark Entire Batch Delivered
                    </button>
                )}

                {/* Orders */}
                <div className="space-y-3">
                    {batchOrders.map(order => {
                        const isExpanded = expandedOrders.has(order.id);
                        const isDelivered = order.status === 'DELIVERED';

                        return (
                            <Card key={order.id} className={`overflow-hidden border ${isDelivered
                                ? 'bg-[#10B981]/5 border-[#10B981]/10'
                                : 'bg-[#1A1A1A] border-[#222222]'
                                }`}>
                                {/* Order Header */}
                                <button onClick={() => toggleOrder(order.id)} className="w-full text-left flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDelivered ? 'bg-[#10B981]/10' : 'bg-[#7C3AED]/10'
                                            }`}>
                                            {isDelivered ? <CheckCircle className="w-4 h-4 text-[#10B981]" /> : <Package className="w-4 h-4 text-[#7C3AED]" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-[#FAF9F6]">{order.fullName}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-[#9C8F7F] font-bold">Room {order.room}</span>
                                                <span className="text-[10px] text-[#9C8F7F]">·</span>
                                                <span className="text-[10px] text-[#9C8F7F] font-bold">{order.plates?.length || 0} plates</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={isDelivered ? 'green' : order.status === 'ON_THE_WAY' ? 'gold' : 'purple'} className="text-[9px] font-black uppercase">
                                            {isDelivered ? 'Done' : order.status === 'ON_THE_WAY' ? 'OTW' : 'Out'}
                                        </Badge>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9C8F7F]" /> : <ChevronDown className="w-4 h-4 text-[#9C8F7F]" />}
                                    </div>
                                </button>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-[#222222] space-y-3">
                                        {/* Items */}
                                        {order.plates?.map((plate: any, i: number) => (
                                            <div key={i} className="p-3 rounded-xl bg-[#222222]/60 text-xs">
                                                <span className="text-[#7C3AED] font-bold mr-2">Plate #{i + 1}</span>
                                                <span className="text-[#9C8F7F]">{plate.items?.map((item: any) => item.item?.name || item.name).join(', ')}</span>
                                            </div>
                                        ))}
                                        {order.drinksSnacks?.length > 0 && (
                                            <div className="p-3 rounded-xl bg-[#FCD34D]/5 text-xs text-[#FCD34D]">
                                                Add-ons: {order.drinksSnacks.map((d: any) => d.name).join(', ')}
                                            </div>
                                        )}
                                        {order.notes && (
                                            <div className="p-3 rounded-xl bg-[#222222]/60 text-xs text-[#9C8F7F]">
                                                📝 {order.notes}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {!isDelivered && (
                                            <div className="flex gap-2">
                                                {order.phone && (
                                                    <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#222222] text-[#7C3AED] font-bold text-xs">
                                                        <Phone className="w-4 h-4" />
                                                        Call
                                                    </a>
                                                )}
                                                {order.status === 'OUT_FOR_DELIVERY' ? (
                                                    <button onClick={() => markOnTheWay(order.id)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FCD34D]/10 text-[#FCD34D] border border-[#FCD34D]/30 font-bold text-xs transition-all">
                                                        <Truck className="w-4 h-4" />
                                                        On The Way
                                                    </button>
                                                ) : (
                                                    <button onClick={() => markDelivered(order.id)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 font-bold text-xs transition-all">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Delivered
                                                    </button>
                                                )}
                                            </div>
                                        )}
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
