import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, CreditCard, Eye, EyeOff, Loader2, LogOut, Mail, Phone, Shield, Signal, Wallet, Wifi, Zap } from 'lucide-react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { collection, doc, getDoc, limit, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import { useAuth } from '../../../context/AuthContext';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { saveOrderToHistory, buildCalebNetEntry } from '../../../services/orderHistory';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Logo } from '../../components/design-system/Logo';
import SEO from '../../components/SEO';

type CalebNetType = 'DATA' | 'AIRTIME';
type Network = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
type ProviderStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

interface CatalogPlan {
  id: string;
  type: CalebNetType;
  network: Network;
  name: string;
  displayName?: string;
  description?: string;
  validity: string | null;
  dataSize: string | null;
  sellingPrice: number;
  category: string;
  isFeatured: boolean;
}

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  balanceAfter: number;
  purpose: string;
  status: string;
  createdAt?: any;
}

const NETWORKS: Array<{ id: Network; label: string; color: string; text: string; prefixes: string[] }> = [
  { id: 'MTN', label: 'MTN', color: '#FCD34D', text: '#713F12', prefixes: ['0803','0806','0810','0813','0814','0816','0903','0906','0913','0916','0704'] },
  { id: 'GLO', label: 'Glo', color: '#22C55E', text: '#FFFFFF', prefixes: ['0805','0807','0811','0815','0705','0905','0915'] },
  { id: 'AIRTEL', label: 'Airtel', color: '#EF4444', text: '#FFFFFF', prefixes: ['0802','0808','0812','0701','0708','0902','0907','0912','0901'] },
  { id: '9MOBILE', label: '9mobile', color: '#065F46', text: '#FFFFFF', prefixes: ['0809','0817','0818','0908','0909'] },
];
const AIRTIME_PRESETS = [50, 100, 200, 500, 1000, 2000];
const FUNDING_PRESETS = [500, 1000, 2000, 5000, 10000];
const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;

function money(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function isValidNigerianPhone(phone: string) {
  return /^0[789][01]\d{8}$/.test(phone);
}

function detectNetwork(phone: string): Network | null {
  const prefix = phone.slice(0, 4);
  return NETWORKS.find((network) => network.prefixes.includes(prefix))?.id || null;
}

function statusMessage(status?: ProviderStatus) {
  if (status === 'DOWN') return 'This network is temporarily unavailable. Please try again later.';
  if (status === 'DEGRADED') return 'Network may be delayed.';
  return '';
}

function authErrorMessage(error: any, mode: 'login' | 'signup') {
  const code = String(error?.code || '');
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
    return 'Email or password is incorrect. Check your details and try again.';
  }
  if (code.includes('auth/invalid-email')) return 'Enter a valid email address.';
  if (code.includes('auth/email-already-in-use')) return 'An account already exists with this email. Sign in instead.';
  if (code.includes('auth/weak-password')) return 'Use a password with at least 6 characters.';
  if (code.includes('auth/popup-closed-by-user')) return 'Sign-in was cancelled.';
  if (code.includes('auth/network-request-failed')) return 'Network error. Check your connection and try again.';
  if (code.includes('auth/too-many-requests')) return 'Too many attempts. Please wait a moment and try again.';
  return mode === 'signup'
    ? 'Could not create your CalebNet account. Please try again.'
    : 'Could not sign you in. Please try again.';
}

async function ensureStudentProfile() {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const userRef = doc(db, 'users', currentUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      role: 'STUDENT',
      email: currentUser.email || null,
      displayName: currentUser.displayName || null,
      phoneNumber: currentUser.phoneNumber || null,
      walletBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return;
  }

  await setDoc(userRef, {
    email: snap.data().email || currentUser.email || null,
    displayName: snap.data().displayName || currentUser.displayName || null,
    phoneNumber: snap.data().phoneNumber || currentUser.phoneNumber || null,
    updatedAt: new Date(),
  }, { merge: true });
}

