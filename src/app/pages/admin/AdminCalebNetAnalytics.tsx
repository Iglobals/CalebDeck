import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, BarChart3, CheckCircle2, Loader2, TrendingUp, XCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';

const money = (val: any) => `₦${Number(val || 0).toLocaleString()}`;

type DateFilter = 'TODAY' | 'WEEK' | 'MONTH';

export function AdminCalebNetAnalytics() {
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('WEEK');
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [recentFailed, setRecentFailed] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        let daysAgo = 7;
        if (dateFilter === 'TODAY') daysAgo = 1;
        else if (dateFilter === 'MONTH') daysAgo = 30;

        const startDate = format(subDays(new Date(), daysAgo - 1), 'yyyy-MM-dd');
        
        const q = query(
          collection(db, 'calebnet_analytics_daily'),
          where('date', '>=', startDate),
          orderBy('date', 'asc')
        );

        const snap = await getDocs(q);
        setDailyStats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('[CalebNet Analytics] Failed to load daily stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [dateFilter]);

  useEffect(() => {
    const q = query(
      collection(db, 'calebnet_orders'),
      where('fulfillmentStatus', 'in', ['FAILED', 'PENDING_PROVIDER', 'REFUND_REQUIRED']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentFailed(all.filter((o: any) => o.status !== 'REFUNDED'));
    });
    return () => unsub();
  }, []);

  const aggregated = useMemo(() => {
    return dailyStats.reduce((acc, curr) => ({
      revenue: acc.revenue + (curr.totalRevenue || 0),
      profit: acc.profit + (curr.totalProfit || 0),
      success: acc.success + (curr.successfulTransactions || 0),
      failed: acc.failed + (curr.failedTransactions || 0),
      pending: acc.pending + (curr.pendingTransactions || 0),
      refundRequired: acc.refundRequired + (curr.refundRequired || 0),
    }), { revenue: 0, profit: 0, success: 0, failed: 0, pending: 0, refundRequired: 0 });
  }, [dailyStats]);

  const topPlansList = useMemo(() => {
    const map: Record<string, any> = {};
    dailyStats.forEach(day => {
      if (!day.topPlans) return;
      Object.entries(day.topPlans).forEach(([planId, data]: [string, any]) => {
        if (!map[planId]) map[planId] = { id: planId, planName: data.planName, count: 0, revenue: 0, profit: 0 };
        map[planId].count += data.count || 0;
        map[planId].revenue += data.revenue || 0;
        map[planId].profit += data.profit || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [dailyStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">Monitor CalebNet revenue safely (optimized to avoid Firestore quota exhaustion).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['TODAY', 'WEEK', 'MONTH'].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter as DateFilter)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${dateFilter === filter ? 'bg-[#7C3AED] text-white shadow-md' : 'bg-card text-muted-foreground border-2 border-border hover:border-[#7C3AED]/50'}`}
            >
              {filter === 'TODAY' ? 'Today' : filter === 'WEEK' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-black uppercase tracking-widest">Revenue</span>
                <TrendingUp className="h-4 w-4 text-[#7C3AED]" />
              </div>
              <p className="text-3xl font-black text-[#7C3AED]">{money(aggregated.revenue)}</p>
            </Card>
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-black uppercase tracking-widest">Profit</span>
                <BarChart3 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-black text-emerald-500">{money(aggregated.profit)}</p>
            </Card>
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-black uppercase tracking-widest">Successful</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-3xl font-black">{aggregated.success}</p>
            </Card>
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-black uppercase tracking-widest">Failed / Refund</span>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-3xl font-black text-red-500">{aggregated.failed} / {aggregated.refundRequired}</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-6 text-lg font-black">Revenue & Profit Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} dy={10} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₦${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: 'var(--foreground)' }} 
                    itemStyle={{ fontWeight: 'bold' }}
                    cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '10px' }} />
                  <Bar dataKey="totalRevenue" name="Revenue" fill="url(#colorRev)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  <Bar dataKey="totalProfit" name="Profit" fill="url(#colorProf)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-black">Top Selling Plans</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-border text-muted-foreground">
                      <th className="pb-3 font-bold uppercase tracking-widest text-xs">Plan</th>
                      <th className="pb-3 font-bold uppercase tracking-widest text-xs text-right">Sold</th>
                      <th className="pb-3 font-bold uppercase tracking-widest text-xs text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topPlansList.length === 0 ? (
                      <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No data available for this period.</td></tr>
                    ) : (
                      topPlansList.map(plan => (
                        <tr key={plan.id} className="transition-colors hover:bg-muted/30">
                          <td className="py-3 font-bold">{plan.planName}</td>
                          <td className="py-3 text-right">{plan.count}</td>
                          <td className="py-3 text-right font-mono font-bold text-[#7C3AED]">{money(plan.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-500" /> Action Required</h3>
                {recentFailed.length > 0 && <Badge variant="red" className="animate-pulse">{recentFailed.length}</Badge>}
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-border text-muted-foreground">
                      <th className="pb-3 font-bold uppercase tracking-widest text-xs">Time</th>
                      <th className="pb-3 font-bold uppercase tracking-widest text-xs">Details</th>
                      <th className="pb-3 font-bold uppercase tracking-widest text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentFailed.length === 0 ? (
                      <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No recent failed or pending orders.</td></tr>
                    ) : (
                      recentFailed.map(order => (
                        <tr key={order.id} className="transition-colors hover:bg-muted/30">
                          <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {order.createdAt?.seconds ? format(order.createdAt.seconds * 1000, 'MMM d, HH:mm') : 'Just now'}
                          </td>
                          <td className="py-3">
                            <p className="font-bold">{order.phoneNumber}</p>
                            <p className="text-xs text-muted-foreground">{order.planName || order.type}</p>
                          </td>
                          <td className="py-3">
                            <Badge variant={order.fulfillmentStatus === 'FAILED' ? 'red' : order.fulfillmentStatus === 'REFUND_REQUIRED' ? 'red' : 'amber'}>
                              {order.fulfillmentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
