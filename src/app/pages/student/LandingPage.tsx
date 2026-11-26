import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Shirt,
  Store,
  Sparkles,
  Compass,
  Wallet,
  Receipt,
  User,
  ShieldCheck,
  Layers,
  Gamepad2,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { Logo } from '../../components/design-system/Logo';
import { Button } from '../../components/design-system/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ThemeToggle } from '../../components/ThemeToggle';
import { PaperBagHamburger } from '../../components/design-system/PaperBagHamburger';
import Footer from '../../components/Footer';
import SEO from '../../components/SEO';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { subscribeToFashionItems } from '../../../services/fashion';
import { subscribeToActiveBusinessProducts, type BusinessProduct } from '../../../services/business';
import { getOptimizedDeliveryUrl } from '../../../services/cloudinary';
import {
  BRAND_CONFIG,
  PRODUCTS_CONFIG,
  HISTORICAL_IMPACT_METRICS,
  VERIFIED_TESTIMONIALS,
  CURATED_FASHION_SHOWCASE_FALLBACK,
  type FashionShowcaseItem,
} from '../../../config/brand';

export default function LandingPage() {
  const { user } = useAuth();
  const { studentTheme, toggleStudentTheme } = useTheme();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [showcaseItems, setShowcaseItems] = useState<FashionShowcaseItem[]>(
    CURATED_FASHION_SHOWCASE_FALLBACK
  );
  const [businessItems, setBusinessItems] = useState<BusinessProduct[]>([]);

  useEffect(() => {
    const unsubFashion = subscribeToFashionItems((fetched) => {
      const inStock = fetched
        .filter((item) => item.inStock && item.imageUrl)
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          name: item.name,
          brand: item.brand || 'CalebDeck Fashion',
          category: item.category || 'Apparel',
          price: Number(item.price) || 0,
          imageUrl: getOptimizedDeliveryUrl(item.imageUrl, 640),
        }));
      if (inStock.length >= 2) {
        setShowcaseItems(inStock);
      }
    });

    const unsubBusiness = subscribeToActiveBusinessProducts((items) => {
      setBusinessItems(items.filter((i) => i.inStock !== false).slice(0, 4));
    });

    return () => {
      unsubFashion();
      unsubBusiness();
    };
  }, []);

  // Support smooth hash scrolling when navigating to /#caleb-life
  useEffect(() => {
    if (window.location.hash === `#${PRODUCTS_CONFIG.gaming.sectionId}`) {
      const el = document.getElementById(PRODUCTS_CONFIG.gaming.sectionId);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' }), 80);
      }
    }
  }, [prefersReducedMotion]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const revealProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      };

  const homepageJsonLd = [
    {
      '@type': 'Organization',
      '@id': `${BRAND_CONFIG.siteUrl}/#calebdeck-brand`,
      name: BRAND_CONFIG.name,
      url: BRAND_CONFIG.siteUrl,
      logo: `${BRAND_CONFIG.siteUrl}/calebdeck-logo.jpeg`,
      parentOrganization: {
        '@type': 'Organization',
        '@id': `${BRAND_CONFIG.parentUrl}/#organization`,
        name: BRAND_CONFIG.parentCompany,
        url: BRAND_CONFIG.parentUrl,
      },
      sameAs: [BRAND_CONFIG.socialXUrl],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: BRAND_CONFIG.supportPhoneE164,
        contactType: 'customer support',
        availableLanguage: 'English',
      },
      description:
        'CalebDeck is an evolving digital brand by IGLOBALS TECHNOLOGY bringing together CalebDeck Fashion, CalebDeck Business for student & independent brands, and the upcoming social gaming experience Caleb Life.',
    },
    {
      '@type': 'WebSite',
      '@id': `${BRAND_CONFIG.siteUrl}/#website`,
      name: BRAND_CONFIG.name,
      url: BRAND_CONFIG.siteUrl,
      description:
        'Discover CalebDeck — shop curated pieces on CalebDeck Fashion, showcase your brand on CalebDeck Business, and preview Caleb Life.',
      publisher: { '@id': `${BRAND_CONFIG.siteUrl}/#calebdeck-brand` },
    },
  ];

  const heroLeadItem = showcaseItems[0] || CURATED_FASHION_SHOWCASE_FALLBACK[0];

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0D0D10] text-[#121212] dark:text-[#FAF9F6] transition-colors duration-300 selection:bg-[#7C3AED]/20">
      <SEO
        title="CalebDeck | Fashion, Business Showcase & Gaming Experiences"
        description="Discover CalebDeck, an evolving digital brand uniting CalebDeck Fashion, CalebDeck Business for student brands, and Caleb Life. Explore what's live today and what we're building next."
        canonical="https://calebdeck.com/"
        keywords="CalebDeck, CalebDeck Fashion, CalebDeck Business, Caleb Life, student brand advertising, CalebDeck digital products, IGLOBALS TECHNOLOGY"
        jsonLd={homepageJsonLd}
      />

      {/* ───────────────────────── NAVIGATION ───────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-black/[0.07] dark:border-white/[0.08] bg-[#FAF9F6]/90 dark:bg-[#0D0D10]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 py-3.5 flex items-center justify-between gap-4">
          <div
            onDoubleClick={() => navigate('/admin/login')}
            className="flex items-center gap-3 shrink-0 cursor-pointer"
          >
            <Logo size="md" />
          </div>

          <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#121212]/75 dark:text-[#FAF9F6]/75">
            <Link
              to={PRODUCTS_CONFIG.fashion.path}
              className="hover:text-[#121212] dark:hover:text-white transition-colors inline-flex items-center gap-1.5 font-semibold text-[#121212] dark:text-[#FAF9F6]"
            >
              {PRODUCTS_CONFIG.fashion.shortName}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            </Link>
            <Link
              to={PRODUCTS_CONFIG.business.path}
              className="hover:text-[#121212] dark:hover:text-white transition-colors inline-flex items-center gap-1.5 font-semibold text-[#121212] dark:text-[#FAF9F6]"
            >
              {PRODUCTS_CONFIG.business.shortName}
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection(PRODUCTS_CONFIG.gaming.sectionId)}
              className="hover:text-[#121212] dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              {PRODUCTS_CONFIG.gaming.name}
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-[#121212]/70 dark:text-[#FAF9F6]/70">
                Soon
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('our-journey')}
              className="hover:text-[#121212] dark:hover:text-white transition-colors"
            >
              Our Journey
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('our-impact')}
              className="hover:text-[#121212] dark:hover:text-white transition-colors"
            >
              Impact
            </button>
            <Link
              to="/support"
              className="hover:text-[#121212] dark:hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-2.5">
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#7C3AED]/40 text-[#7C3AED] dark:text-[#A78BFA] hover:bg-[#7C3AED]/10 transition-colors"
              >
                Admin
              </Link>
            )}
            {user?.role === 'RIDER' && (
              <Link
                to="/rider"
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                Rider
              </Link>
            )}
            {user?.icaSub ? (
              <div className="flex items-center gap-1.5 mr-1">
                <Link
                  to="/wallet"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.09] dark:hover:bg-white/[0.12] transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#7C3AED] dark:text-[#A78BFA]" />
                  Wallet
                </Link>
                <Link
                  to="/my-orders"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.09] dark:hover:bg-white/[0.12] transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Orders
                </Link>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#7C3AED]/12 text-[#7C3AED] dark:text-[#A78BFA] hover:bg-[#7C3AED]/20 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  i-CON
                </Link>
              </div>
            ) : (
              <Link
                to="/my-orders"
                className="text-xs font-semibold px-3 py-1.5 text-[#121212]/70 dark:text-[#FAF9F6]/70 hover:text-[#121212] dark:hover:text-white transition-colors"
              >
                Past Orders
              </Link>
            )}

            <ThemeToggle theme={studentTheme} onToggle={toggleStudentTheme} variant="inline" />

            <Link to={PRODUCTS_CONFIG.fashion.path}>
              <Button
                variant="primary"
                className="px-5 py-2.5 text-xs font-bold rounded-full bg-[#121212] text-[#FAF9F6] dark:bg-[#FAF9F6] dark:text-[#121212] hover:opacity-90 border-none inline-flex items-center gap-1.5"
              >
                Shop Fashion <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle theme={studentTheme} onToggle={toggleStudentTheme} variant="inline" />
            <PaperBagHamburger />
          </div>
        </div>
      </nav>

      {/* ─────────────── SECTION 1: HERO / BRAND INTRODUCTION ─────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-black/[0.07] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            <motion.div
              className="lg:col-span-7 space-y-7"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/[0.04]">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#121212]/80 dark:text-[#FAF9F6]/80">
                  CalebDeck · Chapter II
                </span>
              </div>

              <h1
                className="text-4xl sm:text-6xl xl:text-[4.25rem] font-black tracking-[-0.03em] leading-[1.04]"
                style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
              >
                We’ve built, we’ve grown, and we’re{' '}
                <span
                  className="font-normal italic text-[#7C3AED] dark:text-[#C4B5FD]"
                  style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.08em' }}
                >
                  just getting started.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-[#121212]/72 dark:text-[#FAF9F6]/72 leading-relaxed max-w-2xl">
                CalebDeck is evolving into a broader digital ecosystem. Building on the community trust we earned on campus, we’re uniting curated style on{' '}
                <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                  {PRODUCTS_CONFIG.fashion.name}
                </strong>
                , founder visibility on{' '}
                <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                  {PRODUCTS_CONFIG.business.name}
                </strong>
                , and upcoming social play with{' '}
                <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                  {PRODUCTS_CONFIG.gaming.name}
                </strong>
                .
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2 flex-wrap">
                <Link to={PRODUCTS_CONFIG.fashion.path}>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#121212] text-[#FAF9F6] dark:bg-[#FAF9F6] dark:text-[#121212] hover:opacity-90 border-none font-bold inline-flex items-center justify-center gap-2.5"
                  >
                    Explore {PRODUCTS_CONFIG.fashion.name}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link
                  to={PRODUCTS_CONFIG.business.path}
                  className="w-full sm:w-auto px-7 py-4 rounded-full border border-black/15 dark:border-white/15 hover:border-black/35 dark:hover:border-white/35 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Store className="w-4 h-4 text-[#7C3AED] dark:text-[#A78BFA]" />
                  List Your Brand
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToSection(PRODUCTS_CONFIG.gaming.sectionId)}
                  className="w-full sm:w-auto px-6 py-4 rounded-full text-sm font-semibold text-[#121212]/75 dark:text-[#FAF9F6]/75 hover:text-[#121212] dark:hover:text-white inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Gamepad2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {PRODUCTS_CONFIG.gaming.name}
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-65">
                    Soon
                  </span>
                </button>
              </div>

              {/* Umbrella Architecture Pill Strip */}
              <div className="pt-4 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-[#121212]/60 dark:text-[#FAF9F6]/60 border-t border-black/[0.07] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    <strong className="text-[#121212] dark:text-[#FAF9F6]">
                      {PRODUCTS_CONFIG.fashion.shortName}
                    </strong>{' '}
                    — Live &amp; Shipping
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                  <span>
                    <strong className="text-[#121212] dark:text-[#FAF9F6]">
                      {PRODUCTS_CONFIG.business.shortName}
                    </strong>{' '}
                    — Brand Showcase Live
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>
                    <strong className="text-[#121212] dark:text-[#FAF9F6]">
                      {PRODUCTS_CONFIG.gaming.name}
                    </strong>{' '}
                    — In Development
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Asymmetric Dual-Product Visual Stage */}
            <motion.div
              className="lg:col-span-5 grid grid-cols-12 gap-4 items-stretch"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Active Product Visual: CalebDeck Fashion */}
              <Link
                to={PRODUCTS_CONFIG.fashion.path}
                className="col-span-7 group relative rounded-[1.75rem] overflow-hidden bg-[#ECE8E1] dark:bg-[#19191E] border border-black/[0.08] dark:border-white/10 min-h-[340px] sm:min-h-[400px] flex flex-col justify-between p-5"
              >
                <ImageWithFallback
                  src={heroLeadItem.imageUrl}
                  alt={heroLeadItem.name}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/15" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] bg-white/90 text-[#121212]">
                    Active Now
                  </span>
                  <span className="w-8 h-8 rounded-full bg-white/90 text-[#121212] flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="relative z-10 text-white">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/75 font-semibold mb-1">
                    01 · Apparel &amp; Culture
                  </p>
                  <p
                    className="text-xl sm:text-2xl font-black leading-tight"
                    style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                  >
                    {PRODUCTS_CONFIG.fashion.name}
                  </p>
                  <p className="text-xs text-white/80 mt-1 line-clamp-1">
                    Featured: {heroLeadItem.name}
                  </p>
                </div>
              </Link>

              {/* Upcoming Product Visual: Caleb Life */}
              <button
                type="button"
                onClick={() => scrollToSection(PRODUCTS_CONFIG.gaming.sectionId)}
                className="col-span-5 text-left group relative rounded-[1.75rem] overflow-hidden bg-[#0B1210] border border-emerald-500/25 p-5 flex flex-col justify-between min-h-[340px] sm:min-h-[400px]"
              >
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(16,185,129,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.2) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }}
                />
                <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

                <div className="relative z-10">
                  <span
                    className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                    style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                  >
                    Coming Soon
                  </span>
                </div>

                <div className="relative z-10 my-auto py-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 mb-4">
                    <Compass className="w-5 h-5" />
                  </div>
                  <p
                    className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/80 mb-1"
                    style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                  >
                    02 · Social World
                  </p>
                  <p
                    className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight"
                    style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                  >
                    {PRODUCTS_CONFIG.gaming.name}
                  </p>
                </div>

                <div className="relative z-10 pt-3 border-t border-white/10">
                  <p className="text-[11px] text-emerald-100/70 leading-snug">
                    In development · Not yet playable
                  </p>
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── OUR PRODUCTS (ECOSYSTEM SHOWCASE) ─────────────────────── */}
      <section id="our-products" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-24">
          <motion.div {...revealProps} className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7C3AED] dark:text-[#A78BFA] mb-3">
              The Ecosystem Today &amp; Ahead
            </p>
            <h2
              className="text-3xl sm:text-5xl font-black tracking-[-0.025em] leading-[1.08]"
              style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
            >
              Style, founder visibility, and social play under one roof.
            </h2>
          </motion.div>

          {/* ── PRODUCT A: CALEBDECK FASHION (ACTIVE EDITORIAL LOOKBOOK) ── */}
          <motion.div
            {...revealProps}
            className="border-t border-black/10 dark:border-white/10 pt-12 sm:pt-16"
          >
            <div className="grid lg:grid-cols-12 gap-10 items-end mb-12">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[11px] font-bold uppercase tracking-[0.18em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {PRODUCTS_CONFIG.fashion.statusLabel}
                </div>
                <h3
                  className="text-3xl sm:text-5xl font-black tracking-tight"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                >
                  {PRODUCTS_CONFIG.fashion.name}
                </h3>
                <p className="text-base sm:text-lg text-[#121212]/72 dark:text-[#FAF9F6]/72 leading-relaxed max-w-2xl">
                  {PRODUCTS_CONFIG.fashion.description}
                </p>
              </div>

              <div className="lg:col-span-5 flex lg:justify-end">
                <Link to={PRODUCTS_CONFIG.fashion.path}>
                  <Button
                    variant="primary"
                    size="lg"
                    className="px-8 py-4 rounded-full bg-[#121212] text-[#FAF9F6] dark:bg-[#FAF9F6] dark:text-[#121212] hover:opacity-90 border-none font-bold inline-flex items-center gap-2"
                  >
                    Enter Fashion Store
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Live Editorial Lookbook Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {showcaseItems.map((item, idx) => (
                <Link
                  key={item.id}
                  to={`/fashion/product/${item.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#EAE6DF] dark:bg-[#18181D] border border-black/[0.07] dark:border-white/10 mb-3.5">
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      loading={idx < 2 ? 'eager' : 'lazy'}
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-black/75 text-[#121212] dark:text-white backdrop-blur-sm">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#121212]/55 dark:text-[#FAF9F6]/55 truncate">
                        {item.brand}
                      </p>
                      <h4 className="font-bold text-sm sm:text-base text-[#121212] dark:text-[#FAF9F6] truncate group-hover:underline">
                        {item.name}
                      </h4>
                    </div>
                    <span className="text-sm font-black shrink-0">
                      ₦{item.price.toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ── PRODUCT B: CALEBDECK BUSINESS (STUDENT & EMERGING BRAND SHOWCASE) ── */}
          <motion.div
            {...revealProps}
            id="calebdeck-business"
            className="border-t border-black/10 dark:border-white/10 pt-12 sm:pt-16 space-y-12"
          >
            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C3AED]/12 text-[#7C3AED] dark:text-[#C4B5FD] border border-[#7C3AED]/25 text-[11px] font-bold uppercase tracking-[0.18em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                  {PRODUCTS_CONFIG.business.statusLabel}
                </div>
                <h3
                  className="text-3xl sm:text-5xl font-black tracking-tight"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                >
                  {PRODUCTS_CONFIG.business.name}
                </h3>
                <p className="text-lg sm:text-xl font-medium text-[#121212]/90 dark:text-[#FAF9F6]/90">
                  {PRODUCTS_CONFIG.business.tagline}
                </p>
                <p className="text-base text-[#121212]/70 dark:text-[#FAF9F6]/70 leading-relaxed max-w-2xl">
                  {PRODUCTS_CONFIG.business.description}
                </p>

                <div className="pt-3 flex flex-wrap items-center gap-3.5">
                  <Link to={PRODUCTS_CONFIG.business.path}>
                    <Button
                      variant="primary"
                      size="lg"
                      className="px-7 py-4 rounded-full bg-[#7C3AED] text-white hover:bg-[#6D28D9] border-none font-bold inline-flex items-center gap-2"
                    >
                      <Store className="w-4 h-4" />
                      Showcase Your Brand
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link
                    to={PRODUCTS_CONFIG.business.path}
                    className="px-6 py-4 rounded-full border border-black/15 dark:border-white/15 hover:border-black/35 dark:hover:border-white/35 text-sm font-semibold transition-colors"
                  >
                    Vendor Dashboard Login
                  </Link>
                </div>
              </div>

              {/* Value Proof Strip for Student Advertisers */}
              <div className="lg:col-span-5 rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#15151B] p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-black/[0.07] dark:border-white/10">
                  <img
                    src={PRODUCTS_CONFIG.business.logoUrl}
                    alt={PRODUCTS_CONFIG.business.name}
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#7C3AED] dark:text-[#C4B5FD]">
                      Why Founders List Here
                    </p>
                    <p className="font-bold text-sm sm:text-base">
                      Built for measurable visibility
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-4 h-4 text-[#7C3AED] dark:text-[#C4B5FD] shrink-0 mt-1" />
                    <div>
                      <p className="font-bold">Homepage &amp; Ecosystem Traffic</p>
                      <p className="text-[#121212]/65 dark:text-[#FAF9F6]/65 leading-relaxed">
                        Your products sit right where shoppers and incoming {PRODUCTS_CONFIG.gaming.name} visitors browse — turning platform attention into real discovery.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                    <div>
                      <p className="font-bold">Direct WhatsApp Conversions &amp; Click Analytics</p>
                      <p className="text-[#121212]/65 dark:text-[#FAF9F6]/65 leading-relaxed">
                        Buyers tap straight into your WhatsApp to order while your Vendor Dashboard logs every single product referral click.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Featured Student Brand Products (when active vendors have products) */}
            {businessItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#121212]/55 dark:text-[#FAF9F6]/55">
                    Featured Student &amp; Campus Brands Live Now
                  </p>
                  <Link
                    to={PRODUCTS_CONFIG.business.path}
                    className="text-xs font-bold text-[#7C3AED] dark:text-[#C4B5FD] hover:underline"
                  >
                    Join Featured Vendors →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {businessItems.map((bItem) => (
                    <Link
                      key={bItem.id}
                      to={`/business/product/${bItem.id}`}
                      className="group block rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#15151B] p-3.5 hover:border-[#7C3AED]/40 transition-colors"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-3">
                        <ImageWithFallback
                          src={getOptimizedDeliveryUrl(bItem.imageUrl, 520)}
                          alt={bItem.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur-sm">
                          {bItem.vendorBusinessName || 'Featured Brand'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm truncate group-hover:text-[#7C3AED] dark:group-hover:text-[#C4B5FD] transition-colors">
                        {bItem.name}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-[#121212]/55 dark:text-[#FAF9F6]/55 truncate">
                          {bItem.category || 'Product'}
                        </span>
                        <span className="text-sm font-black">
                          ₦{Number(bItem.price || 0).toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* ── PRODUCT C: CALEB LIFE (DISTINCT GAMING IDENTITY · COMING SOON) ── */}
          <motion.div
            {...revealProps}
            id={PRODUCTS_CONFIG.gaming.sectionId}
            className="scroll-mt-24 relative rounded-[2.25rem] overflow-hidden bg-[#080E0C] text-[#F3F7F5] border border-emerald-500/25 px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20"
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 82% 22%, rgba(16,185,129,0.28), transparent 45%), radial-gradient(circle at 15% 85%, rgba(245,158,11,0.16), transparent 40%)',
              }}
            />

            <div className="relative z-10 grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-emerald-400/15 border border-emerald-400/35 text-emerald-300 text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Coming Soon · In Development
                  </span>
                  <span
                    className="text-xs uppercase tracking-[0.16em] text-white/50 font-medium"
                    style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                  >
                    A CalebDeck Original Experience
                  </span>
                </div>

                <h3
                  className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] leading-[1.02] text-white"
                  style={{ fontFamily: '"Space Grotesk", Satoshi, sans-serif' }}
                >
                  {PRODUCTS_CONFIG.gaming.name}
                </h3>

                <p className="text-lg sm:text-xl text-emerald-100/90 font-medium leading-snug max-w-xl">
                  {PRODUCTS_CONFIG.gaming.tagline}
                </p>

                <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-xl">
                  {PRODUCTS_CONFIG.gaming.description}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-xs sm:text-sm text-white/85">
                    <Layers className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Currently in active concept &amp; world-building — not yet publicly playable.</span>
                  </div>
                </div>
              </div>

              {/* Distinct Gaming Concept Dossier Panel (No fake gameplay screenshots) */}
              <div className="lg:col-span-5">
                <div
                  className="rounded-2xl bg-black/55 border border-emerald-400/25 p-6 sm:p-8 space-y-6 backdrop-blur-sm"
                  style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 font-bold">
                      World Brief // 001
                    </span>
                    <span className="text-[11px] uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
                      Pre-Release
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 mb-1">
                        Creative Inspiration
                      </p>
                      <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                        Rooted in the wit, social dynamics, and everyday ambition captured by Nigerian social gaming culture like Lagos Life — reimagined with its own distinct voice.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
                          Direction
                        </p>
                        <p className="text-sm font-semibold text-emerald-200">
                          Social Gaming
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
                          Availability
                        </p>
                        <p className="text-sm font-semibold text-amber-200">
                          In Development
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/55">
                    <span>CalebDeck Ecosystem</span>
                    <span>Updates via {BRAND_CONFIG.socialXHandle}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────── SECTION 2: OUR JOURNEY / THE STORY ─────────────────── */}
      <section
        id="our-journey"
        className="scroll-mt-20 py-20 sm:py-28 border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121216]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <motion.div {...revealProps} className="lg:col-span-6 space-y-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#121212]/55 dark:text-[#FAF9F6]/55">
                Our Journey · Chapter I to Chapter II
              </p>
              <h2
                className="text-3xl sm:text-5xl font-black tracking-[-0.025em] leading-[1.08]"
                style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
              >
                Built on real experiences.{' '}
                <span
                  className="font-normal italic text-[#7C3AED] dark:text-[#C4B5FD]"
                  style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.08em' }}
                >
                  Moving towards what’s next.
                </span>
              </h2>

              <div className="space-y-4 text-base sm:text-lg text-[#121212]/75 dark:text-[#FAF9F6]/75 leading-relaxed">
                <p>
                  CalebDeck started with a practical question on campus: how could technology save students time every single day? That question grew into a multi-service campus platform spanning cafeteria meal delivery, hostel essentials through CalebDeck Mart, and digital top-ups via CalebNet.
                </p>
                <p>
                  Those early operations were real, fast-moving, and deeply human — coordinating riders, pickup points, batch schedules, and payments for hundreds of orders across campus hostels.
                </p>
                <p>
                  Having concluded our food delivery, Mart, and CalebNet operations, we are carrying that operational discipline and community trust forward into{' '}
                  <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                    {PRODUCTS_CONFIG.fashion.name}
                  </strong>
                  ,{' '}
                  <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                    {PRODUCTS_CONFIG.business.name}
                  </strong>
                  , and{' '}
                  <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                    {PRODUCTS_CONFIG.gaming.name}
                  </strong>
                  .
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/learn-more"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#7C3AED] dark:text-[#C4B5FD] hover:underline"
                >
                  Read the full CalebDeck story <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* Authentic Campus Archival Photography */}
            <motion.div {...revealProps} className="lg:col-span-6 grid grid-cols-12 gap-4 items-end">
              <figure className="col-span-7 space-y-2.5">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-muted">
                  <ImageWithFallback
                    src="/old-cafe-pic.jpeg"
                    alt="Campus cafeteria operations where CalebDeck began"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="text-[11px] text-[#121212]/55 dark:text-[#FAF9F6]/55 uppercase tracking-wider font-medium">
                  Archive 01 · Where campus fulfillment began
                </figcaption>
              </figure>

              <figure className="col-span-5 space-y-2.5">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-muted">
                  <ImageWithFallback
                    src="/new-cafe pic.jpeg"
                    alt="CalebDeck campus hub during Chapter I operations"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="text-[11px] text-[#121212]/55 dark:text-[#FAF9F6]/55 uppercase tracking-wider font-medium">
                  Archive 02 · Campus roots (Concluded)
                </figcaption>
              </figure>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────────────── SECTION 3: OUR IMPACT / BY THE NUMBERS ─────────────────── */}
      <section
        id="our-impact"
        className="scroll-mt-20 py-20 sm:py-28 border-t border-black/[0.08] dark:border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            {...revealProps}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-black/10 dark:border-white/10"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#121212]/55 dark:text-[#FAF9F6]/55 mb-3">
                Historical Milestones · Chapter I
              </p>
              <h2
                className="text-3xl sm:text-5xl font-black tracking-[-0.025em]"
                style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
              >
                Proof that we build for real people.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#121212]/60 dark:text-[#FAF9F6]/60 max-w-md leading-relaxed">
              Verified cumulative milestones achieved across CalebDeck’s historical campus operations prior to our product transition.
            </p>
          </motion.div>

          {/* Editorial Typographic Ledger */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/10 dark:divide-white/10">
            {HISTORICAL_IMPACT_METRICS.map((metric, idx) => (
              <motion.div
                key={metric.label}
                {...revealProps}
                className={`py-12 sm:py-16 ${idx === 0 ? 'md:pr-12 lg:pr-20' : 'md:pl-12 lg:pl-20'}`}
              >
                <p
                  className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-[-0.04em] leading-none text-[#121212] dark:text-[#FAF9F6] mb-4"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                >
                  {metric.value}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">{metric.label}</h3>
                <p className="text-sm sm:text-base text-[#121212]/65 dark:text-[#FAF9F6]/65 max-w-md leading-relaxed">
                  {metric.context}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── SECTION 4: THE PEOPLE WE SERVED ─────────────────── */}
      <section
        id="people-we-served"
        className="py-20 sm:py-28 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#F3F0E8] dark:bg-[#131318]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...revealProps} className="max-w-2xl mb-14 sm:mb-20">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#121212]/55 dark:text-[#FAF9F6]/55 mb-3">
              Community Voices
            </p>
            <h2
              className="text-3xl sm:text-5xl font-black tracking-[-0.025em] leading-[1.08]"
              style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
            >
              The experiences that made it worthwhile.
            </h2>
            <p className="text-base text-[#121212]/70 dark:text-[#FAF9F6]/70 mt-4 leading-relaxed">
              Genuine words from students we served during CalebDeck’s campus delivery chapter — the foundation of trust behind everything we build next.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
            {VERIFIED_TESTIMONIALS.map((item) => (
              <motion.blockquote
                key={item.id}
                {...revealProps}
                className="border-t-2 border-[#121212]/85 dark:border-[#FAF9F6]/80 pt-6 flex flex-col justify-between"
              >
                <p
                  className="text-xl sm:text-2xl leading-snug text-[#121212] dark:text-[#FAF9F6] mb-6"
                  style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.65rem' }}
                >
                  “{item.quote}”
                </p>
                <footer className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.15em]">
                  <div>
                    <span className="font-bold text-[#121212] dark:text-[#FAF9F6]">
                      {item.author}
                    </span>
                    <span className="text-[#121212]/55 dark:text-[#FAF9F6]/55">
                      {' '}
                      · {item.attribution}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#121212]/45 dark:text-[#FAF9F6]/45">
                    {item.eraLabel}
                  </span>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── SECTION 6: THE TRANSITION / WHAT'S NEXT ─────────────────── */}
      <section className="py-24 sm:py-32 border-t border-black/[0.08] dark:border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...revealProps} className="space-y-7">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#7C3AED] dark:text-[#A78BFA]">
              <ShieldCheck className="w-4 h-4" />
              Looking Forward
            </div>

            <h2
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-[-0.03em] leading-[1.06]"
              style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
            >
              The next chapter is already taking shape.
            </h2>

            <p className="text-base sm:text-xl text-[#121212]/72 dark:text-[#FAF9F6]/72 leading-relaxed max-w-2xl mx-auto">
              We’re taking everything we’ve learned from building and serving our community into our next phase. With{' '}
              <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                {PRODUCTS_CONFIG.fashion.name}
              </strong>{' '}
              and{' '}
              <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                {PRODUCTS_CONFIG.business.name}
              </strong>{' '}
              actively serving customers and founders today — and{' '}
              <strong className="font-semibold text-[#121212] dark:text-[#FAF9F6]">
                {PRODUCTS_CONFIG.gaming.name}
              </strong>{' '}
              in development to grow our community even further — we’re excited about what’s ahead.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={PRODUCTS_CONFIG.fashion.path} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto px-9 py-4 rounded-full bg-[#121212] text-[#FAF9F6] dark:bg-[#FAF9F6] dark:text-[#121212] hover:opacity-90 border-none font-bold inline-flex items-center justify-center gap-2"
                >
                  <Shirt className="w-4 h-4" />
                  Shop {PRODUCTS_CONFIG.fashion.name}
                </Button>
              </Link>
              <Link to={PRODUCTS_CONFIG.business.path} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Store className="w-4 h-4" />
                  Explore {PRODUCTS_CONFIG.business.name}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────── SECTION 7: FOOTER ─────────────────────── */}
      <Footer />
    </div>
  );
}
