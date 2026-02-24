import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Logo } from '../../components/design-system/Logo';
import {
    ArrowLeft, CheckCircle, Package, MapPin, DollarSign, Calendar, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router';
import { subscribeToRiderOrders } from '../../../services/db';
import { format, formatDistanceToNow } from 'date-fns';

export default function RiderOrderHistory() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToRiderOrders(user.uid, setOrders);
        return unsub;
    }, [user]);

    const parseDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : d ? new Date(d) : null;

    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');

    // Group by date
    const getDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
    const getDateLabel = (date: Date) => {
        const today = new Date();
        const todayKey = format(today, 'yyyy-MM-dd');
        const yesterdayKey = format(new Date(today.getTime() - 86400000), 'yyyy-MM-dd');
        const key = getDateKey(date);
        if (key === todayKey) return 'Today';
        if (key === yesterdayKey) return 'Yesterday';
        return format(date, 'EEEE, MMM d');
    };

    const grouped: Record<string, any[]> = {};
    deliveredOrders
        .sort((a, b) => (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0))
        .forEach(order => {
            const d = parseDate(order.createdAt);
            if (!d) return;
            const key = getDateKey(d);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(order);
        });

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const totalEarnings = deliveredOrders.length * 300;

    return (
        <div className="min-h-screen bg-[#0F0F0F]">
            {/* Header */}
            <header className="sticky top-0 bg-[#141414]/95 backdrop-blur-xl border-b border-[#222222] z-50">
                <div className="px-5 py-4 flex items-center gap-4">
                    <button onClick={() => navigate('/rider')} className="w-10 h-10 rounded-xl bg-[#222222] flex items-center justify-center text-[#9C8F7F] hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-[#FAF9F6]">Order History</h1>
                        <p className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Past deliveries</p>
                    </div>
                </div>
            </header>

            <main className="p-5 space-y-6 max-w-4xl mx-auto">
                {/* Earnings Summary */}
                <Card className="bg-gradient-to-br from-[#10B981]/5 to-[#7C3AED]/5 border-[#222222]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest mb-1">All Time Earnings</p>
                            <h2 className="text-3xl font-black text-[#10B981]">₦{totalEarnings.toLocaleString()}</h2>
                            <p className="text-xs text-[#9C8F7F] font-bold mt-1">{deliveredOrders.length} total deliveries</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
                            <DollarSign className="w-7 h-7 text-[#10B981]" />
                        </div>
                    </div>
                </Card>

                {/* Order Groups */}
                {sortedKeys.length > 0 ? sortedKeys.map(dateKey => {
                    const dateOrders = grouped[dateKey];
                    const firstDate = parseDate(dateOrders[0].createdAt)!;
                    const dayEarnings = dateOrders.length * 300;

                    return (
                        <div key={dateKey}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-[#7C3AED]" />
                                    <span className="text-sm font-bold text-[#FAF9F6]">{getDateLabel(firstDate)}</span>
                                    <Badge variant="purple" className="text-[9px] font-black">{dateOrders.length}</Badge>
                                </div>
                                <span className="text-xs font-bold text-[#10B981]">₦{dayEarnings.toLocaleString()}</span>
                            </div>
                            <div className="space-y-2">
                                {dateOrders.map(order => {
                                    const d = parseDate(order.createdAt);
                                    return (
                                        <Card key={order.id} className="bg-[#1A1A1A] border-[#222222]">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                                                        <CheckCircle className="w-4 h-4 text-[#10B981]" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-[#FAF9F6]">{order.fullName}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-[#9C8F7F] font-bold">{order.hostelName || order.hostel}</span>
                                                            <span className="text-[10px] text-[#9C8F7F]">·</span>
                                                            <span className="text-[10px] text-[#9C8F7F] font-bold">Room {order.room}</span>
                                                            {d && <span className="text-[10px] text-[#9C8F7F]">· {format(d, 'h:mm a')}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm text-[#FAF9F6]">{order.plates?.length || 0} plates</p>
                                                    <p className="text-[10px] text-[#10B981] font-bold">₦300</p>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }) : (
                    <Card className="text-center py-16 bg-[#1A1A1A] border-[#222222]">
                        <div className="w-16 h-16 rounded-2xl bg-[#222222] flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-[#333333]" />
                        </div>
                        <h3 className="text-lg font-bold text-[#FAF9F6] mb-2">No Deliveries Yet</h3>
                        <p className="text-sm text-[#9C8F7F]">Your completed deliveries will appear here</p>
                    </Card>
                )}
            </main>
        </div>
    );
}
