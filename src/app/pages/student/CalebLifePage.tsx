import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Gamepad2,
  Receipt,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import { useAuth } from '../../../context/AuthContext';
import { useMartCart } from '../../../context/MartCartContext';
import { requestNotificationPermissionAndSaveToken } from '../../../services/messaging';
import { BRAND_CONFIG, PRODUCTS_CONFIG } from '../../../config/brand';

export default function CalebLifePage() {
  const { user } = useAuth();
  const { items: cartItems } = useMartCart();
  const navigate = useNavigate();
  const posterRef = useRef<HTMLDivElement | null>(null);
  const [spotlight, setSpotlight] = useState({ x: 68, y: 28 });
  const [enablingAlerts, setEnablingAlerts] = useState(false);
  const [alertsSubscribed, setAlertsSubscribed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('calebdeck_caleb_life_alert') === 'true';
  });

  const totalBagItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!posterRef.current) return;
    const rect = posterRef.current.getBoundingClientRect();
    setSpotlight({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
    });
  };

  const handleLaunchAlert = async () => {
    if (!user) {
      window.open(BRAND_CONFIG.socialXUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setEnablingAlerts(true);
    try {
      const res = await requestNotificationPermissionAndSaveToken(user.uid, 'users');
      if (res.success) {
        localStorage.setItem('calebdeck_caleb_life_alert', 'true');
        setAlertsSubscribed(true);
        toast.success("You're on the list! We'll send a push notification when Caleb Life opens.");
      } else if (res.needsInstallToHomeScreen) {
        toast.info(
          "Add CalebDeck to your Home Screen first to receive push alerts, or follow @iglobalstechinc for Caleb Life updates.",
          { autoClose: 7000 }
        );
      } else {
        localStorage.setItem('calebdeck_caleb_life_alert', 'true');
        setAlertsSubscribed(true);
        toast.info('Launch interest saved on this device. Follow @iglobalstechinc for official drops!');
      }
    } catch {
      localStorage.setItem('calebdeck_caleb_life_alert', 'true');
      setAlertsSubscribed(true);
      toast.info('Launch interest saved! Follow @iglobalstechinc for official updates.');
    } finally {
      setEnablingAlerts(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 transition-colors duration-300">
      <SEO
        title="Caleb Life | Upcoming Social Gaming Experience by CalebDeck"
        description="Preview Caleb Life — an upcoming interactive Nigerian social gaming experience currently in development inside the CalebDeck ecosystem."
        canonical="https://calebdeck.com/caleb-life"
        keywords="Caleb Life, CalebDeck game, Nigerian social gaming, Lagos Life inspired game, CalebDeck"
      />

      {/* Native App Top Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/50 px-5 sm:px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-10 h-10 -ml-1.5 rounded-full hover:bg-muted/80 flex items-center justify-center transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[#7C3AED] dark:text-[#FCD34D]" />
            <span
              className="text-base font-black tracking-tight"
              style={{ fontFamily: '"Space Grotesk", Satoshi, sans-serif' }}
            >
              {PRODUCTS_CONFIG.gaming.name}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FCD34D]/25 text-amber-800 dark:bg-[#FCD34D]/15 dark:text-[#FCD34D]">
              Soon
            </span>
          </div>

          {user?.icaSub ? (
            <div className="flex items-center gap-1.5">
              <Link
                to="/my-orders"
                className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                aria-label="My Orders"
              >
                <Receipt className="w-4 h-4" />
              </Link>
              <Link
                to="/cart"
                className="relative w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                aria-label="Shopping Bag"
              >
                <ShoppingBag className="w-4 h-4" />
                {totalBagItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[9px] font-black flex items-center justify-center">
                    {totalBagItems}
                  </span>
                )}
              </Link>
            </div>
          ) : (
            <Link
              to="/fashion"
              className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors"
            >
              Shop Fashion
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 pt-5 space-y-6">
        {/* Hero World Card */}
        <section
          ref={posterRef}
          onMouseMove={handleMouseMove}
          className="relative rounded-[2rem] overflow-hidden bg-[#090612] text-white border border-[#7C3AED]/30 shadow-[0_24px_70px_-18px_rgba(17,12,29,0.65)]"
        >
          {/* Ambient Spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(460px circle at ${spotlight.x}% ${spotlight.y}%, rgba(124,58,237,0.32), rgba(252,211,77,0.10) 45%, transparent 74%)`,
            }}
          />

          {/* Subtle Grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundSize: '36px 36px',
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
            }}
          />

          {/* Top Status Ticker */}
          <div className="relative z-10 border-b border-white/10 bg-white/[0.04] px-5 py-2.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="inline-flex items-center gap-2 text-[#FCD34D]">
              <span className="w-2 h-2 rounded-full bg-[#FCD34D] animate-pulse" />
              Coming Soon
            </span>
            <span className="text-white/60">In Active Development · Not Yet Playable</span>
          </div>

          <div className="relative z-10 p-6 sm:p-9 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C3AED]/25 border border-[#7C3AED]/40 text-[#DDD6FE] text-[11px] font-bold uppercase tracking-[0.16em]">
              <Sparkles className="w-3.5 h-3.5 text-[#FCD34D]" />
              CalebDeck Original Experience
            </div>

            <div className="space-y-3">
              <h1
                className="text-4xl sm:text-6xl font-bold tracking-[-0.04em] leading-[0.96] text-white"
                style={{ fontFamily: '"Space Grotesk", Satoshi, sans-serif', color: '#FFFFFF' }}
              >
                {PRODUCTS_CONFIG.gaming.name}
              </h1>

              <p className="text-base sm:text-xl font-semibold text-white/92 leading-snug">
                {PRODUCTS_CONFIG.gaming.tagline}
              </p>

              <p className="text-xs sm:text-sm text-white/72 leading-relaxed">
                {PRODUCTS_CONFIG.gaming.description}
              </p>
            </div>

            {/* Honest Status Strip */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 mb-1">
                  Current Status
                </p>
                <p className="text-xs sm:text-sm font-black text-[#FCD34D]">In Development</p>
              </div>
              <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 mb-1">
                  Gameplay Access
                </p>
                <p className="text-xs sm:text-sm font-black text-white">Coming Soon</p>
              </div>
            </div>

            {/* Notify / Follow Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                disabled={enablingAlerts}
                onClick={handleLaunchAlert}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all ${
                  alertsSubscribed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                    : 'bg-[#FCD34D] text-[#110C1D] hover:bg-[#FDE047] shadow-[0_14px_34px_-10px_rgba(252,211,77,0.5)]'
                }`}
              >
                {alertsSubscribed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Launch Alert Saved</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>{user ? 'Notify Me When It Drops' : 'Follow Launch Updates'}</span>
                  </>
                )}
              </button>

              <a
                href={BRAND_CONFIG.socialXUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 transition-colors"
              >
                <span>Follow {BRAND_CONFIG.socialXHandle}</span>
                <ArrowUpRight className="w-4 h-4 text-[#FCD34D]" />
              </a>
            </div>
          </div>
        </section>

        {/* What We're Building — 3 Native App Cards */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-black tracking-tight px-1">
            What to Expect
          </h2>

          <div className="grid sm:grid-cols-3 gap-3.5">
            <div className="rounded-3xl bg-card border border-border p-4 sm:p-5 shadow-sm space-y-2">
              <span className="inline-block text-[10px] font-black uppercase tracking-[0.18em] text-[#7C3AED] dark:text-[#FCD34D]">
                01 · Cultural DNA
              </span>
              <h3 className="text-sm font-black leading-snug">
                Inspired by Nigerian Social Life Sims
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Channeling the wit, ambition, and everyday drama popularized by experiences like Lagos Life — crafted with CalebDeck’s own original voice.
              </p>
            </div>

            <div className="rounded-3xl bg-card border border-border p-4 sm:p-5 shadow-sm space-y-2">
              <span className="inline-block text-[10px] font-black uppercase tracking-[0.18em] text-[#7C3AED] dark:text-[#FCD34D]">
                02 · Social Energy
              </span>
              <h3 className="text-sm font-black leading-snug">
                Choices, Status &amp; Community
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Designed around quick, replayable moments you’ll want to compare, screenshot, and share with friends.
              </p>
            </div>

            <div className="rounded-3xl bg-card border border-border p-4 sm:p-5 shadow-sm space-y-2">
              <span className="inline-block text-[10px] font-black uppercase tracking-[0.18em] text-[#7C3AED] dark:text-[#FCD34D]">
                03 · Ecosystem Reach
              </span>
              <h3 className="text-sm font-black leading-snug">
                Fueling Student Brands
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As players gather on CalebDeck, student founders on CalebDeck Business gain even stronger visibility for their products.
              </p>
            </div>
          </div>
        </section>

        {/* Explore What's Live Today */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-black tracking-tight px-1">
            Live on CalebDeck Right Now
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Link
              to={PRODUCTS_CONFIG.fashion.path}
              className="group rounded-3xl bg-card border border-border p-4 flex items-center justify-between gap-3 shadow-sm hover:border-[#7C3AED]/50 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/12 text-[#7C3AED] dark:bg-[#7C3AED]/25 dark:text-[#DDD6FE] flex items-center justify-center shrink-0">
                  <Shirt className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED] dark:text-[#C4B5FD]">
                    Active Store
                  </p>
                  <h3 className="text-sm font-black truncate">{PRODUCTS_CONFIG.fashion.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Weekly drops, apparel &amp; kicks
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>

            <Link
              to={PRODUCTS_CONFIG.business.path}
              className="group rounded-3xl bg-card border border-border p-4 flex items-center justify-between gap-3 shadow-sm hover:border-primary/60 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-amber-800 dark:text-primary flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-primary">
                    Founder Showcase
                  </p>
                  <h3 className="text-sm font-black truncate">{PRODUCTS_CONFIG.business.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Advertise your student brand
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
