import React, { useState } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Settings,
  Search,
  Bell,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronRight,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { subscribeToAllOrders, getActiveHostels, Hostel } from '../../../services/db';
import { formatDistanceToNow } from 'date-fns';

interface HostelBatch {
  hostel: string;
  pendingOrders: number;
  totalPlates: number;
  riders: string[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  React.useEffect(() => {
    const unsubOrders = subscribeToAllOrders((newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    });

    const fetchHostels = async () => {
      const activeHostels = await getActiveHostels();
      setHostels(activeHostels);
    };

    fetchHostels();
    return () => unsubOrders();
  }, []);

  // Calculate KPIs from real data
  const todayOrders = orders.filter(o => {
    const today = new Date();
    const orderDate = new Date(o.createdAt);
    return orderDate.toDateString() === today.toDateString();
  });

  const totalRevenue = todayOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  const kpis = [
    {
      label: "Today's Orders",
      value: todayOrders.length.toString(),
      change: '+10%', // Static for now
      icon: <ShoppingBag className="w-6 h-6" />,
      color: '#7C3AED'
    },
    {
      label: 'Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      change: '+5%',
      icon: <DollarSign className="w-6 h-6" />,
      color: '#FCD34D'
    },
    {
      label: 'Active Riders',
      value: '2', // Mocked until we have a riders collection
      change: '100%',
      icon: <Users className="w-6 h-6" />,
      color: '#7C3AED'
    },
    {
      label: 'Pending Dispatches',
      value: orders.filter(o => o.status === 'PAID').length.toString(),
      change: 'Active',
      icon: <Clock className="w-6 h-6" />,
      color: '#10B981'
    },
  ];

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'orders', icon: <ShoppingBag className="w-5 h-5" />, label: 'Orders' },
    { id: 'batches', icon: <Package className="w-5 h-5" />, label: 'Batches' },
    { id: 'riders', icon: <Users className="w-5 h-5" />, label: 'Riders' },
    { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  const handleDispatch = (hostel: string) => {
    alert(`Dispatching batch for ${hostel}. Riders will be automatically notified.`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E2DC] flex flex-col">
        <div className="p-6 border-b border-[#E5E2DC]">
          <Logo size="md" />
          <p className="text-xs text-[#9C8F7F] mt-2">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#121212] hover:bg-[#FAF9F6]'
                  }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-[#E5E2DC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold">
              AD
            </div>
            <div>
              <p className="font-semibold text-[#121212] text-sm">Admin User</p>
              <p className="text-xs text-[#9C8F7F]">admin@caleb.edu</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#E5E2DC] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9C8F7F]" />
                <input
                  type="text"
                  placeholder="Search orders, riders, hostels..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#E5E2DC] bg-[#FAF9F6] focus:border-[#7C3AED] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <button className="relative p-2 hover:bg-[#FAF9F6] rounded-xl transition-colors">
                <Bell className="w-6 h-6 text-[#121212]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#FCD34D] rounded-full"></span>
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FCD34D]"></div>
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#121212] mb-2">
                {menuItems.find(item => item.id === activeTab)?.label}
              </h1>
              <p className="text-[#9C8F7F]">
                Manage your campus food delivery operations
              </p>
            </div>

            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {kpis.map((kpi, index) => (
                    <Card key={index} hover>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}
                        >
                          {kpi.icon}
                        </div>
                        <Badge variant={kpi.change.startsWith('+') ? 'green' : 'gray'} className="text-xs">
                          {kpi.change}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#9C8F7F] mb-1">{kpi.label}</p>
                      <p className="text-2xl font-bold text-[#121212]">{kpi.value}</p>
                    </Card>
                  ))}
                </div>

                {/* Hostel Groups */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-[#121212]">Orders by Hostel</h2>
                    <div className="flex gap-3">
                      <Button variant="secondary" size="sm" onClick={() => setActiveTab('batches')}>
                        <Package className="w-4 h-4" />
                        Management Batches
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {hostels.map((hostel) => {
                      const hostelOrders = orders.filter(o => o.hostel === hostel.name && o.status === 'PAID');
                      const totalPlates = hostelOrders.reduce((acc, o) => acc + (o.plates?.length || 0), 0);

                      return (
                        <Card key={hostel.id}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-bold text-[#121212]">{hostel.name}</h3>
                                {hostelOrders.length > 0 && (
                                  <Badge variant="gold">
                                    {hostelOrders.length} pending
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-6 text-sm text-[#9C8F7F]">
                                <div className="flex items-center gap-2">
                                  <ShoppingBag className="w-4 h-4" />
                                  <span>{hostelOrders.length} orders</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  <span>{totalPlates} plates</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  <span>Riders: {hostel.assignedRiderIds?.length || 0} assigned</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              onClick={() => setActiveTab('batches')}
                              disabled={hostelOrders.length === 0}
                            >
                              Dispatch Batch
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div>
                  <h2 className="text-2xl font-bold text-[#121212] mb-6">Recent Orders</h2>
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#E5E2DC]">
                            <th className="text-left py-4 px-4 text-sm font-semibold text-[#9C8F7F]">Order ID</th>
                            <th className="text-left py-4 px-4 text-sm font-semibold text-[#9C8F7F]">Student</th>
                            <th className="text-left py-4 px-4 text-sm font-semibold text-[#9C8F7F]">Hostel</th>
                            <th className="text-left py-4 px-4 text-sm font-semibold text-[#9C8F7F]">Plates</th>
                            <th className="text-left py-4 px-4 text-sm font-semibold text-[#9C8F7F]">Amount</th>
                            <th className="text-left py-4 px-4 text-sm font-semibold text-[#9C8F7F]">Status</th>
                            <th className="text-left py-4 px-4 text-sm font-semibold text-[#9C8F7F]">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map((order) => (
                            <tr
                              key={order.id}
                              className="border-b border-[#E5E2DC] hover:bg-[#FAF9F6] transition-colors group cursor-pointer"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <td className="py-4 px-4">
                                <span className="font-mono font-semibold text-[#121212]">{order.orderId || order.id.substring(0, 8)}</span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-[#121212] font-medium">{order.fullName}</div>
                                <div className="text-xs text-[#9C8F7F]">{order.phone}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-[#121212] font-bold">{order.hostel}</div>
                                <div className="text-xs text-[#9C8F7F]">Room {order.room}</div>
                              </td>
                              <td className="py-4 px-4 text-[#121212] font-bold text-center">{order.plates?.length || 0}</td>
                              <td className="py-4 px-4 font-semibold text-[#121212]">₦{order.total?.toLocaleString() || 0}</td>
                              <td className="py-4 px-4">
                                <Badge
                                  variant={
                                    order.status === 'DELIVERED' ? 'green' :
                                      order.status === 'ASSIGNED' ? 'purple' :
                                        'gold'
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </td>
                              <td className="py-4 px-4 text-[#9C8F7F] text-sm whitespace-nowrap">
                                {order.createdAt ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }) : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* Orders View */}
            {activeTab === 'orders' && (
              <Card>
                <div className="p-12 text-center">
                  <ShoppingBag className="w-16 h-16 text-[#E5E2DC] mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Extended Orders List</h3>
                  <p className="text-[#9C8F7F]">Implementation of advanced filtering and export coming soon.</p>
                </div>
              </Card>
            )}

            {/* Riders View */}
            {activeTab === 'riders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Active Riders</h2>
                  <Button variant="primary" size="sm">Add New Rider</Button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['Rider 1', 'Rider 2'].map((rider, i) => (
                    <Card key={i} hover>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold">
                          R{i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-[#121212]">{rider}</p>
                          <p className="text-xs text-[#9C8F7F]">Status: <span className="text-green-500 font-bold uppercase">Active</span></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E5E2DC]">
                        <div>
                          <p className="text-[10px] text-[#9C8F7F] uppercase font-black">Today's Trips</p>
                          <p className="font-black text-xl">12</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#9C8F7F] uppercase font-black">Rating</p>
                          <p className="font-black text-xl">4.8</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics View */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold mb-6">Operations Analytics</h2>

                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="bg-[#7C3AED] text-white border-none">
                    <p className="text-xs uppercase font-black opacity-60 mb-1">Total Revenue (All Time)</p>
                    <p className="text-4xl font-black">₦{orders.reduce((acc, o) => acc + (o.total || 0), 0).toLocaleString()}</p>
                  </Card>
                  <Card>
                    <p className="text-xs uppercase font-black text-[#9C8F7F] mb-1">Total Orders</p>
                    <p className="text-4xl font-black">{orders.length}</p>
                  </Card>
                  <Card>
                    <p className="text-xs uppercase font-black text-[#9C8F7F] mb-1">Avg Order Value</p>
                    <p className="text-4xl font-black">
                      ₦{orders.length ? Math.round(orders.reduce((acc, o) => acc + (o.total || 0), 0) / orders.length).toLocaleString() : 0}
                    </p>
                  </Card>
                </div>

                <Card>
                  <h3 className="font-bold mb-6">Popular Hostels</h3>
                  <div className="space-y-4">
                    {hostels.map(h => {
                      const count = orders.filter(o => o.hostel === h.name).length;
                      const percentage = orders.length ? (count / orders.length) * 100 : 0;
                      return (
                        <div key={h.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold">{h.name}</span>
                            <span className="text-[#9C8F7F]">{count} orders</span>
                          </div>
                          <div className="w-full bg-[#FAF9F6] h-2 rounded-full overflow-hidden border border-[#E5E2DC]">
                            <div className="bg-[#7C3AED] h-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Batches View */}
            {activeTab === 'batches' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Active Kitchen Batches</h2>
                {hostels.map(hostel => {
                  const pendingOrders = orders.filter(o => o.hostel === hostel.name && o.status === 'PAID');
                  if (pendingOrders.length === 0) return null;

                  return (
                    <Card key={hostel.id} className="border-l-4 border-l-[#FCD34D]">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-black">{hostel.name}</h3>
                            <Badge variant="gold">Ready for Dispatch</Badge>
                          </div>
                          <div className="space-y-3">
                            {pendingOrders.map(order => (
                              <div key={order.id} className="flex items-center gap-4 text-sm bg-[#FAF9F6] p-3 rounded-lg border border-[#E5E2DC]">
                                <span className="font-mono font-bold">{order.orderId}</span>
                                <span className="font-semibold">{order.fullName}</span>
                                <span className="text-[#9C8F7F]">{order.plates?.length} plates</span>
                                <span className="ml-auto font-bold">₦{order.total?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#9C8F7F] mb-1">Total Plates</p>
                          <p className="text-3xl font-black mb-6">{pendingOrders.reduce((acc, o) => acc + (o.plates?.length || 0), 0)}</p>
                          <Button variant="primary" className="shadow-lg shadow-[#7C3AED]/20">
                            Assign to Rider
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#121212]/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
          <Card className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
            <div className="sticky top-0 bg-white p-6 border-b border-[#E5E2DC] flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedOrder.orderId}</h3>
                  <p className="text-sm text-[#9C8F7F] uppercase font-black tracking-widest leading-none mt-1">{selectedOrder.status}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-[#FAF9F6] rounded-xl transition-colors"
              >
                <ChevronRight className="w-6 h-6 rotate-90" />
              </button>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-12 mb-12">
                <div>
                  <h4 className="text-xs text-[#9C8F7F] uppercase tracking-widest font-black mb-4">Student Info</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-[#9C8F7F] mt-1" />
                      <div>
                        <p className="font-bold text-[#121212]">{selectedOrder.fullName}</p>
                        <p className="text-sm text-[#9C8F7F]">{selectedOrder.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#9C8F7F] mt-1" />
                      <div>
                        <p className="font-bold text-[#121212]">{selectedOrder.hostel}</p>
                        <p className="text-sm text-[#9C8F7F]">Room {selectedOrder.room}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-[#9C8F7F] uppercase tracking-widest font-black mb-4">Transaction Details</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#9C8F7F]">Payment Reference</span>
                      <span className="font-mono font-bold text-[#121212]">{selectedOrder.paymentReference?.substring(0, 10)}...</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#9C8F7F]">Cafeteria</span>
                      <span className="font-bold text-[#121212]">{selectedOrder.cafeteria}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#9C8F7F]">Order Time</span>
                      <span className="font-bold text-[#121212]">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h4 className="text-xs text-[#9C8F7F] uppercase tracking-widest font-black mb-6">Plates Breakdown</h4>
                <div className="space-y-4">
                  {selectedOrder.plates?.map((plate: any, idx: number) => (
                    <div key={idx} className="bg-[#FAF9F6] p-6 rounded-2xl border border-[#E5E2DC]">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-black uppercase tracking-tighter text-xs text-[#7C3AED]">Plate {idx + 1} • {plate.type}</span>
                        <span className="font-bold">₦{plate.total.toLocaleString()}</span>
                      </div>
                      <div className="space-y-2">
                        {plate.items.map((pi: any, pidx: number) => (
                          <div key={pidx} className="flex justify-between text-sm">
                            <span className="text-[#9C8F7F]">{pi.item.name} <span className="text-xs">×{pi.quantity}</span></span>
                            <span>₦{(pi.item.price * pi.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mb-12">
                  <h4 className="text-xs text-[#9C8F7F] uppercase tracking-widest font-black mb-4">Kitchen Notes</h4>
                  <div className="bg-[#FCD34D]/10 p-4 rounded-xl border border-[#FCD34D]/30 text-sm">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-[#E5E2DC] flex justify-between items-center">
                <div>
                  <p className="text-xs text-[#9C8F7F] uppercase tracking-widest font-black mb-1">Total Amount Paid</p>
                  <p className="text-4xl font-black text-[#7C3AED]">₦{selectedOrder.total?.toLocaleString()}</p>
                </div>
                <div className="flex gap-4">
                  <Button variant="secondary">Print Ticket</Button>
                  <Button variant="primary">Confirm Order</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}