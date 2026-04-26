import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Package,
  CheckCircle,
  Users,
  Truck,
  AlertTriangle,
  User,
  Zap,
  X
} from 'lucide-react';
import { subscribeToAllOrders, subscribeToRiders, subscribeToHostels, dispatchBatch, Rider, Hostel, subscribeToPlatformSettings, updatePlatformSettings, PlatformSettings } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';
import { isToday, isYesterday, format } from 'date-fns';

export default function AdminDashboard() {
  const { adminTheme } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [dispatchingHostel, setDispatchingHostel] = useState<string | null>(null);
  const [emergencyCard, setEmergencyCard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded >= 3) setLoading(false); };
    const unsub = subscribeToAllOrders((data) => { setOrders(data); checkLoaded(); });
    const unsubRiders = subscribeToRiders((data) => { setRiders(data); checkLoaded(); });
    const unsubHostels = subscribeToHostels((data) => { setHostels(data); checkLoaded(); });
    const unsubPlatform = subscribeToPlatformSettings((data) => setPlatformSettings(data));
    return () => { unsub(); unsubRiders(); unsubHostels(); unsubPlatform(); };
  }, []);

  const handleToggleMaintenance = async () => {
    if (!platformSettings) return;
    const currentlyAccepting = platformSettings.isAcceptingOrders !== false; // defaults to true
    if (!confirm(`Are you sure you want to ${currentlyAccepting ? 'PAUSE' : 'RESUME'} all ordering?`)) return;
    try {
      await updatePlatformSettings({ isAcceptingOrders: !currentlyAccepting });
    } catch (err) {
      console.error('Failed to update maintenance mode:', err);
    }
  };

  const parseDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : d ? new Date(d) : null;

  const recentOrders = orders.filter(o => {
    const d = parseDate(o.createdAt);
    if (!d) return false;
    return Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
  }).slice(0, 8);

  const formatOrderTime = (d: any) => {
    const date = parseDate(d);
    if (!date) return 'N/A';
    if (isToday(date)) return 'Today ' + format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday ' + format(date, 'h:mm a');
    return format(date, 'MMM d, h:mm a');
  };

  const isDark = adminTheme === 'dark';
  const today = new Date().toLocaleDateString();

  const todayPaidOrders = orders.filter(o => {
    if (!o.createdAt || o.status === 'CANCELLED') return false;
    const date = o.createdAt.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
    return date.toLocaleDateString() === today;
  });

  const totalRevenue = todayPaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalDeliveryFees = todayPaidOrders.reduce((sum, o) => {
    const platesCount = o.type === 'combo' ? (o.quantity || 1) : (o.plates?.length || 1);
    const isGroup = o.deliveryMode === 'group' || o.deliveryMode === 'GROUP';
    const isPremiumHostel = ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'].includes((o.hostel || o.hostelName || '').toString().toLowerCase());

    // Revenue collected from user (Delivery Fee only)
    let baseDeliveryFee = isGroup ? 580 : 750;
    if (isPremiumHostel) {
        baseDeliveryFee = platformSettings?.premiumDeliveryFee || 1250;
    }

    const deliveryRevenue = baseDeliveryFee * platesCount;

    return sum + deliveryRevenue;
  }, 0);

  const totalSystemFees = todayPaidOrders.reduce((sum, o) => {
     return sum + (o.breakdown?.platform || 100) + (o.breakdown?.processing || 200);
  }, 0);

  const getRider = (id?: string) => riders.find(r => r.id === id) || null;

  const hostelCards = hostels.map(hostel => {
    const hostelOrders = orders.filter(o => {
      const matchesHostel = o.hostel === hostel.id || o.hostel === hostel.name;
      if (!matchesHostel) return false;
      const d = parseDate(o.createdAt);
      return d ? d.toLocaleDateString() === today : false;
    });
    const pendingOrders = hostelOrders.filter(o => o.status === 'PAID');
    const outOrders = hostelOrders.filter(o => o.status === 'OUT_FOR_DELIVERY');
    const otwOrders = hostelOrders.filter(o => o.status === 'ON_THE_WAY');
    const deliveredOrders = hostelOrders.filter(o => o.status === 'DELIVERED');
    const defaultRider = getRider(hostel.defaultRiderId);
    const assistantRider = getRider(hostel.assistantRiderId);

    let dispatchRider: Rider | null = null;
    if (defaultRider?.status === 'available') {
      dispatchRider = defaultRider;
    } else if (assistantRider?.status === 'available') {
      dispatchRider = assistantRider;
    }

    return {
      hostel,
      pendingOrders,
      outOrders,
      otwOrders,
      pendingCount: pendingOrders.length,
      outCount: outOrders.length,
      otwCount: otwOrders.length,
      deliveredCount: deliveredOrders.length,
      totalPlates: pendingOrders.reduce((sum, o) => sum + (o.type === 'combo' ? (o.quantity || 1) : (o.plates?.length || 0)), 0),
      defaultRider,
      assistantRider,
      dispatchRider,
    };
  });

  const handleDispatch = async (card: typeof hostelCards[0]) => {
    if (!card.dispatchRider || card.pendingCount === 0) return;
    setDispatchingHostel(card.hostel.id);
    try {
      await dispatchBatch(card.hostel.id, card.hostel.name, card.dispatchRider, card.pendingOrders);
    } catch (err) {
      console.error('Dispatch failed:', err);
    } finally {
      setDispatchingHostel(null);
    }
  };

  const handleEmergencyDispatch = async (rider: Rider) => {
    if (!emergencyCard || emergencyCard.pendingCount === 0) return;
    setDispatchingHostel(emergencyCard.hostel.id);
    setEmergencyCard(null);
    try {
      await dispatchBatch(emergencyCard.hostel.id, emergencyCard.hostel.name, rider, emergencyCard.pendingOrders, true);
    } catch (err) {
      console.error('Emergency dispatch failed:', err);
    } finally {
      setDispatchingHostel(null);
    }
  };

  const onlineRiders = riders.filter(r => r.status === 'available' && r.isActive !== false);

  const kpis = [
    {
      label: "Today's Orders",
      value: todayPaidOrders.length.toString(),
      change: `${todayPaidOrders.filter(o => o.status === 'PAID').length} pending`,
      icon: <ShoppingBag className="w-6 h-6" />,
      color: '#7C3AED'
    },
    {
      label: 'Gross Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      change: `${todayPaidOrders.length} orders`,
      icon: <DollarSign className="w-6 h-6" />,
      color: '#FCD34D'
    },
    {
      label: 'Delivery Fees Collected',
      value: `₦${totalDeliveryFees.toLocaleString()}`,
      change: 'reserved for payout/profit',
      icon: <CheckCircle className="w-6 h-6" />,
      color: '#10B981'
    },
    {
      label: 'Service Fees',
      value: `₦${totalSystemFees.toLocaleString()}`,
      change: 'platform net revenue',
      icon: <Zap className="w-6 h-6" />,
      color: '#3B82F6'
    },
    {
      label: 'Riders Online',
      value: `${riders.filter(r => r.status === 'available').length}/${riders.filter(r => r.isActive !== false).length}`,
      change: `${riders.filter(r => r.status === 'available').length} available`,
      icon: <Users className="w-6 h-6" />,
      color: '#7C3AED'
    },
  ];

  // Status indicator helper
  const StatusDot = ({ status }: { status: string }) => (
    <span className={`inline-block w-2 h-2 rounded-full ${status === 'available' ? 'bg-green-500' : status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
  );

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#7C3AED]' : 'border-purple-600'}`}></div>
          <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>Loading Dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  const isAcceptingOrders = platformSettings?.isAcceptingOrders !== false;

  return (
    <AdminLayout title="Dashboard">
      {/* System Maintenance Toggle */}
      <div className={`mb-8 p-6 rounded-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${isDark 
        ? (isAcceptingOrders ? 'bg-[#222222] border-[#333333]' : 'bg-red-500/10 border-red-500/20 shadow-lg shadow-red-500/5') 
        : (isAcceptingOrders ? 'bg-white border-gray-100 shadow-sm' : 'bg-red-50 border-red-200 shadow-lg shadow-red-500/5')}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAcceptingOrders 
            ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600') 
            : 'bg-red-500/20 text-red-500'}`}>
            {isAcceptingOrders ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className={`text-lg font-black ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
              {isAcceptingOrders ? 'System Active' : 'System Paused (Maintenance)'}
            </h3>
            <p className={`text-sm font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
              {isAcceptingOrders ? 'Students can place orders normally.' : 'Ordering is currently blocked. No new orders will be accepted.'}
            </p>
          </div>
        </div>
        <Button 
          variant={isAcceptingOrders ? 'outline' : 'primary'}
          className={`px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${!isAcceptingOrders 
            ? 'bg-red-500 hover:bg-red-600 text-white border-transparent' 
            : (isDark ? 'border-[#444444] text-red-400 hover:bg-red-500/10 hover:border-red-500/30' : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300')}`}
          onClick={handleToggleMaintenance}
        >
          {isAcceptingOrders ? 'Pause Ordering' : 'Resume Ordering'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {kpis.map((kpi, index) => (
          <Card key={index} hover className={isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}>
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
              <Badge variant="gray" className="text-[10px] font-black tracking-wider px-2 py-1">
                {kpi.change}
              </Badge>
            </div>
            <p className={`text-sm mb-1 font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{kpi.label}</p>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Hostel Dispatch Cards */}
      <div className="mb-6 lg:mb-8">
        <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Hostel Dispatch</h2>

        <div className="grid gap-4">
          {hostelCards.length > 0 ? hostelCards.map((card) => (
            <Card key={card.hostel.id} className={`${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Hostel Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className={`text-lg lg:text-xl font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{card.hostel.name}</h3>
                    {card.pendingCount > 0 && (
                      <Badge variant="gold" className="text-[10px] uppercase font-black px-2 py-0.5">
                        {card.pendingCount} pending
                      </Badge>
                    )}
                    {card.outCount > 0 && (
                      <Badge variant="purple" className="text-[10px] uppercase font-black px-2 py-0.5">
                        {card.outCount} out for delivery
                      </Badge>
                    )}
                    {card.otwCount > 0 && (
                      <Badge variant="amber" className="text-[10px] uppercase font-black px-2 py-0.5">
                        {card.otwCount} on the way
                      </Badge>
                    )}
                    {card.deliveredCount > 0 && (
                      <Badge variant="green" className="text-[10px] uppercase font-black px-2 py-0.5">
                        {card.deliveredCount} delivered
                      </Badge>
                    )}
                  </div>

                  {/* Rider Info */}
                  <div className={`flex flex-wrap gap-x-6 gap-y-2 text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Default:</span>
                      {card.defaultRider ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{card.defaultRider.name}</span>
                          <StatusDot status={card.defaultRider.status} />
                        </span>
                      ) : (
                        <span className="italic">Not assigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Assistant:</span>
                      {card.assistantRider ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{card.assistantRider.name}</span>
                          <StatusDot status={card.assistantRider.status} />
                        </span>
                      ) : (
                        <span className="italic">None</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className={`flex flex-wrap items-center gap-4 lg:gap-6 text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{card.pendingCount} orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>{card.totalPlates} items</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="flex flex-col items-stretch sm:items-end gap-2">
                  {card.otwCount > 0 && card.pendingCount === 0 ? (
                    <Button
                      variant="primary"
                      disabled
                      className="w-full sm:w-auto bg-amber-500/20 text-amber-600 border border-amber-500/30 cursor-not-allowed px-8 py-3.5 rounded-xl font-bold"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      On The Way
                    </Button>
                  ) : card.outCount > 0 && card.pendingCount === 0 ? (
                    <Button
                      variant="primary"
                      disabled
                      className="w-full sm:w-auto bg-green-500/20 text-green-500 cursor-not-allowed px-8 py-3.5 rounded-xl font-bold"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Out by Rider
                    </Button>
                  ) : card.deliveredCount > 0 && card.pendingCount === 0 && card.outCount === 0 && card.otwCount === 0 ? (
                    <Button
                      variant="ghost"
                      disabled
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-green-500/10 text-green-500 border border-green-500/20"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      All Delivered
                    </Button>
                  ) : card.pendingCount === 0 ? (
                    <Button
                      variant="ghost"
                      disabled
                      className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}
                    >
                      No Pending Orders
                    </Button>
                  ) : !card.dispatchRider ? (
                    <Button
                      variant="ghost"
                      onClick={() => setEmergencyCard(card)}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Emergency Dispatch
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleDispatch(card)}
                      disabled={dispatchingHostel === card.hostel.id}
                      className="w-full sm:w-auto bg-[#FCD34D] text-black hover:bg-[#FCD34D]/90 px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-[#FCD34D]/20 active:scale-95"
                    >
                      {dispatchingHostel === card.hostel.id ? 'Dispatching...' : `Dispatch Batch → ${card.dispatchRider.name}`}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )) : (
            <div className={`p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium font-black uppercase tracking-widest text-[10px]">No hostels configured yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div>
        <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Recent Orders <span className={`text-sm font-medium ml-2 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>(last 24h)</span></h2>
        <Card className={`p-0 overflow-hidden ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-[#333333]' : 'border-gray-50'}`}>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Order ID</th>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Student</th>
                  <th className={`hidden sm:table-cell text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Hostel</th>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Items</th>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Amount</th>
                  <th className={`hidden md:table-cell text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Status</th>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Date & Time</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#333333]' : 'divide-gray-50'}`}>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`py-12 text-center text-sm font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                      No orders in the last 24 hours
                    </td>
                  </tr>
                ) : recentOrders.map((order) => (
                  <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}>
                    <td className="py-4 px-6">
                      <span className={`font-mono font-bold text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.orderId || '—'}</span>
                    </td>
                    <td className={`py-4 px-6 font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || '—'}</td>
                    <td className={`py-4 px-6 font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-2">
                        {order.type === 'combo' ? `${order.quantity || 1} Combos` : (order.plates?.length || 0)}
                        {(order.deliveryMode === 'group' || order.deliveryMode === 'GROUP') && (
                          <Badge variant="purple" className="text-[10px] uppercase font-black px-2 py-0.5">Group</Badge>
                        )}
                      </div>
                    </td>
                    <td className={`py-4 px-6 font-black text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>₦{order.total?.toLocaleString()}</td>
                    <td className="hidden md:table-cell py-4 px-6">
                      <Badge
                        variant={
                          order.status === 'DELIVERED' ? 'green' :
                            order.status === 'OUT_FOR_DELIVERY' ? 'purple' :
                              order.status === 'PAID' ? 'gold' :
                                'gray'
                        }
                        className="text-[9px] uppercase font-black tracking-widest px-3 py-1"
                      >
                        {order.status?.toLowerCase().replace(/_/g, ' ') || 'paid'}
                      </Badge>
                    </td>
                    <td className={`py-4 px-6 text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                      {formatOrderTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Emergency Dispatch Modal */}
      {emergencyCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className={`w-full max-w-lg shadow-2xl overflow-hidden ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-[#333333]' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Emergency Dispatch</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                    {emergencyCard.hostel.name} · {emergencyCard.pendingCount} Orders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmergencyCard(null)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#333333] text-[#9C8F7F] hover:text-[#FAF9F6]' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className={`text-sm mb-4 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}`}>
                Both assigned riders are currently unavailable. Select any online rider below to aggressively dispatch this batch.
              </p>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {onlineRiders.length > 0 ? onlineRiders.map(rider => (
                  <div key={rider.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isDark ? 'bg-[#222222] border-[#333333] hover:border-[#7C3AED]/50' : 'bg-gray-50 border-gray-100 hover:border-primary/50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isDark ? 'bg-[#333333] text-[#FAF9F6]' : 'bg-gray-200 text-gray-700'}`}>
                          {rider.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#1A1A1A]"></div>
                      </div>
                      <div>
                        <p className={`font-bold text-sm leading-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{rider.name}</p>
                        <p className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                          {rider.dept}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleEmergencyDispatch(rider)}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20"
                    >
                      Assign Batch
                    </Button>
                  </div>
                )) : (
                  <div className={`p-6 text-center border-2 border-dashed rounded-xl ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                    <AlertTriangle className={`w-8 h-8 mx-auto mb-3 opacity-50 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                    <p className={`text-sm font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>No Riders Online</p>
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>There are absolutely no active riders online right now.</p>
                  </div>
                )}
              </div>
            </div>
            <div className={`p-4 border-t flex justify-end gap-3 bg-opacity-50 ${isDark ? 'border-[#333333] bg-[#0F0F0F]' : 'border-gray-100 bg-gray-50'}`}>
              <Button onClick={() => setEmergencyCard(null)} variant="ghost" className={isDark ? 'text-[#9C8F7F]' : 'text-gray-600'}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}