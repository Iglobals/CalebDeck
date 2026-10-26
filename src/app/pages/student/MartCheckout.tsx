import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { useMartCart } from '../../../context/MartCartContext';
import { getActiveHostels, subscribeToHostels, Hostel, subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { verifyPayment } from '../../../services/functions';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { ArrowLeft, User, Phone, Shield, CreditCard, ShoppingBag, Clock, AlertTriangle, MapPin } from 'lucide-react';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import SEO from '../../components/SEO';
import { PaymentSelector, PaymentMethod } from '../../components/student/PaymentSelector';
import { Loader2 } from 'lucide-react';
import { isPremiumHostel } from '../../../services/orderFees';
import { resolveHostelRestriction, normalizeHostelKey } from '../../../services/hostels';

export default function MartCheckout() {
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
  const [acknowledgementError, setAcknowledgementError] = useState(false);
  const acknowledgementRef = useRef<HTMLDivElement | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYSTACK');
  const [isWalletPaying, setIsWalletPaying] = useState(false);

  const selectedHostel = hostels.find(h => h.id === formData.hostel);
  const hostelRestriction = React.useMemo(
    () => resolveHostelRestriction(formData.hostel, hostels, platformSettings),
    [formData.hostel, hostels, platformSettings]
  );
  const isRestrictedHostelSelected = hostelRestriction.required;
  const isFemaleHostelSelected = isPremiumHostel(formData.hostel, platformSettings, hostels);
  const hostelAcknowledgement = React.useMemo(
    () => ({
      required: isRestrictedHostelSelected,
      accepted: isRestrictedHostelSelected ? Boolean(femaleHostelAgreement) : false,
      acceptedAt: isRestrictedHostelSelected && femaleHostelAgreement ? new Date().toISOString() : undefined,
      hostelId: hostelRestriction.hostelId || formData.hostel,
      hostelName: selectedHostel?.name || hostelRestriction.hostelName || formData.hostel,
      title: hostelRestriction.title,
      message: hostelRestriction.message,
      checkboxLabel: hostelRestriction.checkboxLabel,
      collectionInstruction: hostelRestriction.collectionInstruction,
      pickupPoint: hostelRestriction.pickupPoint,
      ruleType: hostelRestriction.ruleType,
    }),
    [isRestrictedHostelSelected, femaleHostelAgreement, hostelRestriction, formData.hostel, selectedHostel?.name]
  );
  const MART_DELIVERY_FEE = platformSettings?.martDeliveryFee || 1500;
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const total = subtotal + MART_DELIVERY_FEE;
  const orderId = React.useMemo(() => `CD-MART-${Math.floor(10000 + Math.random() * 90000)}`, []);

  const hasFashionItems = items.some(item => ['Apparel', 'Accessories', 'Footwear', 'Merch'].includes(item.category));
  const isWalletDisabled = (isRestrictedHostelSelected && !femaleHostelAgreement) || isWalletPaying || hasFashionItems;

  useEffect(() => {
    // Don't redirect if we're in the middle of processing a payment —
    // clearCart() empties items before navigate('/order-success') fires
    if (paymentProcessingRef.current) return;
    if (items.length === 0) {
      navigate('/mart');
    }
  }, [items, navigate]);

  useEffect(() => {
    const unsubHostels = subscribeToHostels((activeHostels) => {
      setHostels(activeHostels);
      setFormData(prev => {
        if (!prev.hostel) return prev;
        const matched = activeHostels.find(h =>
          h.id === prev.hostel ||
          h.name?.toLowerCase() === prev.hostel.toLowerCase() ||
          normalizeHostelKey(h.id) === normalizeHostelKey(prev.hostel) ||
          normalizeHostelKey(h.name) === normalizeHostelKey(prev.hostel)
        );
        if (matched) {
          return prev.hostel === matched.id ? prev : { ...prev, hostel: matched.id };
        }
        setFemaleHostelAgreement(false);
        setAcknowledgementError(false);
        return { ...prev, hostel: '' };
      });
    });

    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => {
      unsubHostels();
      unsub();
    };
  }, []);

  const currentHour = new Date().getHours();
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const hasMartItems = items.some(item => item.productType === 'MART' || !item.productType);
  
  const martClosed = hasMartItems && !!platformSettings && (
    currentHour < openingHour || 
    currentHour >= closingHour || 
    platformSettings?.isAcceptingOrders === false || 
    platformSettings?.isMartComingSoon === true || 
    platformSettings?.isMartAcceptingOrders === false
  ) && !isDev;

  const isClosed = martClosed;
  const martClosedMessage = platformSettings?.isMartComingSoon === true || platformSettings?.isMartAcceptingOrders === false
    ? (platformSettings?.martClosedMessage || 'CalebDeck Mart is currently closed for restocking. Fresh items will be available soon.')
    : platformSettings?.isAcceptingOrders === false
      ? (platformSettings?.globalClosedMessage || 'CalebDeck is temporarily paused while we make a quick operational update. Please check back shortly.')
      : `CalebDeck Mart follows CalebDeck operating hours: ${openingHour}:00 to ${closingHour}:00.`;

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const config = {
    reference: paymentRef.current,
    email: formData.fullName
      ? `${formData.fullName.trim().toLowerCase().replace(/\s+/g, '.')}@calebdeck.com`
      : "guest@calebdeck.com",
    amount: Math.round(total * 100),
    publicKey: paystackKey as string,
    metadata: {
      orderId,
      orderType: 'MART',
      userId: user?.uid || '',
      source: 'calebdeck',
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelId: hostelRestriction.hostelId || formData.hostel,
      hostelName: selectedHostel?.name || hostelRestriction.hostelName || '',
      pickupPoint: hostelRestriction.pickupPoint,
      collectionInstruction: hostelRestriction.collectionInstruction,
      instructions: formData.instructions,
      femaleHostelAgreement,
      hostelAcknowledgement,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: MART_DELIVERY_FEE,
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
      userId: user?.uid || null,
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelId: hostelRestriction.hostelId || formData.hostel,
      hostelName: selectedHostel?.name || hostelRestriction.hostelName || formData.hostel,
      pickupPoint: hostelRestriction.pickupPoint,
      collectionInstruction: hostelRestriction.collectionInstruction,
      instructions: formData.instructions,
      femaleHostelAgreement,
      hostelAcknowledgement,
      orderType: 'MART',
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: MART_DELIVERY_FEE,
      subtotal,
      totalAmount: total,
    };

    const goToSuccess = async (finalOrderId: string, firestoreId = reference.reference || paymentRef.current) => {
      if (user) {
        try {
          const updateData: any = { productsUsed: arrayUnion('CalebDeck Mart') };
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
          cafeteria: 'CalebDeck Mart',
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
          cafeteria: 'CalebDeck Mart',
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
      // Wait 3s then retry once
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

    // Both retries failed ΓÇö check Firestore directly. The webhook may have already created the order
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

    // Absolute last resort
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

  const handleWalletPayment = async (orderPayload: any) => {
    setIsWalletPaying(true);
    // Suppress the empty-cart redirect while payment processes — clearCart()
    // empties items before navigate('/order-success') fires.
    paymentProcessingRef.current = true;
    toast.loading("Paying from your wallet...");
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/wallet/pay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderData: orderPayload })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Wallet payment failed');
      }

      // Success
      toast.dismiss();
      clearCart();
      navigate('/order-success', {
        state: {
          ...orderPayload,
          orderId: data.data.orderId,
          paymentReference: `WALLET-${data.data.orderId}`,
          totalAmount: total,
          total,
          cafeteria: 'CalebDeck Mart',
          status: 'PAID'
        },
        replace: true
      });

    } catch (err: any) {
      paymentProcessingRef.current = false;
      setIsWalletPaying(false);
      toast.dismiss();
      toast.error(err.message || "Failed to process wallet payment");
      setPaymentMethod('PAYSTACK'); // fallback safely
    }
  };

  const handlePay = async () => {
    if (isWalletPaying) return;
    if (!formData.fullName.trim()) return toast.error('Please enter your full name');
    if (!formData.phone.trim()) return toast.error('Please enter your phone number');
    if (formData.phone.length < 10) return toast.error('Please enter a valid phone number');
    if (!formData.hostel) return toast.error('Please select your hostel');
    if (isRestrictedHostelSelected && !femaleHostelAgreement) {
      setAcknowledgementError(true);
      acknowledgementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return toast.warning(
        `Please confirm that you understand and agree to the collection rule for ${selectedHostel?.name || hostelRestriction.hostelName} before continuing.`
      );
    }

    if (isClosed) {
      toast.error(martClosedMessage);
      return;
    }

    if (paymentMethod === 'WALLET') {
      setIsWalletPaying(true);
    }

    const preSaveData = {
      orderId,
      userId: user?.uid || null,
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelId: hostelRestriction.hostelId || formData.hostel,
      hostelName: selectedHostel?.name || hostelRestriction.hostelName || formData.hostel,
      pickupPoint: hostelRestriction.pickupPoint,
      collectionInstruction: hostelRestriction.collectionInstruction,
      instructions: formData.instructions,
      femaleHostelAgreement,
      hostelAcknowledgement,
      orderType: 'MART',
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: MART_DELIVERY_FEE,
      subtotal,
      totalAmount: total
    };

    try {
      const preSaveRes = await fetch('/api/pre-save-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: paymentRef.current, orderData: preSaveData })
      });
      if (!preSaveRes.ok) {
        setIsWalletPaying(false);
        const errData = await preSaveRes.json().catch(() => ({}));
        toast.error(errData.message || 'We could not prepare this order for payment. Please try again.');
        return;
      }
    } catch (err) {
      setIsWalletPaying(false);
      console.warn('[MartCheckout] Pre-save failed:', err);
      toast.error('We could not securely prepare your order for payment. Check your connection and try again.');
      return;
    }

    if (paymentMethod === 'WALLET') {
      handleWalletPayment(preSaveData);
      return;
    }

    initializePayment({
      onSuccess: (reference: any) => void onSuccess(reference),
      onClose: () => onClose()
    });
  };

  if (isClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <SEO
          title="Mart Checkout Closed - CalebDeck Mart"
          description="CalebDeck Mart checkout is currently unavailable. Check operating hours and return when ordering is open."
          canonical="https://calebdeck.com/mart/checkout"
          robots="noindex,follow"
        />
        <Card className="text-center max-w-md w-full py-12 px-8">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Mart is Closed</h1>
          <p className="text-muted-foreground mb-10 text-lg">
            {martClosedMessage}
          </p>
          <Link to="/mart" className="inline-block w-full">
            <Button variant="primary" className="w-full py-6 text-xl rounded-2xl">Back to Mart</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO
        title="Checkout - CalebDeck Mart"
        description="Complete your CalebDeck Mart order with hostel delivery details, order summary, and secure Paystack payment."
        canonical="https://calebdeck.com/mart/checkout"
        robots="noindex,follow"
      />

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted" aria-label="Go back">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Checkout</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-[#10B981]" />
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
                    setAcknowledgementError(false);
                    setFormData({ ...formData, hostel: e.target.value });
                  }}
                  options={[
                    { value: '', label: 'Select your hostel' },
                    ...hostels.map(h => ({ value: h.id, label: h.name }))
                  ]}
                  required
                />
                <Textarea
                  label="Delivery Instructions (Optional)"
                  placeholder="E.g., Call me when you reach the gate..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                />
                {isRestrictedHostelSelected && (
                  <div
                    ref={acknowledgementRef}
                    data-testid="hostel-acknowledgement-box"
                    className={`p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 shadow-inner transition-all ${
                      acknowledgementError && !femaleHostelAgreement
                        ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h4 className="font-black text-base sm:text-lg leading-tight">
                            {hostelRestriction.title || `${selectedHostel?.name || 'Hostel'} Collection Notice`}
                          </h4>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            Pickup / Collection Point: {hostelRestriction.pickupPoint}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
                          {hostelRestriction.message}
                        </p>
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-background/60 border border-amber-500/30 hover:border-amber-500 transition-colors">
                        <input
                          type="checkbox"
                          checked={femaleHostelAgreement}
                          onChange={(e) => {
                            setFemaleHostelAgreement(e.target.checked);
                            if (e.target.checked) setAcknowledgementError(false);
                          }}
                          className="mt-1 h-5 w-5 rounded border-2 border-amber-500 accent-amber-500 shrink-0"
                        />
                        <span className="text-sm sm:text-base font-bold leading-relaxed">
                          {hostelRestriction.checkboxLabel}
                        </span>
                      </label>
                      {acknowledgementError && !femaleHostelAgreement && (
                        <p role="alert" className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          You must confirm and accept this collection condition for {selectedHostel?.name || hostelRestriction.hostelName} before proceeding with checkout.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="text-sm font-bold text-muted-foreground hover:text-foreground underline underline-offset-4"
                      >
                        No, return to home
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 sticky top-24 border-[#10B981]/20">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#10B981]" /> Order Summary
              </h3>
              
              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate pr-2">{item.quantity}x {item.name}</span>
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
                  <span className="font-medium text-foreground">₦{MART_DELIVERY_FEE}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-black text-[#10B981]">₦{total}</span>
                </div>
                
                <PaymentSelector 
                  amount={total} 
                  selectedMethod={paymentMethod} 
                  onSelect={setPaymentMethod} 
                  disabled={isWalletPaying || !formData.fullName.trim() || !formData.phone.trim() || !formData.hostel || (isRestrictedHostelSelected && !femaleHostelAgreement)}
                  walletDisabled={isWalletDisabled} 
                  isProcessing={isWalletPaying}
                />
              </div>

              <Button 
                variant="primary" 
                className={`w-full py-4 text-lg text-white flex items-center justify-center gap-2 shadow-xl ${paymentMethod === 'WALLET' ? 'bg-[#10B981] hover:bg-[#059669] shadow-[#10B981]/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                onClick={() => void handlePay()}
                disabled={isWalletPaying || !formData.fullName.trim() || !formData.phone.trim() || !formData.hostel || (paymentMethod === 'WALLET' && isWalletDisabled)}
              >
                {isWalletPaying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="w-5 h-5" /> Pay ₦{total}</>
                )}
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
