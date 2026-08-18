import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { ProgressStepper } from '../../components/design-system/ProgressStepper';
import { CheckCircle, MapPin, Clock, Phone, Sparkles, RefreshCw, AlertCircle, Timer } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { subscribeToOrderStatus, getRiderById, getHostelById, Rider, getOrderById, submitReview, subscribeToPlatformSettings } from '../../../services/db';
import { trackOrderTracked } from '../../../services/analytics';
import { saveOrderToHistory, buildFoodOrderEntry, buildMartOrderEntry, buildCalebNetEntry, buildFashionOrderEntry } from '../../../services/orderHistory';
import SEO from '../../components/SEO';
import { BatchTimeline } from '../../components/BatchTimeline';
import { formatBatchTime } from '../../../context/BatchTimerContext';
import { FashionOrderStepper } from '../../components/FashionOrderStepper';
import { FASHION_ORDER_STATUSES } from '../../../services/db';

const TRACKING_STEPS = ['Received', 'Out for Delivery', 'On The Way', 'Delivered'];
const MASS_COMM_PICKUP_HOSTELS = ['mary', 'mary hall', 'rebecca', 'rebecca hall', 'esme', 'esme hall', 'mercy', 'mercy hall', 'deborah', 'deborah hall'];
const MEDICALS_PICKUP_HOSTELS = ['sussana', 'sussana hall', 'susanna', 'susanna hall'];

const STATUS_TO_STEP: Record<string, number> = {
  PAID: 0,
  OUT_FOR_DELIVERY: 1,
  ON_THE_WAY: 2,
  DELIVERED: 3,
};

const getPickupPoint = (hostelId: string, hostelName: string) => {
  const normalizedValues = [hostelId, hostelName]
    .filter(Boolean)
    .map(value => value.toLowerCase().trim());

  if (normalizedValues.some(value => MASS_COMM_PICKUP_HOSTELS.includes(value))) {
    return 'Front of Mass Comm Building';
  }

  if (normalizedValues.some(value => MEDICALS_PICKUP_HOSTELS.includes(value))) {
    return 'Caleb Medicals';
  }

  return 'Front of your hostel/reception';
};

