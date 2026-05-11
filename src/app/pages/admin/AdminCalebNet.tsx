import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
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
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

type Tab = 'dashboard' | 'orders' | 'catalog' | 'provider' | 'health';
type CalebNetType = 'DATA' | 'AIRTIME';

const NETWORK_CODES: Record<string, string> = { MTN: '01', GLO: '02', '9MOBILE': '03', AIRTEL: '04' };
const AIRTIME_DISCOUNT_FALLBACKS: Record<string, number> = { MTN: 3, GLO: 8, AIRTEL: 3, '9MOBILE': 7 };

function safeAirtimeDiscount(network: string, value: any) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 30) return parsed;
  return AIRTIME_DISCOUNT_FALLBACKS[network] || 0;
}

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

interface DraftPlan {
  id: string;
  plan: any;
  sellingPrice: string;
  featured: boolean;
}

export default function AdminCalebNet() {
  const [orders, setOrders] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [providerPlans, setProviderPlans] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [search, setSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busy, setBusy] = useState('');
  const [draftPlans, setDraftPlans] = useState<DraftPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [responseView, setResponseView] = useState<any | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(() => {
    const saved = window.localStorage.getItem('calebnetWalletBalance');
    return saved ? Number(saved) : null;
  });
  const catalogDraftRef = useRef<HTMLDivElement | null>(null);

  // Set of providerPlanCodes already in catalog for duplicate detection
  const catalogCodes = useMemo(() => new Set(catalog.map((c) => c.providerPlanCode).filter(Boolean)), [catalog]);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'calebnet_catalog'), orderBy('network', 'asc'), limit(120)));
      setCatalog(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } finally { setCatalogLoading(false); }
  };

  const loadProviderPlans = async () => {
    setProviderLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'calebnet_provider_plans'), orderBy('lastSyncedAt', 'desc'), limit(250)));
      setProviderPlans(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } finally { setProviderLoading(false); }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const snap = await getDocs(collection(db, 'calebnet_provider_status'));
      setHealth(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } finally { setHealthLoading(false); };
  };

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'calebnet_orders'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setOrders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('[CalebNet Orders listener failed]', error);
      toast.error(`Orders read failed: ${error.message}`);
    });
    return () => unsubOrders();
  }, []);

  useEffect(() => {
    if (tab === 'dashboard' || tab === 'health') {
      loadHealth().catch((error) => toast.error(`Provider health read failed: ${error.message}`));
    }
    if (tab === 'catalog') {
      loadCatalog().catch((error) => toast.error(`Catalog read failed: ${error.message}`));
    }
    if (tab === 'provider') {
      loadProviderPlans().catch((error) => toast.error(`Provider plans read failed: ${error.message}`));
      // Also load catalog so we can detect duplicates
      loadCatalog().catch(() => {});
    }
  }, [tab]);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const haystack = `${order.id} ${order.network} ${order.phoneNumber} ${order.providerOrderId} ${order.providerRequestId}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'ALL' || order.fulfillmentStatus === statusFilter);
  }), [orders, search, statusFilter]);

  const filteredCatalog = useMemo(() => catalog.filter((plan) => {
    const haystack = `${plan.name} ${plan.displayName} ${plan.network} ${plan.type} ${plan.category} ${plan.providerPlanCode}`.toLowerCase();
    return haystack.includes(catalogSearch.toLowerCase());
  }), [catalog, catalogSearch]);

  const stats = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = orders.filter((order) => {
      const ts = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Number(order.createdAt || 0);
      return ts >= cutoff;
    });
    return {
      sales: recent.reduce((sum, order) => sum + Number(order.amountPaid || 0), 0),
      profit: recent.reduce((sum, order) => sum + Number(order.profit || 0), 0),
      successful: recent.filter((order) => order.fulfillmentStatus === 'SUCCESSFUL').length,
      pending: recent.filter((order) => ['PROCESSING', 'ORDER_RECEIVED', 'PENDING_PROVIDER'].includes(order.fulfillmentStatus)).length,
      failed: recent.filter((order) => ['REFUND_REQUIRED', 'FAILED'].includes(order.fulfillmentStatus)).length,
    };
  }, [orders]);

  // Grouped catalog: network → type → plans
  const groupedCatalog = useMemo(() => {
    const networkOrder = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
    const groups: { network: string; type: string; plans: any[] }[] = [];
    const filtered = filteredCatalog;
    for (const net of networkOrder) {
      const netPlans = filtered.filter((p) => p.network === net);
      if (netPlans.length === 0) continue;
      const data = netPlans.filter((p) => p.type !== 'AIRTIME').sort((a, b) => (a.category || '').localeCompare(b.category || '') || Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0));
      const airtime = netPlans.filter((p) => p.type === 'AIRTIME');
      if (data.length > 0) groups.push({ network: net, type: 'DATA', plans: data });
      if (airtime.length > 0) groups.push({ network: net, type: 'AIRTIME', plans: airtime });
    }
    // Catch any networks not in the standard list
    const knownNets = new Set(networkOrder);
    const other = filtered.filter((p) => !knownNets.has(p.network));
    if (other.length > 0) groups.push({ network: 'OTHER', type: 'ALL', plans: other });
    return groups;
  }, [filteredCatalog]);

  const syncProviderPlans = async () => {
    setBusy('sync-plans');
    try {
      const data = await adminFetch('/api/calebnet/sync-provider-plans', { method: 'POST', body: '{}' });
      toast.success(`Synced ${data.count} provider plans (${data.rawCount ?? 0} raw, ${data.skipped ?? 0} skipped)`);
      await loadProviderPlans();
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
      const nextBalance = Number(data.balance || 0);
      setWalletBalance(nextBalance);
      window.localStorage.setItem('calebnetWalletBalance', String(nextBalance));
      toast.success('Wallet balance refreshed');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const syncAirtime = async () => {
    setBusy('sync-airtime');
    try {
      const data = await adminFetch('/api/calebnet/sync-airtime-discounts', { method: 'POST', body: '{}' });
      toast.success(`Synced ${data.count} airtime discount entries (${data.rawCount ?? 0} raw)`);
      await loadCatalog();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const publishDraft = async (draft: DraftPlan) => {
    if (!draft.sellingPrice) return;
    setBusy(`draft-${draft.id}`);
    try {
      await adminFetch('/api/calebnet/catalog', {
        method: 'POST',
        body: JSON.stringify({
          type: 'DATA',
          network: draft.plan.network,
          name: draft.plan.rawName || `${draft.plan.network} ${draft.plan.dataSize}`,
          displayName: draft.plan.rawName,
          description: draft.plan.rawName,
          validity: draft.plan.validity,
          dataSize: draft.plan.dataSize,
          sellingPrice: Number(draft.sellingPrice),
          providerCost: Number(draft.plan.rawPrice || 0),
          providerPlanCode: draft.plan.providerPlanCode,
          providerNetworkCode: draft.plan.providerNetworkCode || NETWORK_CODES[draft.plan.network],
          category: draft.plan.category || 'SME',
          isActive: true,
          isFeatured: draft.featured,
        }),
      });
      toast.success(`Published: ${draft.plan.rawName}`);
      setDraftPlans((prev) => prev.filter((d) => d.id !== draft.id));
      await loadCatalog();
    } catch (error: any) {
      toast.error(`Failed ${draft.plan.rawName}: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const publishAllDrafts = async () => {
    for (const draft of draftPlans) {
      await publishDraft(draft);
    }
  };

  const startCatalogDraft = (plan: any) => {
    // Don't add duplicate drafts for the same plan
    if (draftPlans.some((d) => d.plan.providerPlanCode === plan.providerPlanCode)) {
      toast.info('This plan is already in your drafts.');
      window.setTimeout(() => catalogDraftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      return;
    }
    const newDraft: DraftPlan = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      plan,
      sellingPrice: String(Math.ceil(Number(plan.rawPrice || 0) * 1.15 / 10) * 10),
      featured: false,
    };
    setDraftPlans((prev) => [...prev, newDraft]);
    toast.info(`Added "${plan.rawName}" to drafts.`);
    window.setTimeout(() => catalogDraftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const updateDraft = (draftId: string, updates: Partial<DraftPlan>) => {
    setDraftPlans((prev) => prev.map((d) => d.id === draftId ? { ...d, ...updates } : d));
  };

  const patchCatalog = async (id: string, updates: any) => {
    setBusy(id);
    try {
      await adminFetch('/api/calebnet/catalog', { method: 'PATCH', body: JSON.stringify({ id, updates }) });
      toast.success('Catalog updated');
      await loadCatalog();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const startEditingPlan = (plan: any) => {
    if (plan.type === 'AIRTIME') {
      toast.info('Airtime uses custom amounts, so there is no fixed price to edit.');
      return;
    }
    setEditingPlan({
      id: plan.id,
      name: plan.name || '',
      displayName: plan.displayName || plan.name || '',
      validity: plan.validity || '',
      dataSize: plan.dataSize || '',
      sellingPrice: String(plan.sellingPrice || ''),
      providerPlanCode: plan.providerPlanCode || '',
      providerCost: Number(plan.providerCost || 0),
      profit: Number(plan.profit || 0),
      network: plan.network,
      category: plan.category || '',
      type: plan.type,
      isFeatured: plan.isFeatured || false,
    });
  };

  const saveEditingPlan = async () => {
    if (!editingPlan) return;
    const sellingPrice = Number(editingPlan.sellingPrice || 0);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return toast.error('Selling price must be greater than zero.');
    await patchCatalog(editingPlan.id, { sellingPrice, isFeatured: editingPlan.isFeatured });
    setEditingPlan(null);
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
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Showing last 24 hours</p>
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
              {healthLoading ? [1,2,3,4].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border p-4"><div className="h-4 w-24 rounded bg-muted mb-3" /><div className="h-6 w-16 rounded bg-muted" /></div>
              )) : health.length === 0 ? <p className="text-muted-foreground">No provider health records yet.</p> : health.map((item) => (
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
                        <td className="px-4 py-3">
                          {statusBadge(order.paymentStatus)}
                          <span className="mt-1 block text-xs font-black uppercase text-muted-foreground">{order.paymentProvider || 'paystack'}</span>
                        </td>
                        <td className="px-4 py-3">{statusBadge(order.fulfillmentStatus)}</td>
                        <td className="px-4 py-3">
                          <span className="block min-w-[190px] break-all font-mono text-xs">{order.providerOrderId || 'No order ID'}</span>
                          <span className="block min-w-[190px] break-all font-mono text-xs text-muted-foreground">{order.providerRequestId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                            <button onClick={() => setResponseView(order)} className="rounded-lg border border-border px-3 py-2 text-xs font-black hover:bg-muted" title="View readable order details">
                              Details
                            </button>
                            {['PROCESSING', 'ORDER_RECEIVED', 'PENDING_PROVIDER'].includes(order.fulfillmentStatus) && (
                              <button onClick={() => requery(order.id)} className="rounded-lg border border-[#7C3AED]/30 px-3 py-2 text-xs font-black text-[#7C3AED] hover:bg-[#7C3AED]/10" title="Ask provider for latest status">
                                <RefreshCcw className={`h-4 w-4 ${busy === order.id ? 'animate-spin' : ''}`} />
                                Requery
                              </button>
                            )}
                            {['REFUND_REQUIRED', 'FAILED'].includes(order.fulfillmentStatus) && (
                              <button onClick={() => markRefunded(order.id)} className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-black text-amber-600 hover:bg-amber-500/10" title="Mark this order as refunded/manual resolved">
                                Mark refunded
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
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search catalog by network, plan, category..."
                className="w-full rounded-xl border-2 border-border bg-muted/40 py-3 pl-10 pr-4 outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>
          {catalogLoading ? (
            <div className="p-5 space-y-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="animate-pulse flex gap-4 items-center">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="flex-1" />
                  <div className="h-8 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
          <div className="overflow-x-auto">
            {groupedCatalog.map((group) => (
              <div key={`${group.network}-${group.type}`}>
                <div className="sticky top-0 z-10 flex items-center gap-3 bg-muted/70 backdrop-blur-sm px-4 py-2 border-b border-border">
                  <span className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">{group.network}</span>
                  <Badge variant={group.type === 'DATA' ? 'purple' : 'amber'} className="text-[10px]">{group.type}</Badge>
                  <span className="text-xs text-muted-foreground">{group.plans.length} plan{group.plans.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Price</th>
                      <th className="px-4 py-2">Cost</th>
                      <th className="px-4 py-2">Profit</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.plans.map((plan) => {
                      const isAirtime = plan.type === 'AIRTIME';
                      const discount = safeAirtimeDiscount(plan.network, plan.airtimeDiscountPercent);
                      return (
                        <tr key={plan.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3"><span className="font-black">{plan.name || plan.displayName}</span><span className="block text-xs text-muted-foreground">{isAirtime ? 'Custom amount top-up' : `${plan.dataSize || plan.type} ${plan.validity || ''}`}</span></td>
                          <td className="px-4 py-3">{plan.category}</td>
                          {isAirtime ? (
                            <>
                              <td className="px-4 py-3 font-black">Custom amount</td>
                              <td className="px-4 py-3">After {discount}% discount</td>
                              <td className="px-4 py-3 text-emerald-600">Calculated per order</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-black">{String.fromCharCode(8358)}{Number(plan.sellingPrice || 0).toLocaleString()}</td>
                              <td className="px-4 py-3">{String.fromCharCode(8358)}{Number(plan.providerCost || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-emerald-600">{String.fromCharCode(8358)}{Number(plan.profit || 0).toLocaleString()}</td>
                            </>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {plan.isActive ? <Badge variant="green">Active</Badge> : <Badge variant="gray">Hidden</Badge>}
                              {plan.isFeatured && <Badge variant="amber" className="text-[10px]">Best value</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEditingPlan(plan)}>
                                  Edit Plan
                                </Button>
                              <Button size="sm" variant="outline" onClick={() => patchCatalog(plan.id, { isActive: !plan.isActive })} disabled={busy === plan.id}>
                                {busy === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : plan.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {groupedCatalog.length === 0 && <p className="p-5 text-muted-foreground">No catalog entries found.</p>}
          </div>
          )}
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
              <Button onClick={syncProviderPlans} disabled={busy === 'sync-plans'}><RefreshCcw className={`h-4 w-4 ${busy === 'sync-plans' ? 'animate-spin' : ''}`} />Sync Data Plans</Button>
              <Button variant="outline" onClick={syncAirtime} disabled={busy === 'sync-airtime'}><Phone className="h-4 w-4" />Sync Airtime Discounts</Button>
            </div>
          </Card>

          {/* Batch Draft Area */}
          {draftPlans.length > 0 && (
            <div ref={catalogDraftRef} className="scroll-mt-24 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">{draftPlans.length} draft{draftPlans.length !== 1 ? 's' : ''} pending</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={publishAllDrafts} disabled={!!busy}><Plus className="h-3 w-3" />Publish All</Button>
                  <Button size="sm" variant="outline" onClick={() => setDraftPlans([])}><X className="h-3 w-3" />Cancel All</Button>
                </div>
              </div>
              {draftPlans.map((draft) => (
                <Card key={draft.id} className="border-[#7C3AED]/40 p-4 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_auto_auto] md:items-end">
                    <div>
                      <p className="font-black">{draft.plan.rawName}</p>
                      <p className="text-sm text-muted-foreground">Cost {String.fromCharCode(8358)}{Number(draft.plan.rawPrice || 0).toLocaleString()} | {draft.plan.providerPlanCode}</p>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selling Price</span>
                      <input value={draft.sellingPrice} onChange={(e) => updateDraft(draft.id, { sellingPrice: e.target.value })} type="number" className="w-full rounded-xl border-2 border-border bg-muted/40 px-3 py-2 outline-none focus:border-[#7C3AED]" />
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold">
                      <input type="checkbox" checked={draft.featured} onChange={(e) => updateDraft(draft.id, { featured: e.target.checked })} />
                      Best value
                    </label>
                    <Button size="sm" onClick={() => publishDraft(draft)} disabled={busy === `draft-${draft.id}`}>
                      {busy === `draft-${draft.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Publish
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDraftPlans((prev) => prev.filter((d) => d.id !== draft.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="overflow-hidden p-0">
            {providerLoading ? (
              <div className="p-5 space-y-3">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="animate-pulse flex gap-4 items-center">
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-4 w-14 rounded bg-muted" />
                    <div className="h-4 w-20 rounded bg-muted" />
                    <div className="h-4 w-16 rounded bg-muted" />
                    <div className="flex-1" />
                    <div className="h-8 w-24 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
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
                  {providerPlans.map((plan) => {
                    const alreadyInCatalog = catalogCodes.has(plan.providerPlanCode);
                    return (
                    <tr key={plan.id} className={alreadyInCatalog ? 'bg-emerald-500/5' : ''}>
                      <td className="px-4 py-3"><span className="font-black">{plan.rawName}</span><span className="block text-xs text-muted-foreground">{plan.dataSize || ''} {plan.validity || ''}</span></td>
                      <td className="px-4 py-3">{plan.network}</td>
                      <td className="px-4 py-3 font-mono">{plan.providerPlanCode}</td>
                      <td className="px-4 py-3 font-black">{String.fromCharCode(8358)}{Number(plan.rawPrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{plan.category}</td>
                      <td className="px-4 py-3 text-right">
                        {alreadyInCatalog ? (
                          <Badge variant="green" className="text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3" />In Catalog</Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startCatalogDraft(plan)}>Create Plan</Button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
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

      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingPlan(null)}>
          <div className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <Card className="border-[#7C3AED]/40 p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#7C3AED]">Published data plan</p>
                  <h3 className="mt-1 text-lg font-black">Edit Plan</h3>
                  <p className="text-sm text-muted-foreground">Only CalebNet's student price and badges change. Provider plan details stay untouched.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditingPlan(null)}>Close</Button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_auto_auto_auto] md:items-end">
                <div>
                  <p className="font-black">{editingPlan.name || editingPlan.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {editingPlan.network} | {editingPlan.dataSize || 'Data'} {editingPlan.validity || ''} | {editingPlan.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cost {String.fromCharCode(8358)}{Number(editingPlan.providerCost || 0).toLocaleString()} | {editingPlan.providerPlanCode}
                  </p>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selling Price</span>
                  <input
                    value={editingPlan.sellingPrice}
                    onChange={(event) => setEditingPlan((prev: any) => ({ ...prev, sellingPrice: event.target.value }))}
                    type="number"
                    className="w-full rounded-xl border-2 border-border bg-muted/40 px-3 py-2 font-bold outline-none focus:border-[#7C3AED]"
                  />
                </label>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 font-bold" title="Shows a Best value badge on the student plan card">
                  <input type="checkbox" checked={editingPlan.isFeatured || false} onChange={(e) => setEditingPlan((prev: any) => ({ ...prev, isFeatured: e.target.checked }))} />
                  Best value
                </label>
                <Button onClick={saveEditingPlan} disabled={busy === editingPlan.id}>
                  {busy === editingPlan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditingPlan(null)}>
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {responseView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setResponseView(null)}>
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto" onClick={(event) => event.stopPropagation()}>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">CalebNet Order Details</h3>
              <Button size="sm" variant="ghost" onClick={() => setResponseView(null)}>Close</Button>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['Reference', responseView.paymentReference || responseView.id],
                ['Type', responseView.type],
                ['Network', responseView.network],
                ['Phone', responseView.phoneNumber],
                ['Plan/Amount', responseView.planName || 'Airtime'],
                ['Amount paid', `₦${Number(responseView.amountPaid || 0).toLocaleString()}`],
                ['Provider cost', `₦${Number(responseView.providerCost || 0).toLocaleString()}`],
                ['Profit', `₦${Number(responseView.profit || 0).toLocaleString()}`],
                ['Payment status', responseView.paymentStatus],
                ['Fulfillment', responseView.fulfillmentStatus],
                ['Provider order ID', responseView.providerOrderId || 'Not assigned'],
                ['Request ID', responseView.providerRequestId],
                ['Wallet debit', responseView.walletDebitTransactionId || 'N/A'],
                ['Wallet refund', responseView.walletRefundTransactionId || 'N/A'],
                ['Provider status', responseView.providerStatus || 'Not available'],
                ['Remark', responseView.providerRemark || 'No remark'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="mt-1 break-all font-bold">{value || 'N/A'}</p>
                </div>
              ))}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-black text-[#7C3AED]">Developer raw provider response</summary>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs">{JSON.stringify(responseView.providerResponse || responseView, null, 2)}</pre>
            </details>
          </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
