import React, { useState, useEffect } from 'react';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import {
  Package,
  Phone,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  LogOut,
  Menu as MenuIcon,
  X,
  Bike
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { subscribeToRiderOrdersByHostels, updateOrder } from '../../../services/db';
import { useTheme } from '../../../context/ThemeContext';

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const { adminTheme } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isDark = adminTheme === 'dark';

  useEffect(() => {
    if (!user?.assignedHostelIds || user.assignedHostelIds.length === 0) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToRiderOrdersByHostels(user.assignedHostelIds, (newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const activeOrders = orders.filter(o => o.status === 'PAID' || o.status === 'OUT_FOR_DELIVERY');
  const deliveredToday = orders.filter(o => {
    if (o.status !== 'DELIVERED') return false;
    const d = o.updatedAt?.seconds ? new Date(o.updatedAt.seconds * 1000) : new Date(o.updatedAt);
    return d.toDateString() === new Date().toDateString();
  });

  const earnings = (deliveredToday.length * 300);

  // Stats logic: Today vs Yesterday
  const deliveredYesterday = orders.filter(o => {
    if (o.status !== 'DELIVERED') return false;
    const d = o.updatedAt?.seconds ? new Date(o.updatedAt.seconds * 1000) : new Date(o.updatedAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  });

  const growth = deliveredToday.length >= deliveredYesterday.length;

  const groupOrdersByHostel = () => {
    const groups: { [key: string]: any[] } = {};
    activeOrders.forEach(o => {
      if (!groups[o.hostel]) groups[o.hostel] = [];
      groups[o.hostel].push(o);
    });
    return groups;
  };

  const handleAction = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PAID' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    try {
      await updateOrder(orderId, { status: nextStatus });
    } catch (error) {
      console.error(error);
    }
  };

  const generateManifest = (hostelName: string, batchOrders: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
            <html>
                <head>
                    <title>Purchase Manifest - ${hostelName}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
                        .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                        .hostel-title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
                        .meta { font-size: 12px; color: #666; margin-top: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { text-align: left; padding: 12px; border-bottom: 1px solid #eee; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
                        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
                        .qty { font-weight: 900; background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
                        .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="hostel-title">Manifest: ${hostelName}</div>
                        <div class="meta">Generated ${new Date().toLocaleString()} | Batch Size: ${batchOrders.length} Orders</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item Details</th>
                                <th>Qty</th>
                                <th>Plates</th>
                                <th>Student</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${batchOrders.map(o => `
                                <tr>
                                    <td>
                                        ${o.plates.map((p: any) => `
                                            <div style="margin-bottom: 8px;">
                                                <strong>Plate: ${p.type}</strong><br/>
                                                ${p.items.map((i: any) => `- ${i.item.name} (${i.options?.join(', ') || 'Standard'})`).join('<br/>')}
                                            </div>
                                        `).join('')}
                                        ${o.drinksSnacks?.map((ds: any) => `<div>${ds.name}</div>`).join('') || ''}
                                    </td>
                                    <td>
                                        ${o.plates.map((p: any) => p.items.map((i: any) => `<div style="margin-bottom: 8px;"><span class="qty">${i.quantity}</span></div>`).join('')).join('')}
                                    </td>
                                    <td>${o.plates.length}</td>
                                    <td>${o.fullName}<br/><small>${o.room}</small></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">CalebDeck Fleet Operations — Proprietary Logistics Document</div>
                    <script>window.print();</script>
                </body>
            </html>
        `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const groupedActive = groupOrdersByHostel();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-inter">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#141414]/80 backdrop-blur-xl border-b border-[#222222] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-[#222222] rounded-xl">
            <MenuIcon className="w-5 h-5 text-[#9C8F7F]" />
          </button>
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black uppercase tracking-widest text-white">{user?.fullName}</p>
            <p className="text-[10px] font-bold text-[#9C8F7F] uppercase tracking-widest">{user?.department}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FCD34D] p-[2px]">
            <div className="w-full h-full rounded-full bg-[#141414] flex items-center justify-center font-black text-xs">
              {user?.fullName?.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#141414] border-[#222222] p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.2em] mb-1">Total Earnings</p>
                <h3 className="text-3xl font-black text-white italic">₦{earnings.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-green-500/10 rounded-2xl">
                <Wallet className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {growth ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
              <span className={`text-[10px] font-black uppercase ${growth ? 'text-green-500' : 'text-red-500'}`}>
                {growth ? '+ Efficient' : '- Scale Down'}
              </span>
            </div>
          </Card>

          <Card className="bg-[#141414] border-[#222222] p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.2em] mb-1">Delivered Today</p>
                <h3 className="text-3xl font-black text-[#7C3AED] italic">{deliveredToday.length}</h3>
              </div>
              <div className="p-3 bg-[#7C3AED]/10 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-[#7C3AED]" />
              </div>
            </div>
            <p className="mt-4 text-[10px] font-bold text-[#444444] uppercase tracking-widest leading-none">
              Daily Target Threshold: 20
            </p>
          </Card>

          <Card className="bg-[#141414] border-[#222222] p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-[#9C8F7F] uppercase tracking-[0.2em] mb-1">Yesterday's Reach</p>
                <h3 className="text-3xl font-black text-white italic">{deliveredYesterday.length}</h3>
              </div>
              <div className="p-3 bg-[#FCD34D]/10 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-[#FCD34D]" />
              </div>
            </div>
            <p className="mt-4 text-[10px] font-bold text-[#444444] uppercase tracking-widest leading-none">
              Previous Operations Cycle
            </p>
          </Card>
        </div>

        {/* Operations Core */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse"></div>
              <h2 className="text-xl font-black uppercase tracking-widest">Active Dispatch Batches</h2>
            </div>
            <Badge variant="purple" className="px-4 py-1.5">{activeOrders.length} Pending</Badge>
          </div>

          {Object.keys(groupedActive).length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-8">
              {Object.entries(groupedActive).map(([hostel, batchOrders]) => (
                <Card key={hostel} className="bg-[#141414] border-[#222222] overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-[#222222] bg-gradient-to-br from-[#1A1A1A] to-[#141414]">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-2xl font-black tracking-tight text-white uppercase">{hostel}</h4>
                        <p className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.3em] mt-1">{batchOrders.length} Active Drop-offs</p>
                      </div>
                      <button
                        onClick={() => generateManifest(hostel, batchOrders)}
                        className="p-3 bg-[#222222] hover:bg-[#2A2A2A] rounded-xl transition-all group"
                        title="Print Manifest"
                      >
                        <FileText className="w-5 h-5 text-[#FCD34D] group-hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#222222]">
                        <p className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest mb-1">Total Plates</p>
                        <p className="text-xl font-black text-white">{batchOrders.reduce((s, o) => s + o.plates.length, 0)}</p>
                      </div>
                      <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#222222]">
                        <p className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest mb-1">Est. Revenue</p>
                        <p className="text-xl font-black text-green-500">₦{(batchOrders.length * 300).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {batchOrders.map((order) => (
                      <div key={order.id} className="p-5 bg-[#1A1A1A] border border-[#222222] rounded-3xl hover:border-[#7C3AED]/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-black text-sm text-white">{order.fullName}</h5>
                            <p className="text-[10px] font-bold text-[#9C8F7F]">Room {order.room} • {order.plates.length} Plates</p>
                          </div>
                          <Badge variant={order.status === 'PAID' ? 'gold' : 'purple'} className="text-[9px]">
                            {order.status === 'PAID' ? 'PREPARING' : 'IN TRANSIT'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <a href={`tel:${order.phone}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0A0A0A] hover:bg-[#111] rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#222222]">
                            <Phone className="w-3 h-3 text-[#7C3AED]" /> Call
                          </a>
                          <button
                            onClick={() => handleAction(order.id, order.status)}
                            className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${order.status === 'PAID'
                              ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                              : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                          >
                            {order.status === 'PAID' ? <Bike className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {order.status === 'PAID' ? 'Begin Transit' : 'Confirm Delivery'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center bg-[#141414] rounded-[3rem] border-2 border-dashed border-[#222222]">
              <div className="w-20 h-20 bg-[#222222] rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-[#444444]" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Zero Active Dispatches</h3>
              <p className="text-[#9C8F7F] text-xs font-bold uppercase tracking-widest mt-2">Standing by for logistical routing...</p>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-[80%] max-w-sm bg-[#141414] border-l border-[#222222] p-10 flex flex-col">
            <div className="flex justify-between items-center mb-12">
              <Logo size="sm" />
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-[#222222] rounded-xl"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 space-y-8">
              <div>
                <p className="text-[10px] font-black text-[#444444] uppercase tracking-widest mb-4">Personnel Profile</p>
                <div className="space-y-4">
                  <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-[#222222]">
                    <p className="text-[9px] font-black text-[#9C8F7F] uppercase tracking-widest">{user?.fullName}</p>
                    <p className="text-sm font-black text-white">{user?.phone}</p>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={logout} className="mt-auto flex items-center justify-center gap-3 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
              <LogOut className="w-4 h-4" /> Terminate Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}