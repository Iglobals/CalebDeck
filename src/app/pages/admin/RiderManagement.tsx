import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    Users,
    Plus,
    MapPin,
    Phone,
    Star,
    Settings2,
    ShieldCheck,
    Clock
} from 'lucide-react';
import { subscribeToRiders, subscribeToAllOrders, getActiveHostels, updateRider, addRider, Rider, Hostel } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function RiderManagement() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [isAddingRider, setIsAddingRider] = useState(false);
    const [newRider, setNewRider] = useState({ name: '', phone: '', email: '' });
    const { adminTheme } = useTheme();

    useEffect(() => {
        const unsubRiders = subscribeToRiders(setRiders);
        const unsubOrders = subscribeToAllOrders(setOrders);

        getActiveHostels().then(setHostels);

        return () => {
            unsubRiders();
            unsubOrders();
        };
    }, []);

    const isDark = adminTheme === 'dark';

    const handleStatusToggle = async (rider: Rider) => {
        const states: Rider['status'][] = ['available', 'busy', 'offline'];
        const nextIndex = (states.indexOf(rider.status) + 1) % states.length;
        await updateRider(rider.id, { status: states[nextIndex] });
    };

    const handleOnboard = async () => {
        if (!newRider.name || !newRider.phone) return;
        try {
            await addRider({
                name: newRider.name,
                phone: newRider.phone,
                assignedHostelIds: [],
                dept: 'Logistics'
            });
            setIsAddingRider(false);
            setNewRider({ name: '', phone: '', email: '' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssignHostel = async (riderId: string, hostelId: string) => {
        const rider = riders.find(r => r.id === riderId);
        if (!rider) return;

        const currentHostels = rider.assignedHostelIds || [];
        const newHostels = currentHostels.includes(hostelId)
            ? currentHostels.filter(id => id !== hostelId)
            : [...currentHostels, hostelId];

        await updateRider(riderId, { assignedHostelIds: newHostels });
    };

    const statusColors = {
        available: 'green',
        busy: 'gold',
        offline: 'gray'
    } as const;

    return (
        <AdminLayout title="Riders">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isDark ? 'bg-[#7C3AED]/10 border-[#7C3AED]/20' : 'bg-[#7C3AED]/5 border-[#7C3AED]/10'
                        }`}>
                        <Users className="w-6 h-6 text-[#7C3AED]" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Fleet Intelligence</p>
                        <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{riders.length} Active Personnel</h3>
                    </div>
                </div>
                <Button
                    variant="primary"
                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xl shadow-[#7C3AED]/20 transition-all active:scale-95"
                    onClick={() => setIsAddingRider(true)}
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    Onboard Rider
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {riders.map((rider) => {
                    const riderOrders = orders.filter(o => o.assignedRiderId === rider.id);
                    const completedToday = riderOrders.filter(o => {
                        const todayStr = new Date().toLocaleDateString();
                        const orderDate = o.updatedAt?.seconds
                            ? new Date(o.updatedAt.seconds * 1000).toLocaleDateString()
                            : new Date(o.updatedAt).toLocaleDateString();
                        return o.status === 'DELIVERED' && orderDate === todayStr;
                    }).length;

                    return (
                        <Card key={rider.id} className={`p-6 border transition-all hover:shadow-xl ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'
                            }`}>
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${isDark ? 'bg-[#2A2A2A] text-[#7C3AED]' : 'bg-gray-50 text-[#7C3AED]'
                                        }`}>
                                        {rider.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className={`text-lg font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.name}</h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{rider.dept || 'Logistics'}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleStatusToggle(rider)} className="transition-transform active:scale-90">
                                    <Badge variant={statusColors[rider.status] || 'gray'} className="text-[9px] font-black uppercase tracking-widest py-1 px-3">
                                        {rider.status}
                                    </Badge>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Orders Today</p>
                                    <p className={`text-xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{completedToday}</p>
                                </div>
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Rating</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>4.9</span>
                                        <Star className="w-3.5 h-3.5 text-[#FCD34D] fill-[#FCD34D]" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-[#7C3AED]" />
                                    <span className={`text-xs font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.phone}</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-[#FCD34D]" />
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Assigned Zones</span>
                                    </div>
                                    <select
                                        className={`w-full text-[10px] font-black uppercase tracking-widest p-3 rounded-xl border ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6]' : 'bg-gray-50 border-gray-100'}`}
                                        onChange={(e) => handleAssignHostel(rider.id, e.target.value)}
                                        value=""
                                    >
                                        <option value="">+ Assign New Zone</option>
                                        {hostels.map(h => (
                                            <option key={h.id} value={h.id}>{h.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex flex-wrap gap-2 pl-1">
                                        {rider.assignedHostelIds?.length > 0 ? (
                                            rider.assignedHostelIds.map((hid) => (
                                                <button
                                                    key={hid}
                                                    onClick={() => handleAssignHostel(rider.id, hid)}
                                                    className={`text-[9px] font-black px-2 py-1 rounded-lg border group transition-all ${isDark ? 'border-[#333333] text-[#9C8F7F] hover:border-red-500 hover:text-red-500' : 'border-gray-100 text-gray-500 hover:border-red-500 hover:text-red-500'
                                                        }`}
                                                >
                                                    {hostels.find(h => h.id === hid)?.name || 'N/A'}
                                                    <span className="ml-1 opacity-0 group-hover:opacity-100">×</span>
                                                </button>
                                            ))
                                        ) : (
                                            <span className="text-[10px] font-bold italic text-gray-400">No zones assigned</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="ghost" className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500'
                                    }`}>
                                    Configure
                                </Button>
                                <Button variant="ghost" className={`px-4 py-3 rounded-xl border-0 ${isDark ? 'bg-[#2A2A2A] text-[#FCD34D]' : 'bg-gray-50 text-[#FCD34D]'
                                    }`}>
                                    <ShieldCheck className="w-5 h-5" />
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {isAddingRider && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-all" onClick={() => setIsAddingRider(false)}></div>
                    <Card className={`relative w-full max-w-lg p-0 border-none shadow-3xl overflow-hidden rounded-[2.5rem] animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'
                        }`}>
                        <div className="p-10 bg-[#7C3AED] text-white">
                            <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Onboard Rider</h2>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-2">Executive Fleet Registration</p>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-[0.3em] ml-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Full Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Samuel Alabi"
                                    className={`w-full rounded-2xl px-6 py-4 outline-none border-2 transition-all font-bold text-sm ${isDark
                                        ? 'bg-[#222222] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                                        : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#7C3AED]'
                                        }`}
                                    onChange={(e) => setNewRider(prev => ({ ...prev, name: e.target.value }))}
                                    value={newRider.name}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-[0.3em] ml-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Phone Link</label>
                                <input
                                    type="tel"
                                    placeholder="080 000 0000"
                                    className={`w-full rounded-2xl px-6 py-4 outline-none border-2 transition-all font-bold text-sm ${isDark
                                        ? 'bg-[#222222] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                                        : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#7C3AED]'
                                        }`}
                                    onChange={(e) => setNewRider(prev => ({ ...prev, phone: e.target.value }))}
                                    value={newRider.phone}
                                />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <Button variant="ghost" className={`flex-1 py-4 font-bold uppercase tracking-widest text-[10px] rounded-xl ${isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#222222]' : 'text-gray-500'
                                    }`} onClick={() => setIsAddingRider(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-[10px] rounded-xl bg-[#7C3AED] text-white shadow-xl shadow-[#7C3AED]/20"
                                    onClick={handleOnboard}
                                >
                                    Register
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </AdminLayout>
    );
}
