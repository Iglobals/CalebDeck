import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Phone, Shield, Signal, Wifi, Zap } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
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

const NETWORKS: Array<{ id: Network; label: string; color: string; text: string; prefixes: string[] }> = [
  { id: 'MTN', label: 'MTN', color: '#FCD34D', text: '#713F12', prefixes: ['0803','0806','0810','0813','0814','0816','0903','0906','0913','0916','0704'] },
  { id: 'GLO', label: 'Glo', color: '#22C55E', text: '#FFFFFF', prefixes: ['0805','0807','0811','0815','0705','0905','0915'] },
  { id: 'AIRTEL', label: 'Airtel', color: '#EF4444', text: '#FFFFFF', prefixes: ['0802','0808','0812','0701','0708','0902','0907','0912','0901'] },
  { id: '9MOBILE', label: '9mobile', color: '#065F46', text: '#FFFFFF', prefixes: ['0809','0817','0818','0908','0909'] },
];

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

export default function CalebNet() {
  const navigate = useNavigate();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [type, setType] = useState<CalebNetType>('DATA');
  const [network, setNetwork] = useState<Network>('MTN');
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [statuses, setStatuses] = useState<Record<string, ProviderStatus>>({});
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const paymentRef = useRef(`CDNET-${Date.now()}-${Math.floor(Math.random() * 100000)}`);

  useEffect(() => subscribeToPlatformSettings(setPlatformSettings), []);

  useEffect(() => {
    const q = query(collection(db, 'calebnet_provider_status'), where('provider', '==', 'clubkonnect'));
    return onSnapshot(q, (snapshot) => {
      const next: Record<string, ProviderStatus> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        next[`${data.type}_${data.network}`] = data.status || 'HEALTHY';
      });
      setStatuses(next);
    });
  }, []);

  useEffect(() => {
    setIsLoadingPlans(true);
    setPlans([]);
    setSelectedPlanId('');
    fetch(`/api/calebnet/catalog?type=${type}&network=${network}`)
      .then((res) => res.json())
      .then((data) => {
        const nextPlans = data.plans || [];
        setPlans(nextPlans);
        if (type === 'DATA' && nextPlans.length > 0) {
          setSelectedPlanId(nextPlans[0].id);
        }
      })
      .catch(() => toast.error('Unable to load CalebNet catalog.'))
      .finally(() => setIsLoadingPlans(false));
  }, [type, network]);

  useEffect(() => {
    if (phoneNumber.length >= 4) {
      const detected = detectNetwork(phoneNumber);
      if (detected && !network) setNetwork(detected);
    }
  }, [phoneNumber, network]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );
  const providerStatus = statuses[`${type}_${network}`] || 'HEALTHY';
  const currentAmount = type === 'DATA' ? Number(selectedPlan?.sellingPrice || 0) : Number(amount || 0);
  const airtimeAmountError = type === 'AIRTIME' && amount !== ''
    ? currentAmount < 50
      ? 'Minimum airtime purchase is ₦50.'
      : currentAmount > 200000
        ? 'Maximum airtime purchase is ₦200,000.'
        : ''
    : '';
  const phoneMismatch = phoneNumber.length >= 4 && detectNetwork(phoneNumber) && detectNetwork(phoneNumber) !== network;
  const valid = providerStatus !== 'DOWN'
    && isValidNigerianPhone(phoneNumber)
    && (type === 'DATA' ? !!selectedPlan : currentAmount >= 50 && currentAmount <= 200000);

  const paystackConfig = {
    reference: paymentRef.current,
    email: 'student@calebdeck.com',
    amount: currentAmount * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'CalebNet Service', variable_name: 'calebnet_service', value: `${network} ${type}` },
        { display_name: 'Phone Number', variable_name: 'phone_number', value: phoneNumber },
      ],
    },
  };
  const initializePayment = usePaystackPayment(paystackConfig as any);

  const handlePhone = (value: string) => setPhoneNumber(value.replace(/[^0-9]/g, '').slice(0, 11));

  const verifyAndVend = async (paystackReference: string) => {
    const orderData = {
      type,
      network,
      phoneNumber,
      planId: type === 'DATA' ? selectedPlan?.id : null,
      amountPaid: currentAmount,
      customerPhone: phoneNumber,
      planName: selectedPlan?.name || 'Airtime',
    };

    const response = await fetch('/api/verify-calebnet-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: paystackReference, orderData }),
    });
    const data = await response.json();
    if (!response.ok && !data.data?.success) throw new Error(data.error || 'Unable to verify CalebNet payment');

    saveOrderToHistory(buildCalebNetEntry({
      network,
      type: type === 'DATA' ? 'data' : 'airtime',
      amount: currentAmount,
      phoneNumber,
      planName: selectedPlan?.name || 'Airtime',
      reference: paystackReference,
    }));

    navigate(`/calebnet/status/${encodeURIComponent(paystackReference)}`);
  };

  const handlePay = () => {
    if (!valid || isProcessing) return;
    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
      toast.error('Payment system is not configured. Contact support.');
      return;
    }
    setIsProcessing(true);
    initializePayment({
      onSuccess: async (reference: any) => {
        try {
          await verifyAndVend(reference.reference || paymentRef.current);
        } catch (error: any) {
          toast.error(error.message || 'Payment received, but verification failed. Contact support.');
        } finally {
          setIsProcessing(false);
          paymentRef.current = `CDNET-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        }
      },
      onClose: () => {
        setIsProcessing(false);
        toast.info('Payment window closed. No charge was made.');
      },
    } as any);
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

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-7">
          <div className="rounded-2xl bg-[#7C3AED] p-7 text-white">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-3"><Zap className="h-6 w-6" /></div>
              <div>
                <h2 className="text-2xl font-black">Cheap data and airtime for Caleb students</h2>
                <p className="text-sm text-white/75">Fast top-ups, protected by CalebDeck payments.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['DATA', 'AIRTIME'] as CalebNetType[]).map((item) => (
              <button
                key={item}
                onClick={() => setType(item)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 font-black ${type === item ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]' : 'border-border bg-card'}`}
              >
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
                  <button
                    key={item.id}
                    onClick={() => !disabled && setNetwork(item.id)}
                    disabled={disabled}
                    className={`rounded-xl border-2 p-4 text-center transition ${network === item.id ? 'scale-[1.02] shadow-lg' : 'border-border bg-card'} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                    style={network === item.id ? { backgroundColor: item.color, borderColor: item.color, color: item.text } : undefined}
                  >
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
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading plans...
                </div>
              ) : plans.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-5 text-muted-foreground">No active CalebNet plans for this network yet.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`rounded-xl border-2 bg-card p-4 text-left transition ${selectedPlanId === plan.id ? 'border-[#7C3AED] shadow-lg' : 'border-border'}`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-black">{plan.dataSize || plan.name}</p>
                          <p className="text-sm text-muted-foreground">{plan.validity || plan.description}</p>
                        </div>
                        {plan.isFeatured && <Badge variant="green" className="text-xs">Best value</Badge>}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="muted" className="text-xs">{plan.category}</Badge>
                        <span className="text-xl font-black text-[#7C3AED]">₦{plan.sellingPrice.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Amount</label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value) || '')}
                placeholder="₦50 - ₦200,000"
                className={`w-full rounded-xl border-2 bg-card px-4 py-4 text-lg font-bold outline-none ${airtimeAmountError ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-[#7C3AED]'}`}
              />
              {airtimeAmountError && <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-500"><AlertCircle className="h-4 w-4" />{airtimeAmountError}</p>}
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => handlePhone(event.target.value)}
              placeholder="08012345678"
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-4 text-lg font-bold outline-none focus:border-[#7C3AED]"
            />
            {phoneNumber.length === 11 && !isValidNigerianPhone(phoneNumber) && <p className="mt-2 text-sm font-semibold text-red-500">Enter a valid Nigerian phone number.</p>}
            {phoneMismatch && <p className="mt-2 text-sm font-semibold text-amber-500">This number looks like {detectNetwork(phoneNumber)}. You selected {network}.</p>}
          </div>
        </section>

        <aside>
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
              <div className="mb-5 flex items-center justify-between">
                <span className="text-lg font-black">Total</span>
                <span className="text-3xl font-black text-[#7C3AED]">₦{currentAmount.toLocaleString()}</span>
              </div>
              <Button onClick={handlePay} disabled={!valid || isProcessing} className="w-full py-4">
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                Pay Securely
              </Button>
              {airtimeAmountError && <p className="mt-3 text-center text-xs font-bold text-red-500">{airtimeAmountError}</p>}
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              Data and airtime are sent only after payment is verified.
            </p>
          </Card>
        </aside>
      </main>
    </div>
  );
}
