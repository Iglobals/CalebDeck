import React, { useState } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Package, MapPin, Phone, CheckCircle, Clock } from 'lucide-react';

interface Order {
  id: string;
  student: string;
  hostel: string;
  room: string;
  plates: number;
  phone: string;
  status: 'pending' | 'picked-up' | 'delivered';
}

export default function RiderDashboard() {
  const [riderStatus, setRiderStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [orders, setOrders] = useState<Order[]>([
    { id: 'CD-38492', student: 'Chioma A.', hostel: 'Deborah Hall', room: '204', plates: 2, phone: '08012345678', status: 'pending' },
    { id: 'CD-38493', student: 'Faith M.', hostel: 'Deborah Hall', room: '310', plates: 1, phone: '08087654321', status: 'pending' },
    { id: 'CD-38494', student: 'Sarah K.', hostel: 'Deborah Hall', room: '156', plates: 3, phone: '08098765432', status: 'pending' },
  ]);

  const currentBatch = {
    hostel: 'Deborah Hall',
    totalOrders: orders.filter(o => o.status !== 'delivered').length,
    totalPlates: orders.filter(o => o.status !== 'delivered').reduce((sum, o) => sum + o.plates, 0)
  };

  const handleStatusChange = (status: 'available' | 'busy' | 'offline') => {
    setRiderStatus(status);
  };

  const markPickedUp = (orderId: string) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: 'picked-up' as const } : order
    ));
  };

  const markDelivered = (orderId: string) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: 'delivered' as const } : order
    ));
  };

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const completedOrders = orders.filter(o => o.status === 'delivered');

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[#E5E2DC] z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <Logo size="sm" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-[#121212]">John Doe</p>
                <p className="text-xs text-[#9C8F7F]">Rider ID: R-001</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold">
                JD
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleStatusChange('available')}
              className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                riderStatus === 'available'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-[#121212] border-2 border-[#E5E2DC]'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => handleStatusChange('busy')}
              className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                riderStatus === 'busy'
                  ? 'bg-[#FCD34D] text-white'
                  : 'bg-white text-[#121212] border-2 border-[#E5E2DC]'
              }`}
            >
              Busy
            </button>
            <button
              onClick={() => handleStatusChange('offline')}
              className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                riderStatus === 'offline'
                  ? 'bg-gray-500 text-white'
                  : 'bg-white text-[#121212] border-2 border-[#E5E2DC]'
              }`}
            >
              Offline
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Current Batch */}
        {activeOrders.length > 0 && (
          <Card className="bg-gradient-to-br from-[#FCD34D]/20 to-[#7C3AED]/20 border-2 border-[#FCD34D]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant="gold" className="mb-2">CURRENT BATCH</Badge>
                <h2 className="text-2xl font-bold text-[#121212]">{currentBatch.hostel}</h2>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#121212]">{currentBatch.totalPlates}</div>
                <div className="text-sm text-[#9C8F7F]">plates</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-[#121212]">
                <Package className="w-5 h-5" />
                <span className="font-semibold">{currentBatch.totalOrders} orders</span>
              </div>
              <div className="flex items-center gap-2 text-[#121212]">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">{currentBatch.hostel}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 ? (
          <div>
            <h3 className="text-xl font-bold text-[#121212] mb-4">
              Active Deliveries ({activeOrders.length})
            </h3>
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <Card key={order.id}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-[#121212] text-lg">{order.student}</h4>
                          <Badge variant={order.status === 'picked-up' ? 'gold' : 'purple'}>
                            {order.status === 'picked-up' ? 'Picked Up' : 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#9C8F7F] mb-1">Order ID: {order.id}</p>
                        <div className="flex items-center gap-2 text-[#121212]">
                          <MapPin className="w-4 h-4 text-[#7C3AED]" />
                          <span className="font-medium">{order.hostel}, Room {order.room}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#121212]">{order.plates}</div>
                        <div className="text-xs text-[#9C8F7F]">plates</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.location.href = `tel:${order.phone}`}
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </Button>
                      {order.status === 'pending' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => markPickedUp(order.id)}
                        >
                          <Package className="w-4 h-4" />
                          Mark Picked Up
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 bg-green-500 hover:bg-green-600"
                          onClick={() => markDelivered(order.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#E5E2DC] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[#9C8F7F]" />
            </div>
            <h3 className="text-xl font-bold text-[#121212] mb-2">No Active Deliveries</h3>
            <p className="text-[#9C8F7F]">
              {riderStatus === 'available' 
                ? 'Waiting for new orders...' 
                : 'Set status to Available to receive orders'}
            </p>
          </Card>
        )}

        {/* Completed Today */}
        {completedOrders.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-[#121212] mb-4">
              Completed Today ({completedOrders.length})
            </h3>
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <Card key={order.id} className="bg-green-50 border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#121212]">{order.student}</p>
                        <p className="text-sm text-[#9C8F7F]">{order.hostel}, Room {order.room}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{order.plates} plates</p>
                      <p className="text-xs text-green-600">Delivered</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <div className="text-3xl font-bold text-[#121212] mb-1">
              {orders.length}
            </div>
            <div className="text-sm text-[#9C8F7F]">Total Today</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-[#FCD34D] mb-1">
              {activeOrders.length}
            </div>
            <div className="text-sm text-[#9C8F7F]">Active</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {completedOrders.length}
            </div>
            <div className="text-sm text-[#9C8F7F]">Completed</div>
          </Card>
        </div>

        {/* Tips */}
        <Card className="bg-gradient-to-br from-[#7C3AED]/10 to-[#FCD34D]/10 border-2 border-[#7C3AED]/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-[#121212] mb-1">Quick Tip</h4>
              <p className="text-sm text-[#9C8F7F]">
                Deliver orders from the same hostel together to save time and maximize efficiency!
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}