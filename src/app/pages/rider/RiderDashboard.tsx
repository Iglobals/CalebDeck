import React, { useState, useEffect } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import {
  Package, MapPin, Phone, CheckCircle, Clock, LogOut, Truck,
  DollarSign, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router';
import {
  subscribeToRiderOrders,
  subscribeToBatches,
  updateRider,
  updateOrder,
  updateBatch,
  getRiderById,
  Rider,
  Batch,
} from '../../../services/db';

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rider, setRider] = useState<Rider | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [riderStatus, setRiderStatus] = useState<'available' | 'offline'>('offline');
  const [showCompleted, setShowCompleted] = useState(false);

  // Load rider profile
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

  // Subscribe to orders assigned to this rider
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToRiderOrders(user.uid, setOrders);
    return unsub;
  }, [user]);

  // Subscribe to batches
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToBatches(user.uid, setBatches);
    return unsub;
  }, [user]);

  const handleStatusToggle = async () => {
    if (!user) return;
    const newStatus = riderStatus === 'available' ? 'offline' : 'available';
    setRiderStatus(newStatus);
    await updateRider(user.uid, { status: newStatus });
  };

  const markOnTheWay = async (orderId: string) => {
    await updateOrder(orderId, { status: 'ON_THE_WAY' });
  };

  const markDelivered = async (orderId: string) => {
    await updateOrder(orderId, { status: 'DELIVERED' });
  };

  const markBatchDelivered = async (batch: Batch) => {
    for (const orderId of batch.orderIds) {
      await updateOrder(orderId, { status: 'DELIVERED' });
    }
    await updateBatch(batch.id, { status: 'DELIVERED' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/rider/login');
  };

  // Today-only filter
  const todayStr = new Date().toLocaleDateString();
  const todayOrders = orders.filter(o => {
    const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : o.createdAt ? new Date(o.createdAt) : null;
    return d ? d.toLocaleDateString() === todayStr : false;
  });

  const activeOrders = todayOrders.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'ON_THE_WAY');
  const deliveredOrders = todayOrders.filter(o => o.status === 'DELIVERED');
  const activeBatches = batches.filter(b => b.status === 'OUT_FOR_DELIVERY');
  const todayEarnings = deliveredOrders.length * 300;
  const isNotActivated = rider && rider.isActive === false;

  const kpis = [
    {
      label: "Orders Today",
      value: todayOrders.length.toString(),
      sub: `${activeOrders.length} active`,
      icon: <Package className="w-5 h-5" />,
      color: '#7C3AED',
    },
    {
      label: "Today's Earnings",
      value: `₦${todayEarnings.toLocaleString()}`,
      sub: `${deliveredOrders.length} delivered`,
      icon: <DollarSign className="w-5 h-5" />,
      color: '#10B981',
    },
    {
      label: "Delivery Status",
      value: activeOrders.length > 0 ? 'Active' : 'Idle',
      sub: riderStatus === 'available' ? 'Online' : 'Offline',
      icon: <TrendingUp className="w-5 h-5" />,
      color: '#FCD34D',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header */}
      <header className="sticky top-0 bg-[#141414]/95 backdrop-blur-xl border-b border-[#222222] z-50">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div className={`h-6 w-px bg-[#333333]`}></div>
              <div>
                <p className="text-sm font-bold text-[#FAF9F6]">{rider?.name || user?.displayName || 'Rider'}</p>
                <p className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">{rider?.dept || 'Logistics'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Status Toggle */}
              <button
                onClick={handleStatusToggle}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${riderStatus === 'available'
                    ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                    : 'bg-[#222222] text-[#9C8F7F] border border-[#333333]'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${riderStatus === 'available' ? 'bg-[#10B981] animate-pulse' : 'bg-[#9C8F7F]'}`}></span>
                {riderStatus === 'available' ? 'Online' : 'Offline'}
              </button>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-[#222222] flex items-center justify-center text-[#9C8F7F] hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-5 space-y-6 max-w-4xl mx-auto">
        {/* Not Activated Warning */}
        {isNotActivated && (
          <Card className="bg-[#FCD34D]/5 border-2 border-[#FCD34D]/20">
            <div className="flex items-start gap-4 p-1">
              <div className="w-12 h-12 rounded-xl bg-[#FCD34D]/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-[#FCD34D]" />
              </div>
              <div>
                <h3 className="font-bold text-[#FCD34D] mb-1">Pending Activation</h3>
                <p className="text-sm text-[#9C8F7F] leading-relaxed">Your account is pending admin activation. You'll receive orders once an admin activates your account.</p>
              </div>
            </div>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          {kpis.map((kpi, i) => (
            <Card key={i} className="bg-[#1A1A1A] border-[#222222] hover:border-[#333333] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}
                >
                  {kpi.icon}
                </div>
              </div>
              <p className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className="text-xl font-black text-[#FAF9F6] tracking-tight">{kpi.value}</p>
              <p className="text-[10px] text-[#9C8F7F] font-bold mt-1">{kpi.sub}</p>
            </Card>
          ))}
        </div>

        {/* Active Batches */}
        {activeBatches.length > 0 && activeBatches.map(batch => (
          <Card key={batch.id} className="bg-[#1A1A1A] border-[#FCD34D]/20 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FCD34D] to-[#7C3AED]"></div>
            <div className="flex items-center justify-between mb-4 pt-2">
              <div>
                <Badge variant="gold" className="mb-2 text-[9px] font-black uppercase tracking-widest">Active Batch</Badge>
                <h2 className="text-lg font-bold text-[#FAF9F6]">{batch.hostelName}</h2>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-[#FCD34D]">{batch.plateCount}</div>
                <div className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">plates</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm mb-4">
              <div className="flex items-center gap-2 text-[#9C8F7F]">
                <Package className="w-4 h-4" />
                <span className="font-bold">{batch.orderCount} orders</span>
              </div>
              <div className="flex items-center gap-2 text-[#FCD34D]">
                <Truck className="w-4 h-4" />
                <span className="font-bold">Out for Delivery</span>
              </div>
            </div>
            <button
              onClick={() => markBatchDelivered(batch)}
              className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Entire Batch Delivered
            </button>
          </Card>
        ))}

        {/* Active Deliveries */}
        {activeOrders.length > 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-bold text-[#FAF9F6]">Active Deliveries</h3>
              <Badge variant="purple" className="text-[9px] font-black">{activeOrders.length}</Badge>
            </div>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <Card key={order.id} className="bg-[#1A1A1A] border-[#222222] hover:border-[#333333] transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-[#FAF9F6]">{order.fullName || 'Student'}</h4>
                          <Badge
                            variant={order.status === 'ON_THE_WAY' ? 'gold' : 'purple'}
                            className="text-[9px] font-black uppercase tracking-widest"
                          >
                            {order.status === 'ON_THE_WAY' ? 'On The Way' : 'Dispatched'}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-[#9C8F7F] font-bold tracking-wider mb-2 font-mono">
                          CD-{order.orderId?.slice(-6) || order.id?.slice(-6)}
                        </p>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                          <span className="text-sm font-medium text-[#FAF9F6]">
                            {order.hostelName || order.hostel}{order.room ? `, Room ${order.room}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-right pl-4">
                        <div className="text-2xl font-black text-[#FAF9F6]">{order.plates?.length || 0}</div>
                        <div className="text-[10px] text-[#9C8F7F] font-bold uppercase">plates</div>
                      </div>
                    </div>

                    {/* Items preview */}
                    {order.plates && order.plates.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#222222]/80 space-y-1.5">
                        {order.plates.map((plate: any, i: number) => (
                          <div key={i} className="text-xs text-[#9C8F7F]">
                            <span className="text-[#7C3AED] font-bold mr-2">P{i + 1}</span>
                            {plate.items?.map((item: any) => item.item?.name || item.name).join(', ')}
                          </div>
                        ))}
                        {order.drinksSnacks?.length > 0 && (
                          <div className="text-xs text-[#FCD34D]">
                            + {order.drinksSnacks.map((d: any) => d.name).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#222222] text-[#7C3AED] font-bold text-xs hover:bg-[#2A2A2A] transition-all"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      )}
                      {order.status === 'OUT_FOR_DELIVERY' ? (
                        <button
                          onClick={() => markOnTheWay(order.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FCD34D]/10 text-[#FCD34D] border border-[#FCD34D]/30 font-bold text-xs hover:bg-[#FCD34D]/20 transition-all active:scale-[0.98]"
                        >
                          <Truck className="w-4 h-4" />
                          On The Way
                        </button>
                      ) : (
                        <button
                          onClick={() => markDelivered(order.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 font-bold text-xs hover:bg-[#10B981]/20 transition-all active:scale-[0.98]"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : !isNotActivated && (
          <Card className="text-center py-16 bg-[#1A1A1A] border-[#222222]">
            <div className="w-16 h-16 rounded-2xl bg-[#222222] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[#333333]" />
            </div>
            <h3 className="text-lg font-bold text-[#FAF9F6] mb-2">No Active Deliveries</h3>
            <p className="text-sm text-[#9C8F7F] max-w-xs mx-auto">
              {riderStatus === 'available'
                ? 'You\'re online. Waiting for dispatch from admin...'
                : 'Go online to start receiving delivery batches'}
            </p>
          </Card>
        )}

        {/* Completed Today */}
        {deliveredOrders.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center justify-between w-full mb-3"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[#FAF9F6]">Completed Today</h3>
                <Badge variant="green" className="text-[9px] font-black">{deliveredOrders.length}</Badge>
              </div>
              {showCompleted ? (
                <ChevronUp className="w-5 h-5 text-[#9C8F7F]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#9C8F7F]" />
              )}
            </button>
            {showCompleted && (
              <div className="space-y-2">
                {deliveredOrders.map((order) => (
                  <Card key={order.id} className="bg-[#10B981]/5 border-[#10B981]/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-[#10B981]" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#FAF9F6]">{order.fullName}</p>
                          <p className="text-[10px] text-[#9C8F7F] font-bold">{order.hostelName || order.hostel} · Room {order.room}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#10B981] text-sm">{order.plates?.length || 0} plates</p>
                        <p className="text-[10px] text-[#10B981]/60 font-bold uppercase">₦300</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Earnings Summary */}
        <Card className="bg-gradient-to-br from-[#7C3AED]/5 to-[#10B981]/5 border-[#222222]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest mb-1">Today's Total Earnings</p>
              <h2 className="text-3xl font-black text-[#10B981]">₦{todayEarnings.toLocaleString()}</h2>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-[#10B981]" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#222222] flex items-center justify-between text-sm">
            <span className="text-[#9C8F7F] font-bold">{deliveredOrders.length} deliveries × ₦300</span>
            <span className="text-[#FAF9F6] font-black">₦{todayEarnings.toLocaleString()}</span>
          </div>
        </Card>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <button
            onClick={() => navigate('/rider/history')}
            className="py-4 rounded-xl bg-[#1A1A1A] border border-[#222222] text-[#9C8F7F] font-bold text-xs uppercase tracking-widest hover:border-[#333333] transition-all"
          >
            Order History
          </button>
          <button
            onClick={() => navigate('/rider/login')}
            className="py-4 rounded-xl bg-[#1A1A1A] border border-[#222222] text-[#9C8F7F] font-bold text-xs uppercase tracking-widest hover:border-[#333333] transition-all"
          >
            My Profile
          </button>
        </div>
      </main>
    </div>
  );
}