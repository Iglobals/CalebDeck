import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { useMartCart } from '../../../context/MartCartContext';
import { getActiveHostels, Hostel, subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { verifyPayment } from '../../../services/functions';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { ArrowLeft, User, Phone, Shield, CreditCard, ShoppingBag, Clock, AlertTriangle, Shirt } from 'lucide-react';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import SEO from '../../components/SEO';
import { Loader2 } from 'lucide-react';
import { getHexColorName } from '../../../utils/formatColor';

const FEMALE_HOSTEL_IDS = ['sussana', 'rebecca', 'mary', 'esme', 'deborah', 'mercy'];

export default function FashionCheckout() {
  const { items, subtotal, totalItems, clearCart } = useMartCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const paymentProcessingRef = useRef(false);
  const paymentRef = useRef((new Date()).getTime().toString());

  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.displayNameFromProfile || '',
    phone: user?.phone || '',
    hostel: user?.hostel || '',
    instructions: ''
  });
  const [femaleHostelAgreement, setFemaleHostelAgreement] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const selectedHostel = hostels.find(h => h.id === formData.hostel);
  const isFemaleHostelSelected = FEMALE_HOSTEL_IDS.includes((formData.hostel || '').toLowerCase());
  const FASHION_DELIVERY_FEE = 1500; // Batch fulfillment delivery fee
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const SERVICE_PROCESSING_FEE = 300;
  const total = subtotal + FASHION_DELIVERY_FEE + SERVICE_PROCESSING_FEE;
  const orderId = React.useMemo(() => `CD-FASHION-${Math.floor(10000 + Math.random() * 90000)}`, []);

  useEffect(() => {
    if (!user) {
      window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + '/fashion/checkout')}`;
      return;
    }
    if (items.length === 0) {
      navigate('/fashion');
    }
  }, [items, navigate, user]);

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const activeHostels = await getActiveHostels();
        setHostels(activeHostels);
      } catch (error) {
        toast.error("Failed to load hostels");
      }
    };
    fetchHostels();
    
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
  }, []);

  const currentHour = new Date().getHours();
  const openingHour = platformSettings?.fashionOpeningHour ?? 0;
  const closingHour = platformSettings?.fashionClosingHour ?? 24;
  const hasFashionItems = items.some(item => item.productType === 'FASHION');
  
  const fashionClosed = hasFashionItems && !!platformSettings && (
    currentHour < openingHour || 
    currentHour >= closingHour || 
    platformSettings?.isFashionAcceptingOrders === false || 
    platformSettings?.isFashionComingSoon === true
  ) && !isDev;

  const isClosed = fashionClosed;
  const closedMessage = platformSettings?.isFashionComingSoon === true
    ? (platformSettings?.fashionClosedMessage || 'CalebDeck Fashion is launching soon! Stay tuned.')
    : platformSettings?.isFashionAcceptingOrders === false
      ? (platformSettings?.fashionClosedMessage || 'CalebDeck Fashion is temporarily paused. Please check back shortly.')
      : `CalebDeck Fashion follows operating hours: ${openingHour}:00 to ${closingHour}:00.`;

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const config = {
    reference: paymentRef.current,
    email: formData.fullName
      ? `${formData.fullName.trim().toLowerCase().replace(/\s+/g, '.')}@calebdeck.com`
      : user?.email || "guest@calebdeck.com",
    amount: Math.round(total * 100),
    publicKey: paystackKey as string,
    metadata: {
      orderId,
      orderType: 'FASHION',
      source: 'calebdeck',
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || '',
      instructions: formData.instructions,
      femaleHostelAgreement,
      items: items.map(i => ({
        id: i.id,
        name: i.name + (i.size || i.color ? ` (${[i.size, getHexColorName(i.color || '')].filter(Boolean).join(', ')})` : ''),
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: FASHION_DELIVERY_FEE,
      serviceProcessingFee: SERVICE_PROCESSING_FEE,
      subtotal,
      totalAmount: total
    }
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    if (paymentProcessingRef.current) return;
    paymentProcessingRef.current = true;
    toast.loading("Verifying your payment...");

    const orderData = {
      orderId,
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || formData.hostel,
      instructions: formData.instructions,
      femaleHostelAgreement,
      orderType: 'FASHION',
      items: items.map(i => ({
        id: i.id,
        name: i.name + (i.size || i.color ? ` (${[i.size, getHexColorName(i.color || '')].filter(Boolean).join(', ')})` : ''),
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: FASHION_DELIVERY_FEE,
      serviceProcessingFee: SERVICE_PROCESSING_FEE,
      subtotal,
      totalAmount: total,
    };

    const goToSuccess = async (finalOrderId: string, firestoreId = reference.reference || paymentRef.current) => {
      if (user) {
        try {
          const updateData: any = { productsUsed: arrayUnion('CalebDeck Fashion') };
          if (saveAsDefault) {
            updateData.fullName = formData.fullName;
            updateData.phone = formData.phone;
            updateData.hostel = formData.hostel;
          }
          const { db } = await import('../../../services/firebase');
          await updateDoc(doc(db, 'users', user.uid), updateData);
        } catch(e) { console.error('Failed to update user profile defaults', e); }
      }
      toast.dismiss();
      clearCart();
      navigate('/order-success', {
        state: {
          ...orderData,
          firestoreOrderId: firestoreId,
          orderId: finalOrderId,
          paymentReference: reference.reference || paymentRef.current,
          totalAmount: total,
          total,
          cafeteria: 'CalebDeck Fashion',
          hostel: formData.hostel,
          hostelName: selectedHostel?.name || formData.hostel,
          status: 'PAID'
        },
        replace: true
      });
    };

    const goToPaymentStatus = (status: string, firestoreId: string, message?: string) => {
      toast.dismiss();
      navigate('/order-success', {
        state: {
          ...orderData,
          firestoreOrderId: firestoreId,
          orderId,
          paymentReference: reference.reference || paymentRef.current,
          totalAmount: total,
          total,
          cafeteria: 'CalebDeck Fashion',
          hostel: formData.hostel,
          hostelName: selectedHostel?.name || formData.hostel,
          status,
          paymentMessage: message
        },
        replace: true
      });
    };

    try {
      const response = await verifyPayment({ reference: reference.reference || paymentRef.current, orderData });
      const serverData = response.data || response;
      if (serverData && serverData.success) {
        goToSuccess(serverData.orderId || orderId, serverData.firestoreOrderId || reference.reference || paymentRef.current);
        return;
      }
    } catch (firstError) {
      console.warn('Verification attempt 1 failed:', firstError);
      await new Promise(r => setTimeout(r, 3000));
      try {
        const response = await verifyPayment({ reference: reference.reference || paymentRef.current, orderData });
        const serverData = response.data || response;
        if (serverData && serverData.success) {
          goToSuccess(serverData.orderId || orderId, serverData.firestoreOrderId || reference.reference || paymentRef.current);
          return;
        }
      } catch (secondError) {
        console.warn('Verification attempt 2 failed:', secondError);
      }
    }

    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../../services/firebase');
      const orderSnap = await getDoc(doc(db, 'orders', reference.reference));
      if (orderSnap.exists()) {
        const existingOrder = orderSnap.data();
        if (existingOrder.status === 'PAID' || existingOrder.source === 'verified' || existingOrder.source === 'webhook_confirmed') {
          toast.success('Your payment was successful and your order is confirmed!', { autoClose: 5000 });
          goToSuccess(existingOrder.orderId || orderId);
          return;
        }

        toast.warning(
          existingOrder.status === 'FAILED'
            ? 'Payment did not go through. If your bank deducted money, it should be reversed by your bank or Paystack.'
            : 'Your order details are saved, but payment is not confirmed yet. Try again with a stronger network.',
          { autoClose: 9000 }
        );
        goToPaymentStatus(existingOrder.status || 'PENDING_PAYMENT', orderSnap.id, existingOrder.paymentMessage);
        return;
      }
    } catch (firestoreErr) {
      console.warn('Firestore fallback check failed:', firestoreErr);
    }

    toast.dismiss();
    toast.warning(
      'We could not confirm your payment yet. Please do not pay again immediately. Check your bank alert, then contact support if you were debited.',
      { autoClose: 10000 }
    );
    paymentProcessingRef.current = false;
  };

  const onClose = () => {
    toast.info("Your order details were saved, but payment was not completed. Try again with a stronger network or switch data/WiFi.");
  };

  const handlePay = () => {
    if (!formData.fullName.trim()) return toast.error('Please enter your full name');
    if (!formData.phone.trim()) return toast.error('Please enter your phone number');
    if (formData.phone.length < 10) return toast.error('Please enter a valid phone number');
    if (!formData.hostel) return toast.error('Please select your hostel');
    if (isFemaleHostelSelected && !femaleHostelAgreement) {
      return toast.info('Please accept the female hostel delivery agreement before payment.');
    }

    const currentLiveHour = new Date().getHours();
    const liveClosed = hasFashionItems && !!platformSettings && (
      currentLiveHour < (platformSettings?.fashionOpeningHour ?? 0) || 
      currentLiveHour >= (platformSettings?.fashionClosingHour ?? 24) || 
      platformSettings?.isFashionAcceptingOrders === false || 
      platformSettings?.isFashionComingSoon === true
    ) && !isDev;

    if (isClosed || liveClosed) {
      toast.error(closedMessage);
      return;
    }

    const preSaveData = {
      orderId,
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || formData.hostel,
      instructions: formData.instructions,
      femaleHostelAgreement,
      orderType: 'FASHION',
      items: items.map(i => ({
        id: i.id,
        name: i.name + (i.size || i.color ? ` (${[i.size, getHexColorName(i.color || '')].filter(Boolean).join(', ')})` : ''),
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: FASHION_DELIVERY_FEE,
      serviceProcessingFee: SERVICE_PROCESSING_FEE,
      subtotal,
      totalAmount: total
    };

    fetch('/api/pre-save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: paymentRef.current, orderData: preSaveData })
    }).catch(err => console.warn('[FashionCheckout] Pre-save failed (non-blocking):', err));

    initializePayment({
      onSuccess: (reference: any) => void onSuccess(reference),
      onClose: () => onClose()
    });
  };

  if (isClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <SEO
          title="Fashion Checkout Closed - CalebDeck Fashion"
          description="CalebDeck Fashion checkout is currently unavailable."
          canonical="https://calebdeck.com/fashion/checkout"
          robots="noindex,follow"
        />
        <Card className="text-center max-w-md w-full py-12 px-8">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Fashion is Closed</h1>
          <p className="text-muted-foreground mb-10 text-lg">
            {closedMessage}
          </p>
          <Link to="/fashion" className="inline-block w-full">
            <Button variant="primary" className="w-full py-6 text-xl rounded-2xl">Back to Fashion</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO
        title="Checkout - CalebDeck Fashion"
        description="Complete your CalebDeck Fashion order with delivery details and secure Paystack payment."
        canonical="https://calebdeck.com/fashion/checkout"
        robots="noindex,follow"
      />

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted" aria-label="Go back">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Checkout Fashion</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-[#F97316]" />
                Delivery Details
              </h2>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
                <Input
                  label="Phone Number"
                  placeholder="08012345678"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
                {user && (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" id="saveAsDefault" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} className="w-4 h-4 text-primary rounded border-border" />
                    <label htmlFor="saveAsDefault" className="text-sm font-medium">Save these details as default</label>
                  </div>
                )}
                <Select
                  label="Select Hostel"
                  value={formData.hostel}
                  onChange={(e) => {
                    setFemaleHostelAgreement(false);
                    setFormData({ ...formData, hostel: e.target.value });
                  }}
                  options={hostels.map(h => ({ value: h.id, label: h.name }))}
                  required
                />
                <Textarea
                  label="Delivery Instructions (Optional)"
                  placeholder="E.g., Call me when you reach the gate..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                />
                {isFemaleHostelSelected && (
                  <div className="p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/30 shadow-inner">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h4 className="font-black text-base sm:text-lg leading-tight">Female Hostel Delivery Notice</h4>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
                          You selected {selectedHostel?.name || 'a female hostel'}. CalebDeck currently does not have female delivery agents for female hostels, and school rules restrict male riders from those areas.
                        </p>
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={femaleHostelAgreement}
                          onChange={(e) => setFemaleHostelAgreement(e.target.checked)}
                          className="mt-1 h-5 w-5 rounded border-2 border-amber-500 accent-amber-500"
                        />
                        <span className="text-sm sm:text-base font-bold leading-relaxed">
                          Yes, I agree to meet the rider myself at a safe, school-approved pickup point.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 sticky top-24 border-[#7C3AED]/20 shadow-xl shadow-[#7C3AED]/5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Shirt className="w-5 h-5 text-[#7C3AED]" /> Order Summary
              </h3>
              
              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate pr-2">
                      {item.quantity}x {item.name}
                      {(item.size || item.color) && (
                        <span className="opacity-75"> ({[item.size, getHexColorName(item.color || '')].filter(Boolean).join(', ')})</span>
                      )}
                    </span>
                    <span className="font-medium shrink-0">₦{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">₦{subtotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-foreground">₦{FASHION_DELIVERY_FEE}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Service & Processing Fee</span>
                  <span className="font-medium text-foreground">₦{SERVICE_PROCESSING_FEE}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-black text-[#F97316]">₦{total}</span>
                </div>
                
                <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 flex items-center justify-between opacity-100 transition-all cursor-not-allowed mb-3 relative overflow-hidden">
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black">
                      ₦
                    </div>
                    <div>
                      <p className="font-bold">i-CON Wallet</p>
                      <p className="text-xs text-muted-foreground">Disabled for Fashion pilot</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 relative z-10"></div>
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-20"></div>
                </div>

                <div className="p-4 rounded-xl border-2 border-[#7C3AED] bg-card flex items-center justify-between transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold">Paystack</p>
                      <p className="text-xs text-muted-foreground">Card, Bank Transfer, USSD</p>
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-[5px] border-[#7C3AED] bg-white"></div>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full py-4 text-lg text-white flex items-center justify-center gap-2 shadow-xl bg-gradient-to-r from-[#7C3AED] to-[#F97316] hover:opacity-90 border-none font-bold shadow-[#F97316]/20"
                onClick={handlePay}
                disabled={!formData.fullName.trim() || !formData.phone.trim() || !formData.hostel || (isFemaleHostelSelected && !femaleHostelAgreement)}
              >
                <CreditCard className="w-5 h-5" /> Pay ₦{total}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secured by Paystack & i-CON</span>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

