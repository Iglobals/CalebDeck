import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Loader2,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  Wifi,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

type Tab = 'dashboard' | 'orders' | 'catalog' | 'provider' | 'health';
type CalebNetType = 'DATA' | 'AIRTIME';

const NETWORK_CODES: Record<string, string> = { MTN: '01', GLO: '02', '9MOBILE': '03', AIRTEL: '04' };

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    console.error('[Admin CalebNet API failed]', {
      path,
      status: response.status,
      data,
      body: text,
    });
    throw new Error(data.error || data.message || text || `Request failed (${response.status})`);
  }
  return data;
}

function parseDate(value: any) {
  if (value?.seconds) return new Date(value.seconds * 1000);
  return value ? new Date(value) : null;
}

function statusBadge(status: string) {
  if (status === 'SUCCESSFUL' || status === 'HEALTHY') return <Badge variant="green"><CheckCircle2 className="mr-1 h-3 w-3" />{status}</Badge>;
  if (['PROCESSING', 'ORDER_RECEIVED', 'PENDING_PROVIDER', 'DEGRADED'].includes(status)) return <Badge variant="amber"><Clock className="mr-1 h-3 w-3" />{status}</Badge>;
  if (['REFUND_REQUIRED', 'FAILED', 'DOWN'].includes(status)) return <Badge variant="purple"><AlertCircle className="mr-1 h-3 w-3" />{status}</Badge>;
  return <Badge variant="gray">{status || 'UNKNOWN'}</Badge>;
}

