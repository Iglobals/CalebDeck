import React, { useState, useEffect } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import {
  Package, MapPin, CheckCircle, Clock, Truck,
  DollarSign, TrendingUp, ChevronRight, Bell, LogOut, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigate } from 'react-router';
import {
  subscribeToRiderOrders,
  subscribeToBatches,
  updateRider,
  getRiderById,
  Rider,
  Batch,
  PlatformSettings,
  subscribeToPlatformSettings
} from '../../../services/db';
import { NotificationPanel } from '../../components/NotificationPanel';
import { requestNotificationPermissionAndSaveToken, onForegroundMessage } from '../../../services/messaging';

export default function RiderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { riderTheme, toggleRiderTheme } = useTheme();
  const [rider, setRider] = useState<Rider | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [riderStatus, setRiderStatus] = useState<'available' | 'offline'>('offline');
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const isDark = riderTheme === 'dark';

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadRider = async () => {
      const riderData = await getRiderById(user.uid);
      if (riderData) {
        setRider(riderData);
        setRiderStatus(riderData.status === 'available' ? 'available' : 'offline');
      }
    };
    loadRider();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToRiderOrders(user.uid, setOrders);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToBatches(user.uid, setBatches);
    return unsub;
  }, [user]);

  useEffect(() => {
    // Listen for foreground pushes
    const unsub = onForegroundMessage((payload) => {
      console.log("Foreground Rider Push Received:", payload);
    });
    return () => unsub();
  }, []);

  const handleStatusToggle = async () => {
    if (!user) return;
    const newStatus = riderStatus === 'available' ? 'offline' : 'available';
    setRiderStatus(newStatus);
    await updateRider(user.uid, { status: newStatus });

    if (newStatus === 'available') {
      requestNotificationPermissionAndSaveToken(user.uid, 'riders');
    }
  };

  const todayStr = new Date().toLocaleDateString();
  const todayOrders = orders.filter(o => {
    const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : o.createdAt ? new Date(o.createdAt) : null;
    return d ? d.toLocaleDateString() === todayStr : false;
  });

  const deliveredOrders = todayOrders.filter(o => o.status === 'DELIVERED');

  // Filter for active batches assigned to this rider
  const activeBatches = batches.filter(b => b.status === 'OUT_FOR_DELIVERY');

  const riderRate = platformSettings?.riderRatePerDelivery || 300;

  const getOrderEarnings = (o: any) => {
    const platesCount = o.plates?.length || 1;
    const rate = (o.deliveryMode === 'group' || o.deliveryMode === 'GROUP') ? 250 : 350;
    const earning = platesCount * rate;
    return o.isEmergency ? earning * 1.5 : earning;
  };

  const todayEarnings = deliveredOrders.reduce((acc, o) => acc + getOrderEarnings(o), 0);
  const isNotActivated = rider && rider.isActive === false;

  return (
    <div className={`min-h-screen pb-24 md:pb-8 transition-colors ${isDark ? 'bg-[#0F0F0F]' : 'bg-[#FAF9F6]'}`}>
      {/* Mobile Top Nav */}
      <header className={`sticky top-0 backdrop-blur-xl border-b z-40 md:hidden ${isDark ? 'bg-[#0F0F0F]/90 border-[#222222]' : 'bg-[#FAF9F6]/90 border-gray-200'}`}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Dashboard</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Welcome, {rider?.name?.split(' ')[0] || 'Rider'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleRiderTheme} className={`w-10 h-10 rounded-full border flex items-center justify-center relative ${isDark ? 'bg-[#1A1A1A] border-[#222222] text-[#9C8F7F]' : 'bg-white border-gray-200 text-gray-500 shadow-sm'}`}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationPanel />
          </div>
        </div>
      </header>

      <main className="p-5 space-y-6 max-w-4xl mx-auto">
        <div className="hidden md:flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Welcome back, {rider?.name?.split(' ')[0] || 'Rider'}</h1>
            <p className={`text-sm font-medium mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Here is your operational overview for today.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleRiderTheme} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isDark ? 'bg-[#1A1A1A] border-[#222222] text-[#9C8F7F] hover:text-[#FAF9F6]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm'}`}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <NotificationPanel />
          </div>
        </div>

        {/* Not Activated Warning */}
        {isNotActivated && (
          <Card className="bg-[#FCD34D]/5 border-2 border-[#FCD34D]/20 shadow-none">
            <div className="flex items-start gap-4 p-1">
              <div className="w-12 h-12 rounded-xl bg-[#FCD34D]/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-[#FCD34D]" />
              </div>
              <div>
                <h3 className="font-bold text-[#FCD34D] mb-1">Pending Activation</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>Your account is pending admin activation. You'll receive orders once an admin activates your account.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Massive Availability Toggle */}
        <button
          onClick={handleStatusToggle}
          className={`w-full relative overflow-hidden flex items-center justify-between p-6 rounded-3xl border-2 transition-all active:scale-[0.98] ${riderStatus === 'available'
            ? (isDark ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30 shadow-lg shadow-[#7C3AED]/10' : 'bg-purple-100 border-purple-300 shadow-lg shadow-purple-200')
            : (isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-200 shadow-sm')
            }`}
        >
          <div className="flex items-center gap-4 z-10">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${riderStatus === 'available'
              ? (isDark ? 'bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/40' : 'bg-purple-600 shadow-lg shadow-purple-600/40')
              : (isDark ? 'bg-[#333333]' : 'bg-gray-100')
              }`}>
              {riderStatus === 'available' ? <Truck className="w-6 h-6 text-white" /> : <LogOut className={`w-6 h-6 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />}
            </div>
            <div className="text-left">
              <h2 className={`text-2xl font-black tracking-tight ${riderStatus === 'available'
                ? (isDark ? 'text-[#FAF9F6]' : 'text-gray-900')
                : (isDark ? 'text-[#9C8F7F]' : 'text-gray-500')
                }`}>
                {riderStatus === 'available' ? "You're Online" : "You're Offline"}
              </h2>
              <p className={`text-sm font-medium mt-0.5 ${riderStatus === 'available'
                ? (isDark ? 'text-[#7C3AED]' : 'text-purple-600')
                : (isDark ? 'text-[#666666]' : 'text-gray-400')
                }`}>
                {riderStatus === 'available' ? 'Receiving Dispatches' : 'Tap to Go Online'}
              </p>
            </div>
          </div>

          <div className={`w-16 h-8 rounded-full flex items-center px-1 transition-all ${riderStatus === 'available' ? (isDark ? 'bg-[#7C3AED]' : 'bg-purple-600') : (isDark ? 'bg-[#222222]' : 'bg-gray-200')
            }`}>
            <div className={`w-6 h-6 rounded-full bg-white transition-all transform ${riderStatus === 'available' ? 'translate-x-8' : `translate-x-0 ${isDark ? 'bg-[#9C8F7F]' : 'bg-gray-400'}`
              }`}></div>
          </div>
        </button>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`min-h-[140px] flex flex-col justify-between transition-colors border shadow-none ${isDark ? 'bg-[#1A1A1A] border-[#222222]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <Badge variant="purple" className="text-[9px] font-black uppercase tracking-widest">Today</Badge>
            </div>
            <div>
              <h3 className={`text-3xl font-black tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{activeBatches.length}</h3>
              <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Active Batches</p>
            </div>
          </Card>

          <Card className={`min-h-[140px] flex flex-col justify-between relative overflow-hidden group shadow-none border ${isDark ? 'bg-[#1A1A1A] border-[#FCD34D]/20' : 'bg-white border-amber-200'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#FCD34D]/10 to-transparent"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#FCD34D]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-black text-amber-500 tracking-tight">₦{todayEarnings.toLocaleString()}</h3>
              <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Earnings Today</p>
            </div>
          </Card>
        </div>

        {/* Today's Batches List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Active Batches</h3>
            <button onClick={() => navigate('/rider/batches')} className={`text-xs font-bold text-[#7C3AED] uppercase tracking-widest transition-colors ${isDark ? 'hover:text-[#FAF9F6]' : 'hover:text-purple-700'}`}>
              View All
            </button>
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
                      {orders.some((o: any) => batch.orderIds?.includes(o.id) && (o.deliveryMode === 'group' || o.deliveryMode === 'GROUP')) && (
                        <>
                          <span className={isDark ? 'text-[#333333]' : 'text-gray-200'}>|</span>
                          <span className="text-purple-500 font-bold uppercase tracking-wider text-[10px]">Group</span>
                        </>
                      )}
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
                <p className={`text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>No active batches assigned right now. Sit tight.</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}