function CalebNetAuthGate() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error('Enter a valid email and at least 6 characters password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      await ensureStudentProfile();
      toast.success(mode === 'signup' ? 'CalebNet wallet created.' : 'Welcome back.');
    } catch (error: any) {
      toast.error(authErrorMessage(error, mode));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      await ensureStudentProfile();
      toast.success('Signed in to CalebNet.');
    } catch (error: any) {
      toast.error(authErrorMessage(error, 'login'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-[calc(100vh-76px)] max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_430px]">
      <section className="space-y-5">
        <Badge variant="purple">CalebNet</Badge>
        <h2 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">Data and airtime, ready when you need it.</h2>
        <p className="max-w-xl text-lg text-muted-foreground">Sign in, top up your CalebNet wallet, and buy mobile data or airtime in a few taps.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {['Quick top-ups', 'Secure wallet', 'Easy history'].map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card p-4 font-black">
              <CheckCircle2 className="mb-2 h-5 w-5 text-[#7C3AED]" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <Card className="space-y-5">
        <div>
          <h3 className="text-2xl font-black">{mode === 'signup' ? 'Create CalebNet account' : 'Welcome back'}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to CalebNet.</p>
        </div>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-card px-4 py-3 font-black hover:border-[#7C3AED]"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm text-black">G</span>
          Continue with Google
        </button>
        <div className="relative text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
          <span className="bg-card px-3">or email</span>
          <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-border" />
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Email</span>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border-2 border-border bg-card py-4 pl-12 pr-4 font-bold outline-none focus:border-[#7C3AED]" placeholder="you@example.com" />
          </div>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Password</span>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border-2 border-border bg-card py-4 pl-4 pr-12 font-bold outline-none focus:border-[#7C3AED]" placeholder="Minimum 6 characters" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </label>
        <Button onClick={handleEmailAuth} disabled={busy} className="w-full py-4">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </Button>
        <button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="w-full text-sm font-black text-[#7C3AED]">
          {mode === 'signup' ? 'I already have an account' : 'Create a new CalebNet account'}
        </button>
      </Card>
    </main>
  );
}

export default function CalebNet() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [type, setType] = useState<CalebNetType>('DATA');
  const [network, setNetwork] = useState<Network>('MTN');
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planCategory, setPlanCategory] = useState('ALL');
  const [amount, setAmount] = useState<number | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [fundAmount, setFundAmount] = useState<number | ''>(1000);
  const [fundingReference, setFundingReference] = useState(`CDWALLET-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
  const purchaseRef = useRef(`CDNETW-${Date.now()}-${Math.floor(Math.random() * 100000)}`);

  useEffect(() => subscribeToPlatformSettings(setPlatformSettings), []);

  useEffect(() => {
    if (!user?.uid) return;
    const userUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setWalletBalance(Number(snap.data()?.walletBalance || 0));
    });
    const txQuery = query(collection(db, 'wallet_transactions'), where('userId', '==', user.uid), limit(12));
    const txUnsub = onSnapshot(txQuery, (snap) => {
      setWalletTransactions(snap.docs
        .map((item) => ({ id: item.id, ...item.data() } as WalletTransaction))
        .sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0)));
    }, () => setWalletTransactions([]));
    return () => {
      userUnsub();
      txUnsub();
    };
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'calebnet_provider_status'), where('provider', '==', 'clubkonnect'));
    return onSnapshot(q, (snapshot) => {
      const next: Record<string, ProviderStatus> = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        next[`${data.type}_${data.network}`] = data.status || 'HEALTHY';
      });
      setStatuses(next);
    });
  }, []);

  useEffect(() => {
    const cacheKey = `calebnet_catalog_${type}_${network}`;
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - Number(parsed.cachedAt || 0) < CATALOG_CACHE_TTL_MS) {
          const cachedPlans = parsed.plans || [];
          setPlans(cachedPlans);
          setSelectedPlanId(type === 'DATA' && cachedPlans.length > 0 ? cachedPlans[0].id : '');
          setPlanCategory('ALL');
          setIsLoadingPlans(false);
          return;
        }
      } catch {
        window.sessionStorage.removeItem(cacheKey);
      }
    }
    setIsLoadingPlans(true);
    setPlans([]);
    setSelectedPlanId('');
    setPlanCategory('ALL');
    fetch(`/api/calebnet/catalog?type=${type}&network=${network}`)
      .then((res) => res.json())
      .then((data) => {
        const nextPlans = data.plans || [];
        setPlans(nextPlans);
        window.sessionStorage.setItem(cacheKey, JSON.stringify({ cachedAt: Date.now(), plans: nextPlans }));
        if (type === 'DATA' && nextPlans.length > 0) setSelectedPlanId(nextPlans[0].id);
      })
      .catch(() => toast.error('Unable to load CalebNet catalog.'))
      .finally(() => setIsLoadingPlans(false));
  }, [type, network]);

  useEffect(() => {
    if (phoneNumber.length >= 4) {
      const detected = detectNetwork(phoneNumber);
      if (detected && detected !== network) setNetwork(detected);
    }
  }, [phoneNumber]);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) || null, [plans, selectedPlanId]);
  const planCategories = useMemo(() => ['ALL', ...Array.from(new Set(plans.map((plan) => plan.category).filter(Boolean)))], [plans]);
  const displayPlans = useMemo(() => plans.filter((plan) => planCategory === 'ALL' || plan.category === planCategory), [plans, planCategory]);
  const providerStatus = statuses[`${type}_${network}`] || 'HEALTHY';
  const airtimeAvailable = type !== 'AIRTIME' || plans.length > 0;
  const currentAmount = type === 'DATA' ? Number(selectedPlan?.sellingPrice || 0) : Number(amount || 0);
  const insufficientBalance = currentAmount > 0 && walletBalance < currentAmount;
  const airtimeAmountError = type === 'AIRTIME' && amount !== ''
    ? currentAmount < 50
      ? 'Minimum airtime purchase is ₦50.'
      : currentAmount > 200000
        ? 'Maximum airtime purchase is ₦200,000.'
        : ''
    : '';
  const phoneMismatch = phoneNumber.length >= 4 && detectNetwork(phoneNumber) && detectNetwork(phoneNumber) !== network;
  const valid = !!user
    && providerStatus !== 'DOWN'
    && airtimeAvailable
    && !insufficientBalance
    && isValidNigerianPhone(phoneNumber)
    && (type === 'DATA' ? !!selectedPlan : currentAmount >= 50 && currentAmount <= 200000);

  const fundingAmountNumber = Number(fundAmount || 0);
  const fundingConfig = {
    reference: fundingReference,
    email: user?.email || 'student@calebdeck.com',
    amount: fundingAmountNumber * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'Purpose', variable_name: 'purpose', value: 'CalebNet wallet funding' },
      ],
    },
  };
  const initializeFunding = usePaystackPayment(fundingConfig as any);

  const handlePhone = (value: string) => setPhoneNumber(value.replace(/[^0-9]/g, '').slice(0, 11));

  const verifyFunding = async (reference: string) => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/wallet/verify-funding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reference }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Wallet funding failed');
    toast.success(`Wallet funded. New balance: ${money(data.balance)}`);
  };

  const handleFundWallet = () => {
    if (!user) return;
    if (fundingAmountNumber < 100 || fundingAmountNumber > 50000) {
      toast.error('Wallet funding must be between ₦100 and ₦50,000.');
      return;
    }
    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
      toast.error('Payment system is not configured. Contact support.');
      return;
    }
    setWalletLoading(true);
    initializeFunding({
      onSuccess: async (reference: any) => {
        try {
          await verifyFunding(reference.reference || fundingReference);
        } catch (error: any) {
          toast.error(error.message || 'Payment received, but wallet credit failed. Contact support.');
        } finally {
          setWalletLoading(false);
          setFundingReference(`CDWALLET-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
        }
      },
      onClose: () => {
        setWalletLoading(false);
        toast.info('Funding window closed. No charge was made.');
      },
    } as any);
  };

  const handlePurchase = async () => {
    if (!valid || isProcessing) {
      if (insufficientBalance) toast.error('Insufficient wallet balance. Fund wallet to continue.');
      return;
    }
    setIsProcessing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const clientRequestId = purchaseRef.current;
      const response = await fetch('/api/calebnet/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          network,
          phoneNumber,
          planId: type === 'DATA' ? selectedPlan?.id : undefined,
          amount: type === 'AIRTIME' ? currentAmount : undefined,
          clientRequestId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to complete CalebNet purchase');

      saveOrderToHistory(buildCalebNetEntry({
        network,
        type: type === 'DATA' ? 'data' : 'airtime',
        amount: currentAmount,
        phoneNumber,
        planName: selectedPlan?.name || 'Airtime',
        reference: clientRequestId,
      }));
      purchaseRef.current = `CDNETW-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      navigate(`/calebnet/status/${encodeURIComponent(clientRequestId)}`);
    } catch (error: any) {
      toast.error(error.message || 'CalebNet purchase failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isComingSoon = platformSettings?.isCalebNetComingSoon !== false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="CalebNet - Cheap data and airtime" description="Buy CalebNet data and airtime for Caleb students." />

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="rounded-xl p-2 hover:bg-muted" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black">CalebNet</h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      {isComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur">
          <Card className="max-w-md text-center">
            <Wifi className="mx-auto mb-5 h-12 w-12 text-[#7C3AED]" />
            <Badge variant="purple" className="mb-4">Coming Soon</Badge>
            <h2 className="mb-3 text-3xl font-black">CalebNet is almost here.</h2>
            <p className="mb-6 text-muted-foreground">Cheap data and airtime for Caleb students is being prepared.</p>
            <Link to="/"><Button className="w-full">Return Home</Button></Link>
          </Card>
        </div>
      )}

      {!user ? (
        <CalebNetAuthGate />
      ) : (
        <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_400px]">
          <section className="space-y-7">
            <div className="rounded-2xl bg-[#7C3AED] p-7 text-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-3"><Zap className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-2xl font-black">Cheap data and airtime for Caleb students</h2>
                <p className="text-sm text-white/75">Top up once, buy whenever you need to.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['DATA', 'AIRTIME'] as CalebNetType[]).map((item) => (
                <button key={item} onClick={() => setType(item)} className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 font-black ${type === item ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-border bg-card'}`}>
                  {item === 'DATA' ? <Wifi className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                  {item === 'DATA' ? 'Data' : 'Airtime'}
                </button>
              ))}
            </div>

            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Network</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {NETWORKS.map((item) => {
                  const status = statuses[`${type}_${item.id}`] || 'HEALTHY';
                  const disabled = status === 'DOWN';
                  return (
                    <button key={item.id} onClick={() => !disabled && setNetwork(item.id)} disabled={disabled} className={`rounded-xl border-2 p-4 text-center transition ${network === item.id ? 'scale-[1.02] shadow-lg' : 'border-border bg-card'} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`} style={network === item.id ? { backgroundColor: item.color, borderColor: item.color, color: item.text } : undefined}>
                      <Signal className="mx-auto mb-2 h-5 w-5" />
                      <span className="text-sm font-black">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {statusMessage(providerStatus) && (
                <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${providerStatus === 'DOWN' ? 'text-red-500' : 'text-amber-500'}`}>
                  <AlertCircle className="h-4 w-4" /> {statusMessage(providerStatus)}
                </p>
              )}
            </div>

            {type === 'DATA' ? (
              <div>
                <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Plans</h3>
                {isLoadingPlans ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="animate-pulse rounded-xl border-2 border-border bg-card p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2"><div className="h-5 w-16 rounded bg-muted" /><div className="h-3 w-24 rounded bg-muted" /></div>
                        </div>
                        <div className="flex items-center justify-between"><div className="h-5 w-12 rounded bg-muted" /><div className="h-6 w-20 rounded bg-muted" /></div>
                      </div>
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-5 text-muted-foreground">No active CalebNet plans for this network yet.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {planCategories.length > 2 && (
                      <div className="col-span-full mb-1 flex gap-2 overflow-x-auto pb-1">
                        {planCategories.map((category) => (
                          <button key={category} type="button" onClick={() => setPlanCategory(category)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${planCategory === category ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-border bg-card text-muted-foreground'}`}>
                            {category === 'ALL' ? 'All plans' : category}
                          </button>
                        ))}
                      </div>
                    )}
                    {displayPlans.map((plan) => (
                      <button key={plan.id} onClick={() => setSelectedPlanId(plan.id)} className={`rounded-xl border-2 bg-card p-4 text-left transition ${selectedPlanId === plan.id ? 'border-[#7C3AED] shadow-lg' : 'border-border'}`}>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-black">{plan.dataSize || plan.name}</p>
                            <p className="text-sm text-muted-foreground">{plan.validity || plan.description}</p>
                          </div>
                          {plan.isFeatured && <Badge variant="green" className="text-xs">Best value</Badge>}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="muted" className="text-xs">{plan.category}</Badge>
                          <span className="text-xl font-black text-[#7C3AED]">{money(plan.sellingPrice)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Amount</label>
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {AIRTIME_PRESETS.map((preset) => (
                    <button key={preset} type="button" onClick={() => setAmount(preset)} className={`rounded-xl border-2 px-3 py-3 text-sm font-black transition ${Number(amount) === preset ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-border bg-card hover:border-[#7C3AED]/50'}`}>
                      {money(preset)}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">₦</span>
                  <input type="number" inputMode="numeric" value={amount} onChange={(event) => setAmount(Number(event.target.value) || '')} placeholder="50 - 200,000" className={`w-full rounded-xl border-2 bg-card py-4 pl-10 pr-4 text-lg font-bold outline-none ${airtimeAmountError ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-[#7C3AED]'}`} />
                </div>
                {airtimeAmountError && <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-500"><AlertCircle className="h-4 w-4" />{airtimeAmountError}</p>}
                {!airtimeAvailable && <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-500"><AlertCircle className="h-4 w-4" />{network} airtime is not available right now.</p>}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</label>
              <input type="tel" value={phoneNumber} onChange={(event) => handlePhone(event.target.value)} placeholder="08012345678" className="w-full rounded-xl border-2 border-border bg-card px-4 py-4 text-lg font-bold outline-none focus:border-[#7C3AED]" />
              {phoneNumber.length === 11 && !isValidNigerianPhone(phoneNumber) && <p className="mt-2 text-sm font-semibold text-red-500">Enter a valid Nigerian phone number.</p>}
              {phoneMismatch && <p className="mt-2 text-sm font-semibold text-amber-500">This number looks like {detectNetwork(phoneNumber)}. You selected {network}.</p>}
            </div>
          </section>

          <aside className="space-y-5">
            <Card className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#7C3AED]/10 p-3 text-[#7C3AED]"><Wallet className="h-5 w-5" /></div>
                  <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Wallet balance</p>
                    <p className="text-3xl font-black">{money(walletBalance)}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Sign out of CalebNet?')) logout();
                  }}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {FUNDING_PRESETS.map((preset) => (
                  <button key={preset} type="button" onClick={() => setFundAmount(preset)} className={`rounded-xl border px-3 py-2 text-sm font-black ${Number(fundAmount) === preset ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-border bg-card'}`}>
                    {money(preset)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">₦</span>
                <input type="number" inputMode="numeric" value={fundAmount} onChange={(event) => setFundAmount(Number(event.target.value) || '')} className="w-full rounded-xl border-2 border-border bg-card py-3 pl-10 pr-4 font-bold outline-none focus:border-[#7C3AED]" placeholder="100 - 50,000" />
              </div>
              <Button onClick={handleFundWallet} disabled={walletLoading} className="w-full">
                {walletLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                Fund Wallet
              </Button>
            </Card>

            <Card className="sticky top-24 space-y-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#7C3AED]/10 p-3 text-[#7C3AED]"><CheckCircle2 className="h-5 w-5" /></div>
                <h3 className="text-xl font-black">Order Summary</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-black">{type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span className="font-black">{network}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-mono font-black">{phoneNumber || '---'}</span></div>
                {type === 'DATA' && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Plan</span><span className="text-right font-black">{selectedPlan?.name || '---'}</span></div>}
              </div>
              <div className="border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-lg font-black">Total</span>
                  <span className="text-3xl font-black text-[#7C3AED]">{money(currentAmount)}</span>
                </div>
                {insufficientBalance && <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-500">Insufficient wallet balance. Fund wallet to continue.</p>}
                <Button onClick={handlePurchase} disabled={!valid || isProcessing} className="w-full py-4">
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                  {insufficientBalance ? 'Fund wallet to continue' : 'Pay from Wallet'}
                </Button>
                {!airtimeAvailable && <p className="mt-3 text-center text-xs font-bold text-red-500">{network} airtime is currently unavailable.</p>}
                {airtimeAmountError && <p className="mt-3 text-center text-xs font-bold text-red-500">{airtimeAmountError}</p>}
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                Keep your wallet funded for faster data and airtime purchases.
              </p>
            </Card>

            <Card className="space-y-3">
              <h3 className="text-lg font-black">Wallet Activity</h3>
              {walletTransactions.length === 0 ? (
                <div className="space-y-2">
                  {[1,2,3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between rounded-xl bg-muted/40 p-3">
                      <div className="space-y-1.5"><div className="h-3 w-28 rounded bg-muted" /><div className="h-2 w-16 rounded bg-muted" /></div>
                      <div className="h-4 w-16 rounded bg-muted" />
                    </div>
                  ))}
                  <p className="text-sm text-muted-foreground text-center pt-2">No wallet activity yet.</p>
                </div>
              ) : walletTransactions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-sm">
                  <div>
                    <p className="font-black">{item.purpose?.replace(/_/g, ' ') || item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.status}</p>
                  </div>
                  <p className={`font-black ${item.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>
                    {item.type === 'debit' ? '-' : '+'}{money(item.amount)}
                  </p>
                </div>
              ))}
            </Card>
          </aside>
        </main>
      )}
    </div>
  );
}
