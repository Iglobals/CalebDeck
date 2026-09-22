import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Store, ArrowRight, ArrowLeft, MessageCircle, Lock, Loader2, TrendingUp, Users, Check, Truck, Sparkles } from 'lucide-react';
import SEO from '../../components/SEO';
import { Logo } from '../../components/design-system/Logo';
import { PaperBagHamburger } from '../../components/design-system/PaperBagHamburger';
import { Link } from 'react-router';

export default function BusinessPage() {
  const { studentTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDark = studentTheme === 'dark';

  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryTag, setCategoryTag] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [plan, setPlan] = useState('Basic Plan (₦2,999/month)');

  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  const ONBOARDING_PHONE = '2348072550635'; // CalebDeck Business onboarding line

  // Persistent vendor login: auto-redirect if already logged in
  useEffect(() => {
    const storedVendor = localStorage.getItem('calebdeck_vendor');
    if (storedVendor) {
      try {
        JSON.parse(storedVendor); // validate JSON
        navigate('/business/dashboard', { replace: true });
      } catch {
        localStorage.removeItem('calebdeck_vendor');
      }
    }
  }, [navigate]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !contactPhone) return;

    const message = `*CalebDeck Business Application*

*Business Name:* ${vendorName}
*Category/Tags:* ${categoryTag || 'Not specified'}
*What we sell:* ${description || 'Not specified'}

*Contact Name:* ${contactName}
*Phone Number:* ${contactPhone}
*Preferred Plan:* ${plan}

I would like to onboard my business to CalebDeck.`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${ONBOARDING_PHONE}?text=${encodedMessage}`, '_blank');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) return;

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const response = await fetch('/api/business/vendor-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Authentication failed');
      }

      // Store in localStorage for persistent login
      localStorage.setItem('calebdeck_vendor', JSON.stringify(result.data.vendor));
      navigate('/business/dashboard');

    } catch (err: any) {
      setAuthError(err.message || 'Invalid access code. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Selecting a plan from the pricing cards pre-fills the apply form and
  // scrolls the user down to it.
  const handleChoosePlan = (planLabel: string) => {
    setPlan(planLabel);
    document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 relative pb-20">
      <SEO 
        title="CalebDeck Business — Campus Vendor Visibility" 
        description="Grow your campus business by reaching every student on CalebDeck. List your products on the Campus Brand section." 
      />

      {/* Navigation */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md z-50 border-b border-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user && (
              <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <Link to="/">
              <Logo size="md" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {!user && (
              <Link to="/" className="text-sm font-bold hover:text-primary transition-colors">
                Back to CalebDeck
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
          List your business on <br className="hidden sm:block" />
          <span className="text-primary">CalebDeck.</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          The subscription-based catalog for independent campus vendors. We showcase your products on the CalebDeck homepage, where students already are.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 text-left max-w-4xl mx-auto mb-16">
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <Users className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-2">Campus Visibility</h3>
            <p className="text-sm text-muted-foreground">Your catalog appears directly on the CalebDeck homepage for all students to see.</p>
          </Card>
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <MessageCircle className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-2">Direct Messaging</h3>
            <p className="text-sm text-muted-foreground">Customers tap "Chat with Vendor" to message your WhatsApp directly with their order.</p>
          </Card>
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <TrendingUp className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-2">Track Referrals</h3>
            <p className="text-sm text-muted-foreground">Your vendor dashboard tracks exactly how many clicks your products get each month.</p>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-4">
          <p className="text-xs font-black tracking-widest text-primary uppercase mb-3">
            CalebDeck Business — Vendor Membership
          </p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Choose your plan
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Put your business in front of the campus community. Let CalebDeck help you sell and deliver.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 lg:gap-8 mt-10">
          {/* Basic Plan */}
          <Card className={`p-6 sm:p-8 rounded-3xl border-2 shadow-sm flex flex-col ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-white border-gray-100'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-black mb-1">Basic</h3>
              <p className="text-sm text-muted-foreground font-medium mb-4">
                Get your business on CalebDeck and start reaching campus customers.
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">₦2,999</span>
                <span className="text-sm text-muted-foreground font-bold">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {[
                'Business profile on CalebDeck Business',
                'Product & service listings',
                'Visibility to the campus community',
                'Receive customer orders through CalebDeck',
                'Manage your incoming orders',
                'CalebDeck vendor support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className={`flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-xl mb-6 ${isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'}`}>
              <Truck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                You manage delivery of your own orders. If your product isn't already available on campus, you're responsible for bringing it to campus for fulfillment.
              </span>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => handleChoosePlan('Basic Plan (₦2,999/month)')}
              className={`w-full font-bold py-4 ${isDark ? 'bg-[#333333] text-white hover:bg-[#444444]' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
            >
              Choose Basic <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>

          {/* Premium Plan */}
          <Card className="p-6 sm:p-8 rounded-3xl border-2 border-primary shadow-lg shadow-primary/10 flex flex-col relative bg-card">
            <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Most support
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-black mb-1">Premium</h3>
              <p className="text-sm text-muted-foreground font-medium mb-4">
                Everything in Basic — plus personalized campus delivery support.
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">₦4,999</span>
                <span className="text-sm text-muted-foreground font-bold">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {[
                'Everything in Basic',
                'Personalized delivery support',
                'Assigned CalebDeck delivery agent',
                'Delivery coordination for your campus orders',
                'Less time spent arranging deliveries',
                'Dedicated support for delivery needs',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-xl mb-6 bg-primary/5">
              <Truck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <span>
                Once your product is available on campus, CalebDeck supports delivery through your assigned delivery agent.
              </span>
            </div>

            <Button
              type="button"
              onClick={() => handleChoosePlan('Premium Plan (₦4,999/month)')}
              className="
              w-full
              font-bold
              py-4
              !bg-gray-200
              !text-gray-900
              border-2
              border-[#FCD34D]
              hover:!bg-[#FCD34D]
              hover:!text-white
              transition-colors
              duration-300
            "
            >
              Choose Premium <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>

        {/* The difference, simply */}
        <div className="grid sm:grid-cols-2 gap-6 mt-10">
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <h4 className="font-black text-sm uppercase tracking-wide text-primary mb-3">The difference, simply</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">Basic</span> — you sell, you manage delivery.
              <br />
              <span className="font-bold text-foreground">Premium</span> — you sell, CalebDeck supports delivery.
            </p>
          </Card>
          <Card className="p-6 border-border bg-card shadow-sm squircle">
            <h4 className="font-black text-sm uppercase tracking-wide text-primary mb-3">Who should choose what</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose <span className="font-bold text-foreground">Basic</span> if you already have a reliable way to fulfill and deliver campus orders.
              <br />
              Choose <span className="font-bold text-foreground">Premium</span> if you want to focus on your business while CalebDeck helps coordinate campus delivery.
            </p>
          </Card>
        </div>

        {/* Campus availability requirement */}
        <div className={`mt-6 p-5 rounded-2xl border text-sm text-muted-foreground leading-relaxed ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-gray-50 border-gray-200'}`}>
          <span className="font-black text-foreground">Campus availability requirement: </span>
          Your products must be available on campus. If they aren't currently, you're responsible for getting them to campus before CalebDeck can fulfill customer orders.
        </div>
      </section>

      {/* Forms Section */}
      <section id="apply-form" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Apply Form */}
          <Card className={`p-6 sm:p-8 sm:rounded-3xl border-2 shadow-lg ${isDark ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Get Started</h2>
                <p className="text-sm text-muted-foreground font-medium">Apply to list your business</p>
              </div>
            </div>

            <form onSubmit={handleApply} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2">Business Name</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  placeholder="e.g. ScentByKels"
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Category Tag</label>
                <input
                  type="text"
                  required
                  value={categoryTag}
                  onChange={e => setCategoryTag(e.target.value)}
                  placeholder="e.g. Perfume, Jewelry, Accessories (No Food/Fashion)"
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">What do you sell?</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of your products..."
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none resize-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">WhatsApp No.</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="080..."
                    className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Select Plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#2A2A2A] focus:border-primary' : 'border-gray-200 bg-gray-50 focus:border-primary/50'}`}
                >
                  <option value="Basic Plan (₦2,999/month)">Basic Plan — ₦2,999/month</option>
                  <option value="Premium Plan (₦4,999/month)">Premium Plan — ₦4,999/month</option>
                </select>
              </div>

              <Button type="submit" variant="primary" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 mt-2 shadow-lg shadow-primary/20">
                Apply via WhatsApp <MessageCircle className="w-5 h-5 ml-2" />
              </Button>
            </form>
          </Card>

          {/* Login Form */}
          <Card className={`p-6 sm:p-8 sm:rounded-3xl border-2 shadow-sm ${isDark ? 'bg-[#222222] border-[#333333]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <Lock className={`w-6 h-6 ${isDark ? 'text-[#FAF9F6]' : 'text-gray-900'}`} />
              </div>
              <div>
                <h2 className="text-2xl font-black">Vendor Access</h2>
                <p className="text-sm text-muted-foreground font-medium">For approved businesses</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2">Access Code</label>
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className={`w-full px-4 py-4 text-center tracking-widest font-mono text-lg rounded-xl border-2 outline-none transition-all ${isDark ? 'border-[#333333] bg-[#1A1A1A] focus:border-primary' : 'border-gray-200 bg-white focus:border-primary/50'}`}
                />
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold text-center">
                  {authError}
                </div>
              )}

              <Button type="submit" variant="secondary" disabled={isAuthenticating || !accessCode} className={`w-full font-bold py-4 ${isDark ? 'bg-[#333333] text-white hover:bg-[#444444]' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}>
                {isAuthenticating ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Authenticating...</>
                ) : (
                  <>Access Dashboard <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                Lost your access code? Contact CalebDeck support to regenerate it.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer tagline */}
      <p className="text-center text-xs text-muted-foreground font-bold tracking-wide mt-16">
        Connecting campus businesses with the campus community.
      </p>
    </div>
  );
}
