import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMartCart } from '../../../context/MartCartContext';
import { getActiveHostels, Hostel, subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { verifyPayment } from '../../../services/functions';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { ArrowLeft, User, Phone, MapPin, Shield, CreditCard, ShoppingBag, Clock } from 'lucide-react';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import SEO from '../../components/SEO';

export default function MartCheckout() {
  const { items, subtotal, totalItems, clearCart } = useMartCart();
  const navigate = useNavigate();
  
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const paymentProcessingRef = useRef(false);
  const paymentRef = useRef((new Date()).getTime().toString());

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    hostel: '',
    instructions: ''
  });

  const selectedHostel = hostels.find(h => h.id === formData.hostel);
  const MART_DELIVERY_FEE = 1500;
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const SERVICE_PROCESSING_FEE = 300;
  const total = subtotal + MART_DELIVERY_FEE + SERVICE_PROCESSING_FEE;
  const orderId = React.useMemo(() => `CD-MART-${Math.floor(10000 + Math.random() * 90000)}`, []);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/mart');
    }
  }, [items, navigate]);

  const currentHour = new Date().getHours();
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const isOutOfHours = currentHour < openingHour || currentHour >= closingHour; 
  const isMaintenance = platformSettings?.isMartAcceptingOrders === false;
  const isClosed = (isOutOfHours || isMaintenance) && !isDev;

  if (isClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="text-center max-w-md w-full py-12 px-8">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Mart is Closed</h2>
          <p className="text-muted-foreground mb-10 text-lg">
            CalebDeck Mart operates between {openingHour}:00 and {closingHour}:00. 
            {isMaintenance && " We are currently under maintenance."}
          </p>
          <Link to="/mart" className="inline-block w-full">
            <Button variant="primary" className="w-full py-6 text-xl rounded-2xl">Back to Mart</Button>
          </Link>
        </Card>
      </div>
    );
  }

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
      orderType: 'mart',
      source: 'calebdeck',
      fullName: formData.fullName,
      studentName: formData.fullName,
      phone: formData.phone,
      hostel: formData.hostel,
      hostelName: selectedHostel?.name || '',
      instructions: formData.instructions,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: MART_DELIVERY_FEE,
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
      reference: reference.reference || paymentRef.current,
      orderId,
      studentName: formData.fullName,
      phone: formData.phone,
      hostelId: formData.hostel,
      hostelName: selectedHostel?.name,
      instructions: formData.instructions,
      orderType: 'mart',
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        category: i.category
      })),
      deliveryFee: MART_DELIVERY_FEE,
      serviceProcessingFee: SERVICE_PROCESSING_FEE,
      subtotal,
      totalAmount: total,
    };

    const goToSuccess = (finalOrderId: string) => {
      toast.dismiss();
      clearCart();
      navigate('/order-success', {
        state: {
          orderId: finalOrderId,
          reference: reference.reference,
          totalAmount: total,
          cafeteria: 'CalebDeck Mart'
        },
        replace: true
      });
    };

    try {
      const response = await verifyPayment(orderData);
      const serverData = response.data || response;
      if (serverData && serverData.success) {
        goToSuccess(serverData.orderId || orderId);
        return;
      }
    } catch (firstError) {
      console.warn('Verification attempt 1 failed:', firstError);
      // Wait 3s then retry once
      await new Promise(r => setTimeout(r, 3000));
      try {
        const response = await verifyPayment(orderData);
        const serverData = response.data || response;
        if (serverData && serverData.success) {
          goToSuccess(serverData.orderId || orderId);
          return;
        }
      } catch (secondError) {
        console.warn('Verification attempt 2 failed:', secondError);
      }
    }

    // Both retries failed — check Firestore directly. The webhook may have already created the order
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../../services/firebase');
      const orderSnap = await getDoc(doc(db, 'orders', reference.reference));
      if (orderSnap.exists()) {
        const existingOrder = orderSnap.data();
        toast.success('Your payment was successful and your order is confirmed!', { autoClose: 5000 });
        goToSuccess(existingOrder.orderId || orderId);
        return;
      }
    } catch (firestoreErr) {
      console.warn('Firestore fallback check failed:', firestoreErr);
    }

    // Absolute last resort
    toast.dismiss();
    toast.warning(
      'Your payment was successful! Your order may take a moment to appear. If it doesn\'t show up, please contact support.',
      { autoClose: 10000 }
    );
    goToSuccess(orderId);
    paymentProcessingRef.current = false;
  };

  const onClose = () => {
    toast.info("Payment cancelled. If this was a network issue, please try again.");
  };

  const handlePay = () => {
    if (!formData.fullName.trim()) return toast.error('Please enter your full name');
    if (!formData.phone.trim()) return toast.error('Please enter your phone number');
    if (formData.phone.length < 10) return toast.error('Please enter a valid phone number');
    if (!formData.hostel) return toast.error('Please select your hostel');

    if (platformSettings && !isDev && (platformSettings.isAcceptingOrders === false || platformSettings.isMartComingSoon === true)) {
      toast.error("Ordering is temporarily paused for maintenance. Please try again later.");
      return;
    }

    initializePayment({ onSuccess, onClose } as any);
  };

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO title="Checkout — CalebDeck Mart" description="Complete your CalebDeck Mart order." />

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/mart/cart')} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted">
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
                  icon={<User className="w-5 h-5" />}
                  required
                />
                <Input
                  label="Phone Number"
                  placeholder="08012345678"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  icon={<Phone className="w-5 h-5" />}
                  required
                />
                <Select
                  label="Select Hostel"
                  value={formData.hostel}
                  onChange={(e) => setFormData({ ...formData, hostel: e.target.value })}
                  options={hostels.map(h => ({ value: h.id, label: h.name }))}
                  required
                />
                <Textarea
                  label="Delivery Instructions (Optional)"
                  placeholder="E.g., Call me when you reach the gate..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                />
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
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Service & Processing Fee</span>
                  <span className="font-medium text-foreground">₦{SERVICE_PROCESSING_FEE}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-black text-[#10B981]">₦{total}</span>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full py-4 text-lg bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center gap-2 shadow-xl shadow-[#10B981]/20"
                onClick={handlePay}
              >
                <CreditCard className="w-5 h-5" /> Pay ₦{total}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secured by Paystack</span>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
