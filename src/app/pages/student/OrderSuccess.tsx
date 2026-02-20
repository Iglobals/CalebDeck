import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { ProgressStepper } from '../../components/design-system/ProgressStepper';
import { CheckCircle, MapPin, Clock, Phone, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useTheme } from '../../../context/ThemeContext';

import { createOrder } from '../../../services/db';

import { getRiderById, Rider } from '../../../services/db';

const TRACKING_STEPS = ['Preparing', 'Picked Up', 'On The Way', 'Delivered'];

export default function OrderSuccess() {
  const location = useLocation();
  const { studentTheme } = useTheme();
  const {
    orderId = 'CD-12345',
    fullName = 'Student',
    phone = '',
    hostel = 'Deborah Hall',
    room = '204',
    total = 0,
    plates = [],
    drinksSnacks = [],
    cafeteria = '',
    cafeteriaId = '',
    sectionId = '',
    reference = '',
    assignedRiderId = null
  } = location.state || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [showTracking, setShowTracking] = useState(false);
  const [rider, setRider] = useState<Rider | null>(null);

  // Fetch Rider Details
  useEffect(() => {
    if (assignedRiderId) {
      getRiderById(assignedRiderId).then(setRider);
    }
  }, [assignedRiderId]);

  // Simulate order progress
  useEffect(() => {
    if (showTracking && currentStep < TRACKING_STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showTracking, currentStep]);

  const estimatedTime = 25 - (currentStep * 6);

  if (!showTracking) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
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
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Assigned Rider</p>
                    <p className="text-lg font-black">{rider.name}</p>
                  </div>
                </div>
                <Badge variant="gold" className="font-black italic">DISPATCHING</Badge>
              </Card>
            )}

            <Card className="text-left mb-10 p-8 border-none shadow-2xl bg-card">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight">Delivery Point</p>
                    <p className="text-xl font-bold">{hostel}, Room {room}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight">Expected Arrival</p>
                    <p className="text-xl font-bold">25–30 minutes</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowTracking(true)}
                className="w-full py-6 text-xl rounded-2xl shadow-xl shadow-primary/20"
              >
                Track Live Order
              </Button>

              <Link to="/">
                <Button variant="ghost" size="lg" className="w-full opacity-60 hover:opacity-100">
                  Return to cafeteria
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div >
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
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
            <Badge variant={currentStep === TRACKING_STEPS.length - 1 ? 'green' : 'gold'} className="px-6 py-2 text-sm font-black uppercase tracking-widest rounded-full shadow-lg">
              {currentStep === TRACKING_STEPS.length - 1 ? 'Delivered' : 'En Route'}
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

        {/* Progress Stepper */}
        <div className="mb-16 px-4">
          <ProgressStepper steps={TRACKING_STEPS} currentStep={currentStep} />
        </div>

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
                  <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight mb-4">Your Professional Rider</p>

                  <a href={`tel:${rider.phone}`} className="block">
                    <Button variant="secondary" size="md" className="w-full rounded-2xl py-5">
                      <Phone className="w-4 h-4" />
                      Connect via Call
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-muted/30 border-dashed border-2 border-border flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Waiting for rider pickup</p>
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
                  <p className="text-lg font-bold">{hostel}</p>
                  <p className="text-muted-foreground font-medium leading-none">Room {room}</p>
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
            < Sparkles className="w-5 h-5 text-primary" />
            Live Activity
          </h3>
          <div className="space-y-8">
            {TRACKING_STEPS.slice(0, currentStep + 1).reverse().map((step, index) => {
              const actualIndex = currentStep - index;
              const isLatest = index === 0;
              return (
                <div key={step} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full border-4 transition-colors duration-500 ${isLatest ? 'bg-primary border-primary/30' : 'bg-muted border-transparent'}`}></div>
                    {index < currentStep && <div className="w-1 h-12 bg-muted rounded-full mt-2"></div>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xl font-black ${isLatest ? 'text-foreground' : 'text-muted-foreground opacity-50'}`}>{step}</p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-tight">
                      {actualIndex === currentStep ? (
                        <span className="flex items-center gap-2 text-secondary font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                          In Progress
                        </span>
                      ) : 'Completed'}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground font-bold">
                    {new Date(Date.now() - (currentStep - actualIndex) * 300000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Final Success State */}
        {currentStep === TRACKING_STEPS.length - 1 && (
          <div className="mt-12 text-center animate-in zoom-in duration-700">
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/20 py-12">
              <div className="max-w-md mx-auto px-6">
                <div className="w-20 h-20 rounded-[2rem] bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black mb-4">
                  Enjoy Your Meal!
                </h3>
                <p className="text-lg text-muted-foreground font-medium mb-10 leading-relaxed">
                  Your order has been delivered. Thank you for choosing CalebDeck for your premium campus dining.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/" className="flex-1">
                    <Button variant="primary" className="w-full py-5 rounded-2xl">
                      Done
                    </Button>
                  </Link>
                  <Button variant="secondary" className="flex-1 py-5 rounded-2xl">
                    Share Experience
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}