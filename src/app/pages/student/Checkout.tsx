import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { ArrowLeft, Lock, Shield, CreditCard, MapPin, User, Phone } from 'lucide-react';
import { getActiveHostels, Hostel, createOrder } from '../../../services/db';
import { calculateOrderTotal, verifyPayment } from '../../../services/functions';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';

const DELIVERY_FEE_SOLO = 750;
const DELIVERY_FEE_GROUP = 580;

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentTheme } = useTheme();
  const {
    plates = [],
    drinksSnacks = {},
    drinksSnacksItems = [],
    deliveryMode = 'solo',
    groupSize = 2,
    cafeteria = 'Old Cafeteria',
    cafeteriaId = 'old',
    sectionId = 'front'
  } = location.state || {};

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [orderTotal, setOrderTotal] = useState<{ totalAmount: number; breakdown: any; token: string } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    hostel: '',
    instructions: ''
  });

  // Fetch Hostels
  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const activeHostels = await getActiveHostels();
        setHostels(activeHostels);
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
        quantity: pi.quantity
      }))),
      ...Object.entries(drinksSnacks).map(([id, qty]) => ({ id, quantity: qty as number }))
    ];
  }, [plates, drinksSnacks]);

  // Calculate Order Total (Server-Side)
  useEffect(() => {
    const fetchTotal = async () => {
      if (!plates.length) return;

      setCalculating(true);
      try {
        const response = await calculateOrderTotal({
          items,
          plateCount: plates.length,
          deliveryMode,
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
  }, [plates, drinksSnacks, deliveryMode, formData.hostel]);

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const config = {
    reference: (new Date()).getTime().toString(),
    email: "guest@calebdeck.com",
    amount: Math.round((orderTotal?.totalAmount || 0) * 100),
    publicKey: paystackKey as string,
    metadata: {
      custom_fields: [
        {
          display_name: "Order Items",
          variable_name: "order_items",
          value: items.map(i => `${i.id} (x${i.quantity})`).join(', ')
        },
        {
          display_name: "Student Name",
          variable_name: "student_name",
          value: formData.fullName
        },
        {
          display_name: "Hostel",
          variable_name: "hostel",
          value: formData.hostel
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    setCalculating(true);
    const orderId = `CD-${Math.floor(10000 + Math.random() * 90000)}`;
    const selectedHostel = hostels.find(h => h.id === formData.hostel);

    const orderData = {
      orderId,
      ...formData,
      studentName: formData.fullName,
      hostelName: selectedHostel?.name || formData.hostel,
      total: orderTotal?.totalAmount,
      plates,
      drinksSnacks: drinksSnacksItems,
      cafeteria,
      cafeteriaId,
      sectionId,
      deliveryMode,
      paymentReference: reference.reference,
      status: 'PAID' as const,
      updatedAt: new Date().toISOString()
    };

    try {
      await verifyPayment({
        reference: reference.reference,
        orderData
      });

      const orderRef = await createOrder(orderData);

      sessionStorage.removeItem('cd_plates');
      sessionStorage.removeItem('cd_drinksSnacks');
      sessionStorage.removeItem('cd_deliveryMode');
      sessionStorage.removeItem('cd_groupSize');

      navigate('/order-success', { state: { ...orderData, firestoreOrderId: orderRef.id } });
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Payment verification failed. Please contact support.");
    } finally {
      setCalculating(false);
    }
  };

  const onClose = () => {
    console.log('Payment closed');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTotal) return;
    initializePayment({ onSuccess: onSuccess as any, onClose: onClose });
  };

  const canSubmit = formData.fullName && formData.phone && formData.hostel && orderTotal && !calculating;

  const hostelOptions = [
    { value: '', label: 'Select your hostel' },
    ...hostels.map(h => ({ value: h.id, label: h.name }))
  ];

  if (!plates.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="text-center max-w-md w-full py-12 px-8">
          <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-secondary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">No Active Order</h2>
          <p className="text-muted-foreground mb-10 text-lg">Your cart is currently empty. Head back to build your perfect meal.</p>
          <Link to="/cafeteria" className="inline-block w-full">
            <Button variant="primary" className="w-full py-6 text-xl rounded-2xl">Start Ordering</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-muted rounded-xl transition-colors">
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
            <section>
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
                      label="Additional Instructions"
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleChange}
                      placeholder="Any specific delivery instructions?"
                      className="md:col-span-2 bg-background/80"
                    />
                  </div>
                  {/* Trust Bar */}
                  <div className="p-6 rounded-[2rem] bg-secondary/5 border-2 border-secondary/10 shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Shield className="w-8 h-8 text-secondary-foreground" />
                      </div>
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          <Lock className="w-5 h-5 text-secondary" />
                          Secured by Paystack
                        </div>
                        <p className="text-muted-foreground font-medium">
                          Your sensitive payment information is encrypted and never stored on our servers.
                        </p>
                      </div>
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
                    </div>
                  </div>
                ))}

                {/* Drinks & Snacks */}
                {Object.keys(drinksSnacks).length > 0 && (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <h4 className="font-bold uppercase tracking-wider text-xs text-primary mb-3">Add-ons</h4>
                    <div className="space-y-1">
                      {drinksSnacksItems.map(({ item, quantity }: any) => (
                        <div key={item.id} className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground font-medium">{item.name} <span className="text-xs opacity-60">×{quantity}</span></span>
                          <span className="text-foreground">₦{(item.price * quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Stats */}
              <div className="space-y-4 pt-6 border-t border-border mb-8">
                <div className="flex justify-between items-center text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Delivery (₦{DELIVERY_FEE_SOLO} × {plates.length})</span>
                  </div>
                  <span>₦{(DELIVERY_FEE_SOLO * plates.length).toLocaleString()}</span>
                </div>

                {deliveryMode === 'group' && (
                  <div className="flex justify-between items-center text-green-500 font-bold">
                    <span>Group Savings (₦170 off per plate)</span>
                    <span>-₦{((DELIVERY_FEE_SOLO - DELIVERY_FEE_GROUP) * plates.length).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-border gap-4">
                  <span className="text-2xl font-black">Total Due</span>
                  <div className="text-right">
                    <div className="text-4xl font-black text-secondary leading-none">
                      {calculating ? '...' : `₦${(orderTotal?.totalAmount || 0).toLocaleString()}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-6 bg-primary text-primary-foreground text-xl font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {calculating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    Pay ₦{(orderTotal?.totalAmount || 0).toLocaleString()}
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
    </div>
  );
}