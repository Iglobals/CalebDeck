import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Logo } from '../../components/design-system/Logo';
import { CheckCircle2, Loader2, Copy, AlertCircle, CreditCard, Store, Shield } from 'lucide-react';
import SEO from '../../components/SEO';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../services/firebase';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

interface VendorInfo {
  docId: string;
  businessName: string;
  subscriptionPlan: string;
  contactEmail?: string;
  contactName: string;
  status: string;
  activationToken: string;
}

export default function VendorActivation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { studentTheme } = useTheme();
  const isDark = studentTheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [activationResult, setActivationResult] = useState<{ accessCode: string; businessName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Look up vendor by activation token
  useEffect(() => {
    if (!token) { setError('Invalid activation link'); setLoading(false); return; }

    const lookupVendor = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'business_vendors'), where('activationToken', '==', token), limit(1))
        );
        if (snap.empty) {
          setError('This activation link is invalid or has already been used.');
          setLoading(false);
          return;
        }
        const doc = snap.docs[0];
        const data = doc.data();

        if (data.status === 'ACTIVE' && data.accessCode) {
          setError('This vendor account is already activated. Use your access code to log in.');
          setLoading(false);
          return;
        }

        setVendor({
          docId: doc.id,
          businessName: data.businessName,
          subscriptionPlan: data.subscriptionPlan || 'Monthly Plan (₦2,999/month)',
          contactEmail: data.contactEmail || '',
          contactName: data.contactName || '',
          status: data.status || 'PENDING_PAYMENT',
          activationToken: token
        });
      } catch (e) {
        console.error('[VendorActivation] lookup error:', e);
        setError('Failed to load activation details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    lookupVendor();
  }, [token]);

  const getPlanPrice = (plan: string): number => {
    if (plan.toLowerCase().includes('year')) return 24999;
    return 2999; // Monthly default
  };

  const handlePay = () => {
    if (!vendor || !PAYSTACK_PUBLIC_KEY) return;
    setPaying(true);

    const amount = getPlanPrice(vendor.subscriptionPlan) * 100; // kobo

    // Load Paystack inline
    const handler = (window as any).PaystackPop?.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: vendor.contactEmail || `${vendor.docId}@vendor.calebdeck.com`,
      amount,
      currency: 'NGN',
      ref: `CBDK-BIZ-${vendor.docId.slice(0, 8)}-${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: 'Business Name', variable_name: 'business_name', value: vendor.businessName },
          { display_name: 'Plan', variable_name: 'plan', value: vendor.subscriptionPlan },
          { display_name: 'Type', variable_name: 'type', value: 'VENDOR_SUBSCRIPTION' }
        ]
      },
      callback: async (response: { reference: string }) => {
        // Verify and activate on server
        try {
          const res = await fetch('/api/business/activate-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activationToken: vendor.activationToken,
              reference: response.reference
            })
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Activation failed');

          setActivationResult({
            accessCode: result.accessCode,
            businessName: result.businessName
          });
        } catch (e: any) {
          setError(e.message || 'Payment succeeded but activation failed. Contact support with your payment reference.');
        } finally {
          setPaying(false);
        }
      },
      onClose: () => {
        setPaying(false);
      }
    });

    if (handler) {
      handler.openIframe();
    } else {
      // Paystack script not loaded — load it dynamically
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.onload = () => handlePay(); // retry
      document.head.appendChild(script);
      setPaying(false);
    }
  };

  const handleCopy = () => {
    if (!activationResult?.accessCode) return;
    navigator.clipboard.writeText(activationResult.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4 border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-black">Activation Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="primary" onClick={() => navigate('/business')} className="mt-4">
            Go to CalebDeck Business
          </Button>
        </Card>
      </div>
    );
  }

  // Success — show access code
  if (activationResult) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <SEO title="Vendor Activated — CalebDeck Business" />
        <Card className="max-w-md w-full p-8 text-center space-y-6 border-green-500/20">
          <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black">You're Activated! 🎉</h1>
          <p className="text-muted-foreground">
            <strong>{activationResult.businessName}</strong> is now live on CalebDeck. Save your access code below — you'll use it to log into your vendor dashboard.
          </p>

          <div className="bg-muted rounded-2xl p-6 border-2 border-border space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Access Code</p>
            <code className="text-3xl font-mono font-black tracking-widest block">{activationResult.accessCode}</code>
            <Button variant="secondary" onClick={handleCopy} className="w-full mt-2">
              <Copy className="w-4 h-4 mr-2" /> {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠️ Save this code somewhere safe. You will need it every time you access your vendor dashboard.
          </p>

          <Button variant="primary" onClick={() => {
            localStorage.setItem('calebdeck_vendor', JSON.stringify({
              id: vendor?.docId,
              businessName: activationResult.businessName,
              status: 'ACTIVE'
            }));
            navigate('/business/dashboard');
          }} className="w-full">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Payment page
  if (!vendor) return null;
  const price = getPlanPrice(vendor.subscriptionPlan);
  const isYearly = vendor.subscriptionPlan.toLowerCase().includes('year');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      <SEO title="Activate Your Subscription — CalebDeck Business" />
      
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo size="md" />
          <h1 className="text-2xl font-black mt-6">Activate Your Subscription</h1>
          <p className="text-muted-foreground mt-2">Complete payment to receive your vendor access code</p>
        </div>

        <Card className={`p-6 border-2 space-y-5 ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
          {/* Business info */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="font-black text-lg">{vendor.businessName}</h2>
              <p className="text-sm text-muted-foreground">{vendor.contactName}</p>
            </div>
          </div>

          {/* Plan details */}
          <div className={`rounded-xl p-4 border-2 ${isDark ? 'border-orange-500/20 bg-orange-500/5' : 'border-orange-100 bg-orange-50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{isYearly ? 'Yearly' : 'Monthly'} Plan</p>
                <p className="text-2xl font-black mt-1">₦{price.toLocaleString()}<span className="text-sm font-bold text-muted-foreground">/{isYearly ? 'year' : 'month'}</span></p>
              </div>
              <CreditCard className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </div>

          {/* What's included */}
          <div className="space-y-2.5 text-sm">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">What you get:</p>
            {[
              'Products shown on CalebDeck homepage',
              'Direct "Chat with Vendor" WhatsApp link',
              'Monthly referral tap analytics',
              `${isYearly ? '12 months' : '30 days'} of campus visibility`
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Pay button */}
          <Button
            variant="primary"
            onClick={handlePay}
            disabled={paying}
            className="w-full py-4 text-lg font-black bg-orange-500 hover:bg-orange-600 text-white"
          >
            {paying ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
            ) : (
              <>Pay ₦{price.toLocaleString()} with Paystack</>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured by Paystack. Payment goes directly to CalebDeck.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
