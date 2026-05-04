import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Wifi, Phone, Loader2, CheckCircle2, AlertCircle, ChevronDown, Zap, Signal, RefreshCcw, Shield } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Logo } from '../../components/design-system/Logo';
import SEO from '../../components/SEO';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';

const NETWORKS = [
  { id: 'MTN', name: 'MTN', color: '#FCD34D', textDark: 'text-yellow-900', prefixes: ['0803','0806','0810','0813','0814','0816','0903','0906','0913','0916','0704'] },
  { id: 'Airtel', name: 'Airtel', color: '#EF4444', textDark: 'text-white', prefixes: ['0802','0808','0812','0701','0708','0902','0907','0912','0901'] },
  { id: 'Glo', name: 'Glo', color: '#22C55E', textDark: 'text-white', prefixes: ['0805','0807','0811','0815','0705','0905','0915'] },
  { id: '9Mobile', name: '9Mobile', color: '#065F46', textDark: 'text-white', prefixes: ['0809','0817','0818','0908','0909'] }
];

const VALID_NETWORKS = ['MTN', 'Airtel', 'Glo', '9Mobile'];

function isValidNigerianPhone(phone: string): boolean {
  return /^0[789][01]\d{8}$/.test(phone);
}

function detectNetwork(phone: string): string | null {
  if (phone.length < 4) return null;
  const prefix = phone.substring(0, 4);
  for (const net of NETWORKS) {
    if (net.prefixes.includes(prefix)) return net.id;
  }
  return null;
}

