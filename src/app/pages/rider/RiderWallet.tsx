import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { ArrowLeft, Wallet, Gift, Clock, TrendingUp, CheckCircle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { 
    getRiderById, 
    Rider, 
    subscribeToRiderDailyEarnings, 
    subscribeToRiderWeeklyStats,
    RiderDailyEarnings,
    RiderWeeklyStats,
    getIsoWeek,
    claimRiderBonus,
    subscribeToRiderBonusClaims,
    BonusClaim
} from '../../../services/db';
import { BankDetailsModal } from '../../components/BankDetailsModal';

export default function RiderWallet() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { riderTheme } = useTheme();
    const isDark = riderTheme === 'dark';

    const [activeTab, setActiveTab] = useState<'earnings' | 'incentives'>('earnings');
    const [rider, setRider] = useState<Rider | null>(null);
    const [dailyEarnings, setDailyEarnings] = useState<RiderDailyEarnings[]>([]);
    const [weeklyStats, setWeeklyStats] = useState<RiderWeeklyStats | null>(null);
    const [claims, setClaims] = useState<BonusClaim[]>([]);
    const [showBankModal, setShowBankModal] = useState(false);
    const [loadingClaim, setLoadingClaim] = useState(false);

    const now = new Date();
    const currentWeekId = getIsoWeek(now);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            const data = await getRiderById(user.uid);
            setRider(data);
        };
        load();
        
        const unsubEarnings = subscribeToRiderDailyEarnings(user.uid, setDailyEarnings);
        const unsubStats = subscribeToRiderWeeklyStats(user.uid, currentWeekId, setWeeklyStats);
        const unsubClaims = subscribeToRiderBonusClaims(user.uid, setClaims);

        return () => {
            unsubEarnings();
            unsubStats();
            unsubClaims();
        };
    }, [user, currentWeekId]);

    const handleClaim = async (type: 'REFUEL_DECK' | 'REFUEL_DECK_PLUS') => {
        if (!rider) return;
        setLoadingClaim(true);
        try {
            await claimRiderBonus(rider.id, rider.name, type, currentWeekId);
            alert(`Sweet! You've successfully claimed the ${type.replace(/_/g, ' ')} bonus. An admin will process it shortly.`);
        } catch (err: any) {
            alert(err.message || 'Failed to claim bonus. Try again.');
        } finally {
            setLoadingClaim(false);
        }
    };

    // Calculate Eligibility
    const stats = weeklyStats || { totalDeliveries: 0, activeDays: 0, dailyTrips: {}, completedOrderIds: [] };
    const tripsArray = Object.values(stats.dailyTrips);
    const daysWith3PlusTrips = tripsArray.filter(t => t >= 3).length;

    // Refuel Deck: 130-150 deliveries, 5 active days, 3+ trips/day
    const canClaimRefuelDeck = stats.totalDeliveries >= 130 && stats.activeDays >= 5 && daysWith3PlusTrips >= 5;
    
    // Refuel Deck Plus: 180-200 deliveries, 6 active days, 3-4 trips daily
    const canClaimRefuelDeckPlus = stats.totalDeliveries >= 180 && stats.activeDays >= 6 && daysWith3PlusTrips >= 6;

    const hasClaimedThisWeek = claims.some(c => c.weekId === currentWeekId);

    const tabClass = (tab: typeof activeTab) => `
        flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all
        ${activeTab === tab 
            ? (isDark ? 'bg-[#2A2A2A] text-[#FAF9F6] shadow-sm' : 'bg-white text-gray-900 shadow-sm border border-gray-100') 
            : (isDark ? 'text-[#9C8F7F] hover:bg-[#222222]' : 'text-gray-500 hover:bg-gray-100')}
    `;

    return (
        <div className={`min-h-screen pb-24 md:pb-8 transition-colors ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
            {rider && (
                <BankDetailsModal 
                    isOpen={showBankModal} 
                    onClose={() => setShowBankModal(false)} 
                    rider={rider} 
                />
            )}

            <header className={`sticky top-0 backdrop-blur-xl border-b z-40 ${isDark ? 'bg-[#0F0F0F]/90 border-[#222222]' : 'bg-[#FAF9F6]/90 border-gray-200'}`}>
                <div className="px-5 py-4 flex items-center justify-between mx-auto max-w-2xl">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/rider')} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDark ? 'bg-[#1A1A1A] hover:bg-[#222222] text-[#9C8F7F]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <h1 className={`text-xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Wallet & Incentives</h1>
                    </div>
                </div>
            </header>

            <main className="p-5 space-y-6 max-w-2xl mx-auto">
                {/* Total Earnings Card */}
                <Card className={`relative overflow-hidden p-6 border-2 shadow-2xl ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] border-transparent text-white'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-[#9C8F7F]' : 'text-white/70'}`}>Lifetime Earnings</p>
                        <h2 className={`text-5xl font-black tracking-tighter ${isDark ? 'text-[#10B981]' : 'text-white'}`}>
                            <span className="text-2xl mr-1 opacity-70">₦</span>
                            {(rider?.earnings || 0).toLocaleString()}
                        </h2>

                        <div className={`mt-6 w-full flex items-center justify-between p-4 rounded-2xl ${isDark ? 'bg-[#222222]' : 'bg-white/10 backdrop-blur-sm'}`}>
                            <div className="flex items-center gap-3 text-left">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#10B981]/10' : 'bg-white/20'}`}>
                                    <ShieldAlert className={`w-5 h-5 ${isDark ? 'text-[#10B981]' : 'text-white'}`} />
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-white/60'}`}>Payout Bank</p>
                                    <p className={`font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-white'}`}>{rider?.bankName || 'Not Set'}</p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowBankModal(true)}
                                className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'bg-[#333333] hover:bg-[#444444] text-[#FAF9F6]' : 'bg-white text-[#7C3AED] hover:bg-gray-50'}`}
                            >
                                Edit
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Tabs */}
                <div className={`flex p-1.5 rounded-2xl ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
                    <button className={tabClass('earnings')} onClick={() => setActiveTab('earnings')}>
                        <Wallet className="w-4 h-4" /> Earnings
                    </button>
                    <button className={tabClass('incentives')} onClick={() => setActiveTab('incentives')}>
                        <Gift className="w-4 h-4" /> Incentives
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'earnings' ? (
                    <div className="space-y-4">
                        <h3 className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Daily Breakdown</h3>
                        {dailyEarnings.length > 0 ? dailyEarnings.map(day => (
                            <div key={day.date} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                                        <TrendingUp className={`w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
                                    </div>
                                    <div>
                                        <p className={`font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </p>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-[#7C3AED]' : 'text-purple-600'}`}>{day.totalDeliveries} Deliveries</p>
                                    </div>
                                </div>
                                <h4 className={`text-xl font-black ${isDark ? 'text-[#10B981]' : 'text-[#059669]'}`}>₦{day.totalEarned.toLocaleString()}</h4>
                            </div>
                        )) : (
                            <div className={`text-center py-10 border-2 border-dashed rounded-2xl ${isDark ? 'border-[#222222] text-[#9C8F7F]' : 'border-gray-200 text-gray-400'}`}>
                                <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                <p className="text-xs font-bold uppercase tracking-widest">No earnings data yet</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
                            <h3 className={`text-base font-black tracking-tight mb-4 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>This Week's Progress <span className="text-xs text-gray-400 ml-2 font-medium">({currentWeekId})</span></h3>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Deliveries</p>
                                    <p className={`text-2xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{stats.totalDeliveries}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#222222]' : 'bg-gray-50'}`}>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Active Days</p>
                                    <p className={`text-2xl font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{stats.activeDays}/7</p>
                                </div>
                            </div>
                            
                            {hasClaimedThisWeek && (
                                <div className={`mt-4 p-3 rounded-xl flex items-center justify-between border ${isDark ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="text-xs font-black uppercase tracking-widest">Bonus Claimed</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-green-600/70">This Week</span>
                                </div>
                            )}
                        </div>

                        {/* REFUEL DECK */}
                        <Card className={`relative overflow-hidden border-2 ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-blue-100'} ${hasClaimedThisWeek ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
                            <div className="p-6 relative z-10">
                                <Badge variant="blue" className="text-[9px] font-black uppercase tracking-[0.2em] mb-4">Tier 1</Badge>
                                <h3 className={`text-2xl font-black tracking-tight mb-2 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Refuel Deck</h3>
                                <ul className={`text-sm space-y-1 mb-6 font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>
                                    <li>• 2 portions Rice + 1 medium fish</li>
                                    <li>• 1 bottle of water</li>
                                    <li>• ₦1,000 data bonus</li>
                                </ul>
                                
                                <div className="space-y-3 mb-6">
                                    {/* Progress bars */}
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5 text-gray-400">
                                            <span>Deliveries</span>
                                            <span>{stats.totalDeliveries} / 130</span>
                                        </div>
                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.totalDeliveries / 130) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5 text-gray-400">
                                            <span>Active Days (3+ Trips/Day)</span>
                                            <span>{daysWith3PlusTrips} / 5</span>
                                        </div>
                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (daysWith3PlusTrips / 5) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => handleClaim('REFUEL_DECK')} 
                                    disabled={!canClaimRefuelDeck || loadingClaim} 
                                    className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] ${canClaimRefuelDeck ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400'}`}
                                >
                                    {canClaimRefuelDeck ? 'Claim Reward' : 'Locked'}
                                </Button>
                            </div>
                        </Card>

                        {/* REFUEL DECK PLUS */}
                        <Card className={`relative overflow-hidden border-2 ${isDark ? 'bg-[#1A1A1A] border-[#FCD34D]/30 shadow-lg shadow-[#FCD34D]/5' : 'bg-gradient-to-b from-amber-50 to-white border-amber-200'} ${hasClaimedThisWeek ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
                            <div className="p-6 relative z-10">
                                <Badge variant="warning" className="text-[9px] font-black uppercase tracking-[0.2em] mb-4">Ultimate Tier</Badge>
                                <h3 className={`text-2xl font-black tracking-tight mb-2 text-amber-500`}>Refuel Deck Plus</h3>
                                <ul className={`text-sm space-y-1 mb-6 font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>
                                    <li>• 2 portions Rice + 1 tail fish</li>
                                    <li>• 1 drink (Fanta/Coke/Pepsi)</li>
                                    <li>• ₦1,500 data bonus</li>
                                </ul>
                                
                                <div className="space-y-3 mb-6">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5 text-gray-400">
                                            <span>Deliveries</span>
                                            <span>{stats.totalDeliveries} / 180</span>
                                        </div>
                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#333333]' : 'bg-amber-100'}`}>
                                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, (stats.totalDeliveries / 180) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5 text-gray-400">
                                            <span>Active Days (3+ Trips/Day)</span>
                                            <span>{daysWith3PlusTrips} / 6</span>
                                        </div>
                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#333333]' : 'bg-amber-100'}`}>
                                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, (daysWith3PlusTrips / 6) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => handleClaim('REFUEL_DECK_PLUS')} 
                                    disabled={!canClaimRefuelDeckPlus || loadingClaim} 
                                    className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transform transition-transform border-b-4 ${canClaimRefuelDeckPlus ? 'bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-300 active:translate-y-1 active:border-b-0' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
                                >
                                    {canClaimRefuelDeckPlus ? 'Claim Ultimate Reward' : 'Locked'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
