import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { Loader2, RefreshCcw, CheckCircle2, AlertCircle, Clock, Search, Filter, Wifi, Phone, Zap, DollarSign, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type TimeRange = 'today' | 'week' | 'month';
type Tab = 'dashboard' | 'history';

export default function AdminCalebNet() {
  const { adminTheme } = useTheme();
  const isDark = adminTheme === 'dark';
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    const q = query(collection(db, 'calebnet_orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching CalebNet orders:', error);
      toast.error('Failed to load orders');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRequery = async (reference: string) => {
    setIsProcessing(reference);
    try {
      const res = await fetch('/api/calebnet-requery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) });
      const data = await res.json();
      res.ok ? toast.success(`Requery: ${data.status}`) : toast.error(data.error || 'Requery failed');
    } catch { toast.error('Network error'); } finally { setIsProcessing(null); }
  };

  const handleRetry = async (reference: string) => {
    if (!window.confirm('Retry this vending? Ensure VTpass has not already processed it.')) return;
    setIsProcessing(reference);
    try {
      const res = await fetch('/api/calebnet-retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) });
      const data = await res.json();
      res.ok ? toast.success(`Retry: ${data.status}`) : toast.error(data.error || 'Retry failed');
    } catch { toast.error('Network error'); } finally { setIsProcessing(null); }
  };

  const parseDate = (d: any) => d?.seconds ? new Date(d.seconds * 1000) : d ? new Date(d) : null;
  const now = new Date();

  const getRangeBounds = (range: TimeRange) => {
    if (range === 'today') return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) };
    if (range === 'week') return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    return { start: startOfMonth(now), end: endOfMonth(now) };
  };

  const rangeOrders = useMemo(() => {
    const bounds = getRangeBounds(timeRange);
    return orders.filter(o => { const d = parseDate(o.createdAt); return d && isWithinInterval(d, bounds); });
  }, [orders, timeRange]);

  const successfulOrders = rangeOrders.filter(o => o.fulfillmentStatus === 'SUCCESSFUL');
  const totalRevenue = rangeOrders.reduce((s, o) => s + (o.amountPaid || 0), 0);
  const successRevenue = successfulOrders.reduce((s, o) => s + (o.amountPaid || 0), 0);
  const pendingCount = orders.filter(o => o.fulfillmentStatus === 'PENDING_PROVIDER' || o.fulfillmentStatus === 'PROCESSING').length;
  const failedCount = orders.filter(o => o.fulfillmentStatus === 'REFUND_REQUIRED').length;
  const successRate = rangeOrders.length > 0 ? ((successfulOrders.length / rangeOrders.length) * 100).toFixed(0) : '0';

  // Network breakdown for pie chart
  const networkBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    rangeOrders.forEach(o => { counts[o.network || 'Unknown'] = (counts[o.network || 'Unknown'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [rangeOrders]);

  // Revenue chart data
  const revenueData = useMemo(() => {
    const bounds = getRangeBounds(timeRange);
    let days: Date[] = [];
    if (timeRange === 'today') { days = [now]; }
    else if (timeRange === 'week') {
      const count = Math.floor((bounds.end.getTime() - bounds.start.getTime()) / 86400000) + 1;
      days = Array.from({ length: count }, (_, i) => new Date(bounds.start.getFullYear(), bounds.start.getMonth(), bounds.start.getDate() + i));
    } else {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      days = Array.from({ length: daysInMonth }, (_, i) => new Date(bounds.start.getFullYear(), bounds.start.getMonth(), bounds.start.getDate() + i));
    }
    return days.map(d => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => { const od = parseDate(o.createdAt); return od && format(od, 'yyyy-MM-dd') === dateStr; });
      return { name: format(d, timeRange === 'week' ? 'EEE' : timeRange === 'month' ? 'MMM d' : 'HH:mm'), revenue: dayOrders.reduce((s, o) => s + (o.amountPaid || 0), 0), orders: dayOrders.length };
    });
  }, [orders, timeRange]);

  const COLORS = ['#FCD34D', '#EF4444', '#22C55E', '#065F46', '#7C3AED'];
  const getNetworkColor = (n: string) => { switch (n?.toUpperCase()) { case 'MTN': return '#FCD34D'; case 'AIRTEL': return '#EF4444'; case 'GLO': return '#22C55E'; case '9MOBILE': return '#065F46'; default: return '#7C3AED'; } };
  const getStatusBadge = (s: string) => { switch (s) { case 'SUCCESSFUL': return <Badge variant="green"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>; case 'PENDING_PROVIDER': case 'PROCESSING': return <Badge variant="amber"><Clock className="w-3 h-3 mr-1" />Pending</Badge>; case 'REFUND_REQUIRED': return <Badge variant="purple"><AlertCircle className="w-3 h-3 mr-1" />Refund</Badge>; default: return <Badge variant="gray">{s || 'Unknown'}</Badge>; } };

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.phoneNumber?.includes(search) || o.id?.toLowerCase().includes(search.toLowerCase()) || o.network?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.fulfillmentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const cardBg = isDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-gray-100 shadow-sm';
  const mutedText = isDark ? 'text-[#9C8F7F]' : 'text-gray-500';
  const headingText = isDark ? 'text-[#FAF9F6]' : 'text-gray-900';
  const timeLabel = timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month';

  if (isLoading) return (
    <AdminLayout title="CalebNet">
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#7C3AED]' : 'border-purple-600'}`} />
        <p className="text-muted-foreground font-medium">Loading CalebNet...</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="CalebNet">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 mb-8 p-1 rounded-2xl bg-muted/50 w-fit">
        {([['dashboard', 'Dashboard', BarChart3], ['history', 'Order History', Clock]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === key ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Time Range */}
          <div className="flex items-center gap-2 mb-8">
            {(['today', 'week', 'month'] as TimeRange[]).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20' : isDark ? 'bg-[#2A2A2A] text-[#9C8F7F] hover:bg-[#333]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Orders', value: rangeOrders.length.toString(), icon: <Zap className="w-5 h-5" />, color: '#7C3AED' },
              { label: 'Gross Revenue', value: `₦${totalRevenue.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: '#10B981' },
              { label: 'Successful', value: `${successfulOrders.length} (${successRate}%)`, icon: <CheckCircle2 className="w-5 h-5" />, color: '#3B82F6' },
              { label: 'Pending', value: pendingCount.toString(), icon: <Clock className="w-5 h-5" />, color: '#F97316' },
              { label: 'Needs Refund', value: failedCount.toString(), icon: <AlertTriangle className="w-5 h-5" />, color: '#EF4444' },
            ].map((kpi, i) => (
              <Card key={i} className={`border ${cardBg}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>{kpi.label}</p>
                <p className={`text-2xl font-black tracking-tight ${headingText}`}>{kpi.value}</p>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Revenue Chart */}
            <Card className={`lg:col-span-2 p-6 lg:p-8 border ${cardBg}`}>
              <div className="mb-6">
                <h3 className={`text-lg font-black ${headingText}`}>CalebNet Revenue</h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${mutedText}`}>{timeLabel} performance</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs><linearGradient id="colorCalebNet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} /><stop offset="95%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="name" stroke="none" fontSize={10} fontWeight="bold" tick={{ fill: isDark ? '#9C8F7F' : '#6B7280' }} />
                    <YAxis stroke="none" fontSize={10} fontWeight="bold" tickFormatter={v => `₦${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fill: isDark ? '#9C8F7F' : '#6B7280' }} />
                    <Tooltip cursor={{ stroke: isDark ? '#333' : '#E5E7EB', strokeWidth: 2 }} contentStyle={{ backgroundColor: isDark ? '#1A1A1A' : '#fff', border: isDark ? '1px solid #333' : '1px solid #e5e7eb', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', padding: '12px 16px' }} labelStyle={{ fontWeight: 900, fontSize: 11, color: isDark ? '#FAF9F6' : '#111' }} formatter={(v: number) => [`₦${v.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorCalebNet)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Network Pie */}
            <Card className={`p-6 lg:p-8 border ${cardBg}`}>
              <div className="mb-6">
                <h3 className={`text-lg font-black ${headingText}`}>By Network</h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${mutedText}`}>Transaction distribution</p>
              </div>
              {networkBreakdown.length > 0 ? (
                <>
                  <div className="h-52 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={networkBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} cornerRadius={8} dataKey="value" stroke="none">
                          {networkBreakdown.map((entry, i) => <Cell key={i} fill={getNetworkColor(entry.name)} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#1A1A1A' : '#fff', border: isDark ? '1px solid #333' : '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '8px 14px' }} formatter={(v: number, name: string) => [`${v} orders`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`text-3xl font-black ${headingText}`}>{rangeOrders.length}</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${mutedText}`}>Orders</span>
                    </div>
                  </div>
                  <div className="space-y-3 mt-4">
                    {networkBreakdown.map((n, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNetworkColor(n.name) }} /><span className={`text-xs font-bold ${mutedText}`}>{n.name}</span></div>
                        <span className={`text-xs font-black ${headingText}`}>{n.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={`flex flex-col items-center justify-center py-16 ${mutedText}`}><Wifi className="w-10 h-10 mb-3 opacity-20" /><p className="text-xs font-bold">No data {timeLabel.toLowerCase()}</p></div>
              )}
            </Card>
          </div>

          {/* Bottom stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Avg. Transaction', value: `₦${rangeOrders.length > 0 ? Math.round(totalRevenue / rangeOrders.length).toLocaleString() : 0}`, icon: <DollarSign className="w-6 h-6 text-[#7C3AED]" />, bg: 'bg-[#7C3AED]/10' },
              { label: 'Success Rate', value: `${successRate}%`, icon: <TrendingUp className="w-6 h-6 text-[#10B981]" />, bg: 'bg-[#10B981]/10' },
              { label: 'Data Orders', value: rangeOrders.filter(o => o.type === 'data').length.toString(), icon: <Wifi className="w-6 h-6 text-[#3B82F6]" />, bg: 'bg-[#3B82F6]/10' },
              { label: 'Airtime Orders', value: rangeOrders.filter(o => o.type === 'airtime').length.toString(), icon: <Phone className="w-6 h-6 text-[#F97316]" />, bg: 'bg-[#F97316]/10' },
            ].map((s, i) => (
              <Card key={i} className={`p-6 border ${cardBg}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center`}>{s.icon}</div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${mutedText}`}>{s.label}</p>
                    <p className={`text-2xl font-black tracking-tight ${headingText}`}>{s.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <>
          {/* Search & Filter */}
          <Card className="p-4 mb-6 border border-border/60">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input type="text" placeholder="Search phone, reference, or network..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-muted/50 border-2 border-border rounded-xl text-sm focus:border-[#7C3AED] outline-none transition-all font-medium text-foreground" />
              </div>
              <div className="sm:w-56 relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-muted/50 border-2 border-border rounded-xl text-sm focus:border-[#7C3AED] outline-none transition-all appearance-none font-medium text-foreground">
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESSFUL">Successful</option>
                  <option value="PENDING_PROVIDER">Pending Provider</option>
                  <option value="REFUND_REQUIRED">Refund Required</option>
                  <option value="PROCESSING">Processing</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Orders Table */}
          <Card className="border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className={`text-xs uppercase font-bold tracking-wider ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <tr>
                    <th className="px-6 py-4">Network & Type</th>
                    <th className="px-6 py-4">Plan / Amount</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3"><Wifi className="w-10 h-10 text-muted-foreground/50" /><p className="text-muted-foreground font-medium">No orders found.</p></div>
                    </td></tr>
                  ) : filteredOrders.map(order => {
                    const date = parseDate(order.createdAt);
                    return (
                      <tr key={order.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50/70'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: getNetworkColor(order.network) }}>
                              {order.type === 'data' ? <Wifi className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                            </div>
                            <div><span className="font-bold text-foreground uppercase block">{order.network}</span><span className="text-xs text-muted-foreground capitalize">{order.type}</span></div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="font-bold text-foreground">₦{order.amountPaid?.toLocaleString()}</span><span className="text-xs text-muted-foreground block max-w-[180px] truncate">{order.planName || 'Airtime'}</span></td>
                        <td className="px-6 py-4"><span className="font-mono font-medium text-foreground">{order.phoneNumber}</span></td>
                        <td className="px-6 py-4"><span className="text-xs text-muted-foreground font-medium">{date ? format(date, 'MMM d, h:mm a') : 'N/A'}</span></td>
                        <td className="px-6 py-4">{getStatusBadge(order.fulfillmentStatus)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {(order.fulfillmentStatus === 'PENDING_PROVIDER' || order.fulfillmentStatus === 'PROCESSING') && (
                              <button onClick={() => handleRequery(order.id)} disabled={isProcessing === order.id} className="p-2 text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg transition-colors disabled:opacity-50" title="Requery">
                                <RefreshCcw className={`w-4 h-4 ${isProcessing === order.id ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                            {order.fulfillmentStatus === 'REFUND_REQUIRED' && (
                              <Button variant="secondary" onClick={() => handleRetry(order.id)} disabled={isProcessing === order.id} className="text-xs px-3 py-1.5 border-orange-300 text-orange-600 hover:bg-orange-50">
                                {isProcessing === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Retry'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
