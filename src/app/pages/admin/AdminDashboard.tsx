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
  DollarSign
} from 'lucide-react';

interface HostelBatch {
  hostel: string;
  pendingOrders: number;
  totalPlates: number;
  riders: string[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const hostelBatches: HostelBatch[] = [
    { hostel: 'Deborah Hall', pendingOrders: 5, totalPlates: 12, riders: ['John Doe', 'Jane Smith'] },
    { hostel: 'Integrity Hall', pendingOrders: 8, totalPlates: 18, riders: ['Mike Johnson'] },
    { hostel: 'Mary Hall', pendingOrders: 3, totalPlates: 7, riders: ['Sarah Williams'] },
    { hostel: 'Levi Hall', pendingOrders: 6, totalPlates: 14, riders: ['David Brown'] },
    { hostel: 'Mercy Hall', pendingOrders: 4, totalPlates: 9, riders: ['Lisa Davis'] },
  ];

  const kpis = [
    { 
      label: "Today's Orders", 
      value: '26', 
      change: '+12%', 
      icon: <ShoppingBag className="w-6 h-6" />,
      color: '#7C3AED'
    },
    { 
      label: 'Revenue', 
      value: '₦45,800', 
      change: '+8%', 
      icon: <DollarSign className="w-6 h-6" />,
      color: '#FCD34D'
    },
    { 
      label: 'Active Riders', 
      value: '8', 
      change: '100%', 
      icon: <Users className="w-6 h-6" />,
      color: '#7C3AED'
    },
    { 
      label: 'Avg Delivery', 
      value: '28 min', 
      change: '-5%', 
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
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
                      <TrendingUp className="w-3 h-3" />
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
                  <Button variant="secondary" size="sm">
                    <Package className="w-4 h-4" />
                    View All Batches
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {hostelBatches.map((batch, index) => (
                  <Card key={index}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-[#121212]">{batch.hostel}</h3>
                          {batch.pendingOrders > 0 && (
                            <Badge variant="gold">
                              {batch.pendingOrders} pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-[#9C8F7F]">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" />
                            <span>{batch.pendingOrders} orders</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>{batch.totalPlates} plates</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{batch.riders.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => handleDispatch(batch.hostel)}
                        disabled={batch.pendingOrders === 0}
                      >
                        Dispatch Batch
                      </Button>
                    </div>
                  </Card>
                ))}
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
                      {[
                        { id: 'CD-38492', student: 'Chioma A.', hostel: 'Deborah Hall', plates: 2, amount: 3400, status: 'preparing', time: '2 min ago' },
                        { id: 'CD-38491', student: 'David O.', hostel: 'Integrity Hall', plates: 3, amount: 5600, status: 'picked-up', time: '5 min ago' },
                        { id: 'CD-38490', student: 'Faith M.', hostel: 'Mary Hall', plates: 1, amount: 2200, status: 'on-way', time: '8 min ago' },
                        { id: 'CD-38489', student: 'John D.', hostel: 'Levi Hall', plates: 2, amount: 4100, status: 'delivered', time: '12 min ago' },
                      ].map((order, index) => (
                        <tr key={index} className="border-b border-[#E5E2DC] hover:bg-[#FAF9F6] transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-mono font-semibold text-[#121212]">{order.id}</span>
                          </td>
                          <td className="py-4 px-4 text-[#121212]">{order.student}</td>
                          <td className="py-4 px-4 text-[#9C8F7F]">{order.hostel}</td>
                          <td className="py-4 px-4 text-[#121212]">{order.plates}</td>
                          <td className="py-4 px-4 font-semibold text-[#121212]">₦{order.amount.toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <Badge 
                              variant={
                                order.status === 'delivered' ? 'green' :
                                order.status === 'on-way' ? 'gold' :
                                'purple'
                              }
                            >
                              {order.status.replace('-', ' ')}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-[#9C8F7F] text-sm">{order.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}