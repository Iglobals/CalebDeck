import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Clock, CreditCard, Eye, EyeOff, Info, Loader2, LogOut, Mail, Phone, RefreshCcw, Shield, Signal, UserRound, Wallet, Wifi, X, Zap, Settings, History } from 'lucide-react';
import { CalebNetAvatar, AvatarPicker, getAvatarById } from '../../components/CalebNetAvatar';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { collection, doc, getDoc, limit, onSnapshot, query, setDoc, where, updateDoc, arrayUnion } from 'firebase/firestore';
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
  relatedOrderId?: string;
  status: string;
  createdAt?: any;
}

interface StudentProfile {
  displayName: string;
  phoneNumber: string;
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

function createFundingReference() {
  return `CDWALLET-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function pendingFundingKey(userId: string) {
  return `calebnet_pending_wallet_funding_${userId}`;
}

function getPendingFundingReferences(userId: string) {
  try {
    const raw = window.localStorage.getItem(pendingFundingKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function savePendingFundingReference(userId: string, reference: string) {
  const refs = new Set(getPendingFundingReferences(userId));
  refs.add(reference);
  window.localStorage.setItem(pendingFundingKey(userId), JSON.stringify(Array.from(refs).slice(-5)));
}

function removePendingFundingReference(userId: string, reference: string) {
  const refs = getPendingFundingReferences(userId).filter((item) => item !== reference);
  if (refs.length === 0) window.localStorage.removeItem(pendingFundingKey(userId));
  else window.localStorage.setItem(pendingFundingKey(userId), JSON.stringify(refs));
}

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

function walletActivityTitle(item: WalletTransaction) {
  if (item.purpose === 'CALEBNET_PURCHASE' && item.type === 'debit') return 'CalebNet purchase';
  if (item.purpose === 'CALEBNET_REFUND' || item.type === 'refund') return 'Wallet refund';
  if (item.purpose === 'WALLET_FUNDING' && item.type === 'credit') return 'Wallet funding';
  return item.purpose?.replace(/_/g, ' ') || item.type;
}

function walletActivityDetail(item: WalletTransaction) {
  if (item.purpose === 'CALEBNET_PURCHASE' && item.type === 'debit') return 'Payment made. Check order status for delivery update.';
  if (item.purpose === 'CALEBNET_REFUND' || item.type === 'refund') return 'Money returned to your CalebNet wallet.';
  if (item.purpose === 'WALLET_FUNDING' && item.type === 'credit') return 'Wallet credited.';
  return item.status || 'Updated';
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
      isCalebNetUser: true,
      email: currentUser.email || null,
      displayName: currentUser.displayName || null,
      phoneNumber: currentUser.phoneNumber || null,
      walletBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return;
  }

  const existing = snap.data();
  const profilePatch: Record<string, any> = {
    email: snap.data().email || currentUser.email || null,
    displayName: snap.data().displayName || currentUser.displayName || null,
    phoneNumber: snap.data().phoneNumber || currentUser.phoneNumber || null,
    isCalebNetUser: true,
    updatedAt: new Date(),
  };
  if (!existing?.role) profilePatch.role = 'STUDENT';
  await setDoc(userRef, profilePatch, { merge: true });
}

function hasCompleteStudentProfile(profile: StudentProfile) {
  return profile.displayName.trim().length >= 2 && isValidNigerianPhone(profile.phoneNumber.trim());
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [type, setType] = useState<CalebNetType>(location.state?.preSelectedType || 'DATA');
  const [network, setNetwork] = useState<Network>(location.state?.preSelectedNetwork || 'MTN');
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planCategory, setPlanCategory] = useState('ALL');
  const [amount, setAmount] = useState<number | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saveAsDefaultPhone, setSaveAsDefaultPhone] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [fundAmount, setFundAmount] = useState<number | ''>(1000);
  const [fundingReference, setFundingReference] = useState(createFundingReference());
  const purchaseRef = useRef(`CDNETW-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
  const phoneTouchedRef = useRef(false);
  const fundingCompletedRef = useRef(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({ displayName: '', phoneNumber: '' });
  const [profileDraft, setProfileDraft] = useState<StudentProfile>({ displayName: '', phoneNumber: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarId, setAvatarId] = useState<string>('av1');
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [walletActivityOpen, setWalletActivityOpen] = useState(false);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalText, setInfoModalText] = useState('');

  const openInfo = (e: React.MouseEvent, category: string) => {
    e.stopPropagation();
    let text = 'This is a data bundle for mobile internet access.';
    const cat = category.toUpperCase();
    if (cat.includes('SME')) text = 'SME data is a cheaper shared data bundle provided through bulk reseller allocations. It works like normal mobile data for browsing, streaming, WhatsApp, TikTok, YouTube and everyday use.';
    else if (cat.includes('DIRECT')) text = 'Direct Data is delivered directly through the network provider. It is usually slightly more expensive but very stable and reliable.';
    else if (cat.includes('AWOOF')) text = 'Awoof Data are special promotional bundles that give extra value for short-term usage. They are usually cheaper and bigger for the price.';
    else if (cat.includes('WEEKLY')) text = 'These bundles are designed to last for 7 days.';
    else if (cat.includes('MONTHLY')) text = 'These bundles are designed to last for 30 days.';
    else if (cat.includes('NIGHT')) text = 'These plans are optimized for heavy nighttime usage and may work best during late-night hours depending on the provider.';
    
    setInfoModalTitle(`${category} Info`);
    setInfoModalText(text);
    setInfoModalOpen(true);
  };

  useEffect(() => subscribeToPlatformSettings(setPlatformSettings), []);

  useEffect(() => {
    if (!user?.uid) return;
    const userUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data() || {};
      const nextProfile = {
        displayName: String(data.displayName || user.displayName || '').trim(),
        phoneNumber: String(data.phoneNumber || user.phoneNumber || '').trim(),
      };
      setWalletBalance(Number(data.walletBalance || 0));
      if (data.calebNetAvatarId) setAvatarId(data.calebNetAvatarId);
      setStudentProfile(nextProfile);
      setProfileDraft((current) => ({
        displayName: current.displayName || nextProfile.displayName,
        phoneNumber: current.phoneNumber || nextProfile.phoneNumber,
      }));
      if (!phoneTouchedRef.current && !phoneNumber && isValidNigerianPhone(nextProfile.phoneNumber)) {
        setPhoneNumber(nextProfile.phoneNumber);
      }
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
          const defaultPlan = location.state?.preSelectedPlanId && cachedPlans.some((p: any) => p.id === location.state.preSelectedPlanId) 
            ? location.state.preSelectedPlanId 
            : cachedPlans[0]?.id;
          setSelectedPlanId(type === 'DATA' && cachedPlans.length > 0 ? defaultPlan : '');
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
        const defaultPlan = location.state?.preSelectedPlanId && nextPlans.some((p: any) => p.id === location.state.preSelectedPlanId) 
          ? location.state.preSelectedPlanId 
          : nextPlans[0]?.id;
        if (type === 'DATA' && nextPlans.length > 0) setSelectedPlanId(defaultPlan);
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
      source: 'calebnet_wallet',
      purpose: 'CALEBNET_WALLET_FUNDING',
      userId: user?.uid || '',
      email: user?.email || '',
      displayName: studentProfile.displayName || user?.displayName || '',
      phoneNumber: studentProfile.phoneNumber || user?.phoneNumber || '',
      custom_fields: [
        { display_name: 'Purpose', variable_name: 'purpose', value: 'CALEBNET_WALLET_FUNDING' },
        { display_name: 'User ID', variable_name: 'userId', value: user?.uid || '' },
      ],
    },
  };
  const initializeFunding = usePaystackPayment(fundingConfig as any);

  const handlePhone = (value: string) => setPhoneNumber(value.replace(/[^0-9]/g, '').slice(0, 11));

  const handleTransactionPhone = (value: string) => {
    phoneTouchedRef.current = true;
    handlePhone(value);
  };

  const handleProfilePhone = (value: string) => {
    setProfileDraft((current) => ({ ...current, phoneNumber: value.replace(/[^0-9]/g, '').slice(0, 11) }));
  };

  const saveStudentProfile = async () => {
    const displayName = profileDraft.displayName.trim().replace(/\s+/g, ' ');
    const savedPhoneNumber = profileDraft.phoneNumber.trim();
    if (displayName.length < 2) {
      toast.error('Enter your name as you want it to appear on CalebNet.');
      return;
    }
    if (!isValidNigerianPhone(savedPhoneNumber)) {
      toast.error('Enter a valid Nigerian phone number.');
      return;
    }
    if (!auth.currentUser) return;
    setProfileLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);
      if (auth.currentUser.displayName !== displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }
      const profilePayload: Record<string, any> = {
        email: auth.currentUser.email || null,
        displayName,
        phoneNumber: savedPhoneNumber,
        calebNetAvatarId: avatarId,
        isCalebNetUser: true,
        updatedAt: new Date(),
      };
      if (!snap.exists()) {
        profilePayload.role = 'STUDENT';
        profilePayload.walletBalance = 0;
        profilePayload.createdAt = new Date();
      } else if (!snap.data()?.role) {
        profilePayload.role = 'STUDENT';
      }
      await setDoc(userRef, profilePayload, { merge: true });
      setStudentProfile({ displayName, phoneNumber: savedPhoneNumber });
      setProfileDraft({ displayName, phoneNumber: savedPhoneNumber });
      if (!phoneTouchedRef.current || !phoneNumber) setPhoneNumber(savedPhoneNumber);
      toast.success('Profile saved.');
    } catch {
      toast.error('Could not save your profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const saveAvatarChoice = async (newAvatarId: string) => {
    setAvatarId(newAvatarId);
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { calebNetAvatarId: newAvatarId, updatedAt: new Date() }, { merge: true });
    } catch {
      // silent — avatar is cosmetic
    }
  };

