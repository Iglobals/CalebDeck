import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    Users,
    Plus,
    Phone,
    MapPin,
    Star,
    ShieldCheck,
    Clock,
    UserCheck,
    UserPlus
} from 'lucide-react';
import { subscribeToRiders, subscribeToAllOrders, subscribeToHostels, updateRider, addRider, assignHostelRiders, Rider, Hostel } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function RiderManagement() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [isAddingRider, setIsAddingRider] = useState(false);
    const [newRider, setNewRider] = useState({ name: '', phone: '', dept: '' });
    const { adminTheme } = useTheme();

    useEffect(() => {
        const unsubRiders = subscribeToRiders(setRiders);
        const unsubOrders = subscribeToAllOrders(setOrders);
        const unsubHostels = subscribeToHostels(setHostels);

        return () => {
            unsubRiders();
            unsubOrders();
            unsubHostels();
        };
    }, []);

    const isDark = adminTheme === 'dark';

    const handleStatusToggle = async (rider: Rider) => {
        const states: Rider['status'][] = ['available', 'offline'];
        const nextIndex = (states.indexOf(rider.status) + 1) % states.length;
        await updateRider(rider.id, { status: states[nextIndex] });
    };

    const handleActivateToggle = async (rider: Rider) => {
        await updateRider(rider.id, { isActive: !rider.isActive });
    };

    const handleOnboard = async () => {
        if (!newRider.name || !newRider.phone) return;
        try {
            await addRider({
                name: newRider.name,
                phone: newRider.phone,
                dept: newRider.dept || 'Logistics',
                assignedHostelIds: [],
                earnings: 0,
            });
            setIsAddingRider(false);
            setNewRider({ name: '', phone: '', dept: '' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleAssignDefaultRider = async (hostelId: string, riderId: string) => {
        const hostel = hostels.find(h => h.id === hostelId);
        await assignHostelRiders(hostelId, riderId || null, hostel?.assistantRiderId || null);
    };

    const handleAssignAssistantRider = async (hostelId: string, riderId: string) => {
        const hostel = hostels.find(h => h.id === hostelId);
        await assignHostelRiders(hostelId, hostel?.defaultRiderId || null, riderId || null);
    };

    const statusColors = {
        available: 'green',
        busy: 'gold',
        offline: 'gray'
    } as const;

    const activeRiders = riders.filter(r => r.isActive !== false);
    const pendingRiders = riders.filter(r => r.isActive === false);

    return (
        <AdminLayout title="Riders">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isDark ? 'bg-[#7C3AED]/10 border-[#7C3AED]/20' : 'bg-[#7C3AED]/5 border-[#7C3AED]/10'
                        }`}>
                        <Users className="w-6 h-6 text-[#7C3AED]" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Rider Management</p>
                        <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{activeRiders.length} Active • {pendingRiders.length} Pending</h3>
                    </div>
                </div>
                <Button
                    variant="primary"
                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xl shadow-[#7C3AED]/20 transition-all active:scale-95"
                    onClick={() => setIsAddingRider(true)}
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    Add Rider
                </Button>
            </div>

            {/* Pending Riders */}
            {pendingRiders.length > 0 && (
                <div className="mb-10">
                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-[#FCD34D]' : 'text-yellow-600'}`}>
                        Pending Activation ({pendingRiders.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingRiders.map(rider => (
                            <Card key={rider.id} className={`p-5 border-2 border-dashed ${isDark ? 'bg-[#222222] border-[#FCD34D]/30' : 'bg-white border-yellow-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${isDark ? 'bg-[#2A2A2A] text-[#FCD34D]' : 'bg-yellow-50 text-yellow-600'}`}>
                                            {rider.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.name}</p>
                                            <p className={`text-xs ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{rider.phone} • {rider.dept}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleActivateToggle(rider)}
                                        className="px-4 py-2 rounded-lg font-bold text-[10px] uppercase bg-[#10B981] hover:bg-[#059669] text-white"
                                    >
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        Activate
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Riders */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {activeRiders.map((rider) => {
                    const riderOrders = orders.filter(o => o.assignedRiderId === rider.id);
                    const todayStr = new Date().toLocaleDateString();
                    const completedToday = riderOrders.filter(o => {
                        const orderDate = o.updatedAt?.seconds
                            ? new Date(o.updatedAt.seconds * 1000).toLocaleDateString()
                            : new Date(o.updatedAt).toLocaleDateString();
                        return o.status === 'DELIVERED' && orderDate === todayStr;
                    }).length;

                    return (
                        <Card key={rider.id} className={`p-6 border transition-all hover:shadow-xl ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'
                            }`}>
                            <div className="flex items-start justify-between mb-6">
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
                                        {rider.status === 'available' ? 'Online' : 'Offline'}
                                    </Badge>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Deliveries Today</p>
                                    <p className={`text-xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{completedToday}</p>
                                </div>
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Earnings Today</p>
                                    <p className={`text-xl font-black text-[#10B981]`}>₦{(completedToday * 300).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <Phone className="w-4 h-4 text-[#7C3AED]" />
                                <span className={`text-xs font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.phone}</span>
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => handleActivateToggle(rider)}
                                className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                            >
                                Deactivate
                            </Button>
                        </Card>
                    );
                })}
            </div>

            {/* Hostel Rider Assignment */}
            <div>
                <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Hostel Rider Assignment</h2>
                <div className="grid gap-4">
                    {hostels.map(hostel => (
                        <Card key={hostel.id} className={`${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex-1">
                                    <h4 className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{hostel.name}</h4>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {/* Default Rider */}
                                    <div className="space-y-1">
                                        <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                            <UserCheck className="w-3 h-3 inline mr-1" />
                                            Default Rider
                                        </label>
                                        <select
                                            className={`w-full sm:w-48 text-sm font-bold p-3 rounded-xl border ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6]' : 'bg-gray-50 border-gray-100'}`}
                                            value={hostel.defaultRiderId || ''}
                                            onChange={(e) => handleAssignDefaultRider(hostel.id, e.target.value)}
                                        >
                                            <option value="">— None —</option>
                                            {activeRiders.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Assistant Rider */}
                                    <div className="space-y-1">
                                        <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                            <UserPlus className="w-3 h-3 inline mr-1" />
                                            Assistant Rider
                                        </label>
                                        <select
                                            className={`w-full sm:w-48 text-sm font-bold p-3 rounded-xl border ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6]' : 'bg-gray-50 border-gray-100'}`}
                                            value={hostel.assistantRiderId || ''}
                                            onChange={(e) => handleAssignAssistantRider(hostel.id, e.target.value)}
                                        >
                                            <option value="">— None —</option>
                                            {activeRiders.filter(r => r.id !== hostel.defaultRiderId).map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Add Rider Modal */}
            {isAddingRider && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-all" onClick={() => setIsAddingRider(false)}></div>
                    <Card className={`relative w-full max-w-lg p-0 border-none shadow-3xl overflow-hidden rounded-[2.5rem] animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'
                        }`}>
                        <div className="p-10 bg-[#7C3AED] text-white">
                            <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Add Rider</h2>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-2">New riders start as pending until activated</p>
                        </div>
                        <div className="p-10 space-y-6">
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
                                <label className={`text-[10px] font-black uppercase tracking-[0.3em] ml-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Phone</label>
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
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-[0.3em] ml-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Department</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Science"
                                    className={`w-full rounded-2xl px-6 py-4 outline-none border-2 transition-all font-bold text-sm ${isDark
                                        ? 'bg-[#222222] border-[#333333] text-[#FAF9F6] focus:border-[#7C3AED]'
                                        : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#7C3AED]'
                                        }`}
                                    onChange={(e) => setNewRider(prev => ({ ...prev, dept: e.target.value }))}
                                    value={newRider.dept}
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
                                    Submit
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </AdminLayout>
    );
}
