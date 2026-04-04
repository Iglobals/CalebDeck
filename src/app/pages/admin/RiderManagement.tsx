import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
    Users,
    Phone,
    Star,
    UserCheck,
    UserPlus,
    MapPin,
    Trash2,
    Gift,
    CheckCircle,
    Copy,
    Building,
    Hash
} from 'lucide-react';
import {
    subscribeToRiders,
    subscribeToOrderHistory,
    subscribeToHostels,
    updateRider,
    deleteRider,
    assignHostelRiders,
    Rider,
    Hostel,
    PlatformSettings,
    subscribeToPlatformSettings,
    updatePlatformSettings,
    BonusClaim,
    subscribeToPendingBonusClaims,
    markBonusClaimSorted
} from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function RiderManagement() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [claims, setClaims] = useState<BonusClaim[]>([]);
    const [activeTab, setActiveTab] = useState<'riders' | 'assignment' | 'bonuses'>('riders');
    const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
    const [isEditingRate, setIsEditingRate] = useState<'normal' | 'combo' | 'group' | null>(null);
    const [newRate, setNewRate] = useState('');
    const { adminTheme } = useTheme();

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let loaded = { riders: false, orders: false, hostels: false, claims: false };
        const checkDone = () => {
            if (Object.values(loaded).every(v => v)) setIsLoading(false);
        };

        const unsubRiders = subscribeToRiders(data => { setRiders(data); loaded.riders = true; checkDone(); });
        const unsubOrders = subscribeToOrderHistory(data => { setOrders(data); loaded.orders = true; checkDone(); });
        const unsubHostels = subscribeToHostels(data => { setHostels(data); loaded.hostels = true; checkDone(); });
        const unsubSettings = subscribeToPlatformSettings(setPlatformSettings);
        const unsubClaims = subscribeToPendingBonusClaims(data => { setClaims(data); loaded.claims = true; checkDone(); });
        
        return () => { unsubRiders(); unsubOrders(); unsubHostels(); unsubSettings(); unsubClaims(); };
    }, []);

    const isDark = adminTheme === 'dark';

    const handleStatusToggle = async (rider: Rider) => {
        const next = rider.status === 'available' ? 'offline' : 'available';
        await updateRider(rider.id, { status: next });
    };

    const handleActivateToggle = async (rider: Rider) => {
        await updateRider(rider.id, { isActive: !rider.isActive });
    };

    const handleDeleteRider = async (rider: Rider) => {
        if (!confirm(`Delete rider "${rider.name}"? This cannot be undone.`)) return;
        await deleteRider(rider.id);
    };

    const handleAssignDefaultRider = async (hostelId: string, riderId: string) => {
        const hostel = hostels.find(h => h.id === hostelId);
        await assignHostelRiders(hostelId, riderId || null, hostel?.assistantRiderId || null);
    };

    const handleAssignAssistantRider = async (hostelId: string, riderId: string) => {
        const hostel = hostels.find(h => h.id === hostelId);
        await assignHostelRiders(hostelId, hostel?.defaultRiderId || null, riderId || null);
    };

    const handleSaveRate = async (type: 'normal' | 'combo' | 'group') => {
        const rate = parseInt(newRate);
        if (!isNaN(rate) && rate > 0) {
            const key = type === 'normal' ? 'riderRatePerDelivery' : type === 'combo' ? 'comboRatePerDelivery' : 'groupRatePerDelivery';
            await updatePlatformSettings({ [key]: rate });
        }
        setIsEditingRate(null);
    };

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (text: string, riderId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(riderId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSortClaim = async (claimId: string) => {
        await markBonusClaimSorted(claimId);
    };

    const statusColors = { available: 'green', busy: 'gold', offline: 'gray' } as const;

    const activeRiders = riders.filter(r => r.isActive !== false);
    const pendingRiders = riders.filter(r => r.isActive === false);
    const todayStr = new Date().toLocaleDateString();

    const tabClass = (tab: string) =>
        `px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === tab
            ? isDark ? 'bg-[#7C3AED] text-white' : 'bg-[#7C3AED] text-white'
            : isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`;

    return (
        <AdminLayout title="Riders">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isDark ? 'bg-[#7C3AED]/10 border-[#7C3AED]/20' : 'bg-[#7C3AED]/5 border-[#7C3AED]/10'}`}>
                        <Users className="w-6 h-6 text-[#7C3AED]" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Rider Management</p>
                        <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{activeRiders.length} Active • {pendingRiders.length} Pending</h3>
                    </div>
                </div>

                {/* Rider Earnings Rate Config */}
                <Card className={`${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Normal Rate */}
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Normal Plate</p>
                            {isEditingRate === 'normal' ? (
                                <div className="flex gap-2">
                                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-20 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="300" />
                                    <Button size="sm" variant="primary" onClick={() => handleSaveRate('normal')} className="px-3 rounded-lg text-xs font-bold shadow-md">Save</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-[#10B981]">₦{platformSettings?.riderRatePerDelivery || 300}</h4>
                                    <button onClick={() => { setNewRate((platformSettings?.riderRatePerDelivery || 300).toString()); setIsEditingRate('normal'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Edit</button>
                                </div>
                            )}
                        </div>
                        {/* Combo Rate */}
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Combo Order</p>
                            {isEditingRate === 'combo' ? (
                                <div className="flex gap-2">
                                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-20 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="250" />
                                    <Button size="sm" variant="primary" onClick={() => handleSaveRate('combo')} className="px-3 rounded-lg text-xs font-bold shadow-md">Save</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-[#7C3AED]">₦{platformSettings?.comboRatePerDelivery || 250}</h4>
                                    <button onClick={() => { setNewRate((platformSettings?.comboRatePerDelivery || 250).toString()); setIsEditingRate('combo'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Edit</button>
                                </div>
                            )}
                        </div>
                        {/* Group Rate */}
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Group Order</p>
                            {isEditingRate === 'group' ? (
                                <div className="flex gap-2">
                                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-20 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="200" />
                                    <Button size="sm" variant="primary" onClick={() => handleSaveRate('group')} className="px-3 rounded-lg text-xs font-bold shadow-md">Save</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-[#F59E0B]">₦{platformSettings?.groupRatePerDelivery || 200}</h4>
                                    <button onClick={() => { setNewRate((platformSettings?.groupRatePerDelivery || 200).toString()); setIsEditingRate('group'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Edit</button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className={`flex gap-2 p-1.5 rounded-2xl mb-8 w-fit flex-wrap ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                <button className={tabClass('riders')} onClick={() => setActiveTab('riders')}>
                    <Users className="w-3.5 h-3.5 inline mr-2" />
                    All Riders
                </button>
                <button className={tabClass('assignment')} onClick={() => setActiveTab('assignment')}>
                    <MapPin className="w-3.5 h-3.5 inline mr-2" />
                    Hostel Assignment
                </button>
                <button className={tabClass('bonuses')} onClick={() => setActiveTab('bonuses')}>
                    <Gift className="w-3.5 h-3.5 inline mr-2" />
                    Bonus Approvals {claims.length > 0 && <span className="ml-2 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[8px]">{claims.length}</span>}
                </button>
            </div>

            {/* Tab Content */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className={`w-12 h-12 border-4 rounded-full animate-spin mb-4 ${isDark ? 'border-[#7C3AED] border-t-transparent' : 'border-purple-600 border-t-transparent'}`} />
                    <p className={`text-sm font-bold tracking-widest uppercase ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Loading Data...</p>
                </div>
            ) : (
                <>
            {activeTab === 'riders' ? (
                <div>
                    {/* Pending Riders */}
                    {pendingRiders.length > 0 && (
                        <div className="mb-8">
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
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleActivateToggle(rider)}
                                                    className="px-4 py-2 rounded-lg font-bold text-[10px] uppercase bg-[#10B981] hover:bg-[#059669] text-white"
                                                >
                                                    <UserCheck className="w-3 h-3 mr-1" />
                                                    Activate
                                                </Button>
                                                <button
                                                    onClick={() => handleDeleteRider(rider)}
                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Riders */}
                    {activeRiders.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeRiders.map((rider) => {
                                const riderOrders = orders.filter(o => o.assignedRiderId === rider.id);
                                const completedToday = riderOrders.filter(o => {
                                    const orderDate = o.updatedAt?.seconds
                                        ? new Date(o.updatedAt.seconds * 1000).toLocaleDateString()
                                        : new Date(o.updatedAt).toLocaleDateString();
                                    return o.status === 'DELIVERED' && orderDate === todayStr;
                                }).length;

                                return (
                                    <Card key={rider.id} className={`p-6 border transition-all hover:shadow-xl ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${isDark ? 'bg-[#2A2A2A] text-[#7C3AED]' : 'bg-gray-50 text-[#7C3AED]'}`}>
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
                                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Earnings</p>
                                                <p className="text-xl font-black text-[#10B981]">₦{(rider.earnings || 0).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mb-4">
                                            <Phone className="w-4 h-4 text-[#7C3AED]" />
                                            <span className={`text-xs font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.phone}</span>
                                        </div>

                                        <div className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-gray-50 border-gray-100'}`}>
                                            <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Payout Details</p>
                                            
                                            {rider.bankName && rider.accountNumber ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{rider.bankName}</span>
                                                            <span className={`text-sm font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.accountNumber}</span>
                                                            <span className={`text-[10px] font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'} mt-1`}>{rider.accountName}</span>
                                                        </div>
                                                        <button onClick={() => handleCopy(rider.accountNumber!, rider.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#333333] hover:bg-[#444444] text-[#FAF9F6]' : 'bg-white hover:bg-gray-100 text-gray-700'}`}>
                                                            {copiedId === rider.id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-red-500 font-bold">Not configured</p>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleActivateToggle(rider)}
                                                className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F] hover:bg-[#2A2A2A]' : 'text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                Deactivate
                                            </Button>
                                            <button
                                                onClick={() => handleDeleteRider(rider)}
                                                className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-[10px]">No active riders yet</p>
                            <p className="text-xs mt-2">Riders sign up at <span className="font-bold text-[#7C3AED]">/rider/signup</span></p>
                        </div>
                    )}
                </div>
            ) : activeTab === 'assignment' ? (
                /* Hostel Assignment Tab */
                <div className="space-y-4">
                    {hostels.length > 0 ? hostels.map(hostel => (
                        <Card key={hostel.id} className={`${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
                            <div className="flex flex-col md:flex-row md:items-center gap-5">
                                <div className="flex-1">
                                    <h4 className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{hostel.name}</h4>
                                    <p className={`text-xs mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                        {hostel.defaultRiderId
                                            ? `Default: ${activeRiders.find(r => r.id === hostel.defaultRiderId)?.name || 'Unknown'}`
                                            : 'No default rider assigned'}
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {/* Default Rider */}
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                            <UserCheck className="w-3 h-3" />
                                            Default Rider
                                        </label>
                                        <select
                                            className={`w-full sm:w-52 text-sm font-bold p-3 rounded-xl border ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6]' : 'bg-gray-50 border-gray-100'}`}
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
                                    <div className="space-y-1.5">
                                        <label className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                            <UserPlus className="w-3 h-3" />
                                            Assistant Rider
                                        </label>
                                        <select
                                            className={`w-full sm:w-52 text-sm font-bold p-3 rounded-xl border ${isDark ? 'bg-[#2A2A2A] border-[#333333] text-[#FAF9F6]' : 'bg-gray-50 border-gray-100'}`}
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
                    )) : (
                        <div className={`p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
                            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-[10px]">No hostels configured</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Bonuses Tab */
                <div className="space-y-4">
                    <h3 className={`text-lg font-black tracking-tight mb-4 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Pending Bonus Claims</h3>
                    {claims.length > 0 ? claims.map(claim => (
                        <Card key={claim.id} className={`${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-blue-100'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${claim.rewardType === 'REFUEL_DECK_PLUS' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className={`text-lg font-black uppercase ${claim.rewardType === 'REFUEL_DECK_PLUS' ? 'text-amber-500' : 'text-blue-500'}`}>
                                            {claim.rewardType.replace(/_/g, ' ')}
                                        </h4>
                                        <div className={`text-xs font-bold flex items-center gap-2 mt-1 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                                            <span>Rider: {claim.riderName}</span>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-gray-500">Week: {claim.weekId}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    variant="primary"
                                    onClick={() => handleSortClaim(claim.id)}
                                    className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] bg-[#10B981] hover:bg-[#059669] text-white shadow-lg"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2 inline" /> Mark Sorted
                                </Button>
                            </div>
                        </Card>
                    )) : (
                        <div className={`p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
                            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20 text-[#10B981]" />
                            <p className="font-black uppercase tracking-widest text-[10px]">All caught up!</p>
                            <p className="text-xs mt-2">No pending bonus claims to process.</p>
                        </div>
                    )}
                </div>
            )}
            </>
            )}
        </AdminLayout>
    );
}