  const ensureWalletProfile = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch('/api/calebnet/wallet-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        displayName: studentProfile.displayName || auth.currentUser?.displayName || null,
        phoneNumber: studentProfile.phoneNumber || auth.currentUser?.phoneNumber || null,
        email: auth.currentUser?.email || null,
      }),
    });
  };

  useEffect(() => {
    if (!user?.uid) return;
    ensureWalletProfile().catch(() => {
      // The Firestore listener still shows the local profile. Funding/purchase endpoints also ensure wallet server-side.
    });
  }, [user?.uid]);

  const verifyFunding = async (reference: string, options: { silent?: boolean } = {}) => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/wallet/verify-funding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reference }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Wallet funding failed');
    setWalletBalance(Number(data.balance || 0));
    if (auth.currentUser) removePendingFundingReference(auth.currentUser.uid, reference);
    if (!options.silent) toast.success(`Wallet funded. New balance: ${money(data.balance)}`);
  };

  useEffect(() => {
    if (!user?.uid) return;
    const refs = getPendingFundingReferences(user.uid);
    if (refs.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const reference of refs) {
        if (cancelled) return;
        try {
          await verifyFunding(reference, { silent: true });
        } catch {
          // Keep the reference locally. A later page load can retry it.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

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
    const currentReference = fundingReference;
    fundingCompletedRef.current = false;
    savePendingFundingReference(user.uid, currentReference);
    setWalletLoading(true);
    initializeFunding({
      onSuccess: async (reference: any) => {
        fundingCompletedRef.current = true;
        const paidReference = reference.reference || currentReference;
        try {
          await verifyFunding(paidReference);
        } catch (error: any) {
          savePendingFundingReference(user.uid, paidReference);
          toast.error(error.message || 'Payment received. We are confirming your wallet top-up. Please refresh CalebNet or contact support if it does not reflect soon.');
        } finally {
          setWalletLoading(false);
          setFundingReference(createFundingReference());
        }
      },
      onClose: () => {
        setWalletLoading(false);
        if (!fundingCompletedRef.current) {
          toast.info('Funding window closed. If you completed payment, tap Refresh wallet.');
        }
      },
    } as any);
  };

  const refreshWallet = async () => {
    if (!user?.uid) return;
    setWalletLoading(true);
    try {
      const refs = getPendingFundingReferences(user.uid);
      for (const reference of refs) {
        try {
          await verifyFunding(reference, { silent: true });
        } catch {
          // Leave unresolved references for the next retry.
        }
      }

      const snap = await getDoc(doc(db, 'users', user.uid));
      const balance = Number(snap.data()?.walletBalance || 0);
      setWalletBalance(balance);
      toast.success(`Wallet balance refreshed: ${money(balance)}`);
    } catch {
      toast.error('Could not refresh wallet balance. Please try again.');
    } finally {
      setWalletLoading(false);
    }
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

      if (user?.uid) {
        try {
          const updateData: any = { productsUsed: arrayUnion('CalebNet') };
          if (saveAsDefaultPhone && phoneNumber !== studentProfile.phoneNumber) {
            updateData.calebNetNumber = phoneNumber;
          }
          await updateDoc(doc(db, 'users', user.uid), updateData);
        } catch(e) {}
      }
      purchaseRef.current = `CDNETW-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      navigate(`/calebnet/status/${encodeURIComponent(clientRequestId)}`);
    } catch (error: any) {
      const raw = error.message || '';
      // Never show raw Firestore / server internals to students
      const isTechnical = raw.includes('Firestore') || raw.includes('firebase') || raw.includes('undefined') || raw.includes('INTERNAL') || raw.length > 120;
      const friendly = isTechnical
        ? 'Something went wrong processing your request. Please try again or contact support.'
        : raw || 'CalebNet purchase failed.';
      toast.error(friendly);
    } finally {
      setIsProcessing(false);
    }
  };

  const isComingSoon = platformSettings?.isCalebNetComingSoon !== false;
  const calebNetClosedMessage = platformSettings?.calebNetClosedMessage || 'CalebNet is temporarily unavailable while we update plans and provider availability.';
  const needsProfileSetup = !!user && !hasCompleteStudentProfile(studentProfile);

  if (platformSettings === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="CalebNet - Student Data and Airtime | CalebDeck"
        description="Buy affordable data plans and airtime for MTN, Airtel, Glo, and 9Mobile with CalebNet. A digital service of CalebDeck, powered by IGLOBALS TECHNOLOGY."
        canonical="https://calebdeck.com/calebnet"
        keywords="CalebNet, student data plans, Caleb University airtime, MTN data, Airtel data, Glo data, 9mobile data"
      />

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-5 py-3 pr-16 sm:pr-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Back button removed */}
            <h1 className="text-lg sm:text-xl font-black truncate">CalebNet</h1>
          </div>
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 lg:hidden">
              <div className="flex flex-col items-end text-right min-w-0">
                <p className="text-[11px] sm:text-sm font-black truncate max-w-[80px] sm:max-w-[120px] leading-tight">{studentProfile.displayName || 'Student'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Wallet className="h-3 w-3 text-[#7C3AED]" />
                  <span className="text-[10px] sm:text-xs font-bold text-[#7C3AED] leading-none">{money(walletBalance)}</span>
                </div>
              </div>
              <CalebNetAvatar
                avatarId={avatarId}
                size="sm"
                onClick={() => setProfilePanelOpen(true)}
              />
            </div>
          ) : (
            <Logo size="sm" />
          )}
        </div>
      </header>

      {isComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur">
          <Card className="max-w-md text-center">
            <Wifi className="mx-auto mb-5 h-12 w-12 text-[#7C3AED]" />
            <Badge variant="purple" className="mb-4">Coming Soon</Badge>
            <h2 className="mb-3 text-3xl font-black">CalebNet is almost here.</h2>
            <p className="mb-6 text-muted-foreground">{calebNetClosedMessage}</p>
            <Link to="/"><Button className="w-full">Return Home</Button></Link>
          </Card>
        </div>
      )}

      {!user ? (
        <CalebNetAuthGate />
      ) : (
        <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_400px]">
          <section className="space-y-7 min-w-0">
            <div className="rounded-2xl bg-[#7C3AED] p-7 text-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-3"><Zap className="h-6 w-6" /></div>
                <div>
                  <h2 className="text-2xl font-black">Fast data and airtime for Caleb students</h2>
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {[1,2,3,4,5,6].map((i) => (
                      <div key={i} className="animate-pulse rounded-xl border-2 border-border bg-card p-3 space-y-2 text-center">
                        <div className="h-5 w-12 rounded bg-muted mx-auto" />
                        <div className="h-3 w-14 rounded bg-muted mx-auto" />
                        <div className="h-5 w-10 rounded bg-muted mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-5 text-muted-foreground">No active CalebNet plans for this network yet.</div>
                ) : (
                  <div className="space-y-3 min-w-0">
                    <details className="group rounded-xl border border-border bg-card p-3 text-sm transition-all">
                      <summary className="flex cursor-pointer items-center justify-between font-black outline-none">
                        <span className="flex items-center gap-2"><Info className="h-4 w-4 text-[#7C3AED]" /> What do these plans mean?</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 space-y-2 rounded-xl bg-card p-3 text-xs text-muted-foreground">
                        <p><strong className="text-foreground">Direct/SME:</strong> Normal data plans. Lasts 30 days unless stated otherwise.</p>
                        <p><strong className="text-foreground">Awoof/Promo:</strong> Special discounted plans. Usually valid for 1-14 days.</p>
                        <p><strong className="text-[#7C3AED]">Tip:</strong> If one type fails, try another (e.g. if SME is down, use Direct).</p>
                      </div>
                    </details>
                    {planCategories.length > 2 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 min-w-0 w-full mb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {planCategories.map((category) => (
                          <button key={category} type="button" onClick={() => setPlanCategory(category)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${planCategory === category ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-border bg-card text-muted-foreground'}`}>
                            {category === 'ALL' ? 'All plans' : category}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 min-w-0">
                      {displayPlans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`
                            rounded-xl border-2 bg-card p-2.5 sm:p-3 text-center transition-all duration-200 relative min-w-0
                            ${selectedPlanId === plan.id
                              ? 'border-[#7C3AED] bg-[#7C3AED]/5 shadow-md scale-[1.03]'
                              : 'border-border hover:border-[#7C3AED]/30 hover:bg-muted/30'
                            }
                          `}
                        >
                          {plan.isFeatured && (
                            <span className="absolute -top-1.5 -right-1 text-[8px] font-black uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none z-10 shadow-sm">★</span>
                          )}
                          <p className="text-sm sm:text-base font-black leading-tight break-words">{plan.dataSize || plan.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5 leading-tight break-words">{plan.validity || plan.description}</p>
                          <p className="text-sm sm:text-base font-black text-[#7C3AED] mt-1.5 leading-none">{money(plan.sellingPrice)}</p>
                          <p className="text-[9px] font-bold text-muted-foreground/60 mt-0.5 uppercase tracking-wider leading-none">{plan.category}</p>
                        </button>
                      ))}
                    </div>
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
              <input type="tel" value={phoneNumber} onChange={(event) => handleTransactionPhone(event.target.value)} placeholder="08012345678" className="w-full rounded-xl border-2 border-border bg-card px-4 py-4 text-lg font-bold outline-none focus:border-[#7C3AED]" />
              {studentProfile.phoneNumber && (
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Your saved number is used by default. You can change it for this purchase.</p>
              )}
              {phoneNumber && phoneNumber !== studentProfile.phoneNumber && isValidNigerianPhone(phoneNumber) && user && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="saveAsDefaultPhone" checked={saveAsDefaultPhone} onChange={(e) => setSaveAsDefaultPhone(e.target.checked)} className="w-4 h-4 text-[#7C3AED] rounded border-border" />
                  <label htmlFor="saveAsDefaultPhone" className="text-sm font-medium">Save this number as default for CalebNet</label>
                </div>
              )}
              {phoneNumber.length === 11 && !isValidNigerianPhone(phoneNumber) && <p className="mt-2 text-sm font-semibold text-red-500">Enter a valid Nigerian phone number.</p>}
              {phoneMismatch && <p className="mt-2 text-sm font-semibold text-amber-500">This number looks like {detectNetwork(phoneNumber)}. You selected {network}.</p>}
            </div>
          </section>

          <aside className="space-y-5 lg:row-span-2">
            <Card className="hidden lg:block space-y-5">
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

              <div className="rounded-xl bg-muted/40 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <CalebNetAvatar avatarId={avatarId} size="md" />
                  <div>
                    <p className="font-black text-lg">{studentProfile.displayName || 'Student'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{studentProfile.phoneNumber || 'Add phone number'}</p>
                  </div>
                </div>
                <details className="group text-sm">
                  <summary className="cursor-pointer font-bold text-[#7C3AED] outline-none hover:underline">Edit Profile</summary>
                  <div className="pt-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Avatar</p>
                      <AvatarPicker selectedId={avatarId} onSelect={saveAvatarChoice} />
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Display Name</span>
                      <input
                        value={profileDraft.displayName}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))}
                        className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 font-bold outline-none focus:border-[#7C3AED]"
                        placeholder="Your name"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Default Phone Number</span>
                      <input
                        type="tel"
                        value={profileDraft.phoneNumber}
                        onChange={(event) => handleProfilePhone(event.target.value)}
                        className={`w-full rounded-xl border-2 bg-card px-4 py-3 font-bold outline-none ${profileDraft.phoneNumber && !isValidNigerianPhone(profileDraft.phoneNumber) ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-[#7C3AED]'}`}
                        placeholder="08012345678"
                      />
                    </label>
                    <Button onClick={saveStudentProfile} disabled={profileLoading} className="w-full py-3" size="sm">
                      {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save Profile
                    </Button>
                  </div>
                </details>
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
              <Button onClick={refreshWallet} disabled={walletLoading} variant="outline" className="w-full">
                {walletLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCcw className="h-5 w-5" />}
                Refresh Wallet
              </Button>
            </Card>

            <div className="space-y-5 lg:sticky lg:top-24">
              <Card className="space-y-5">
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
              <div className="mt-5 space-y-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><Clock className="h-3 w-3 shrink-0 text-amber-500" /> After wallet payment, we confirm delivery with the network and update your status automatically.</p>
                <p className="flex items-center gap-2"><Zap className="h-3 w-3 shrink-0 text-amber-500" /> Fast automated delivery.</p>
                <p className="flex items-center gap-2"><Shield className="h-3 w-3 shrink-0 text-[#7C3AED]" /> Secure payment and wallet system.</p>
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                Keep your wallet funded for faster data and airtime purchases.
              </p>
            </Card>

            </div>
          </aside>

          <Card className="space-y-3 lg:col-start-1 lg:row-start-2">
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setWalletActivityOpen(!walletActivityOpen)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#7C3AED]" />
                  <h3 className="text-base font-black">Wallet Activity</h3>
                </div>
                {walletActivityOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <History className="h-5 w-5 text-[#7C3AED]" />
              <h3 className="text-lg font-black">Wallet Activity</h3>
            </div>
            
            <div className={`max-h-[280px] space-y-2 overflow-y-auto pr-2 custom-scrollbar ${walletActivityOpen ? 'block pt-2 border-t border-border' : 'hidden'} lg:block lg:pt-0 lg:border-t-0`}>
              {walletTransactions.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="hidden lg:flex items-center justify-between rounded-xl bg-muted/40 p-3 animate-pulse">
                      <div className="space-y-1.5"><div className="h-3 w-28 rounded bg-muted" /><div className="h-2 w-16 rounded bg-muted" /></div>
                      <div className="h-4 w-16 rounded bg-muted" />
                    </div>
                  ))}
                  <p className="pt-2 text-center text-sm text-muted-foreground">No wallet activity yet.</p>
                </div>
              ) : walletTransactions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-black">{walletActivityTitle(item)}</p>
                    <p className="text-xs text-muted-foreground">{walletActivityDetail(item)}</p>
                    {item.relatedOrderId && item.purpose === 'CALEBNET_PURCHASE' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/calebnet/status/${encodeURIComponent(item.relatedOrderId!)}`)}
                        className="mt-1 text-xs font-black text-[#7C3AED] hover:underline"
                      >
                        View status
                      </button>
                    )}
                  </div>
                  <p className={`font-black ${item.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>
                    {item.type === 'debit' ? '-' : '+'}{money(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </main>
      )}

      {needsProfileSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-[#7C3AED]/20 shadow-2xl">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-2xl bg-[#7C3AED]/10 p-3 text-[#7C3AED]">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Complete your CalebNet profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add your name and main phone number for faster top-ups.</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Full name</span>
                <input
                  value={profileDraft.displayName}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-xl border-2 border-border bg-card px-4 py-4 font-bold outline-none focus:border-[#7C3AED]"
                  placeholder="Your full name"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Main phone number</span>
                <input
                  type="tel"
                  value={profileDraft.phoneNumber}
                  onChange={(event) => handleProfilePhone(event.target.value)}
                  className={`w-full rounded-xl border-2 bg-card px-4 py-4 font-bold outline-none ${profileDraft.phoneNumber && !isValidNigerianPhone(profileDraft.phoneNumber) ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-[#7C3AED]'}`}
                  placeholder="08012345678"
                />
                {profileDraft.phoneNumber && !isValidNigerianPhone(profileDraft.phoneNumber) && (
                  <p className="mt-2 text-sm font-semibold text-red-500">Enter a valid Nigerian phone number.</p>
                )}
              </label>

              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                This number will appear first when you buy data or airtime. You can still enter another recipient number anytime.
              </div>

              <Button onClick={saveStudentProfile} disabled={profileLoading || !hasCompleteStudentProfile(profileDraft)} className="w-full py-5">
                {profileLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Save and Continue
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Profile Panel — triggered by avatar tap */}
      {profilePanelOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-sm lg:hidden" onClick={() => setProfilePanelOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md max-h-[85vh] flex flex-col">
            <Card className="w-full flex-1 border-[#7C3AED]/20 shadow-2xl overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-[#7C3AED]" />
                  <h3 className="text-xl font-black">Profile & Wallet</h3>
                </div>
                <button onClick={() => setProfilePanelOpen(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Avatar display + balance */}
              <div className="flex flex-col items-center mb-6">
                <CalebNetAvatar avatarId={avatarId} size="lg" />
                <p className="mt-3 text-lg font-black">{studentProfile.displayName || 'Student'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Wallet className="h-4 w-4 text-[#7C3AED]" />
                  <span className="text-xl font-black text-[#7C3AED]">{money(walletBalance)}</span>
                </div>
              </div>

              {/* Avatar Picker */}
              <div className="mb-6">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Choose your avatar</p>
                <AvatarPicker selectedId={avatarId} onSelect={saveAvatarChoice} />
              </div>

              {/* Profile Editor */}
              <div className="space-y-4 mb-6 border-t border-border pt-5">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Edit Profile</p>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Display Name</span>
                  <input
                    value={profileDraft.displayName}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))}
                    className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 font-bold outline-none focus:border-[#7C3AED]"
                    placeholder="Your name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Default Phone Number</span>
                  <input
                    type="tel"
                    value={profileDraft.phoneNumber}
                    onChange={(event) => handleProfilePhone(event.target.value)}
                    className={`w-full rounded-xl border-2 bg-card px-4 py-3 font-bold outline-none ${profileDraft.phoneNumber && !isValidNigerianPhone(profileDraft.phoneNumber) ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-[#7C3AED]'}`}
                    placeholder="08012345678"
                  />
                </label>
                <Button onClick={() => { saveStudentProfile(); setProfilePanelOpen(false); }} disabled={profileLoading} className="w-full py-3">
                  {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Profile
                </Button>
              </div>

              {/* Fund Wallet (compact) */}
              <div className="space-y-3 border-t border-border pt-5 mb-5">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fund Wallet</p>
                <div className="grid grid-cols-3 gap-2">
                  {FUNDING_PRESETS.map((preset) => (
                    <button key={preset} type="button" onClick={() => setFundAmount(preset)} className={`rounded-xl border px-2 py-2 text-xs font-black ${Number(fundAmount) === preset ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-border bg-card'}`}>
                      {money(preset)}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">₦</span>
                  <input type="number" inputMode="numeric" value={fundAmount} onChange={(event) => setFundAmount(Number(event.target.value) || '')} className="w-full rounded-xl border-2 border-border bg-card py-2.5 pl-8 pr-3 font-bold outline-none focus:border-[#7C3AED] text-sm" placeholder="100 - 50,000" />
                </div>
                <Button onClick={() => { handleFundWallet(); setProfilePanelOpen(false); }} disabled={walletLoading} className="w-full py-3">
                  {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Fund Wallet
                </Button>
                <Button onClick={refreshWallet} disabled={walletLoading} variant="outline" className="w-full py-3">
                  {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Refresh Wallet
                </Button>
              </div>

              {/* Sign Out */}
              <button
                onClick={() => {
                  if (window.confirm('Sign out of CalebNet?')) {
                    logout();
                    setProfilePanelOpen(false);
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-500/20 px-4 py-3 text-sm font-black text-red-500 hover:bg-red-500/5 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </Card>
          </div>
        </div>
      )}

      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setInfoModalOpen(false)}>
          <Card className="w-full max-w-sm border-[#7C3AED]/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#7C3AED]/10 p-2 text-[#7C3AED]"><Info className="h-5 w-5" /></div>
                <h3 className="text-lg font-black">{infoModalTitle}</h3>
              </div>
              <button onClick={() => setInfoModalOpen(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{infoModalText}</p>
            <Button className="mt-6 w-full py-5" onClick={() => setInfoModalOpen(false)}>Got it</Button>
          </Card>
        </div>
      )}
    </div>
  );
}


