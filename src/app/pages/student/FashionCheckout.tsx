import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { useMartCart } from '../../../context/MartCartContext';
import { getActiveHostels, Hostel, subscribeToPlatformSettings, PlatformSettings, FashionDeliveryConfig } from '../../../services/db';
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
import { getFashionBatchState, DEFAULT_FASHION_BATCH_CONFIG } from '../../../services/fashionBatch';
import { isPremiumHostel } from '../../../services/orderFees';
import { FashionBatchPickerModal, SelectedFashionBatchInfo } from '../../components/FashionBatchPickerModal';
import { PaymentSelector, PaymentMethod } from '../../components/student/PaymentSelector';
import { BatchStatusBar } from '../../components/BatchStatusBar';
import { BatchClock } from '../../components/BatchClock';
import { auth } from '../../../services/firebase';

export default function FashionCheckout() {
  const { items, subtotal, totalItems, clearCart } = useMartCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [fashionDeliveryConfig, setFashionDeliveryConfig] = useState<FashionDeliveryConfig | null>(null);
  const [confirmedDeliveryRequest, setConfirmedDeliveryRequest] = useState<any>(null);
  const paymentProcessingRef = useRef(false);
  const paymentRef = useRef((new Date()).getTime().toString());

  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.displayNameFromProfile || '',
    phone: user?.phone || '',
    hostel: user?.hostel || '',
    instructions: '', state: 'Lagos', city: '', areaId: '', address: '', addressDetails: ''
  });
  const [customerType, setCustomerType] = useState<'STUDENT' | 'GENERAL'>(user?.icaSub ? 'STUDENT' : 'GENERAL');
  const [femaleHostelAgreement, setFemaleHostelAgreement] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYSTACK');
  const [isWalletPaying, setIsWalletPaying] = useState(false);

  const selectedHostel = hostels.find(h => h.id === formData.hostel);
  const isFemaleHostelSelected = isPremiumHostel(formData.hostel, platformSettings);
  const selectedDelivery = fashionDeliveryConfig?.zones.flatMap(zone => zone.areas.map(area => ({ zone, area }))).find(item => item.area.id === formData.areaId);
  const FASHION_DELIVERY_FEE = customerType === 'GENERAL'
    ? (confirmedDeliveryRequest?.confirmedFee || (selectedDelivery?.area.pricingMode === 'FIXED' ? Number(selectedDelivery.area.fixedFee) : 0))
    : (platformSettings?.fashionDeliveryFee || 1500);
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const total = subtotal + FASHION_DELIVERY_FEE;
  const checkoutItems = items.map(item => ({
    id: item.productId || item.id,
    cartItemId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    category: item.category,
    size: item.size || null,
    color: item.color || null,
    colorName: item.colorName || (item.color ? getHexColorName(item.color) : null),
    colorIndex: item.colorIndex ?? null,
    variation: item.variation || null,
    variationName: item.variationName || null,
    variationIndex: item.variationIndex ?? null,
    imageUrl: item.imageUrl
  }));
  const orderId = React.useMemo(() => `CD-FASHION-${Math.floor(10000 + Math.random() * 90000)}`, []);

  const [isBatchPickerOpen, setIsBatchPickerOpen] = useState(false);
  const fashionBatchConfig = platformSettings?.fashionBatchConfig || DEFAULT_FASHION_BATCH_CONFIG;
  const batchState = React.useMemo(() => getFashionBatchState(fashionBatchConfig), [fashionBatchConfig]);
  
  const [selectedBatch, setSelectedBatch] = useState<SelectedFashionBatchInfo | null>(null);

  useEffect(() => {
    if (!selectedBatch) {
      setSelectedBatch({
        batchName: batchState.currentBatchLabel,
        expectedArrivalDate: batchState.expectedArrivalDate,
        status: batchState.isOpen || batchState.isGracePeriod ? 'OPEN' : 'UPCOMING'
      });
    }
  }, [batchState, selectedBatch]);

  useEffect(() => {
    // Don't redirect if we're in the middle of processing a payment —
    // clearCart() empties items before navigate('/order-success') fires
    if (paymentProcessingRef.current) return;
    if (items.length === 0) {
      navigate('/fashion');
    }
  }, [items, navigate]);

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
    fetch('/api/fashion-delivery').then(res => res.ok ? res.json() : null).then(data => { if (data?.config) setFashionDeliveryConfig(data.config); }).catch(() => undefined);
    const requestId = searchParams.get('deliveryRequest');
    if (requestId) {
      auth.currentUser?.getIdToken().then(token => fetch(`/api/fashion-delivery-request?requestId=${encodeURIComponent(requestId)}`, { headers: { Authorization: `Bearer ${token}` } }))
        .then(response => response?.ok ? response.json() : null)
        .then(data => {
          if (data?.request?.status !== 'AWAITING_CUSTOMER_APPROVAL') return;
          const request = data.request;
          setConfirmedDeliveryRequest(request);
          setCustomerType('GENERAL');
          setFormData(prev => ({ ...prev, fullName: request.customerName || prev.fullName, phone: request.phone || prev.phone, state: request.state || 'Lagos', city: request.city || '', areaId: request.areaId || '', address: request.streetAddress || '', addressDetails: request.addressDetails || '', instructions: request.instructions || '' }));
        }).catch(() => undefined);
    }
    return () => unsub();
  }, [searchParams]);

  const currentHour = new Date().getHours();
  const fashionClosed = !!platformSettings && (
    platformSettings?.isFashionAcceptingOrders === false || 
    platformSettings?.isFashionComingSoon === true
  ) && !isDev;

  const isClosed = fashionClosed;
  const closedMessage = platformSettings?.isFashionComingSoon === true
    ? (platformSettings?.fashionClosedMessage || 'CalebDeck Fashion is launching soon! Stay tuned.')
    : platformSettings?.isFashionAcceptingOrders === false
      ? (platformSettings?.fashionClosedMessage || 'CalebDeck Fashion is temporarily paused. Please check back shortly.')
      : 'CalebDeck Fashion is currently closed.';

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const config: any = {
    reference: paymentRef.current,
    email: formData.fullName
      ? `${formData.fullName.trim().toLowerCase().replace(/\s+/g, '.')}@calebdeck.com`
      : user?.email || "guest@calebdeck.com",
    amount: Math.round(total * 100),
    publicKey: paystackKey as string,
    metadata: {
      orderId,
      orderType: 'FASHION',
      userId: user?.uid || '',
      source: 'calebdeck',
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || '',
      instructions: formData.instructions,
      customerType,
      state: formData.state,
      city: formData.city,
      areaId: formData.areaId,
      areaName: selectedDelivery?.area.name || '',
      zoneName: selectedDelivery?.zone.name || '',
      address: formData.address,
      addressDetails: formData.addressDetails,
      femaleHostelAgreement,
      items: checkoutItems,
      deliveryFee: FASHION_DELIVERY_FEE,
      subtotal,
      totalAmount: total,
      fashionBatchName: selectedBatch?.batchName,
      expectedArrivalDate: selectedBatch?.expectedArrivalDate ? selectedBatch.expectedArrivalDate.toISOString() : null,
      fashionBatchStatus: selectedBatch?.status
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
      hostelName: selectedHostel?.name || formData.hostel,
      instructions: formData.instructions,
      customerType,
      state: formData.state,
      city: formData.city,
      areaId: formData.areaId,
      areaName: selectedDelivery?.area.name || '',
      zoneName: selectedDelivery?.zone.name || '',
      address: formData.address,
      addressDetails: formData.addressDetails,
      femaleHostelAgreement,
      orderType: 'FASHION',
      items: checkoutItems,
      deliveryFee: FASHION_DELIVERY_FEE,
      subtotal,
      totalAmount: total,
      fashionBatchName: selectedBatch?.batchName,
      expectedArrivalDate: selectedBatch?.expectedArrivalDate ? selectedBatch.expectedArrivalDate.toISOString() : null,
      fashionBatchStatus: selectedBatch?.status
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

  const handleWalletPayment = async (orderPayload: any) => {
    setIsWalletPaying(true);
    // Suppress the empty-cart redirect while payment processes — clearCart()
    // empties items before navigate('/order-success') fires.
    paymentProcessingRef.current = true;
    toast.loading("Paying from your wallet...");
    try {
      const token = await auth.currentUser?.getIdToken();
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
          firestoreOrderId: data.data.orderId,
          orderId: data.data.orderId,
          paymentReference: `WALLET-${data.data.orderId}`,
          totalAmount: total,
          total,
          cafeteria: 'CalebDeck Fashion',
          status: 'PAID'
        },
        replace: true
      });
    } catch (err: any) {
      paymentProcessingRef.current = false;
      toast.dismiss();
      toast.error(err.message || "Failed to process wallet payment");
      setPaymentMethod('PAYSTACK'); // fallback safely
    } finally {
      setIsWalletPaying(false);
    }
  };

  const handlePay = async () => {
    if (!formData.fullName.trim()) return toast.error('Please enter your full name');
    if (!formData.phone.trim()) return toast.error('Please enter your phone number');
    if (formData.phone.length < 10) return toast.error('Please enter a valid phone number');
    if (customerType === 'STUDENT' && !formData.hostel) return toast.error('Please select your hostel');
    if (customerType === 'GENERAL') {
      if (!fashionDeliveryConfig?.nonStudentDeliveryEnabled || !fashionDeliveryConfig.pilotEnabled) return toast.error('Fashion delivery for this address is not available yet.');
      if (!formData.city.trim() || !formData.areaId || !formData.address.trim()) return toast.error('Please complete your Lagos delivery address.');
      if (!selectedDelivery || !selectedDelivery.zone.enabled || !selectedDelivery.area.enabled) return toast.error('Please select an available delivery area.');
      if (selectedDelivery.area.pricingMode === 'RANGE' && !confirmedDeliveryRequest?.confirmedFee) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch('/api/fashion-delivery-request', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ ...formData, streetAddress: formData.address, customerType, items: checkoutItems, subtotal }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'We could not submit your delivery request.');
          toast.success('Delivery details received. We will confirm the final fee before payment.');
          clearCart();
          navigate('/fashion');
        } catch (error: any) { toast.error(error.message || 'We could not submit your delivery request.'); }
        return;
      }
    }
    if (isFemaleHostelSelected && !femaleHostelAgreement) {
      return toast.info('Please accept the female hostel delivery agreement before payment.');
    }

    const liveClosed = !!platformSettings && (
      platformSettings?.isFashionAcceptingOrders === false ||
      platformSettings?.isFashionComingSoon === true
    ) && !isDev;

    if (isClosed || liveClosed) {
      toast.error(closedMessage);
      return;
    }

    const preSaveData = {
      orderId,
      userId: user?.uid || null,
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || formData.hostel,
      instructions: formData.instructions,
      femaleHostelAgreement,
      customerType,
      state: formData.state,
      city: formData.city,
      areaId: formData.areaId,
      areaName: selectedDelivery?.area.name || '',
      zoneName: selectedDelivery?.zone.name || '',
      address: formData.address,
      addressDetails: formData.addressDetails,
      confirmedDeliveryFee: confirmedDeliveryRequest?.confirmedFee || null,
      deliveryRequestId: confirmedDeliveryRequest?.id || null,
      orderType: 'FASHION',
      items: checkoutItems,
      deliveryFee: FASHION_DELIVERY_FEE,
      subtotal,
      totalAmount: total,
      fashionBatchName: selectedBatch?.batchName,
      expectedArrivalDate: selectedBatch?.expectedArrivalDate ? selectedBatch.expectedArrivalDate.toISOString() : null,
      fashionBatchStatus: selectedBatch?.status
    };

    if (paymentMethod === 'WALLET') {
      handleWalletPayment(preSaveData);
      return;
    }

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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEO
          title="Become an i-CON - CalebDeck Fashion"
          description="Create your free i-CON account to complete your CalebDeck order."
          canonical="https://calebdeck.com/fashion/checkout"
          robots="noindex,follow"
        />
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted" aria-label="Go back">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Complete Your Order</h1>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 pb-24">
          <Card className="max-w-md w-full p-8 md:p-10 border-2 border-[#7C3AED]/20 dark:border-[#7C3AED]/30 bg-card">
            <div className="w-20 h-20 bg-[#7C3AED]/10 rounded-full flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-[#7C3AED]" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Sign in to complete your order
            </h1>
            
            <p className="text-muted-foreground mb-8 text-lg">
              Sign in to continue with your CalebDeck order and keep your delivery details together.
            </p>
            
            <ul className="space-y-4 mb-10">
              {[
                'Secure order history',
                'Order history & tracking',
                'Push notifications',
                'Personalized CalebDeck experience',
                'Faster checkout next time'
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground font-medium">
                  <div className="w-6 h-6 rounded-full bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="space-y-4">
              <Button 
                variant="primary" 
                className="w-full py-6 text-lg rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold"
                onClick={() => window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + '/fashion/checkout')}`}
              >
                Sign in
              </Button>
              <Button 
                variant="outline" 
                className="w-full py-6 text-lg rounded-2xl border-2 border-border hover:bg-muted font-bold text-foreground"
                onClick={() => window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + '/fashion/checkout')}`}
              >
                Create an account
              </Button>
            </div>
          </Card>
        </main>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted" aria-label="Go back">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Checkout Fashion</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:gap-10">
          {/* Form - Left */}
          <div className="space-y-8">
            {/* Fashion Batch Status Bar */}
            {selectedBatch && (
              <div 
                className={`p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border shadow-inner cursor-pointer transition-colors ${
                  selectedBatch.status === 'OPEN' 
                    ? 'bg-[#F97316]/5 border-[#F97316]/20 hover:bg-[#F97316]/10' 
                    : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                }`}
                onClick={() => setIsBatchPickerOpen(true)}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${
                        selectedBatch.status === 'OPEN'
                          ? 'bg-[#F97316]/10 border-[#F97316]/20'
                          : 'bg-primary/10 border-primary/20'
                      }`}>
                        <BatchClock size={36} className="drop-shadow-sm" />
                      </div>
                      <h4 className="font-black text-foreground text-sm sm:text-base">
                        Delivery Batch: {selectedBatch.batchName}
                      </h4>
                    </div>
                    <Button variant="secondary" size="sm" className="h-8 text-xs font-bold px-3">
                      Change
                    </Button>
                  </div>
                  <div className="space-y-2 pl-[52px]">
                    <p className="text-sm text-muted-foreground font-medium">
                      Fashion items are grouped into weekly batches for efficient delivery.
                    </p>
                    <div className="inline-block px-3 py-1.5 rounded-lg bg-background/50 border border-border/50">
                      <p className="text-sm font-semibold text-foreground">
                        Expected Arrival: <span className={`font-black ${
                          selectedBatch.status === 'OPEN' ? 'text-[#F97316]' : 'text-primary'
                        }`}>
                          {selectedBatch.expectedArrivalDate ? new Date(selectedBatch.expectedArrivalDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Pending'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isClosed && (
              <div className="mb-2 p-5 rounded-2xl bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-4 shadow-lg shadow-red-500/5">
                <AlertTriangle className="w-8 h-8 flex-shrink-0 text-red-500" />
                <div>
                  <h4 className="font-black text-lg">Fashion Orders Closed</h4>
                  <p className="font-medium text-sm">{closedMessage}</p>
                </div>
              </div>
            )}

            <Card className="p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-[#F97316]" />
                Delivery Details
              </h2>
              <div className="space-y-4">
                <div className={`grid ${user?.icaSub ? 'grid-cols-2' : 'grid-cols-1'} gap-2 rounded-xl bg-muted/50 p-1`}>
                  {user?.icaSub && <button type="button" onClick={() => setCustomerType('STUDENT')} className={`rounded-lg px-3 py-2 text-sm font-bold ${customerType === 'STUDENT' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>Campus delivery</button>}
                  <button type="button" onClick={() => setCustomerType('GENERAL')} className={`rounded-lg px-3 py-2 text-sm font-bold ${customerType === 'GENERAL' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>Lagos delivery</button>
                </div>
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
                {customerType === 'STUDENT' ? <Select
                    label="Select Hostel"
                    value={formData.hostel}
                    onChange={(e) => { setFemaleHostelAgreement(false); setFormData({ ...formData, hostel: e.target.value }); }}
                    options={hostels.map(h => ({ value: h.id, label: h.name }))}
                    required
                  /> : <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="State" value="Lagos" disabled />
                      <Input label="City" placeholder="e.g. Lekki" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
                    </div>
                    <Select label="Delivery area" value={formData.areaId} onChange={(e) => setFormData({ ...formData, areaId: e.target.value })} options={(fashionDeliveryConfig?.zones || []).filter(zone => zone.enabled).flatMap(zone => zone.areas.filter(area => area.enabled).map(area => ({ value: area.id, label: `${area.name} - ${area.pricingMode === 'FIXED' ? `₦${area.fixedFee?.toLocaleString()}` : `₦${area.minFee?.toLocaleString()}–₦${area.maxFee?.toLocaleString()}`}` })))} required />
                    <Input label="Street address" placeholder="House number, street and landmark" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
                    <Input label="Address details (Optional)" placeholder="Apartment, estate or gate details" value={formData.addressDetails} onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })} />
                    {selectedDelivery?.area.pricingMode === 'RANGE' && !confirmedDeliveryRequest?.confirmedFee && <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">Delivery for this area is estimated at ₦{selectedDelivery.area.minFee?.toLocaleString()}–₦{selectedDelivery.area.maxFee?.toLocaleString()}. We will confirm the exact fee before you pay.</p>}
                    {confirmedDeliveryRequest?.confirmedFee && <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">Your delivery fee has been confirmed at ₦{Number(confirmedDeliveryRequest.confirmedFee).toLocaleString()}. Review the total below to continue.</p>}
                  </>}
                <Textarea
                  label="Delivery Instructions (Optional)"
                  placeholder="E.g., Call me when you reach the gate..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                />
                {customerType === 'STUDENT' && isFemaleHostelSelected && (
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

          <div className="min-w-0 space-y-6">
            <Card className="p-4 sm:p-6 lg:sticky lg:top-24 border-[#7C3AED]/20 shadow-xl shadow-[#7C3AED]/5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Shirt className="w-5 h-5 text-[#7C3AED]" /> Order Summary
              </h3>
              
              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{item.quantity}x {item.name}</p>
                      {[item.size, item.color ? getHexColorName(item.color) : '', item.variation].filter(Boolean).length > 0 && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {[item.size, item.color ? getHexColorName(item.color) : '', item.variation].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-medium">₦{(item.price * item.quantity).toLocaleString()}</span>
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
                  <span className="font-medium text-foreground">{customerType === 'GENERAL' && selectedDelivery?.area.pricingMode === 'RANGE' && !confirmedDeliveryRequest?.confirmedFee ? `₦${selectedDelivery.area.minFee?.toLocaleString()}–₦${selectedDelivery.area.maxFee?.toLocaleString()}` : `₦${FASHION_DELIVERY_FEE.toLocaleString()}`}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-black text-[#F97316]">{customerType === 'GENERAL' && selectedDelivery?.area.pricingMode === 'RANGE' && !confirmedDeliveryRequest?.confirmedFee ? 'Fee to be confirmed' : `₦${total.toLocaleString()}`}</span>
                </div>

                {!(customerType === 'GENERAL' && selectedDelivery?.area.pricingMode === 'RANGE' && !confirmedDeliveryRequest?.confirmedFee) && <PaymentSelector
                  amount={total}
                  selectedMethod={paymentMethod}
                  onSelect={setPaymentMethod}
                  disabled={isWalletPaying}
                />}
              </div>

              <Button
                variant="primary"
                className="w-full py-4 text-lg text-white flex items-center justify-center gap-2 shadow-xl bg-gradient-to-r from-[#7C3AED] to-[#F97316] hover:opacity-90 border-none font-bold shadow-[#F97316]/20 disabled:bg-none disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                onClick={handlePay}
                disabled={isWalletPaying || !formData.fullName.trim() || !formData.phone.trim() || (customerType === 'STUDENT' ? !formData.hostel : !formData.areaId || !formData.city.trim() || !formData.address.trim()) || (isFemaleHostelSelected && !femaleHostelAgreement)}
              >
                {isWalletPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                {isWalletPaying ? 'Processing...' : (customerType === 'GENERAL' && selectedDelivery?.area.pricingMode === 'RANGE' && !confirmedDeliveryRequest?.confirmedFee ? 'Request delivery fee' : `Pay ₦${total.toLocaleString()}`)}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secured by Paystack & i-CON</span>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <FashionBatchPickerModal
        isOpen={isBatchPickerOpen}
        onClose={() => setIsBatchPickerOpen(false)}
        batchState={batchState}
        onSelectBatch={(batch) => {
          setSelectedBatch(batch);
          setIsBatchPickerOpen(false);
        }}
      />
    </div>
  );
}