export default function AdminCalebNet() {
  const [orders, setOrders] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [providerPlans, setProviderPlans] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busy, setBusy] = useState('');
  const [selectedProviderPlan, setSelectedProviderPlan] = useState<any | null>(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [featured, setFeatured] = useState(false);
  const [responseView, setResponseView] = useState<any | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'calebnet_orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('[CalebNet Orders listener failed]', error);
      toast.error(`Orders read failed: ${error.message}`);
    });
    const unsubCatalog = onSnapshot(query(collection(db, 'calebnet_catalog'), orderBy('network', 'asc')), (snap) => {
      setCatalog(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('[CalebNet Catalog listener failed]', error);
      toast.error(`Catalog read failed: ${error.message}`);
    });
    const unsubProvider = onSnapshot(query(collection(db, 'calebnet_provider_plans'), orderBy('lastSyncedAt', 'desc')), (snap) => {
      setProviderPlans(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('[CalebNet Provider Plans listener failed]', error);
      toast.error(`Provider plans read failed: ${error.message}`);
    });
    const unsubHealth = onSnapshot(collection(db, 'calebnet_provider_status'), (snap) => {
      setHealth(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('[CalebNet Health listener failed]', error);
      toast.error(`Provider health read failed: ${error.message}`);
    });
    return () => {
      unsubOrders();
      unsubCatalog();
      unsubProvider();
      unsubHealth();
    };
  }, []);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const haystack = `${order.id} ${order.network} ${order.phoneNumber} ${order.providerOrderId} ${order.providerRequestId}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'ALL' || order.fulfillmentStatus === statusFilter);
  }), [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const successful = orders.filter((order) => order.fulfillmentStatus === 'SUCCESSFUL');
    return {
      sales: orders.reduce((sum, order) => sum + Number(order.amountPaid || 0), 0),
      profit: orders.reduce((sum, order) => sum + Number(order.profit || 0), 0),
      successful: successful.length,
      pending: orders.filter((order) => ['PROCESSING', 'ORDER_RECEIVED', 'PENDING_PROVIDER'].includes(order.fulfillmentStatus)).length,
      failed: orders.filter((order) => ['REFUND_REQUIRED', 'FAILED'].includes(order.fulfillmentStatus)).length,
    };
  }, [orders]);

  const syncProviderPlans = async () => {
    setBusy('sync-plans');
    try {
      const data = await adminFetch('/api/calebnet/sync-provider-plans', { method: 'POST', body: '{}' });
      console.info('[CalebNet Provider Plan Sync]', data);
      toast.success(`Synced ${data.count} provider plans (${data.rawCount ?? 0} raw, ${data.skipped ?? 0} skipped)`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const loadWalletBalance = async () => {
    setBusy('wallet');
    try {
      const data = await adminFetch('/api/calebnet/wallet-balance');
      setWalletBalance(Number(data.balance || 0));
      toast.success('Wallet balance refreshed');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const runDiagnostics = async () => {
    setBusy('diagnostics');
    try {
      const data = await adminFetch('/api/calebnet/diagnostics');
      console.info('[CalebNet Diagnostics]', data);
      toast.success(`Diagnostics OK: ${data.clubkonnect?.baseUrl || 'Clubkonnect configured'}`);
    } catch (error: any) {
      console.error('[CalebNet Diagnostics failed]', error);
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const syncAirtime = async () => {
    setBusy('sync-airtime');
    try {
      const data = await adminFetch('/api/calebnet/sync-airtime-discounts', { method: 'POST', body: '{}' });
      console.info('[CalebNet Airtime Discount Sync]', data);
      toast.success(`Synced ${data.count} airtime discount entries (${data.rawCount ?? 0} raw)`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const createCatalogPlan = async () => {
    if (!selectedProviderPlan || !sellingPrice) return;
    setBusy('create-catalog');
    try {
      await adminFetch('/api/calebnet/catalog', {
        method: 'POST',
        body: JSON.stringify({
          type: 'DATA',
          network: selectedProviderPlan.network,
          name: selectedProviderPlan.rawName || `${selectedProviderPlan.network} ${selectedProviderPlan.dataSize}`,
          displayName: selectedProviderPlan.rawName,
          description: selectedProviderPlan.rawName,
          validity: selectedProviderPlan.validity,
          dataSize: selectedProviderPlan.dataSize,
          sellingPrice: Number(sellingPrice),
          providerCost: Number(selectedProviderPlan.rawPrice || 0),
          providerPlanCode: selectedProviderPlan.providerPlanCode,
          providerNetworkCode: selectedProviderPlan.providerNetworkCode || NETWORK_CODES[selectedProviderPlan.network],
          category: selectedProviderPlan.category || 'SME',
          isActive: true,
          isFeatured: featured,
        }),
      });
      toast.success('CalebNet catalog plan created');
      setSelectedProviderPlan(null);
      setSellingPrice('');
      setFeatured(false);
      setTab('catalog');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const patchCatalog = async (id: string, updates: any) => {
    setBusy(id);
    try {
      await adminFetch('/api/calebnet/catalog', { method: 'PATCH', body: JSON.stringify({ id, updates }) });
      toast.success('Catalog updated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const requery = async (paymentReference: string) => {
    setBusy(paymentReference);
    try {
      const data = await adminFetch('/api/calebnet/requery', { method: 'POST', body: JSON.stringify({ paymentReference }) });
      toast.success(`Requery: ${data.status}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const markRefunded = async (paymentReference: string) => {
    if (!confirm('Mark this CalebNet order as refunded/manual resolved?')) return;
    setBusy(paymentReference);
    try {
      await adminFetch('/api/calebnet/orders/mark-refunded', { method: 'POST', body: JSON.stringify({ paymentReference }) });
      toast.success('Order marked resolved');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const resetHealth = async (network: string, type: CalebNetType) => {
    setBusy(`health-${network}-${type}`);
    try {
      await adminFetch('/api/calebnet/provider-status/reset', { method: 'POST', body: JSON.stringify({ network, type }) });
      toast.success(`${network} ${type} reset to healthy`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <AdminLayout title="CalebNet">
      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ['dashboard', 'Dashboard', BarChart3],
          ['orders', 'Orders', Clock],
          ['catalog', 'Catalog', Settings],
          ['provider', 'Provider Plans', Wifi],
          ['health', 'Provider Health', ShieldAlert],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${tab === key ? 'bg-[#7C3AED] text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Total Sales', `₦${stats.sales.toLocaleString()}`, Wifi],
              ['Profit', `₦${stats.profit.toLocaleString()}`, BarChart3],
              ['Successful', stats.successful, CheckCircle2],
              ['Pending', stats.pending, Clock],
              ['Refund Review', stats.failed, AlertCircle],
            ].map(([label, value, Icon]: any) => (
              <Card key={label} className="p-5">
                <Icon className="mb-3 h-6 w-6 text-[#7C3AED]" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </Card>
            ))}
          </div>
          <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Clubkonnect Wallet Balance</p>
              <p className={`mt-1 text-3xl font-black ${walletBalance !== null && walletBalance < 5000 ? 'text-amber-600' : ''}`}>
                {walletBalance === null ? 'Not checked' : `₦${walletBalance.toLocaleString()}`}
              </p>
              {walletBalance !== null && walletBalance < 5000 && (
                <p className="mt-1 text-sm font-semibold text-amber-600">Wallet balance is low. Top up before opening high-volume sales.</p>
              )}
            </div>
            <Button onClick={loadWalletBalance} disabled={busy === 'wallet'} variant="outline">
              <RefreshCcw className={`h-4 w-4 ${busy === 'wallet' ? 'animate-spin' : ''}`} />
              Check Balance
            </Button>
          </Card>
          <Card>
            <h3 className="mb-4 text-lg font-black">Provider Warnings</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {health.length === 0 ? <p className="text-muted-foreground">No provider health records yet.</p> : health.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <p className="font-black">{item.network} {item.type}</p>
                  <div className="mt-2">{statusBadge(item.status)}</div>
                  {item.lastFailureReason && <p className="mt-2 text-xs text-muted-foreground">{item.lastFailureReason}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, phone, request ID..." className="w-full rounded-xl border-2 border-border bg-muted/40 py-3 pl-10 pr-4 outline-none focus:border-[#7C3AED]" />
              </div>
              <div className="relative md:w-60">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border-2 border-border bg-muted/40 py-3 pl-10 pr-4 outline-none">
                  <option value="ALL">All statuses</option>
                  <option value="SUCCESSFUL">Successful</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="ORDER_RECEIVED">Order received</option>
                  <option value="PENDING_PROVIDER">Pending provider</option>
                  <option value="REFUND_REQUIRED">Refund required</option>
                </select>
              </div>
            </div>
          </Card>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Plan/Amount</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Profit</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Fulfillment</th>
                    <th className="px-4 py-3">Provider IDs</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((order) => {
                    const date = parseDate(order.createdAt);
                    return (
                      <tr key={order.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">{date ? format(date, 'MMM d, h:mm a') : 'N/A'}</td>
                        <td className="px-4 py-3"><span className="font-black">{order.network}</span><span className="block text-xs text-muted-foreground">{order.type}</span></td>
                        <td className="px-4 py-3 font-mono">{order.phoneNumber}</td>
                        <td className="px-4 py-3">{order.planName || 'Airtime'}</td>
                        <td className="px-4 py-3 font-black">₦{Number(order.amountPaid || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">₦{Number(order.providerCost || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-600">₦{Number(order.profit || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">{statusBadge(order.paymentStatus)}</td>
                        <td className="px-4 py-3">{statusBadge(order.fulfillmentStatus)}</td>
                        <td className="px-4 py-3">
                          <span className="block max-w-[160px] truncate font-mono text-xs">{order.providerOrderId || 'No order ID'}</span>
                          <span className="block max-w-[160px] truncate font-mono text-xs text-muted-foreground">{order.providerRequestId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setResponseView(order.providerResponse || {})} className="rounded-lg p-2 hover:bg-muted" title="View provider response"><Eye className="h-4 w-4" /></button>
                            {['PROCESSING', 'ORDER_RECEIVED', 'PENDING_PROVIDER'].includes(order.fulfillmentStatus) && (
                              <button onClick={() => requery(order.id)} className="rounded-lg p-2 text-[#7C3AED] hover:bg-[#7C3AED]/10" title="Requery">
                                <RefreshCcw className={`h-4 w-4 ${busy === order.id ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                            {['REFUND_REQUIRED', 'FAILED'].includes(order.fulfillmentStatus) && (
                              <button onClick={() => markRefunded(order.id)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-500/10" title="Mark refunded">
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
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
        </div>
      )}

      {tab === 'catalog' && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-5">
            <h3 className="text-lg font-black">Student Catalog</h3>
            <p className="text-sm text-muted-foreground">Only active plans here can appear to students.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Profit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {catalog.map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-4 py-3"><span className="font-black">{plan.name || plan.displayName}</span><span className="block text-xs text-muted-foreground">{plan.dataSize || plan.type} {plan.validity || ''}</span></td>
                    <td className="px-4 py-3">{plan.network}</td>
                    <td className="px-4 py-3">{plan.category}</td>
                    <td className="px-4 py-3 font-black">₦{Number(plan.sellingPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">₦{Number(plan.providerCost || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-600">₦{Number(plan.profit || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">{plan.isActive ? <Badge variant="green">Active</Badge> : <Badge variant="gray">Hidden</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => patchCatalog(plan.id, { isActive: !plan.isActive })} disabled={busy === plan.id}>
                        {busy === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : plan.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'provider' && (
        <div className="space-y-5">
          <Card className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black">Raw Provider Plans</h3>
              <p className="text-sm text-muted-foreground">These are never shown to students until curated into the catalog.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={runDiagnostics} disabled={busy === 'diagnostics'}>
                <ShieldAlert className="h-4 w-4" />
                Diagnostics
              </Button>
              <Button onClick={syncProviderPlans} disabled={busy === 'sync-plans'}><RefreshCcw className={`h-4 w-4 ${busy === 'sync-plans' ? 'animate-spin' : ''}`} />Sync Data Plans</Button>
              <Button variant="outline" onClick={syncAirtime} disabled={busy === 'sync-airtime'}><Phone className="h-4 w-4" />Sync Airtime Discounts</Button>
            </div>
          </Card>
          {selectedProviderPlan && (
            <Card className="p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_160px_130px_auto] md:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Creating catalog plan from</p>
                  <p className="font-black">{selectedProviderPlan.rawName}</p>
                  <p className="text-sm text-muted-foreground">Cost ₦{Number(selectedProviderPlan.rawPrice || 0).toLocaleString()} | {selectedProviderPlan.providerPlanCode}</p>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground">Selling Price</span>
                  <input value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} type="number" className="w-full rounded-xl border-2 border-border bg-muted/40 px-3 py-2 outline-none focus:border-[#7C3AED]" />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 font-bold">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                  Featured
                </label>
                <Button onClick={createCatalogPlan} disabled={busy === 'create-catalog'}><Plus className="h-4 w-4" />Publish</Button>
              </div>
            </Card>
          )}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Raw Plan</th>
                    <th className="px-4 py-3">Network</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {providerPlans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="px-4 py-3"><span className="font-black">{plan.rawName}</span><span className="block text-xs text-muted-foreground">{plan.dataSize || ''} {plan.validity || ''}</span></td>
                      <td className="px-4 py-3">{plan.network}</td>
                      <td className="px-4 py-3 font-mono">{plan.providerPlanCode}</td>
                      <td className="px-4 py-3 font-black">₦{Number(plan.rawPrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{plan.category}</td>
                      <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => { setSelectedProviderPlan(plan); setSellingPrice(String(Math.ceil(Number(plan.rawPrice || 0) * 1.15 / 10) * 10)); }}>Create Plan</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'health' && (
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {health.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{item.network}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                  {statusBadge(item.status)}
                </div>
                <p className="text-sm text-muted-foreground">Failures: {item.failureCount || 0}</p>
                {item.lastFailureReason && <p className="mt-2 text-xs text-amber-600">{item.lastFailureReason}</p>}
                <Button className="mt-4 w-full" variant="outline" size="sm" onClick={() => resetHealth(item.network, item.type)}>Reset Healthy</Button>
              </div>
            ))}
            {health.length === 0 && <p className="text-muted-foreground">Provider health records will appear after syncs or transactions.</p>}
          </div>
        </Card>
      )}

      {responseView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResponseView(null)}>
          <Card className="max-h-[80vh] w-full max-w-3xl overflow-auto" onClick={(event: any) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">Provider Response</h3>
              <Button size="sm" variant="ghost" onClick={() => setResponseView(null)}>Close</Button>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs">{JSON.stringify(responseView, null, 2)}</pre>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
