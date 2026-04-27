import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
  Package,
  Search,
  CheckCircle,
  Truck,
  Phone,
  User,
  MapPin,
  Clock,
  ExternalLink
} from 'lucide-react';
import { subscribeToAllOrders, subscribeToRiders, Rider, dispatchBatch } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

export default function AdminMartOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'dispatching' | 'completed' | 'failed'>('pending');
  const [loading, setLoading] = useState(true);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [dispatchingOrder, setDispatchingOrder] = useState<string | null>(null);
  
  const { adminTheme } = useTheme();

  useEffect(() => {
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded >= 2) setLoading(false); };
    
    const unsubOrders = subscribeToAllOrders((data) => {
      setOrders(data.filter((o: any) => o.type === 'mart'));
      checkLoaded();
    });
    
    const unsubRiders = subscribeToRiders((data) => {
      setRiders(data);
      checkLoaded();
    });
    
    return () => { unsubOrders(); unsubRiders(); };
  }, []);

  const filteredOrders = orders.filter(o => {
    // Filter by tab
    if (activeTab === 'pending' && o.status !== 'PAID' && o.status !== 'PREPARING') return false;
    if (activeTab === 'dispatching' && o.status !== 'DISPATCHED') return false;
    if (activeTab === 'completed' && o.status !== 'DELIVERED' && o.status !== 'REFUNDED') return false;
    if (activeTab === 'failed') {
      if (o.status === 'FAILED' || o.status === 'CANCELLED') return true;
      if (o.status === 'PENDING_PAYMENT') {
        const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
        const ageInMinutes = (new Date().getTime() - d.getTime()) / 60000;
        return ageInMinutes > 30;
      }
      return false;
    }
    if (activeTab !== 'failed' && (o.status === 'FAILED' || o.status === 'CANCELLED' || o.status === 'PENDING_PAYMENT')) return false;

    
    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.studentName.toLowerCase().includes(q) ||
        o.hostelName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableRiders = riders.filter(r => r.status === 'online');

  const handleDispatch = async (orderId: string, riderId: string) => {
    setDispatchingOrder(orderId);
    try {
      const rider = riders.find(r => r.id === riderId);
      if (!rider) throw new Error("Rider not found");
      const order = orders.find(o => o.id === orderId || o.orderId === orderId);
      if (!order) throw new Error("Order not found");
      
      await dispatchBatch(order.hostel || 'mart_hostel', order.hostelName || 'Mart Delivery', rider, [order], true);
      toast.success("Order dispatched successfully");
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to dispatch order");
    } finally {
      setDispatchingOrder(null);
    }
  };

  const isDark = adminTheme === 'dark';

  return (
    <AdminLayout title="Mart Orders">
      <div className="space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2 p-1 rounded-xl bg-muted/50 border border-border overflow-x-auto">
            {(['pending', 'dispatching', 'completed', 'failed'] as const).map(tab => {
              const count = orders.filter(o => {
                if (tab === 'pending') return o.status === 'PAID' || o.status === 'PREPARING';
                if (tab === 'dispatching') return o.status === 'DISPATCHED';
                return o.status === 'DELIVERED';
              }).length;
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab} <span className="ml-1 opacity-50">({count})</span>
                </button>
              );
            })}
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 outline-none transition-all ${
                isDark 
                ? 'border-[#333333] bg-[#222222] text-[#FAF9F6] focus:border-[#10B981]' 
                : 'border-gray-200 bg-white text-gray-900 focus:border-[#10B981]/50'
              }`}
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className={`h-24 rounded-2xl animate-pulse ${isDark ? 'bg-[#333333]' : 'bg-gray-200'}`} />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-bold mb-2">No {activeTab} mart orders</h3>
            <p className="text-muted-foreground">When new mart orders come in, they'll appear here.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {filteredOrders.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                const timeAgo = order.createdAt ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true }) : '';
                
                return (
                  <Card 
                    key={order.id} 
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      isSelected 
                      ? 'border-[#10B981] shadow-lg shadow-[#10B981]/10' 
                      : 'border-border hover:border-[#10B981]/50'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg">{order.orderId}</span>
                          <Badge className="bg-[#10B981]/10 text-[#10B981]">₦{order.total?.toLocaleString() || order.totalAmount?.toLocaleString()}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-4 h-4" /> {order.fullName || order.studentName}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {order.hostelName || order.hostel}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">{timeAgo}</span>
                        <Badge variant="outline" className={
                          order.status === 'PAID' ? 'border-yellow-500 text-yellow-500' :
                          order.status === 'DISPATCHED' ? 'border-blue-500 text-blue-500' :
                          order.status === 'REFUNDED' ? 'border-red-500 text-red-500' :
                          (order.status === 'PENDING_PAYMENT' || order.status === 'FAILED') ? 'border-red-400 text-red-400' :
                          'border-green-500 text-green-500'
                        }>
                          {order.status === 'PENDING_PAYMENT' ? 'FAILED / ABANDONED' : order.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm pt-3 border-t border-border/50">
                      <span className="font-semibold">{order.items?.length || 0} items</span>
                      <span className="text-muted-foreground truncate flex-1">
                        {(order.items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
            
            {/* Order Details Sidebar */}
            <div className="lg:col-span-1">
              {selectedOrder ? (
                <Card className="p-6 sticky top-24 border-[#10B981]/20">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-xl mb-1">{selectedOrder.orderId}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.createdAt ? format(selectedOrder.createdAt.toDate(), 'MMM d, h:mm a') : ''}
                      </p>
                    </div>
                    <Badge className="bg-[#10B981] text-white">₦{selectedOrder.total?.toLocaleString() || selectedOrder.totalAmount?.toLocaleString()}</Badge>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-muted/30 p-4 rounded-2xl space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{selectedOrder.fullName || selectedOrder.studentName}</p>
                          <a href={`tel:${selectedOrder.phone}`} className="text-[#10B981] hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedOrder.phone}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{selectedOrder.hostelName || selectedOrder.hostel}</p>
                          {selectedOrder.instructions && (
                            <p className="text-muted-foreground mt-1 text-xs">Note: {selectedOrder.instructions}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5" /> Items
                      </h4>
                      <ul className="space-y-3">
                        {(selectedOrder.items || []).map((item: any, i: number) => (
                          <li key={i} className="flex justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex gap-3">
                              <span className="font-bold text-muted-foreground">{item.quantity}x</span>
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <span className="font-semibold text-muted-foreground">₦{item.price * item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-4 border-t border-border flex justify-between font-bold">
                        <span>Total Paid</span>
                        <span className="text-[#10B981] text-lg">₦{selectedOrder.total?.toLocaleString() || selectedOrder.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {activeTab === 'pending' && (
                      <div className="pt-4 border-t border-border">
                        <h4 className="font-bold mb-3">Assign Rider</h4>
                        {availableRiders.length > 0 ? (
                          <div className="space-y-2">
                            {availableRiders.map(rider => (
                              <div key={rider.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-5 h-5 text-muted-foreground" />
                                  <span className="font-medium text-sm">{rider.name}</span>
                                </div>
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => handleDispatch(selectedOrder.id, rider.id)}
                                  disabled={dispatchingOrder === selectedOrder.id}
                                  className="bg-[#10B981] hover:bg-[#059669] text-white"
                                >
                                  {dispatchingOrder === selectedOrder.id ? 'Assigning...' : 'Assign'}
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-yellow-500/10 text-yellow-600 text-sm font-semibold border border-yellow-500/20">
                            No riders currently online.
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'dispatching' && selectedOrder.riderName && (
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700">
                        <p className="font-semibold flex items-center gap-2 mb-1">
                          <Truck className="w-5 h-5" /> With Rider
                        </p>
                        <p className="text-sm font-bold">{selectedOrder.riderName}</p>
                        <a href={`tel:${selectedOrder.riderPhone}`} className="text-sm underline mt-1 block">
                          {selectedOrder.riderPhone}
                        </a>
                      </div>
                    )}
                    
                    {activeTab === 'completed' && (
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 flex-shrink-0" />
                        <div>
                          <p className="font-bold">Order Delivered</p>
                          <p className="text-xs mt-1">Successfully fulfilled by {selectedOrder.riderName || 'Rider'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-3xl bg-muted/10">
                  <Package className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
                  <p className="text-muted-foreground font-medium">Select an order to view details and assign riders</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
