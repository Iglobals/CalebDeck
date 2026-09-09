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
    Hash,
    ChevronDown,
    ChevronUp,
    Package,
    Clock
} from 'lucide-react';
import {
    subscribeToRiders,
    getRecentOrderHistory,
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
    markBonusClaimSorted,
    markRiderPaidOut
} from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function RiderManagement() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [claims, setClaims] = useState<BonusClaim[]>([]);
    const [activeTab, setActiveTab] = useState<'riders' | 'assignment' | 'bonuses'>('riders');
    const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
    const [isEditingRate, setIsEditingRate] = useState<'normal' | 'combo' | 'group' | 'mart' | 'premium_delivery' | 'premium_solo_rider' | 'premium_combo_rider' | 'premium_group_rider' | null>(null);
    const [newRate, setNewRate] = useState('');
    const [savingRate, setSavingRate] = useState(false);
    const { adminTheme } = useTheme();
    const [expandedRider, setExpandedRider] = useState<string | null>(null);
    const [payoutConfirm, setPayoutConfirm] = useState<{ rider: Rider; amount: number } | null>(null);
    const [payingOut, setPayingOut] = useState(false);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let loaded = { riders: false, orders: false, hostels: false, claims: false };
        let mounted = true;
        const checkDone = () => {
            if (Object.values(loaded).every(v => v)) setIsLoading(false);
        };

        const unsubRiders = subscribeToRiders(data => { setRiders(data); loaded.riders = true; checkDone(); });
        getRecentOrderHistory(30, 250).then(data => {
            if (!mounted) return;
            setOrders(data);
            loaded.orders = true;
            checkDone();
        }).catch(error => {
            console.error('RiderManagement order history read failed:', error);
            if (!mounted) return;
            setOrders([]);
            loaded.orders = true;
            checkDone();
        });
        const unsubHostels = subscribeToHostels(data => { setHostels(data); loaded.hostels = true; checkDone(); });
        const unsubSettings = subscribeToPlatformSettings(setPlatformSettings);
        const unsubClaims = subscribeToPendingBonusClaims(data => { setClaims(data); loaded.claims = true; checkDone(); });
        
        return () => { mounted = false; unsubRiders(); unsubHostels(); unsubSettings(); unsubClaims(); };
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

    const handleSaveRate = async (type: 'normal' | 'combo' | 'group' | 'mart' | 'premium_delivery' | 'premium_solo_rider' | 'premium_combo_rider' | 'premium_group_rider') => {
    const rate = parseInt(newRate);
    if (!isNaN(rate) && rate > 0) {
        setSavingRate(true);
        try {
            const key = type === 'normal' ? 'riderRatePerDelivery' 
                      : type === 'combo' ? 'comboRatePerDelivery' 
                      : type === 'group' ? 'groupRatePerDelivery'
                      : type === 'premium_delivery' ? 'premiumDeliveryFee'
                      : type === 'premium_solo_rider' ? 'premiumSoloRiderRate' 
                      : type === 'premium_combo_rider' ? 'premiumComboRiderRate' 
                      : type === 'mart' ? 'martRatePerDelivery' 
                      : 'premiumGroupRiderRate';
            await updatePlatformSettings({ [key]: rate });
        } finally {
            setSavingRate(false);
        }
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

    const handlePayoutRider = async (rider: Rider, amount: number) => {
        setPayingOut(true);
        try {
            await markRiderPaidOut(rider.id, rider.name, amount);
            setPayoutConfirm(null);
        } catch (err: any) {
            alert('Failed to mark payout: ' + (err.message || 'Unknown error'));
        } finally {
            setPayingOut(false);
        }
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
                    {!platformSettings ? (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`p-4 rounded-xl animate-pulse ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                                    <div className={`h-3 w-20 rounded mb-3 ${isDark ? 'bg-[#333333]' : 'bg-gray-200'}`} />
                                    <div className={`h-6 w-16 rounded ${isDark ? 'bg-[#333333]' : 'bg-gray-200'}`} />
                                </div>
                            ))}
                        </div>
                    ) : (
                   <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {/* Normal Rate */}
                        <div className={`p-4 rounded-xl border border-dashed ${isDark ? 'bg-[#333333]/10 border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Rider payout (Solo)</p>
                            {isEditingRate === 'normal' ? (
                                <div className="flex gap-2">
                                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-16 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="300" />
                                    <Button size="sm" variant="primary" onClick={() => handleSaveRate('normal')} disabled={savingRate} className="px-2 rounded-lg text-xs font-bold shadow-md">✓</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-[#10B981]">₦{platformSettings?.riderRatePerDelivery || 300}</h4>
                                    <button onClick={() => { setNewRate((platformSettings?.riderRatePerDelivery || 300).toString()); setIsEditingRate('normal'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Edit</button>
                                </div>
                            )}
                        </div>
                        {/* Combo Rate */}
                        <div className={`p-4 rounded-xl border border-dashed ${isDark ? 'bg-[#333333]/10 border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Rider Payout (Combo)</p>
                            {isEditingRate === 'combo' ? (
                                <div className="flex gap-2">
                                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-16 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="250" />
                                    <Button size="sm" variant="primary" onClick={() => handleSaveRate('combo')} disabled={savingRate} className="px-2 rounded-lg text-xs font-bold shadow-md">✓</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-[#7C3AED]">₦{platformSettings?.comboRatePerDelivery || 250}</h4>
                                    <button onClick={() => { setNewRate((platformSettings?.comboRatePerDelivery || 250).toString()); setIsEditingRate('combo'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Edit</button>
                                </div>
                            )}
                        </div>
                        {/* Group Rate */}
                        <div className={`p-4 rounded-xl border border-dashed ${isDark ? 'bg-[#333333]/10 border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Rider Payout (Group)</p>
                            {isEditingRate === 'group' ? (
                                <div className="flex gap-2">
                                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-16 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="200" />
                                    <Button size="sm" variant="primary" onClick={() => handleSaveRate('group')} disabled={savingRate} className="px-2 rounded-lg text-xs font-bold shadow-md">✓</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-[#F59E0B]">₦{platformSettings?.groupRatePerDelivery || 200}</h4>
                                    <button onClick={() => { setNewRate((platformSettings?.groupRatePerDelivery || 200).toString()); setIsEditingRate('group'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Edit</button>
                                </div>
                            )}
                        </div>
                        {/* Mart Rate */}
                        <div className={`p-4 rounded-xl border border-dashed ${isDark ? 'bg-[#333333]/10 border-[#333]' : 'bg-blue-50 border-blue-200'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-blue-600'}`}>Rider Payout (Mart)</p>
                            {isEditingRate === 'mart' ? (
                                <div className="flex gap-2">
                                    <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-16 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="500" />
                                    <Button size="sm" variant="primary" onClick={() => handleSaveRate('mart')} disabled={savingRate} className="px-2 rounded-lg text-xs font-bold shadow-md">✓</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black text-blue-500">₦{platformSettings?.martRatePerDelivery || 500}</h4>
                                    <button onClick={() => { setNewRate((platformSettings?.martRatePerDelivery || 500).toString()); setIsEditingRate('mart'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-blue-200 text-blue-800 hover:bg-blue-300'}`}>Edit</button>
                                </div>
                            )}
                        </div>
                        {/* Premium Delivery (fee editable in Platform Settings → Fees & Pricing) */}
                        <div className={`p-4 rounded-xl border border-amber-500/30 ${isDark ? 'bg-amber-500/5' : 'bg-amber-50'}`}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>Premium Delivery</p>
                            <div className="flex items-center gap-2">
                                <h4 className="text-lg font-black text-amber-500">₦{platformSettings?.premiumDeliveryFee || 1250}</h4>
                            </div>
                            <p className={`text-[9px] font-bold mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-amber-700/70'}`}>Edit in Platform Settings → Fees & Pricing</p>
                        </div>

{/* Premium Solo Rider Rate */}
<div className={`p-4 rounded-xl border border-amber-500/30 ${isDark ? 'bg-amber-500/5' : 'bg-amber-50'}`}>
    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>Prem Solo Payout</p>
    {isEditingRate === 'premium_solo_rider' ? (
        <div className="flex gap-2">
            <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-16 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="750" />
            <Button size="sm" variant="primary" onClick={() => handleSaveRate('premium_solo_rider')} disabled={savingRate} className="px-2 rounded-lg text-xs font-bold shadow-md">✓</Button>
        </div>
    ) : (
        <div className="flex items-center gap-2">
            <h4 className="text-lg font-black text-amber-500">₦{platformSettings?.premiumSoloRiderRate || 750}</h4>
            <button onClick={() => { setNewRate((platformSettings?.premiumSoloRiderRate || 750).toString()); setIsEditingRate('premium_solo_rider'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}>Edit</button>
        </div>
    )}
</div>

{/* Premium Combo Rider Rate */}
<div className={`p-4 rounded-xl border border-amber-500/30 ${isDark ? 'bg-amber-500/5' : 'bg-amber-50'}`}>
    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>Prem Combo Payout</p>
    {isEditingRate === 'premium_combo_rider' ? (
        <div className="flex gap-2">
            <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-16 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="600" />
            <Button size="sm" variant="primary" onClick={() => handleSaveRate('premium_combo_rider')} disabled={savingRate} className="px-2 rounded-lg text-xs font-bold shadow-md">✓</Button>
        </div>
    ) : (
        <div className="flex items-center gap-2">
            <h4 className="text-lg font-black text-amber-500">₦{platformSettings?.premiumComboRiderRate || 600}</h4>
            <button onClick={() => { setNewRate((platformSettings?.premiumComboRiderRate || 600).toString()); setIsEditingRate('premium_combo_rider'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}>Edit</button>
        </div>
    )}
</div>

{/* Premium Group Rider Rate */}
<div className={`p-4 rounded-xl border border-amber-500/30 ${isDark ? 'bg-amber-500/5' : 'bg-amber-50'}`}>
    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>Prem Group Payout</p>
    {isEditingRate === 'premium_group_rider' ? (
        <div className="flex gap-2">
            <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={`w-16 text-sm font-bold p-2 rounded-lg border ${isDark ? 'bg-[#0F0F0F] border-[#333333] text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-900'}`} placeholder="600" />
            <Button size="sm" variant="primary" onClick={() => handleSaveRate('premium_group_rider')} disabled={savingRate} className="px-2 rounded-lg text-xs font-bold shadow-md">✓</Button>
        </div>
    ) : (
        <div className="flex items-center gap-2">
            <h4 className="text-lg font-black text-amber-500">₦{platformSettings?.premiumGroupRiderRate || 600}</h4>
            <button onClick={() => { setNewRate((platformSettings?.premiumGroupRiderRate || 600).toString()); setIsEditingRate('premium_group_rider'); }} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6] hover:bg-[#444444]' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}>Edit</button>
        </div>
    )}
</div>
</div>
 )}
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
                                                {(rider.earnings || 0) > 0 && (
                                                    <button
                                                        onClick={() => setPayoutConfirm({ rider, amount: rider.earnings || 0 })}
                                                        className={`mt-2 w-full py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all ${isDark ? 'bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 border border-[#10B981]/20' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}
                                                    >
                                                        ✓ Mark Sorted
                                                    </button>
                                                )}
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

                                        {/* Order History Toggle */}
                                        <button
                                            onClick={() => setExpandedRider(expandedRider === rider.id ? null : rider.id)}
                                            className={`w-full mb-4 p-3 rounded-xl border flex items-center justify-between transition-all ${
                                                expandedRider === rider.id
                                                    ? isDark ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30' : 'bg-purple-50 border-purple-200'
                                                    : isDark ? 'bg-[#1A1A1A] border-[#333333] hover:border-[#444444]' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Package className={`w-4 h-4 ${expandedRider === rider.id ? 'text-[#7C3AED]' : isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${expandedRider === rider.id ? 'text-[#7C3AED]' : isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                    Today's Orders ({riderOrders.filter(o => { const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : new Date(o.createdAt).toLocaleDateString(); return d === todayStr; }).length})
                                                </span>
                                            </div>
                                            {expandedRider === rider.id ? <ChevronUp className="w-4 h-4 text-[#7C3AED]" /> : <ChevronDown className={`w-4 h-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />}
                                        </button>

                                        {/* Expanded Order History */}
                                        {expandedRider === rider.id && (
                                            <div className={`mb-4 rounded-xl border overflow-hidden ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
                                                {(() => { const todayOrders = riderOrders.filter(o => { const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : new Date(o.createdAt).toLocaleDateString(); return d === todayStr; }); return todayOrders.length === 0 ? (
                                                    <div className={`p-8 text-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                                                        <Package className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-[#333333]' : 'text-gray-300'}`} />
                                                        <p className={`text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>No orders today</p>
                                                    </div>
                                                ) : (
                                                    <div className={`max-h-[280px] overflow-y-auto ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
                                                        {todayOrders
                                                            .sort((a: any, b: any) => {
                                                                const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
                                                                const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
                                                                return (dateB || 0) - (dateA || 0);
                                                            })
                                                            .map((order: any, idx: number) => {
                                                                const orderDate = order.createdAt?.seconds
                                                                    ? new Date(order.createdAt.seconds * 1000)
                                                                    : new Date(order.createdAt);
                                                                const isCombo = order.type === 'combo';
                                                                const isGroup = order.deliveryMode === 'group' || order.deliveryMode === 'GROUP';
                                                                const isDelivered = order.status === 'DELIVERED';

                                                                return (
                                                                    <div
                                                                        key={order.id}
                                                                        className={`px-4 py-3 flex flex-col gap-2 ${
                                                                            idx !== todayOrders.length - 1
                                                                                ? isDark ? 'border-b border-[#222222]' : 'border-b border-gray-50'
                                                                                : ''
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className={`text-xs font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                                                                                    {order.fullName || order.studentName || 'Student'}
                                                                                </span>
                                                                                <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                                                                                    CD-{order.orderId?.slice(-5) || order.id?.slice(-5)}
                                                                                </span>
                                                                                {isCombo && <Badge variant="purple" className="text-[8px] font-black uppercase px-1.5 py-0.5">Combo</Badge>}
                                                                                {isGroup && <Badge variant="gold" className="text-[8px] font-black uppercase px-1.5 py-0.5">Group</Badge>}
                                                                                {!isCombo && !isGroup && <Badge variant="gray" className="text-[8px] font-black uppercase px-1.5 py-0.5">Plate</Badge>}
                                                                            </div>
                                                                            <Badge
                                                                                variant={isDelivered ? 'green' : order.status === 'ON_THE_WAY' ? 'gold' : 'purple'}
                                                                                className="text-[8px] font-black uppercase px-1.5 py-0.5"
                                                                            >
                                                                                {isDelivered ? 'Delivered' : order.status?.replace(/_/g, ' ') || 'Pending'}
                                                                            </Badge>
                                                                        </div>

                                                                        <div className={`text-[11px] leading-relaxed ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                                                            {isCombo ? (
                                                                                <span>
                                                                                    <span className="font-bold">{order.comboName}</span> × {order.quantity || 1}
                                                                                    {order.comboItems?.length > 0 && (
                                                                                        <span> — {order.comboItems.map((i: any) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.name}`).join(', ')}</span>
                                                                                    )}
                                                                                </span>
                                                                            ) : (
                                                                                <span>
                                                                                    {order.plates?.length || 0} plate{(order.plates?.length || 0) !== 1 ? 's' : ''}
                                                                                    {order.plates?.map((p: any, pi: number) => (
                                                                                        p.items?.length > 0
                                                                                            ? ` [${p.items.map((item: any) => item.item?.name || item.name).join(', ')}]`
                                                                                            : ''
                                                                                    )).filter(Boolean).join('')}
                                                                                    {order.drinksSnacks?.length > 0 && ` + ${order.drinksSnacks.length} extra${order.drinksSnacks.length !== 1 ? 's' : ''}`}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <MapPin className={`w-3 h-3 ${isDark ? 'text-[#666666]' : 'text-gray-300'}`} />
                                                                                <span className={`text-[10px] font-bold ${isDark ? 'text-[#666666]' : 'text-gray-400'}`}>
                                                                                    {order.hostelName || order.hostel || '—'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-[10px] font-black text-[#10B981]">₦{(order.total || 0).toLocaleString()}</span>
                                                                                <div className="flex items-center gap-1">
                                                                                    <Clock className={`w-3 h-3 ${isDark ? 'text-[#666666]' : 'text-gray-300'}`} />
                                                                                    <span className={`text-[10px] font-bold ${isDark ? 'text-[#666666]' : 'text-gray-400'}`}>
                                                                                        {!isNaN(orderDate.getTime()) ? orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + orderDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                ); })()}
                                            </div>
                                        )}

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

            {/* Payout Confirmation Modal */}
            {payoutConfirm && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !payingOut && setPayoutConfirm(null)}></div>
                    <div className={`relative w-full max-w-sm rounded-3xl p-8 shadow-2xl ${isDark ? 'bg-[#222222]' : 'bg-white'}`}>
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-7 h-7 text-[#10B981]" />
                            </div>
                            <h3 className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Confirm Payout
                            </h3>
                            <p className={`text-sm mt-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                                You are about to mark <strong className={isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}>{payoutConfirm.rider.name}</strong>'s earnings as paid.
                            </p>
                        </div>

                        <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Amount</span>
                                <span className="text-2xl font-black text-[#10B981]">₦{payoutConfirm.amount.toLocaleString()}</span>
                            </div>
                            {payoutConfirm.rider.bankName && (
                                <div className={`pt-3 border-t text-xs ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-200 text-gray-500'}`}>
                                    <p>{payoutConfirm.rider.bankName} • {payoutConfirm.rider.accountNumber}</p>
                                    <p className="font-bold mt-0.5">{payoutConfirm.rider.accountName}</p>
                                </div>
                            )}
                        </div>

                        <p className={`text-[10px] text-center mb-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                            This will reset their earnings to ₦0 and record the payout.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handlePayoutRider(payoutConfirm.rider, payoutConfirm.amount)}
                                disabled={payingOut}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#10B981] text-white hover:bg-[#059669] transition-all disabled:opacity-50"
                            >
                                {payingOut ? 'Processing...' : `Confirm — Paid ₦${payoutConfirm.amount.toLocaleString()}`}
                            </button>
                            <button
                                onClick={() => setPayoutConfirm(null)}
                                disabled={payingOut}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${isDark ? 'text-[#9C8F7F] hover:bg-[#2A2A2A]' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