export default function CalebNet() {
  const navigate = useNavigate();
  const { studentTheme } = useTheme();
  const [network, setNetwork] = useState<string>('');
  const [type, setType] = useState<'data' | 'airtime'>('data');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [planFetchError, setPlanFetchError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const paymentRef = useRef(`calebnet_${Date.now()}_${Math.floor(Math.random() * 100000)}`);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (type === 'data' && network) {
      fetchPlans();
    } else {
      setPlans([]);
      setSelectedPlanId('');
      setPlanFetchError(false);
    }
  }, [network, type]);

  // Auto-detect network from phone number
  useEffect(() => {
    if (phoneNumber.length >= 4 && !network) {
      const detected = detectNetwork(phoneNumber);
      if (detected) setNetwork(detected);
    }
  }, [phoneNumber]);

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    setPlanFetchError(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(`/api/calebnet-plans?network=${network}`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await response.json();
      if (data.success && data.plans?.length > 0) {
        setPlans(data.plans);
        setSelectedPlanId(data.plans[0].variation_code);
        setAmount(data.plans[0].variation_amount);
      } else {
        setPlanFetchError(true);
        setPlans([]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.error('Request timed out. Please check your connection.');
      } else {
        toast.error('Failed to load data plans. Try again.');
      }
      setPlanFetchError(true);
      setPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 11);
    setPhoneNumber(cleaned);
    if (cleaned.length === 11 && !isValidNigerianPhone(cleaned)) {
      setPhoneError('Enter a valid Nigerian phone number');
    } else {
      setPhoneError('');
    }
  };

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPlanId(val);
    const plan = plans.find(p => p.variation_code === val);
    if (plan) setAmount(plan.variation_amount);
  };

  const isFormValid = () => {
    if (!network || !VALID_NETWORKS.includes(network)) return false;
    if (!phoneNumber || phoneNumber.length !== 11 || !isValidNigerianPhone(phoneNumber)) return false;
    if (type === 'data' && !selectedPlanId) return false;
    if (type === 'airtime' && (!amount || Number(amount) < 50 || Number(amount) > 50000)) return false;
    return true;
  };

  const selectedPlan = type === 'data' ? plans.find(p => p.variation_code === selectedPlanId) : null;

  const config = {
    reference: paymentRef.current,
    email: 'student@calebdeck.com',
    amount: (Number(amount) || 0) * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: "CalebNet Service", variable_name: "calebnet_service", value: `${network} ${type}` },
        { display_name: "Phone Number", variable_name: "phone_number", value: phoneNumber }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config as any);

  const onSuccess = async (reference: any) => {
    setIsProcessing(true);
    try {
      const orderData = {
        network, type, phoneNumber,
        planId: type === 'data' ? selectedPlanId : null,
        planName: type === 'data' ? selectedPlan?.name : 'Airtime',
        amountPaid: Number(amount)
      };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch('/api/verify-calebnet-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: reference.reference, orderData }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.data?.success) {
        if (data.data.fulfillmentStatus === 'SUCCESSFUL') {
          toast.success('Recharge successful! 🎉');
          navigate('/order-success', { state: { calebnet: true, amount, type, network, phoneNumber } });
        } else if (data.data.fulfillmentStatus === 'PENDING_PROVIDER') {
          toast.info('Payment received! Your recharge is being processed by the network. This usually takes a few seconds.');
          navigate('/');
        } else {
          toast.warning('Payment received but recharge could not be completed. Admin has been notified and will resolve this.');
          navigate('/');
        }
      } else {
        toast.error(data.error || 'Payment verification failed. Contact support if deducted.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.warning('Verification is taking long. Your payment is safe — admin will follow up.');
      } else {
        toast.error('Connection error during verification. If your payment was deducted, contact support.');
      }
    } finally {
      setIsProcessing(false);
      paymentRef.current = `calebnet_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    }
  };

  const onClose = () => {
    toast.info('Payment window closed. No charge was made.');
    setIsProcessing(false);
  };

  const handlePay = () => {
    if (!isFormValid()) return;
    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
      toast.error('Payment system is not configured. Contact support.');
      return;
    }
    setIsProcessing(true);
    initializePayment({ onSuccess: onSuccess as any, onClose });
  };

  const isComingSoon = platformSettings?.isCalebNetComingSoon !== false;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="CalebNet — Instant Data & Airtime"
        description="Buy mobile data and airtime for MTN, Airtel, Glo, and 9Mobile directly from CalebDeck."
      />

      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-muted rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">CalebNet</h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      {isComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center shadow-2xl animate-fade-in-up">
            <div className="w-20 h-20 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wifi className="w-10 h-10 text-[#7C3AED]" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-black uppercase tracking-widest mb-5">
              Coming Soon
            </div>
            <h2 className="text-3xl font-black mb-4">CalebNet is almost here.</h2>
            <p className="text-muted-foreground mb-4 text-lg font-medium leading-relaxed">
              Cheaper data and airtime top-up is coming to CalebDeck for Caleb University students.
            </p>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              CalebNet will make it easier to stay connected for classes, calls, and campus life without overpaying.
            </p>
            <Link to="/">
              <Button variant="primary" className="w-full py-4 text-base rounded-xl font-bold">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 lg:py-12">
        <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-12">

          {/* Left Panel — Form */}
          <div className="space-y-8">

            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4C1D95] p-8 lg:p-10 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-black">Instant Top-Up</h2>
                    <p className="text-white/70 text-sm font-medium">Data & Airtime in seconds</p>
                  </div>
                </div>
                <p className="text-white/80 text-sm lg:text-base max-w-lg leading-relaxed mt-4">
                  Buy data plans and airtime for any Nigerian network. Fast, secure, and powered by CalebDeck.
                </p>
              </div>
            </div>

            {/* Type Toggle */}
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 pl-1">What do you need?</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'data' as const, label: 'Data Plan', icon: Wifi },
                  { key: 'airtime' as const, label: 'Airtime', icon: Phone }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={`p-5 lg:p-6 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 ${
                      type === key
                        ? 'border-[#7C3AED] bg-[#7C3AED]/5 shadow-lg shadow-[#7C3AED]/10'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${type === key ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/30' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`font-bold text-lg ${type === key ? 'text-[#7C3AED]' : 'text-foreground'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Network Selection */}
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 pl-1">Select Network</h2>
              <div className="grid grid-cols-4 gap-3">
                {NETWORKS.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setNetwork(n.id)}
                    className={`p-4 lg:p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                      network === n.id
                        ? 'border-transparent shadow-lg shadow-black/10 scale-[1.04]'
                        : 'border-border bg-card hover:bg-muted/50 hover:scale-[1.02]'
                    }`}
                    style={network === n.id ? { backgroundColor: n.color, borderColor: n.color } : {}}
                  >
                    <Signal className={`w-5 h-5 ${network === n.id ? n.textDark : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-bold ${network === n.id ? n.textDark : 'text-foreground'}`}>
                      {n.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Phone & Plan / Amount */}
            {network && (
              <section className="space-y-6">
                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={phoneNumber}
                    onChange={e => handlePhoneChange(e.target.value)}
                    className={`w-full px-5 py-4 rounded-2xl border-2 bg-card text-foreground transition-all text-lg font-medium outline-none ${
                      phoneError ? 'border-red-400 focus:border-red-500' : 'border-border focus:border-[#7C3AED]'
                    }`}
                  />
                  {phoneError && <p className="text-red-500 text-xs font-semibold pl-1">{phoneError}</p>}
                  {phoneNumber.length >= 4 && !phoneError && detectNetwork(phoneNumber) && detectNetwork(phoneNumber) !== network && (
                    <p className="text-amber-500 text-xs font-semibold pl-1">
                      This number looks like {detectNetwork(phoneNumber)}. You selected {network}.
                    </p>
                  )}
                </div>

                {/* Data Plan or Airtime Amount */}
                {type === 'airtime' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Amount (₦)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Min ₦50 · Max ₦50,000"
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value) || '')}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-card text-foreground focus:border-[#7C3AED] transition-all text-lg font-medium outline-none"
                    />
                    {amount && Number(amount) < 50 && (
                      <p className="text-red-500 text-xs font-semibold pl-1">Minimum airtime amount is ₦50</p>
                    )}
                    {amount && Number(amount) > 50000 && (
                      <p className="text-red-500 text-xs font-semibold pl-1">Maximum amount is ₦50,000</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Select Data Plan</label>
                    {isLoadingPlans ? (
                      <div className="h-16 bg-card border-2 border-border rounded-2xl flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
                        <span className="text-sm text-muted-foreground font-medium">Loading {network} plans...</span>
                      </div>
                    ) : planFetchError ? (
                      <div className="p-4 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">Couldn't load plans. Network issue.</span>
                        </div>
                        <button
                          onClick={fetchPlans}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-colors"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" /> Retry
                        </button>
                      </div>
                    ) : plans.length > 0 ? (
                      <div className="relative">
                        <select
                          value={selectedPlanId}
                          onChange={handlePlanChange}
                          className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-card text-foreground focus:border-[#7C3AED] transition-all text-base font-medium appearance-none pr-12 outline-none"
                        >
                          {plans.map(plan => (
                            <option key={plan.variation_code} value={plan.variation_code}>
                              {plan.name} — ₦{Number(plan.variation_amount).toLocaleString()}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                      </div>
                    ) : (
                      <div className="h-16 bg-muted/30 border-2 border-border rounded-2xl flex items-center justify-center text-muted-foreground text-sm">
                        Select a network to see available plans
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Security Note — only on mobile (below form) */}
            <div className="lg:hidden">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
                <Shield className="w-5 h-5 text-[#7C3AED] flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Payments are processed securely via Paystack. Your card details are never stored.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel — Order Summary (desktop: sticky sidebar, mobile: floating footer) */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <Card className="border-2 border-border/60 p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <h3 className="text-xl font-black">Order Summary</h3>
                </div>

                {!network ? (
                  <div className="py-8 text-center">
                    <Signal className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Select a network and fill in your details to see the summary.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground text-sm">Network</span>
                        <span className="font-bold flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full inline-block"
                            style={{ backgroundColor: NETWORKS.find(n => n.id === network)?.color }}
                          />
                          {network}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground text-sm">Type</span>
                        <span className="font-bold capitalize">{type}</span>
                      </div>
                      {phoneNumber && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-muted-foreground text-sm">Phone</span>
                          <span className="font-bold font-mono tracking-wide">{phoneNumber}</span>
                        </div>
                      )}
                      {type === 'data' && selectedPlan && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-muted-foreground text-sm">Plan</span>
                          <span className="font-bold text-right text-sm max-w-[200px] truncate" title={selectedPlan.name}>{selectedPlan.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-6 mt-4">
                      <div className="flex justify-between items-center mb-6">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-black text-3xl text-[#7C3AED]">₦{(Number(amount) || 0).toLocaleString()}</span>
                      </div>

                      <Button
                        variant="primary"
                        onClick={handlePay}
                        disabled={!isFormValid() || isProcessing}
                        className="w-full py-5 rounded-2xl text-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Pay ₦{(Number(amount) || 0).toLocaleString()}
                          </span>
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 mt-2">
                      <Shield className="w-5 h-5 text-[#7C3AED] flex-shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Payments are processed securely via Paystack. Your card details are never stored.
                      </p>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile-only Floating Pay Button */}
      <div className="lg:hidden">
        {isFormValid() && (
          <div className="fixed bottom-6 left-0 right-0 px-4 z-40">
            <div className="max-w-lg mx-auto">
              <Button
                variant="primary"
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full py-5 rounded-2xl shadow-2xl shadow-[#7C3AED]/20 flex items-center justify-between px-6 text-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              >
                {isProcessing ? (
                  <div className="w-full flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      Pay Securely
                    </span>
                    <span className="bg-white/20 px-4 py-1.5 rounded-xl font-black">₦{(Number(amount) || 0).toLocaleString()}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
