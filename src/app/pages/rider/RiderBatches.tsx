import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { MapPin, ChevronRight, CheckCircle, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigate } from 'react-router';
import { subscribeToBatches, Batch } from '../../../services/db';

export default function RiderBatches() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { riderTheme } = useTheme();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);

    const isDark = riderTheme === 'dark';

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToBatches(user.uid, (data) => {
            setBatches(data);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const todayStr = new Date().toLocaleDateString();
    const activeBatches = batches.filter(b => {
        if (b.status !== 'OUT_FOR_DELIVERY') return false;
        const createdAt = b.createdAt as any;
        let d: Date | null = null;
        if (createdAt != null) {
            if (typeof createdAt === 'object' && 'seconds' in createdAt) {
                d = new Date(createdAt.seconds * 1000);
            } else {
                d = new Date(createdAt);
            }
        }
        return d ? d.toLocaleDateString() === todayStr : true;
    });

    const completedBatches = batches.filter(b => {
        if (b.status !== 'DELIVERED') return false;
        const d = (b.createdAt as any)?.seconds
            ? new Date((b.createdAt as any).seconds * 1000)
            : b.createdAt ? new Date(b.createdAt) : null;
        return d ? d.toLocaleDateString() === todayStr : false;
    });

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-5 ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
                <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#7C3AED]' : 'border-purple-600'}`}></div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen pb-24 md:pb-8 transition-colors ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
            <header className={`sticky top-0 backdrop-blur-xl border-b z-40 ${isDark ? 'bg-[#0F0F0F]/90 border-[#222222]' : 'bg-[#FAF9F6]/90 border-gray-200'}`}>
                <div className="px-6 py-4">
                    <h1 className={`text-2xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Your Batches</h1>
                    <p className={`text-sm font-medium mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Manage your deliveries</p>
                </div>
            </header>

            <main className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
                {/* Active Batches Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-sm font-bold uppercase tracking-widest px-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Active Batches ({activeBatches.length})</h2>
                    </div>

                    <div className="space-y-3">
                        {activeBatches.length > 0 ? activeBatches.map(batch => (
                            <button
                                key={batch.id}
                                onClick={() => navigate(`/rider/batch/${batch.id}`)}
                                className={`w-full text-left border rounded-2xl p-4 transition-all active:scale-[0.98] group flex items-center justify-between ${isDark ? 'bg-[#1A1A1A] border-[#222222] hover:bg-[#1E1E1E]' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <MapPin className="w-5 h-5 text-[#7C3AED]" />
                                    </div>
                                    <div>
                                        <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{batch.hostelName}</h4>
                                        <div className={`flex items-center gap-2 text-xs font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                            <span>{batch.orderCount} Orders</span>
                                            <span className={isDark ? 'text-[#333333]' : 'text-gray-200'}>|</span>
                                            <span className="text-amber-500 font-bold">{batch.plateCount} Plates</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden sm:block mr-2">
                                        <Badge variant="purple" className="text-[9px] font-black uppercase tracking-widest">In Progress</Badge>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-[#222222] text-[#9C8F7F] group-hover:bg-[#7C3AED] group-hover:text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-purple-600 group-hover:text-white'}`}>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </button>
                        )) : (
                            <Card className={`py-12 text-center flex flex-col items-center justify-center shadow-none border ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                                    <CheckCircle className={`w-8 h-8 ${isDark ? 'text-[#333333]' : 'text-gray-300'}`} />
                                </div>
                                <h4 className={`text-lg font-bold mb-1 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>You're all caught up</h4>
                                <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>No active batches at the moment.</p>
                            </Card>
                        )}
                    </div>
                </section>

                {/* Completed Batches Section */}
                {completedBatches.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-4 mt-8">
                            <h2 className={`text-sm font-bold uppercase tracking-widest px-1 flex items-center gap-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                <CheckCircle className="w-4 h-4" />
                                Completed Today
                            </h2>
                        </div>

                        <div className="space-y-3 opacity-70">
                            {completedBatches.map(batch => (
                                <button
                                    key={batch.id}
                                    onClick={() => navigate(`/rider/batch/${batch.id}`)}
                                    className={`w-full text-left border rounded-2xl p-4 transition-all group flex items-center justify-between ${isDark ? 'bg-[#1A1A1A]/50 border-[#222222] hover:bg-[#1A1A1A]' : 'bg-gray-50 border-gray-100 hover:bg-white shadow-sm'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-[#222222]' : 'bg-white border'}`}>
                                            <Package className={`w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-bold mb-0.5 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{batch.hostelName}</h4>
                                            <div className={`flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-[#666666]' : 'text-gray-400'}`}>
                                                <span>{batch.orderCount} Orders</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="green" className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Delivered</Badge>
                                        <ChevronRight className={`w-4 h-4 ${isDark ? 'text-[#666666]' : 'text-gray-300'}`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