export default function OrderSuccess() {
  const location = useLocation();
  const { studentTheme } = useTheme();

  const savedOrder = (() => {
    try { 
      const data = localStorage.getItem('calebdeck_last_order');
      return data ? JSON.parse(data) : null; 
    } catch { return null; }
  })();

  const orderData = location.state || savedOrder || {};

  const {
    orderId = 'CD-12345',
    fullName = 'Student',
    phone = '',
    hostel = '',
    hostelName = '',
    total = 0,
    plates = [],
    drinksSnacks = [],
    cafeteria = '',
    cafeteriaId = '',
    sectionId = '',
    reference = '',
    firestoreOrderId = null,
    status = 'PAID',
    paymentMessage = '',
  } = orderData;

  useEffect(() => {
    if (location.state) {
      localStorage.setItem('calebdeck_last_order', JSON.stringify(location.state));

      // Save to persistent order history
      try {
        const s = location.state as any;
        if (s.calebnet) {
          saveOrderToHistory(buildCalebNetEntry({
            network: s.network || '',
            type: s.type || 'data',
            amount: Number(s.amount) || 0,
            phoneNumber: s.phoneNumber || '',
            planName: s.planName,
            reference: s.firestoreOrderId || s.paymentReference || s.orderId || `cn_${Date.now()}`
          }));
        } else if (s.orderType === 'FASHION' || s.orderType === 'fashion' || s.cafeteria === 'CalebDeck Fashion') {
          saveOrderToHistory(buildFashionOrderEntry(s));
        } else if (s.orderType === 'mart' || s.type === 'mart' || s.cafeteria === 'CalebDeck Mart') {
          saveOrderToHistory(buildMartOrderEntry(s));
        } else {
          saveOrderToHistory(buildFoodOrderEntry(s));
        }
      } catch (e) {
        console.warn('Could not save to order history:', e);
      }
    }
  }, [location.state]);

  const displayHostel = hostelName || hostel || 'Your Hostel';
  const pickupPoint = getPickupPoint(hostel, hostelName);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTracking, setShowTracking] = useState(orderData.showTracking === true);
  const [rider, setRider] = useState<Rider | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>(status || 'PAID');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const enjoyMealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubSettings = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsubSettings();
  }, []);

  useEffect(() => {
     if (orderId && localStorage.getItem(`reviewed_${orderId}`)) {
         setHasReviewed(true);
     }
  }, [orderId]);

  useEffect(() => {
    if (!hostel) return;
    const fetchHostelRider = async () => {
      const hostelDoc = await getHostelById(hostel);
      if (hostelDoc?.defaultRiderId) {
        const defaultRider = await getRiderById(hostelDoc.defaultRiderId);
        if (defaultRider) setRider(defaultRider);
      }
    };
    fetchHostelRider();
  }, [hostel]);

  useEffect(() => {
    if (!firestoreOrderId) return;
    
    const unsub = subscribeToOrderStatus(firestoreOrderId, (order) => {
      if (order) {
        setOrderStatus(order.status);
        setCurrentStep(STATUS_TO_STEP[order.status] ?? 0);
        
        // Track order status updates
        trackOrderTracked(orderId, order.status);

        if (order.assignedRiderId) {
          getRiderById(order.assignedRiderId).then(r => {
            if (r) setRider(r);
          });
        }

        if (order.status === 'DELIVERED') {
          setTimeout(() => {
            enjoyMealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 600);
        }
      }
    });

    // Check for network connectivity
    const handleOnline = () => {
        // Force refresh if back online
        refreshStatus();
    };
    window.addEventListener('online', handleOnline);

    return () => {
        unsub();
        window.removeEventListener('online', handleOnline);
    };
  }, [firestoreOrderId]);

  const refreshStatus = async () => {
    if (!firestoreOrderId || isRefreshing) return;
    setIsRefreshing(true);
    try {
        const orderDataRaw = await getOrderById(firestoreOrderId);
        const order = orderDataRaw as any;
        if (order) {
            setOrderStatus(order.status);
            setCurrentStep(STATUS_TO_STEP[order.status] ?? 0);
            if (order.assignedRiderId) {
                const r = await getRiderById(order.assignedRiderId);
                if (r) setRider(r);
            }
        }
    } catch (err) {
        console.error("Manual refresh failed:", err);
    } finally {
        setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const handleReviewSubmit = async () => {
    if (!orderId || !firestoreOrderId) return;
    setIsSubmittingReview(true);
    try {
      await submitReview({
        orderId: firestoreOrderId,
        studentName: fullName || 'Student',
        rating: reviewRating,
        feedback: reviewText,
        cafeteria: cafeteria || 'General',
        riderName: rider?.name || 'Unknown'
      });
      localStorage.setItem(`reviewed_${orderId}`, 'true');
      setHasReviewed(true);
      setIsReviewOpen(false);
    } catch (e) {
      console.error('Failed to submit review', e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const estimatedTime = 25 - (currentStep * 6);
  const isPaymentIssue = ['PENDING_PAYMENT', 'FAILED', 'PENDING_CONFIRMATION'].includes(orderStatus);
  const retryPath = orderData.orderType === 'mart' || orderData.type === 'mart' || cafeteria === 'CalebDeck Mart' ? '/mart' : '/cafeteria';
  const isFashionOrder = orderData.orderType === 'FASHION' || orderData.orderType === 'fashion' || orderData.cafeteria === 'CalebDeck Fashion';
  // Map fashion status to the FASHION_ORDER_STATUSES index
  const fashionStatusIndex = isFashionOrder ? FASHION_ORDER_STATUSES.indexOf(orderStatus as any) : -1;

  if (isPaymentIssue) {
    const isFailed = orderStatus === 'FAILED';
    const title = isFailed ? 'Payment Did Not Go Through' : 'Payment Not Confirmed Yet';
    const message = isFailed
      ? 'Your bank or Paystack did not confirm payment to CalebDeck, so this order will not be processed yet.'
      : 'We saved your order details, but Paystack has not confirmed payment to CalebDeck yet.';
    const guidance = isFailed
      ? 'If money was deducted, your bank or Paystack should reverse it. You can try again with a stronger network or a different connection.'
      : 'This usually happens when the school network is weak. Try again with a stronger network or switch data/WiFi before paying.';

    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <SEO title="Payment Status - CalebDeck" description="Check the status of your CalebDeck order payment." canonical="https://calebdeck.com/order-success" robots="noindex,follow" />
        <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
            <Logo size="md" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-16">
          <Card className="text-center p-8 sm:p-10 border-2 border-amber-500/20 bg-amber-500/5 rounded-[2rem]">
            <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
              {isFailed ? <AlertCircle className="w-11 h-11 text-amber-600" /> : <Clock className="w-11 h-11 text-amber-600" />}
            </div>
            <Badge variant={isFailed ? 'gray' : 'amber'} className="mb-5 font-black uppercase tracking-widest">
              {isFailed ? 'Payment Failed' : 'Awaiting Payment'}
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed mb-4">
              {message}
            </p>
            <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed">
              {guidance}
            </p>

            <div className="mt-8 rounded-2xl bg-background/80 border border-border p-5 text-left">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-2">Saved Attempt</p>
              <p className="text-lg font-black">{orderId}</p>
              {paymentMessage && (
                <p className="text-sm text-muted-foreground font-medium mt-2">{paymentMessage}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-8">
              <Link to={retryPath}>
                <Button variant="primary" size="lg" className="w-full">
                  Try Again
                </Button>
              </Link>
              <Link to="/support">
                <Button variant="secondary" size="lg" className="w-full">
                  Contact Support
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground font-bold mt-5 leading-relaxed">
              CalebDeck only processes orders after Paystack confirms that payment reached us.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  if (!showTracking) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <SEO title="Order Placed - CalebDeck" description="Your CalebDeck order has been successfully placed and is ready for live tracking." canonical="https://calebdeck.com/order-success" robots="noindex,follow" />
        <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
            <Logo size="md" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="relative inline-block mb-8">
              <div className="w-28 h-28 rounded-[2.5rem] bg-green-500/10 flex items-center justify-center mx-auto animate-pulse">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg animate-bounce">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
              Order Placed!
            </h1>

            <div className="inline-block px-8 py-4 rounded-[2rem] bg-primary/10 border-2 border-primary/30 mb-10 shadow-inner">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black mb-1 opacity-60">Ticket Number</p>
              <p className="text-3xl font-black text-foreground">{orderId}</p>
            </div>

            {rider && (
              <Card className="mb-10 p-6 bg-secondary/5 border-2 border-secondary/20 rounded-[2.5rem] flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-xl">
                    {rider.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Your Rider</p>
                    <p className="text-lg font-black">{rider.name}</p>
                  </div>
                </div>
                <Badge variant={orderStatus === 'DELIVERED' ? 'green' : 'gold'} className="font-black italic">
                  {orderStatus === 'DELIVERED' ? 'DELIVERED' : orderStatus === 'ON_THE_WAY' ? 'ON THE WAY' : orderStatus === 'OUT_FOR_DELIVERY' ? 'OUT FOR DELIVERY' : 'RECEIVED'}
                </Badge>
              </Card>
            )}

            <Card className="text-left mb-10 p-8 border-none shadow-2xl bg-card">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight">Hostel</p>
                    <p className="text-xl font-bold">{displayHostel}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight">Pickup Point</p>
                    <p className="text-xl font-bold">{pickupPoint}</p>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Meet your rider here when they call or arrive.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight">Expected Arrival</p>
                    {orderData.deliveryType === 'BATCH' || orderData.foodBatchId ? (
                      <>
                        <p className="text-xl font-bold">
                          {formatBatchTime(orderData.deliveryWindowStart)}–{formatBatchTime(orderData.deliveryWindowEnd)}
                        </p>
                        <p className="text-sm text-muted-foreground font-medium mt-1">
                          Your order is part of <strong>{orderData.foodBatchName}</strong>.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold">
                          {platformSettings?.instantDeliveryEstimateMin && platformSettings?.instantDeliveryEstimateMax 
                            ? `${platformSettings.instantDeliveryEstimateMin}–${platformSettings.instantDeliveryEstimateMax} minutes` 
                            : 'Processing Now'}
                        </p>
                        <p className="text-sm text-muted-foreground font-medium mt-1">
                          Delivery time depends on rider availability and current order volume.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Batch Timeline — only shows if order has batch info */}
            {orderData.foodBatchId && (
              <BatchTimeline
                className="mb-4"
                highlightBatchId={orderData.foodBatchId}
              />
            )}

            <div className="space-y-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowTracking(true)}
                className="w-full py-6 text-xl rounded-2xl shadow-xl shadow-primary/20"
              >
                Track Live Order
              </Button>

              <div className="flex flex-col gap-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refreshStatus}
                    disabled={isRefreshing}
                    className="w-full opacity-60 hover:opacity-100 flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Syncing...' : 'Sync Status'}
                </Button>

                <Link to="/">
                    <Button variant="ghost" size="sm" className="w-full opacity-40 hover:opacity-100">
                    Return to home
                    </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <SEO title="Order Tracker - CalebDeck" description="Track your CalebDeck food or mart delivery in real time." canonical="https://calebdeck.com/order-success" robots="noindex,follow" />
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border transition-colors duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Order Tracker</h1>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">{orderId}</p>
            </div>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Status Header */}
        <div className="text-center mb-16">
          <div className="mb-6">
            <Badge variant={currentStep === TRACKING_STEPS.length - 1 ? 'green' : 'gold'} className={`px-6 py-2 text-sm font-black uppercase tracking-widest rounded-full shadow-lg ${currentStep === TRACKING_STEPS.length - 1 ? 'shadow-green-500/20' : ''}`}>
              {TRACKING_STEPS[currentStep]}
            </Badge>
          </div>
          <h2 className="text-5xl font-black mb-4 tracking-tight">
            {TRACKING_STEPS[currentStep]}
          </h2>
          {currentStep < TRACKING_STEPS.length - 1 && (
            <div className="flex items-center justify-center gap-2 text-xl text-muted-foreground font-medium">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              Estimated arrival in <span className="text-foreground font-bold">{estimatedTime} minutes</span>
            </div>
          )}
        </div>

        {/* Progress Stepper — Fashion gets the vertical 9-step, food/mart get horizontal 4-step */}
        {isFashionOrder ? (
          <div className="mb-16">
            <FashionOrderStepper currentStatus={orderStatus} />
          </div>
        ) : (
          <div className="mb-16 px-4">
            <ProgressStepper steps={TRACKING_STEPS} currentStep={currentStep} />
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Rider Info */}
          {rider ? (
            <Card className="bg-card/50 backdrop-blur-sm border-none shadow-xl border-t-4 border-t-secondary">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-3xl shadow-2xl">
                    {rider.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black mb-1">{rider.name}</h3>
                  <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight mb-4">Your Rider</p>

                  <a href={`tel:${rider.phone}`} className="block">
                    <Button variant="secondary" size="md" className="w-full rounded-2xl py-5">
                      <Phone className="w-4 h-4" />
                      Call Rider
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-muted/30 border-dashed border-2 border-border flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Waiting for rider assignment</p>
            </Card>
          )}

          {/* Delivery Details */}
          <Card className="bg-card/50 backdrop-blur-sm border-none shadow-xl border-t-4 border-t-primary">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Delivery Summary
            </h3>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Destination</p>
                  <p className="text-lg font-bold">{displayHostel}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Pickup Point</p>
                  <p className="text-lg font-bold">{pickupPoint}</p>
                  <p className="text-sm text-muted-foreground font-medium">Meet your rider here when they call or arrive.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Ordered At</p>
                  <p className="text-lg font-bold">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card className="border-none shadow-2xl p-8 bg-card">
          <h3 className="text-xl font-black mb-8 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Live Activity
          </h3>
          <div className="space-y-8">
            {TRACKING_STEPS.slice(0, currentStep + 1).reverse().map((step, index) => {
              const actualIndex = currentStep - index;
              const isLatest = index === 0;
              const isDelivered = currentStep === TRACKING_STEPS.length - 1;
              const isDeliveredStep = isLatest && isDelivered;
              return (
                <div key={step} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full border-4 transition-colors duration-500 ${isDeliveredStep ? 'bg-[#10B981] border-[#10B981]/30' :
                      isLatest ? 'bg-primary border-primary/30' :
                        'bg-muted border-transparent'
                      }`}></div>
                    {index < currentStep && <div className="w-1 h-12 bg-muted rounded-full mt-2"></div>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xl font-black ${isDeliveredStep ? 'text-[#10B981]' :
                      isLatest ? 'text-foreground' :
                        'text-muted-foreground opacity-50'
                      }`}>{step}</p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-tight">
                      {actualIndex === currentStep ? (
                        <span className={`flex items-center gap-2 font-bold ${isDelivered ? 'text-[#10B981]' : 'text-secondary'
                          }`}>
                          {isDelivered ? (
                            <><CheckCircle className="w-4 h-4" /> Delivered</>
                          ) : (
                            <><span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span> In Progress</>
                          )}
                        </span>
                      ) : 'Completed'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Final Success State */}
        {currentStep === TRACKING_STEPS.length - 1 && (
          <div ref={enjoyMealRef} className="mt-12 text-center animate-in zoom-in duration-700">
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/20 py-12">
              <div className="max-w-md mx-auto px-6">
                <div className="w-20 h-20 rounded-[2rem] bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black mb-4">
                  Enjoy Your Meal!
                </h3>
                <p className="text-lg text-muted-foreground font-medium mb-10 leading-relaxed">
                  Your order has been delivered. Thank you for choosing CalebDeck for fast campus delivery.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {!hasReviewed && (
                    <Button variant="secondary" onClick={() => setIsReviewOpen(true)} className="flex-1 py-5 rounded-2xl">
                      Rate Experience
                    </Button>
                  )}
                  <Link to="/" className="flex-1">
                    <Button variant="primary" className="w-full py-5 rounded-2xl">
                      Done
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}

        {isReviewOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-card w-full max-w-md rounded-3xl p-8 relative shadow-2xl">
                <button onClick={() => setIsReviewOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
                   ×
                </button>
                <h3 className="text-2xl font-black mb-2 text-center text-[#7C3AED]">Rate Your Experience</h3>
                <p className="text-sm text-center text-muted-foreground mb-6">How was your order and delivery from {cafeteria || 'us'}?</p>
                <div className="flex justify-center gap-2 mb-6">
                   {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setReviewRating(star)} className={`text-4xl transition-transform ${star <= reviewRating ? 'text-[#FCD34D] scale-110' : 'text-gray-300'}`}>
                         ★
                      </button>
                   ))}
                </div>
                <textarea 
                   className="w-full bg-secondary/10 border-2 border-secondary/20 rounded-2xl p-4 text-sm mb-6 min-h-[100px] outline-none font-medium resize-none placeholder:text-muted-foreground focus:border-primary/50" 
                   placeholder="Any feedback? (Optional)"
                   value={reviewText}
                   onChange={e => setReviewText(e.target.value)}
                />
                <Button variant="primary" disabled={isSubmittingReview} onClick={handleReviewSubmit} className="w-full py-4 text-lg">
                   {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
