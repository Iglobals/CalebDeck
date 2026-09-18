import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { ArrowLeft, Lock, Shield, CreditCard, MapPin, User, AlertTriangle, Timer, Gift } from 'lucide-react';
import { netDeliveryFeeFromBreakdown, previewFirstOrderDiscount } from '../../../services/firstOrderDiscount';
import { getActiveHostels, Hostel, subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { isPremiumHostel } from '../../../services/orderFees';
import { calculateOrderTotal, verifyPayment } from '../../../services/functions';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { useBatchTimer, formatBatchTime } from '../../../context/BatchTimerContext';
import { BatchStatusBar } from '../../components/BatchStatusBar';
import { 
  trackCheckoutView, 
  trackDeliveryModeSelected, 
  trackPaymentInitiated, 
  trackOrderPlaced,
  trackPaymentFailed 
} from '../../../services/analytics';
import { DeliveryTypeSelector, SelectedBatchInfo } from '../../components/DeliveryTypeSelector';
import { BatchPickerModal } from '../../components/BatchPickerModal';
import { BatchClock } from '../../components/BatchClock';
import { PaymentSelector, PaymentMethod } from '../../components/student/PaymentSelector';

const DELIVERY_FEE_SOLO = 750;
const DELIVERY_FEE_GROUP = 580;

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentTheme } = useTheme();
  const { user } = useAuth();
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [hasAutofilled, setHasAutofilled] = useState(false);

  useEffect(() => {
    if (user && !hasAutofilled) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || user.displayNameFromProfile || '',
        phone: prev.phone || user.phone || '',
        hostel: prev.hostel || (user.assignedHostelIds?.[0]) || (user as any).hostel || ''
      }));
      setHasAutofilled(true);
    }
  }, [user, hasAutofilled]);
  const locationState = location.state || {};

  // CRITICAL: If location.state has plates, this is a plate order — ignore any stale combo in sessionStorage
  const hasPlatesInState = Array.isArray(locationState.plates) && locationState.plates.length > 0;
  const savedCombo = hasPlatesInState ? null : sessionStorage.getItem('cd_comboOrder');
  const comboOrder = locationState.comboOrder || (savedCombo ? JSON.parse(savedCombo) : null);
  const isCombo = !!comboOrder && !hasPlatesInState;

  // Clean up stale combo from sessionStorage when navigating with plates
  useEffect(() => {
    if (hasPlatesInState) {
      sessionStorage.removeItem('cd_comboOrder');
    }
  }, [hasPlatesInState]);

  const {
    plates = [],
    drinksSnacks = {},
    drinksSnacksItems = [],
    deliveryMode: initialDeliveryMode = 'solo',
    groupSize = 2,
    cafeteria = isCombo ? comboOrder.cafeteria : 'Old Cafeteria',
    cafeteriaId = isCombo ? comboOrder.cafeteriaId : 'old',
    sectionId = isCombo ? comboOrder.sectionId : 'none'
  } = locationState;

  const hasMixedCafeteriaItems = React.useMemo(() => {
    if (isCombo || !Array.isArray(plates)) return false;
    return plates.some((plate: any) => (
      (plate.items || []).some((plateItem: any) => {
        const item = plateItem.item || plateItem;
        if (!item?.cafeteriaId) return false;
        if (item.cafeteriaId !== cafeteriaId) return true;
        if (cafeteriaId !== 'old' && item.sectionId && item.sectionId !== sectionId) return true;
        if (cafeteriaId === 'old' && item.sectionId && item.sectionId !== 'none') return true;
        return false;
      })
    ));
  }, [isCombo, plates, cafeteriaId, sectionId]);

  const currentDeliveryMode = sessionStorage.getItem('cd_deliveryMode') || initialDeliveryMode;

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [orderTotal, setOrderTotal] = useState<{ totalAmount: number; breakdown: any } | null>(null);
  const paymentProcessingRef = useRef(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    hostel: '',
    instructions: ''
  });
  const [femaleHostelAgreement, setFemaleHostelAgreement] = useState(false);

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const batchTimer = useBatchTimer();
  const isBatchSystemActive = batchTimer.isEnabled || batchTimer.isManualOverride;

  const [deliveryType, setDeliveryType] = useState<'INSTANT' | 'BATCH'>(
    isBatchSystemActive ? 'BATCH' : 'INSTANT'
  );
  const [selectedBatch, setSelectedBatch] = useState<SelectedBatchInfo | null>(null);
  const [isBatchPickerOpen, setIsBatchPickerOpen] = useState(false);

  useEffect(() => {
    if (deliveryType === 'BATCH' && !selectedBatch && batchTimer.activeBatch) {
      setSelectedBatch({
        batchId: batchTimer.activeBatch.id,
        batchName: batchTimer.activeBatch.batchName,
        orderWindowStart: batchTimer.activeBatch.orderWindowStart,
        orderWindowEnd: batchTimer.activeBatch.orderWindowEnd,
        deliveryWindowStart: batchTimer.activeBatch.deliveryWindowStart,
        deliveryWindowEnd: batchTimer.activeBatch.deliveryWindowEnd,
      });
    }
  }, [deliveryType, batchTimer.activeBatch, selectedBatch]);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (
      isBatchSystemActive &&
      platformSettings?.instantOrderingEnabled === false &&
      deliveryType !== 'BATCH'
    ) {
      setDeliveryType('BATCH');
    }
  }, [deliveryType, isBatchSystemActive, platformSettings?.instantOrderingEnabled]);

  // Fetch Hostels
  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const activeHostels = await getActiveHostels();
        setHostels(activeHostels);
        
        // Track checkout view when hostels are loaded
        if (orderTotal) {
          trackCheckoutView(
            orderTotal.totalAmount,
            plates.length + Object.keys(drinksSnacks).length,
            cafeteriaId,
            cafeteria
          );
        }
      } catch (error) {
        console.error("Error fetching hostels:", error);
        toast.error("Failed to load hostels");
      } finally {
        setLoadingHostels(false);
      }
    };
    fetchHostels();
  }, []);

  // Calculate Order Items for calculation and Paystack metadata
  const items = React.useMemo(() => {
    return [
      ...plates.flatMap((p: any) => p.items.map((pi: any) => ({
        id: pi.item.id,
        price: pi.item.price,
        quantity: pi.quantity,
        isAddon: false
      }))),
      ...drinksSnacksItems.map((dsi: any) => ({
        id: dsi.item.id,
        price: dsi.item.price,
        quantity: dsi.quantity,
        isAddon: true
      }))
    ];
  }, [plates, drinksSnacksItems]);

  // Combo total — computed synchronously, no effect needed
  const comboTotal = React.useMemo(() => {
    if (!isCombo) return null;
    const qty = comboOrder.quantity || 1;
    const base = comboOrder.basePrice || 0;
    const dMode = currentDeliveryMode || 'solo';
    const isGrp = dMode === 'group' || dMode === 'GROUP';
    const premium = isPremiumHostel(formData.hostel, platformSettings);

let baseDeliveryFee;
if (premium) {
    const premiumFee = platformSettings?.premiumDeliveryFee || 1250;
    baseDeliveryFee = isGrp ? Math.round(premiumFee * 0.8) : premiumFee; // 20% off for group
} else {
    const foodSoloFee = platformSettings?.foodDeliveryFee || DELIVERY_FEE_SOLO;
    const foodGroupFee = platformSettings?.foodGroupDeliveryFee || DELIVERY_FEE_GROUP;
    baseDeliveryFee = isGrp ? foodGroupFee : foodSoloFee;
}
    const delivery = baseDeliveryFee * qty;
    return {
      totalAmount: base * qty + delivery,
      breakdown: { food: base * qty, delivery, takeaway: 0, discount: 0, platform: 0, processing: 0 }
    };
  }, [isCombo, comboOrder?.quantity, comboOrder?.basePrice, currentDeliveryMode, formData.hostel, platformSettings]);

  // Calculate Order Total (Server-Side) — only for plate orders
  useEffect(() => {
    // Don't override calculating state while payment is being processed
    if (paymentProcessingRef.current) return;

    if (isCombo) {
      setOrderTotal(comboTotal);
      if (comboTotal) setCalculating(false);
      return;
    }

    if (!plates.length) return;

    const fetchTotal = async () => {
      setCalculating(true);
      try {
        const response = await calculateOrderTotal({
          items,
          plateCount: plates.length,
          deliveryMode: currentDeliveryMode,
          hostelId: formData.hostel
        });

        setOrderTotal(response.data as any);
      } catch (error) {
        console.error("Calculation error:", error);
        toast.error("Failed to calculate order total");
      } finally {
        setCalculating(false);
      }
    };

    fetchTotal();
  }, [plates, drinksSnacks, currentDeliveryMode, formData.hostel, comboTotal, isCombo]);

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const selectedHostel = hostels.find(h => h.id === formData.hostel);
  const isFemaleHostelSelected = isPremiumHostel(formData.hostel, platformSettings);
  const orderId = React.useMemo(() => `CD-${Math.floor(10000 + Math.random() * 90000)}`, []);

  const firstOrderPreview = React.useMemo(() => {
    if (!orderTotal) return null;
    return previewFirstOrderDiscount({
      settings: platformSettings,
      user,
      netDeliveryFee: netDeliveryFeeFromBreakdown(orderTotal.breakdown),
    });
  }, [orderTotal, platformSettings, user]);

  const payableTotal = Math.max(
    0,
    (orderTotal?.totalAmount || 0) - (firstOrderPreview?.amount || 0)
  );
  const checkoutBreakdown = {
    ...(orderTotal?.breakdown || {}),
    ...(firstOrderPreview
      ? {
          firstOrderDiscount: firstOrderPreview.amount,
          firstOrderDiscountPercent: firstOrderPreview.percentOff,
        }
      : {}),
  };

  // Stable payment reference — generated once, used for pre-save + Paystack + verify
  const paymentRef = useRef((new Date()).getTime().toString());

  const config = {
    reference: paymentRef.current,
    email: formData.fullName
      ? `${formData.fullName.trim().toLowerCase().replace(/\s+/g, '.')}@calebdeck.com`
      : "guest@calebdeck.com",
    amount: Math.round(payableTotal * 100),
    publicKey: paystackKey as string,
    metadata: {
      // These fields are used by the webhook as a fallback
      orderId,
      userId: user?.uid || null,
      iConId: user?.uid || null,
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || formData.hostel,
      instructions: formData.instructions,
      femaleHostelAgreement,
      cafeteria,
      cafeteriaId,
      sectionId,
      deliveryMode: currentDeliveryMode,
      deliveryType,
      selectedBatchId: deliveryType === 'BATCH' ? selectedBatch?.batchId : undefined,
      foodBatchName: deliveryType === 'BATCH' ? selectedBatch?.batchName : undefined,
      orderWindowStart: deliveryType === 'BATCH' ? selectedBatch?.orderWindowStart : undefined,
      orderWindowEnd: deliveryType === 'BATCH' ? selectedBatch?.orderWindowEnd : undefined,
      deliveryWindowStart: deliveryType === 'BATCH' ? selectedBatch?.deliveryWindowStart : undefined,
      deliveryWindowEnd: deliveryType === 'BATCH' ? selectedBatch?.deliveryWindowEnd : undefined,
      ...(isCombo ? {
        type: 'combo',
        comboId: comboOrder.comboId,
        comboName: comboOrder.comboName,
        quantity: comboOrder.quantity,
        plateCount: comboOrder.quantity,
        comboItems: comboOrder.comboItems
      } : {
        plates: plates.map((p: any) => ({
          ...p,
          items: p.items.map((pi: any) => ({
            item: { id: pi.item.id, name: pi.item.name, price: pi.item.price },
            quantity: pi.quantity
          }))
        })),
        drinksSnacks: drinksSnacksItems.map((dsi: any) => ({
          item: { id: dsi.item.id, name: dsi.item.name, price: dsi.item.price },
          quantity: dsi.quantity
        })),
        plateCount: plates.length
      }),
      custom_fields: [
        {
          display_name: "Student Name",
          variable_name: "student_name",
          value: formData.fullName
        },
        {
          display_name: "Hostel",
          variable_name: "hostel",
          value: selectedHostel?.name || formData.hostel
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  const handleWalletPayment = async (orderPayload: any) => {
    setIsWalletPaying(true);
    // Suppress the empty-order redirect while payment processes — clearing the
    // plate builder happens only via successful navigation to order-success.
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
        body: JSON.stringify({ orderData: orderPayload, reference: paymentRef.current })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Wallet payment failed');
      }

      // Success
      toast.dismiss();
      navigate('/order-success', {
        state: {
          ...orderPayload,
          firestoreOrderId: data.data.firestoreOrderId || data.data.orderId,
          orderId: data.data.orderId || orderPayload.orderId,
          paymentReference: `WALLET-${data.data.orderId || orderPayload.orderId}`,
          total: payableTotal,
          totalAmount: payableTotal,
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

  const onSuccess = async (reference: any) => {
    paymentProcessingRef.current = true;
    setCalculating(true);

    const orderData = {
      orderId,
      userId: user?.uid || null,
      iConId: user?.uid || null,
      source: 'CalebDeck',
      ...formData,
      studentName: formData.fullName,
      hostelName: selectedHostel?.name || formData.hostel,
      total: payableTotal,
      breakdown: checkoutBreakdown,
      firstOrderDiscount: firstOrderPreview
        ? {
            applied: true,
            percentOff: firstOrderPreview.percentOff,
            amount: firstOrderPreview.amount,
            message: firstOrderPreview.message,
          }
        : undefined,
      femaleHostelAgreement,
      cafeteria,
      cafeteriaId,
      sectionId,
      deliveryMode: currentDeliveryMode,
      deliveryType,
      selectedBatchId: deliveryType === 'BATCH' ? selectedBatch?.batchId : undefined,
      foodBatchName: deliveryType === 'BATCH' ? selectedBatch?.batchName : undefined,
      orderWindowStart: deliveryType === 'BATCH' ? selectedBatch?.orderWindowStart : undefined,
      orderWindowEnd: deliveryType === 'BATCH' ? selectedBatch?.orderWindowEnd : undefined,
      deliveryWindowStart: deliveryType === 'BATCH' ? selectedBatch?.deliveryWindowStart : undefined,
      deliveryWindowEnd: deliveryType === 'BATCH' ? selectedBatch?.deliveryWindowEnd : undefined,
      ...(isCombo ? {
        type: 'combo',
        comboId: comboOrder.comboId,
        comboName: comboOrder.comboName,
        comboItems: comboOrder.comboItems,
        quantity: comboOrder.quantity,
        plateCount: comboOrder.quantity,
        basePrice: comboOrder.basePrice
      } : {
        items,
        plates,
        drinksSnacks: drinksSnacksItems,
        plateCount: plates.length
      })
    };

    const clearSession = () => {
      sessionStorage.removeItem('cd_plates');
      sessionStorage.removeItem('cd_drinksSnacks');
      sessionStorage.removeItem('cd_deliveryMode');
      sessionStorage.removeItem('cd_groupSize');
      sessionStorage.removeItem('cd_comboOrder');
      Object.keys(sessionStorage)
        .filter(key => key.startsWith('cd_plate_builder_'))
        .forEach(key => sessionStorage.removeItem(key));
    };

    const goToSuccess = async (firestoreId: string, finalOrderId: string) => {
      if (user) {
        try {
          const updateData: any = { productsUsed: arrayUnion('CalebDeck') };
          if (saveAsDefault) {
            updateData.fullName = formData.fullName;
            updateData.phone = formData.phone;
            updateData.hostel = formData.hostel;
          }
          await updateDoc(doc(db, 'users', user.uid), updateData);
        } catch(e) { console.error('Failed to update user profile defaults', e); }
      }
      clearSession();
      
      // Track order placed
      trackOrderPlaced(
        finalOrderId,
        orderData.total,
        items.length,
        cafeteriaId,
        cafeteria,
        currentDeliveryMode,
        reference.reference
      );
      
      navigate('/order-success', {
        state: {
          ...orderData,
          firestoreOrderId: firestoreId,
          orderId: finalOrderId,
          paymentReference: reference.reference,
          status: 'PAID'
        }
      });
    };

    const goToPaymentStatus = (status: string, firestoreId: string, message?: string) => {
      navigate('/order-success', {
        state: {
          ...orderData,
          firestoreOrderId: firestoreId,
          orderId,
          paymentReference: reference.reference,
          status,
          paymentMessage: message
        }
      });
    };

    // Try verify-payment — if it fails, retry once
    try {
      const result = await verifyPayment({ reference: reference.reference, orderData });
      const serverData = result.data || result;
      goToSuccess(serverData.firestoreOrderId, serverData.orderId || orderId);
      return;
    } catch (firstError) {
      console.warn('Verification attempt 1 failed:', firstError);
      // Wait 3s then retry once
      await new Promise(r => setTimeout(r, 3000));
      try {
        const result = await verifyPayment({ reference: reference.reference, orderData });
        const serverData = result.data || result;
        goToSuccess(serverData.firestoreOrderId, serverData.orderId || orderId);
        return;
      } catch (secondError) {
        console.warn('Verification attempt 2 failed:', secondError);
      }
    }

    // Both retries failed — check Firestore directly
    // The webhook may have already created the order
    try {
      const orderSnap = await getDoc(doc(db, 'orders', reference.reference));
      if (orderSnap.exists()) {
        const existingOrder = orderSnap.data();
        if (existingOrder.status === 'PAID' || existingOrder.source === 'verified' || existingOrder.source === 'webhook_confirmed') {
          toast.success('Your payment was successful and your order is confirmed!', { autoClose: 5000 });
          goToSuccess(orderSnap.id, existingOrder.orderId || orderId);
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

    // Absolute last resort — payment succeeded on Paystack but we can't confirm the order
    toast.warning(
      'We could not confirm your payment yet. Please do not pay again immediately. Check your bank alert, then contact support if you were debited.',
      { autoClose: 10000 }
    );
    paymentProcessingRef.current = false;
    setCalculating(false);
    setIsSubmitting(false);
  };

  const onClose = () => {
    toast.info('Your order details were saved, but payment was not completed. Try again with a stronger network or switch data/WiFi.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'hostel') {
      setFemaleHostelAgreement(false);
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const currentHour = new Date().getHours();
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const isOutOfHours = currentHour < openingHour || currentHour >= closingHour; 
  const isMaintenance = platformSettings?.isAcceptingOrders === false || platformSettings?.isFoodOrderingClosed === true;
  
  // Batch-aware closing: if batch system is active, use batch state instead of hours
  // BUT if the student chose INSTANT delivery, batch window state should NOT block them
  const isBatchWindowClosed = isBatchSystemActive && !batchTimer.isBatchOpen && !batchTimer.isManualOverride;
  const isBatchFull = isBatchSystemActive && batchTimer.isBatchFull;
  const isInstantSelected = deliveryType === 'INSTANT';
  const isClosed = isMaintenance || (isBatchSystemActive
    ? (isInstantSelected ? isOutOfHours : (isBatchWindowClosed || isBatchFull))
    : isOutOfHours);
  
  const closedMessage = platformSettings?.isFoodOrderingClosed === true
    ? (platformSettings?.foodOrderingClosedMessage || 'Food ordering is currently closed. Cafeterias are preparing for the next order window.')
    : platformSettings?.isAcceptingOrders === false
      ? (platformSettings?.globalClosedMessage || 'CalebDeck is temporarily paused while we make a quick operational update. Please check back shortly.')
      : isBatchSystemActive
        ? (isBatchFull
          ? `The ${batchTimer.activeBatch?.batchName || 'current batch'} is at full capacity. ${batchTimer.nextBatch ? `The next window is the ${batchTimer.nextBatch.batchName}.` : ''}`
          : batchTimer.nextBatch
            ? `Ordering opens at ${formatBatchTime(batchTimer.nextBatch.orderWindowStart)} for the ${batchTimer.nextBatch.batchName}.`
            : "Today's delivery windows have ended. Fresh batches open tomorrow.")
        : `CalebDeck is currently closed. Ordering hours are between ${openingHour}:00 and ${closingHour}:00.`;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYSTACK');
  const [isWalletPaying, setIsWalletPaying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTotal || isClosed || isSubmitting) return;
    if (isFemaleHostelSelected && !femaleHostelAgreement) {
      toast.info('Please accept the female hostel delivery agreement before payment.');
      return;
    }
    
    // Track payment initiation
    trackPaymentInitiated(
      payableTotal,
      currentDeliveryMode,
      'paystack'
    );
    
    setIsSubmitting(true);

    // PRE-SAVE: Save the complete order to Firestore BEFORE payment
    // This ensures items are never lost, even if verify-payment fails later
    const preSaveData = {
      orderId,
      userId: user?.uid || null,
      iConId: user?.uid || null,
      source: 'CalebDeck',
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || formData.hostel,
      instructions: formData.instructions,
      total: payableTotal,
      breakdown: checkoutBreakdown,
      firstOrderDiscount: firstOrderPreview
        ? {
            applied: true,
            percentOff: firstOrderPreview.percentOff,
            amount: firstOrderPreview.amount,
            message: firstOrderPreview.message,
          }
        : undefined,
      femaleHostelAgreement,
      cafeteria,
      cafeteriaId,
      sectionId,
      deliveryMode: currentDeliveryMode,
      deliveryType,
      selectedBatchId: deliveryType === 'BATCH' ? selectedBatch?.batchId : undefined,
      foodBatchName: deliveryType === 'BATCH' ? selectedBatch?.batchName : undefined,
      orderWindowStart: deliveryType === 'BATCH' ? selectedBatch?.orderWindowStart : undefined,
      orderWindowEnd: deliveryType === 'BATCH' ? selectedBatch?.orderWindowEnd : undefined,
      deliveryWindowStart: deliveryType === 'BATCH' ? selectedBatch?.deliveryWindowStart : undefined,
      deliveryWindowEnd: deliveryType === 'BATCH' ? selectedBatch?.deliveryWindowEnd : undefined,
      ...(isCombo ? {
        type: 'combo',
        comboId: comboOrder.comboId,
        comboName: comboOrder.comboName,
        comboItems: comboOrder.comboItems,
        quantity: comboOrder.quantity,
        plateCount: comboOrder.quantity,
        basePrice: comboOrder.basePrice
      } : {
        plates,
        drinksSnacks: drinksSnacksItems,
        plateCount: plates.length
      })
    };

    try {

      const preSaveResponse = await fetch('/api/pre-save-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: paymentRef.current, orderData: preSaveData })
      });

      const preSaveResult = await preSaveResponse.json();

      // Handle batch rejection from server
      if (!preSaveResponse.ok) {
        if (preSaveResult.error === 'ORDER_WINDOW_CLOSED') {
          const nextName = preSaveResult.nextBatch?.batchName || 'the next batch';
          const nextTime = preSaveResult.nextBatch?.orderWindowStart
            ? formatBatchTime(preSaveResult.nextBatch.orderWindowStart)
            : 'soon';
          toast.info(
            `This order window just closed. Your next chance is the ${nextName} — ordering opens at ${nextTime}.`,
            { autoClose: 8000, position: 'top-center' }
          );
          setIsSubmitting(false);
          return;
        }
        if (preSaveResult.error === 'BATCH_FULL') {
          const nextName = preSaveResult.nextBatch?.batchName || 'the next batch';
          const nextDelivery = preSaveResult.nextBatch?.deliveryWindowStart
            ? formatBatchTime(preSaveResult.nextBatch.deliveryWindowStart)
            : 'later';
          toast.info(
            `This batch just filled up! Join the ${nextName} — delivery starts at ${nextDelivery}.`,
            { autoClose: 8000, position: 'top-center' }
          );
          setIsSubmitting(false);
          return;
        }
        if (preSaveResult.error === 'INSTANT_THROTTLED') {
          toast.info(
            preSaveResult.message || 'Instant ordering is currently unavailable. Please join a delivery batch.',
            { autoClose: 8000, position: 'top-center' }
          );
          setDeliveryType('BATCH');
          setIsSubmitting(false);
          return;
        }

        toast.error(
          preSaveResult.message || 'We could not prepare this order for payment. Please try again.',
          { autoClose: 8000, position: 'top-center' }
        );
        setIsSubmitting(false);
        return;
      }

      console.log('[Checkout] Order pre-saved successfully');
    } catch (preSaveErr) {
      // Payment must not begin unless the order was accepted and saved by the server.
      console.warn('[Checkout] Pre-save failed:', preSaveErr);
      toast.error(
        'We could not securely prepare your order for payment. Check your connection and try again.',
        { autoClose: 8000, position: 'top-center' }
      );
      setIsSubmitting(false);
      return;
    }

    // Wallet payments debit atomically server-side against the just-saved order.
    if (paymentMethod === 'WALLET') {
      await handleWalletPayment(preSaveData);
      setIsSubmitting(false);
      return;
    }

    initializePayment({
      onSuccess: (reference: any) => void onSuccess(reference),
      onClose: () => { onClose(); setIsSubmitting(false); }
    });
  };

  const canSubmit = formData.fullName && formData.phone && formData.hostel && orderTotal && !calculating && !isClosed && !isSubmitting && (!isFemaleHostelSelected || femaleHostelAgreement);


  const hostelOptions = [
    { value: '', label: 'Select your hostel' },
    ...hostels.map(h => ({ value: h.id, label: h.name }))
  ];

  if (!isCombo && !plates.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <SEO
          title="No Active Food Order - CalebDeck Checkout"
          description="Start a CalebDeck food order by choosing a cafeteria and building your plate before checkout."
          canonical="https://calebdeck.com/checkout"
          robots="noindex,follow"
        />
        <Card className="text-center max-w-md w-full py-12 px-8">
          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">No Active Order</h1>
          <p className="text-muted-foreground mb-10 text-lg">Your cart is currently empty. Head back to build your perfect meal.</p>
          <Link to="/cafeteria" className="inline-block w-full">
            <Button variant="primary" className="w-full py-6 text-xl rounded-2xl">Start Ordering</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (hasMixedCafeteriaItems) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-9 h-9 text-amber-500" />
          </div>
          <h1 className="text-2xl font-black mb-3">Please rebuild this order</h1>
          <p className="text-muted-foreground font-medium leading-relaxed mb-8">
            This order contains items from more than one cafeteria or section. To avoid wrong preparation, start again from one cafeteria.
          </p>
          <Link to="/cafeteria">
            <Button variant="primary" className="w-full py-4">
              Choose Cafeteria
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO
        title="Checkout - CalebDeck Food Delivery"
        description="Complete your CalebDeck food order with hostel delivery details, order summary, and secure Paystack payment."
        canonical="https://calebdeck.com/checkout"
        robots="noindex,follow"
      />
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => {
              if (cafeteriaId) {
                navigate(`/plate-builder/${cafeteriaId}`, { state: { cafeteria, cafeteriaId, sectionId }, replace: true });
              } else {
                navigate('/cafeteria', { replace: true });
              }
            }} className="p-2 hover:bg-muted rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_450px] gap-12">
          {/* Form - Left */}
          <div className="space-y-8">
            {/* Batch Status Bar (when batch system is active) */}
            {isBatchSystemActive && (
              <BatchStatusBar
                compact
                className="mb-2"
                onJoinNextBatch={() => navigate('/cafeteria', { replace: true })}
              />
            )}
            {/* Delivery window confirmation - Detailed Explanation */}
            {isBatchSystemActive && batchTimer.isBatchOpen && batchTimer.activeBatch && !isBatchFull && (
              <div className="p-4 sm:p-5 mb-6 rounded-2xl sm:rounded-[2rem] bg-[#7C3AED]/5 border border-[#7C3AED]/20 shadow-inner">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FCD34D]/10 border border-[#FCD34D]/20 shadow-sm">
                      <BatchClock size={36} className="drop-shadow-sm" />
                    </div>
                    <h4 className="font-black text-foreground text-sm sm:text-base">Why Scheduled Batches?</h4>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      To reduce delays during peak hours, CalebDeck now groups active food orders into scheduled delivery batches.
                    </p>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      This helps us coordinate riders better, reduce cafeteria wait-time issues, and deliver orders more reliably during busy periods.
                    </p>
                    <div className="inline-block px-3 py-2 mt-1 rounded-lg bg-[#FCD34D]/10 border border-[#FCD34D]/20">
                      <p className="text-sm font-semibold text-foreground">
                        Expected dispatch begins by <span className="font-black text-amber-600 dark:text-[#FCD34D]">{formatBatchTime(batchTimer.activeBatch.deliveryWindowStart)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Legacy closed banner (non-batch or maintenance) */}
            {isClosed && !isBatchSystemActive && (
              <div className="mb-2 p-5 rounded-2xl bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-4 shadow-lg shadow-red-500/5">
                <Lock className="w-8 h-8 flex-shrink-0 text-red-500" />
                <div>
                  <h4 className="font-black text-lg">Ordering Currently Closed</h4>
                  <p className="font-medium text-sm">{closedMessage}</p>
                </div>
              </div>
            )}
            <section>
              {isBatchSystemActive && (
                <div className="mb-12">
                  <DeliveryTypeSelector
                    selectedType={deliveryType}
                    onSelectType={setDeliveryType}
                    selectedBatch={selectedBatch}
                    onOpenBatchPicker={() => setIsBatchPickerOpen(true)}
                    isBatchSystemEnabled={isBatchSystemActive}
                    isInstantEnabled={platformSettings?.instantOrderingEnabled !== false}
                    recommendedType="BATCH"
                    instantThrottleState="OK"
                    instantEstimateMin={platformSettings?.instantDeliveryEstimateMin}
                    instantEstimateMax={platformSettings?.instantDeliveryEstimateMax}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
                <h2 className="text-3xl font-bold">Delivery Details</h2>
              </div>

              <Card className="p-8 border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="Full Name"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      required
                      className="bg-background/80"
                    />

                        {user && (
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" id="saveAsDefault" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} className="w-4 h-4 text-[#7C3AED] rounded border-border" />
                        <label htmlFor="saveAsDefault" className="text-sm font-medium">Save these details as default</label>
                      </div>
                    )}

                    <Input
                      label="Phone Number"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 08012345678"
                      required
                      pattern="[0-9]*"
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        target.value = target.value.replace(/[^0-9]/g, '');
                      }}
                      className="bg-background/80"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Select
                      label="Hostel"
                      name="hostel"
                      value={formData.hostel}
                      onChange={handleChange}
                      options={hostelOptions}
                      required
                      disabled={loadingHostels}
                      className="bg-background/80"
                    />

                    <Input
                      label="Alternative Food"
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleChange}
                      placeholder="If your first choice is unavailable, what should we buy instead?"
                      className="md:col-span-2 bg-background/80"
                    />
                  </div>
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
                          <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
                            Please meet the rider yourself at the assigned safe pickup point. Do not send an unknown person to collect your order, because CalebDeck can only confirm delivery when the order is handed directly to you.
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
                  {/* Trust Bar */}
                  <div className="p-6 rounded-[2rem] bg-secondary/5 border-2 border-secondary/10 shadow-inner">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Shield className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          <Lock className="w-4 h-4 text-secondary" />
                          Secured by Paystack
                        </div>
                      </div>
                      <p className="text-muted-foreground font-medium text-sm">
                        Your sensitive payment information is encrypted and never stored on our servers.
                      </p>
                    </div>
                  </div>
                </form>
              </Card>
            </section>
          </div>

          {/* Order Summary - Right sticky */}
          <div className="lg:sticky lg:top-28 h-fit">
            <Card className="p-8 border-none shadow-2xl bg-card border-secondary/10">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
                <CreditCard className="w-6 h-6 text-secondary" />
                <h3 className="text-2xl font-bold">Order Summary</h3>
              </div>

              {/* Plates Breakdown */}
              <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">

                {isCombo ? (
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">
                        {comboOrder.comboName} • {comboOrder.quantity}x Combo
                      </h4>
                      <span className="font-bold text-secondary text-sm">₦{((comboOrder.basePrice || 0) * (comboOrder.quantity || 1)).toLocaleString()}</span>
                    </div>
                    <div className="space-y-1">
                      {comboOrder.comboItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-2 text-sm font-medium">
                          <span className="text-primary mt-0.5">•</span>
                          <span className="text-muted-foreground flex-1">
                            {item.name} {item.quantity > 1 ? <span className="text-xs opacity-60 ml-1">×{item.quantity}</span> : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {plates.map((plate: any, index: number) => (
                      <div key={plate.id} className="p-4 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">
                            Plate {index + 1} • {plate.type}
                          </h4>
                          <span className="font-bold text-secondary text-sm">₦{plate.total.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          {plate.items.map((item: any) => (
                            <div key={item.item.id} className="flex justify-between text-sm font-medium">
                              <span className="text-muted-foreground">{item.item.name} <span className="text-xs opacity-60">×{item.quantity}</span></span>
                              <span className="text-foreground">₦{(item.item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-medium pt-1 mt-1 border-t border-border/30">
                            <span className="text-muted-foreground">Takeaway Pack</span>
                            <span className="text-foreground">₦200</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Drinks & Snacks */}
                    {Object.keys(drinksSnacks).length > 0 && (
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <h4 className="font-bold uppercase tracking-wider text-xs text-primary mb-3">Add-ons</h4>
                        <div className="space-y-1">
                          {drinksSnacksItems.map(({ item, quantity }: any) => {
                            const inflatedPrice = item.price + (item.price < 1000 && item.isAddon ? 50 : 0);
                            return (
                              <div key={item.id} className="flex justify-between text-sm font-medium">
                                <span className="text-muted-foreground font-medium">{item.name} <span className="text-xs opacity-60">×{quantity}</span></span>
                                <span className="text-foreground">₦{(inflatedPrice * quantity).toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Delivery Stats */}
              <div className="space-y-4 pt-6 border-t border-border mb-8">
                <div className="flex justify-between items-center text-muted-foreground font-medium">
  <div className="flex items-center gap-2">
    <MapPin className="w-4 h-4" />
    <span>Delivery Fee</span>
  </div>
  <span>₦{(orderTotal?.breakdown?.delivery || 0).toLocaleString()}</span>
</div>

                {currentDeliveryMode === 'group' && orderTotal?.breakdown?.discount > 0 && (
                  <div className="flex justify-between items-center text-green-500 font-bold">
                    <span>Group Savings (₦{(orderTotal.breakdown.discount / (isCombo ? (comboOrder.quantity || 1) : plates.length)).toLocaleString()} off per {isCombo ? 'combo' : 'plate'})</span>
                    <span>-₦{orderTotal.breakdown.discount.toLocaleString()}</span>
                  </div>
                )}

                {firstOrderPreview && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">First on CalebDeck</p>
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 leading-snug mt-1">
                          {firstOrderPreview.headline}
                        </p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 leading-relaxed">
                          {firstOrderPreview.percentOff}% off your delivery fee — a thank-you for being among the first to order food here.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 font-black pt-1 border-t border-emerald-500/20">
                      <span>First-order delivery discount</span>
                      <span>-₦{firstOrderPreview.amount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-border gap-4">
                  <span className="text-2xl font-black">Total Due</span>
                  <div className="text-right">
                    {firstOrderPreview && !calculating && (
                      <div className="text-sm font-bold text-muted-foreground line-through mb-1">
                        ₦{(orderTotal?.totalAmount || 0).toLocaleString()}
                      </div>
                    )}
                    <div className="text-4xl font-black text-secondary leading-none">
                      {calculating ? '...' : `₦${payableTotal.toLocaleString()}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              {!calculating && orderTotal && (
                <div className="mb-6">
                  <PaymentSelector
                    amount={payableTotal}
                    selectedMethod={paymentMethod}
                    onSelect={setPaymentMethod}
                  />
                </div>
              )}

              {/* Payment Button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-6 bg-primary text-primary-foreground text-xl font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {calculating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {paymentProcessingRef.current ? 'Processing Order...' : 'Calculating...'}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    {isWalletPaying ? 'Processing...' : `Pay ₦${payableTotal.toLocaleString()}`}
                  </>
                )}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-widest leading-none">Safe & Encrypted Checkout</span>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <BatchPickerModal
        isOpen={isBatchPickerOpen}
        onClose={() => setIsBatchPickerOpen(false)}
        onSelectBatch={(batch) => {
          setSelectedBatch(batch);
          setDeliveryType('BATCH');
          setIsBatchPickerOpen(false);
        }}
        allowFutureBatchPreorders={platformSettings?.allowFutureBatchPreorders || false}
        selectedBatchId={selectedBatch?.batchId}
      />
    </div>
  );
}


