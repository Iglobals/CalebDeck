import React, { useState, useEffect } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Package, MapPin, Phone, CheckCircle, Clock, LogOut, Truck } from 'lucide-react';
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

  // Load rider profile from riders collection
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

  const markDelivered = async (orderId: string) => {
    await updateOrder(orderId, { status: 'DELIVERED' });
  };

  const markBatchDelivered = async (batch: Batch) => {
    // Mark all orders in the batch as delivered
    for (const orderId of batch.orderIds) {
      await updateOrder(orderId, { status: 'DELIVERED' });
    }
    await updateBatch(batch.id, { status: 'DELIVERED' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/rider/login');
  };

  const activeOrders = orders.filter(o => o.status === 'OUT_FOR_DELIVERY');
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  const activeBatches = batches.filter(b => b.status === 'OUT_FOR_DELIVERY');

  const isNotActivated = rider && rider.isActive === false;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 bg-[#141414] border-b border-[#222222] z-50">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <Logo size="sm" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-[#FAF9F6]">{rider?.name || user?.displayName || 'Rider'}</p>
                <p className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">{rider?.dept || 'Logistics'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-[#222222] flex items-center justify-center text-[#9C8F7F] hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStatusToggle}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${riderStatus === 'available'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                : 'bg-[#222222] text-[#9C8F7F] border border-[#333333]'
                }`}
            >
              🟢 Online
            </button>
            <button
              onClick={handleStatusToggle}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${riderStatus === 'offline'
                ? 'bg-[#333333] text-white'
                : 'bg-[#222222] text-[#9C8F7F] border border-[#333333]'
                }`}
            >
              ⚫ Offline
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-5 space-y-6">
        {/* Not Activated Warning */}
        {isNotActivated && (
          <Card className="bg-[#FCD34D]/10 border-2 border-[#FCD34D]/30">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-[#FCD34D] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#FCD34D] mb-1">Pending Activation</h3>
                <p className="text-sm text-[#9C8F7F]">Your account is pending admin activation. You'll be able to receive orders once an admin activates your account.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Active Batches */}
        {activeBatches.length > 0 && activeBatches.map(batch => (
          <Card key={batch.id} className="bg-gradient-to-br from-[#FCD34D]/10 to-[#7C3AED]/10 border border-[#FCD34D]/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant="gold" className="mb-2 text-[9px] font-black uppercase tracking-widest">Active Batch</Badge>
                <h2 className="text-xl font-bold text-[#FAF9F6]">{batch.hostelName}</h2>
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
              <div className="flex items-center gap-2 text-[#9C8F7F]">
                <Truck className="w-4 h-4" />
                <span className="font-bold">Out for Delivery</span>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => markBatchDelivered(batch)}
              className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Entire Batch Delivered
            </Button>
          </Card>
        ))}

        {/* Active Orders */}
        {activeOrders.length > 0 ? (
          <div>
            <h3 className="text-lg font-bold text-[#FAF9F6] mb-4">
              Active Deliveries ({activeOrders.length})
            </h3>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <Card key={order.id} className="bg-[#1A1A1A] border-[#222222]">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-[#FAF9F6]">{order.fullName || 'Student'}</h4>
                          <Badge variant="purple" className="text-[9px] font-black uppercase">Out for delivery</Badge>
                        </div>
                        <p className="text-xs text-[#9C8F7F] font-bold mb-1">{order.orderId || order.id}</p>
                        <div className="flex items-center gap-2 text-[#FAF9F6]">
                          <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                          <span className="text-sm font-medium">{order.hostel}{order.roomNumber ? `, Room ${order.roomNumber}` : ''}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-[#FAF9F6]">{order.plates?.length || 0}</div>
                        <div className="text-[10px] text-[#9C8F7F] font-bold">plates</div>
                      </div>
                    </div>

                    {/* Order items preview */}
                    {order.plates && order.plates.length > 0 && (
                      <div className={`p-3 rounded-xl bg-[#222222] text-xs text-[#9C8F7F]`}>
                        {order.plates.map((plate: any, i: number) => (
                          <div key={i} className="flex justify-between py-1">
                            <span>{plate.items?.map((item: any) => item.name).join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      {order.phone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 bg-[#222222] text-[#7C3AED] border-none hover:bg-[#2A2A2A]"
                          onClick={() => window.location.href = `tel:${order.phone}`}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => markDelivered(order.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Delivered
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : !isNotActivated && (
          <Card className="text-center py-12 bg-[#1A1A1A] border-[#222222]">
            <div className="w-16 h-16 rounded-2xl bg-[#222222] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[#9C8F7F]" />
            </div>
            <h3 className="text-lg font-bold text-[#FAF9F6] mb-2">No Active Deliveries</h3>
            <p className="text-sm text-[#9C8F7F]">
              {riderStatus === 'available'
                ? 'Waiting for dispatch from admin...'
                : 'Go online to receive delivery batches'}
            </p>
          </Card>
        )}

        {/* Completed Today */}
        {deliveredOrders.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-[#FAF9F6] mb-4">
              Completed ({deliveredOrders.length})
            </h3>
            <div className="space-y-2">
              {deliveredOrders.slice(0, 5).map((order) => (
                <Card key={order.id} className="bg-green-500/5 border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#FAF9F6]">{order.fullName}</p>
                        <p className="text-xs text-[#9C8F7F]">{order.hostel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-500 text-sm">{order.plates?.length || 0} plates</p>
                      <p className="text-[10px] text-green-500/60 font-bold uppercase">Delivered</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center bg-[#1A1A1A] border-[#222222]">
            <div className="text-2xl font-black text-[#FAF9F6] mb-1">{orders.length}</div>
            <div className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Total</div>
          </Card>
          <Card className="text-center bg-[#1A1A1A] border-[#222222]">
            <div className="text-2xl font-black text-[#FCD34D] mb-1">{activeOrders.length}</div>
            <div className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Active</div>
          </Card>
          <Card className="text-center bg-[#1A1A1A] border-[#222222]">
            <div className="text-2xl font-black text-green-500 mb-1">{deliveredOrders.length}</div>
            <div className="text-[10px] text-[#9C8F7F] font-bold uppercase tracking-widest">Done</div>
          </Card>
        </div>
      </main>
    </div>
  );
}