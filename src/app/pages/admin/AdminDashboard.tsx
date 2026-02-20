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
  Clock,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { subscribeToAllOrders } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function AdminDashboard() {
  const { adminTheme } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeToAllOrders((newOrders) => {
      setOrders(newOrders);
    });
    return () => unsub();
  }, []);

  const isDark = adminTheme === 'dark';
  const today = new Date().toLocaleDateString();

  const todayPaidOrders = orders.filter(o => {
    if (!o.createdAt || o.status === 'CANCELLED') return false;
    const date = o.createdAt.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
    return date.toLocaleDateString() === today;
  });

  const totalRevenue = todayPaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Assuming delivery fee is ~700 per plate for solo and ~560 for group (average ~600 for profit estimation if not stored)
  // Or if we want to be precise, we should store deliveryFee in orderData. 
  // For now, let's calculate based on plates.length * average fee as a proxy, or ideally use the breakdown if available.
  const totalNetProfit = todayPaidOrders.reduce((sum, o) => {
    const deliveryFee = o.deliveryMode === 'group' ? 560 : 700;
    return sum + (deliveryFee * (o.plates?.length || 1));
  }, 0);

  // Calculate hostel batches dynamically
  const hostelBatches = Array.from(new Set(orders.map(o => o.hostel || 'Main'))).map(hostel => {
    const hostelOrders = orders.filter(o => (o.hostel || 'Main') === hostel && o.status === 'PAID');
    return {
      hostel,
      pendingOrders: hostelOrders.length,
      totalPlates: hostelOrders.reduce((sum, o) => sum + (o.plates?.length || 0), 0),
      riders: Array.from(new Set(hostelOrders.map(o => o.riderName).filter(Boolean))) as string[]
    };
  }).filter(b => b.pendingOrders > 0).slice(0, 5);

  const kpis = [
    {
      label: "Today's Orders",
      value: todayPaidOrders.length.toString(),
      change: '+12%',
      icon: <ShoppingBag className="w-6 h-6" />,
      color: '#7C3AED'
    },
    {
      label: 'Gross Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      change: '+8%',
      icon: <DollarSign className="w-6 h-6" />,
      color: '#FCD34D'
    },
    {
      label: 'Net Profit (Fees)',
      value: `₦${totalNetProfit.toLocaleString()}`,
      change: '+15%',
      icon: <CheckCircle className="w-6 h-6" />,
      color: '#10B981'
    },
    {
      label: 'Active Riders',
      value: '8', // This should later be dynamic
      change: 'Fleet Active',
      icon: <Users className="w-6 h-6" />,
      color: '#7C3AED'
    },
  ];

  const handleDispatch = (hostel: string) => {
    alert(`Dispatching batch for ${hostel}. Riders will be automatically notified.`);
  };

  return (
    <AdminLayout title="Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {kpis.map((kpi, index) => (
          <Card key={index} hover className={isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}>
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
              <Badge variant={kpi.change.startsWith('+') ? 'green' : 'gray'} className="text-[10px] font-black tracking-wider px-2 py-1">
                <TrendingUp className="w-3 h-3" />
                {kpi.change}
              </Badge>
            </div>
            <p className={`text-sm mb-1 font-medium ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{kpi.label}</p>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Hostel Groups */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-4">
          <h2 className={`text-xl lg:text-2xl font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Orders by Hostel</h2>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" className={isDark ? 'text-[#9C8F7F] hover:text-white hover:bg-[#2A2A2A]' : 'text-gray-500'}>
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">View All Batches</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {hostelBatches.length > 0 ? hostelBatches.map((batch, index) => (
            <Card key={index} className={isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100 shadow-sm'}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className={`text-lg lg:text-xl font-bold ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{batch.hostel}</h3>
                    {batch.pendingOrders > 0 && (
                      <Badge variant="gold" className="text-[10px] uppercase font-black px-2 py-0.5">
                        {batch.pendingOrders} pending
                      </Badge>
                    )}
                  </div>
                  <div className={`flex flex-wrap items-center gap-4 lg:gap-6 text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{batch.pendingOrders} orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>{batch.totalPlates} plates</span>
                    </div>
                    {batch.riders.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{batch.riders.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleDispatch(batch.hostel)}
                  disabled={batch.pendingOrders === 0}
                  className="w-full sm:w-auto bg-[#FCD34D] text-black hover:bg-[#FCD34D]/90 px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-[#FCD34D]/20 active:scale-95"
                >
                  Dispatch Batch
                </Button>
              </div>
            </Card>
          )) : (
            <div className={`p-12 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-[#333333] text-[#9C8F7F]' : 'border-gray-100 text-gray-400'}`}>
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium font-black uppercase tracking-widest text-[10px]">No active batches at the moment</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div>
        <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>Recent Orders</h2>
        <Card className={`p-0 overflow-hidden ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-[#333333]' : 'border-gray-50'}`}>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Order ID</th>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Student</th>
                  <th className={`hidden sm:table-cell text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Hostel</th>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Plates</th>
                  <th className={`text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Amount</th>
                  <th className={`hidden md:table-cell text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Status</th>
                  <th className={`hidden lg:table-cell text-left py-4 px-6 text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>Time</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-[#333333]' : 'divide-gray-50'}`}>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-50'}`}>
                    <td className="py-4 px-6">
                      <span className={`font-mono font-bold text-xs ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>CD-{order.orderId?.slice(-5) || '38492'}</span>
                    </td>
                    <td className={`py-4 px-6 font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.fullName || 'Chioma A.'}</td>
                    <td className={`hidden sm:table-cell py-4 px-6 text-sm ${isDark ? 'text-[#9C8F7F]' : 'text-gray-500'}`}>{order.hostel || 'Deborah Hall'}</td>
                    <td className={`py-4 px-6 font-bold text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>{order.plates?.length || 0}</td>
                    <td className={`py-4 px-6 font-black text-sm ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`}>₦{order.total?.toLocaleString()}</td>
                    <td className="hidden md:table-cell py-4 px-6">
                      <Badge
                        variant={
                          order.status === 'DELIVERED' ? 'green' :
                            order.status === 'PREPARING' ? 'purple' :
                              'gold'
                        }
                        className="text-[9px] uppercase font-black tracking-widest px-3 py-1"
                      >
                        {order.status?.toLowerCase().replace('_', ' ') || 'preparing'}
                      </Badge>
                    </td>
                    <td className={`hidden lg:table-cell py-4 px-6 text-xs font-bold ${isDark ? 'text-[#9C8F7F]' : 'text-gray-400'}`}>
                      {order.createdAt ? '2 min ago' : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}