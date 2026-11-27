import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Receipt,
  User,
} from 'lucide-react';
import { Logo } from '../../components/design-system/Logo';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { ThemeToggle } from '../../components/ThemeToggle';
import { PaperBagHamburger } from '../../components/design-system/PaperBagHamburger';
import { PhoneMockup } from '../../components/showcase/PhoneMockup';
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
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);
  const [quotePaused, setQuotePaused] = useState(false);

  // Subtle scroll-linked parallax for the dual-phone hero stage
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const frontPhoneY = useTransform(heroScroll, [0, 1], [0, prefersReducedMotion ? 0 : -28]);
  const backPhoneY = useTransform(heroScroll, [0, 1], [0, prefersReducedMotion ? 0 : 24]);

  // Interactive spotlight coordinates on the Caleb Life poster
  const calebLifeRef = useRef<HTMLDivElement | null>(null);
  const [spotlight, setSpotlight] = useState({ x: 72, y: 35 });

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
          imageUrl: getOptimizedDeliveryUrl(item.imageUrl, 720),
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

  // Gentle auto-rotation for verified testimonials unless hovered or reduced-motion
  useEffect(() => {
    if (prefersReducedMotion || quotePaused) return;
    const id = window.setInterval(() => {
      setActiveQuoteIdx((prev) => (prev + 1) % VERIFIED_TESTIMONIALS.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, quotePaused]);

  // Smooth hash scroll when landing on /#caleb-life
  useEffect(() => {
    if (window.location.hash === `#${PRODUCTS_CONFIG.gaming.sectionId}`) {
      const el = document.getElementById(PRODUCTS_CONFIG.gaming.sectionId);
      if (el) {
        setTimeout(
          () => el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' }),
          80
        );
      }
    }
  }, [prefersReducedMotion]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const handleCalebLifeMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !calebLifeRef.current) return;
    const rect = calebLifeRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setSpotlight({ x, y });
  };

  const reveal = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-70px' },
          transition: {
            duration: 0.65,
            delay,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          },
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

  const leadFashionItem = showcaseItems[0] || CURATED_FASHION_SHOWCASE_FALLBACK[0];
  const secondaryFashionItems = showcaseItems.slice(1, 4);
  const currentTestimonial = VERIFIED_TESTIMONIALS[activeQuoteIdx] || VERIFIED_TESTIMONIALS[0];

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0813] text-[#110C1D] dark:text-[#FAF8F4] transition-colors duration-300 selection:bg-[#7C3AED] selection:text-white">
      <SEO
        title="CalebDeck | Fashion, Business Showcase & Gaming Experiences"
        description="Discover CalebDeck, an evolving digital brand uniting CalebDeck Fashion, CalebDeck Business for student brands, and Caleb Life. Explore what's live today and what we're building next."
        canonical="https://calebdeck.com/"
        keywords="CalebDeck, CalebDeck Fashion, CalebDeck Business, Caleb Life, student brand advertising, CalebDeck digital products, IGLOBALS TECHNOLOGY"
        jsonLd={homepageJsonLd}
      />

      {/* ───────────────────────── PRECISION HEADER ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#110C1D]/[0.07] dark:border-white/[0.08] bg-[#FAF9F6]/85 dark:bg-[#0B0813]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div
            onDoubleClick={() => navigate('/admin/login')}
            className="flex items-center gap-3 shrink-0 cursor-pointer"
          >
            <Logo size="md" />
          </div>

          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-8 text-[13px] font-semibold tracking-tight text-[#110C1D]/70 dark:text-[#FAF8F4]/70"
          >
            <Link
              to={PRODUCTS_CONFIG.fashion.path}
              className="hover:text-[#7C3AED] dark:hover:text-[#FCD34D] transition-colors text-[#110C1D] dark:text-white"
            >
              Fashion
            </Link>
            <Link
              to={PRODUCTS_CONFIG.business.path}
              className="hover:text-[#7C3AED] dark:hover:text-[#FCD34D] transition-colors text-[#110C1D] dark:text-white"
            >
              Business
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection(PRODUCTS_CONFIG.gaming.sectionId)}
              className="hover:text-[#7C3AED] dark:hover:text-[#FCD34D] transition-colors inline-flex items-center gap-2"
            >
              <span>{PRODUCTS_CONFIG.gaming.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded bg-[#FCD34D]/25 text-[#854D0E] dark:bg-[#FCD34D]/15 dark:text-[#FCD34D]">
                Soon
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('our-journey')}
              className="hover:text-[#110C1D] dark:hover:text-white transition-colors"
            >
              Our Story
            </button>
            <Link
              to="/support"
              className="hover:text-[#110C1D] dark:hover:text-white transition-colors"
            >
              Contact
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-2.5">
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#7C3AED]/40 text-[#7C3AED] dark:text-[#C4B5FD] hover:bg-[#7C3AED]/10 transition-colors"
              >
                Admin
              </Link>
            )}
            {user?.role === 'RIDER' && (
              <Link
                to="/rider"
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#FCD34D]/60 text-amber-700 dark:text-[#FCD34D] hover:bg-[#FCD34D]/10 transition-colors"
              >
                Rider
              </Link>
            )}

            {user?.icaSub ? (
              <div className="flex items-center gap-1.5 mr-1">
                <Link
                  to="/wallet"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#110C1D]/[0.05] dark:bg-white/[0.07] hover:bg-[#110C1D]/[0.1] dark:hover:bg-white/[0.12] transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#7C3AED] dark:text-[#FCD34D]" />
                  Wallet
                </Link>
                <Link
                  to="/my-orders"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#110C1D]/[0.05] dark:bg-white/[0.07] hover:bg-[#110C1D]/[0.1] dark:hover:bg-white/[0.12] transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Orders
                </Link>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[#7C3AED]/12 text-[#7C3AED] dark:bg-[#7C3AED]/25 dark:text-[#DDD6FE] transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  i-CON
                </Link>
              </div>
            ) : (
              <Link
                to="/my-orders"
                className="text-xs font-semibold px-3 py-1.5 text-[#110C1D]/65 dark:text-[#FAF8F4]/65 hover:text-[#110C1D] dark:hover:text-white transition-colors"
              >
                Past Orders
              </Link>
            )}

            <ThemeToggle theme={studentTheme} onToggle={toggleStudentTheme} variant="inline" />

            <Link
              to={PRODUCTS_CONFIG.fashion.path}
              className="group inline-flex items-center gap-2 pl-5 pr-4 py-2.5 rounded-full text-xs font-bold bg-[#110C1D] text-[#FAF9F6] dark:bg-[#FCD34D] dark:text-[#110C1D] shadow-[0_10px_28px_-8px_rgba(17,12,29,0.45)] hover:bg-[#7C3AED] hover:text-white dark:hover:bg-[#FDE047] transition-all"
            >
              <span>Shop Fashion</span>
              <span className="w-5 h-5 rounded-full bg-[#FCD34D] text-[#110C1D] dark:bg-[#110C1D] dark:text-[#FCD34D] flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle theme={studentTheme} onToggle={toggleStudentTheme} variant="inline" />
            <PaperBagHamburger />
          </div>
        </div>
      </header>

      {/* ─────────────── SECTION 1: SPATIAL MULTI-PLANE HERO ─────────────── */}
      <section ref={heroRef} className="relative overflow-hidden cd-architectural-grid pt-10 sm:pt-16 pb-16 sm:pb-24">
        {/* Restrained Brand Wash (Top-Right Violet + Warm Gold corner wash — never muddy) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-[-8%] w-[540px] h-[540px] rounded-full opacity-45 dark:opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(124,58,237,0.26) 0%, rgba(252,211,77,0.16) 52%, transparent 74%)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Copy Column */}
            <motion.div
              className="lg:col-span-6 xl:col-span-6 space-y-7"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#7C3AED] dark:text-[#FCD34D]">
                <span className="inline-block w-8 h-[2px] bg-[#7C3AED] dark:bg-[#FCD34D]" />
                <span>CalebDeck Evolution</span>
              </div>

              <h1
                className="text-[2.65rem] sm:text-6xl xl:text-[4.35rem] font-black tracking-[-0.035em] leading-[1.01] text-[#110C1D] dark:text-white"
                style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
              >
                We’ve built, we’ve grown, and we’re{' '}
                <span className="relative inline-block whitespace-nowrap">
                  <span
                    className="relative z-10 font-normal italic text-[#7C3AED] dark:text-[#FCD34D]"
                    style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.1em' }}
                  >
                    just getting started.
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-1 sm:bottom-1.5 h-2.5 sm:h-3 bg-[#FCD34D]/45 dark:bg-[#7C3AED]/45 -rotate-1 rounded-sm"
                  />
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#110C1D]/72 dark:text-[#FAF8F4]/72 leading-[1.68] max-w-xl">
                From serving over a thousand students on campus to building consumer products with real cultural pull — CalebDeck now brings together{' '}
                <strong className="font-bold text-[#110C1D] dark:text-white">
                  {PRODUCTS_CONFIG.fashion.name}
                </strong>
                , founder brand visibility on{' '}
                <strong className="font-bold text-[#110C1D] dark:text-white">
                  {PRODUCTS_CONFIG.business.name}
                </strong>
                , and our upcoming social game{' '}
                <strong className="font-bold text-[#110C1D] dark:text-white">
                  {PRODUCTS_CONFIG.gaming.name}
                </strong>
                .
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                <Link
                  to={PRODUCTS_CONFIG.fashion.path}
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-sm bg-[#7C3AED] text-white shadow-[0_18px_40px_-10px_rgba(124,58,237,0.55)] hover:bg-[#6D28D9] transition-all"
                >
                  <span>Explore CalebDeck Fashion</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to={PRODUCTS_CONFIG.business.path}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full font-bold text-sm bg-white dark:bg-[#171226] text-[#110C1D] dark:text-white border border-[#110C1D]/12 dark:border-white/15 shadow-sm hover:border-[#7C3AED] dark:hover:border-[#FCD34D] transition-colors"
                >
                  <span>List Your Brand</span>
                  <ArrowUpRight className="w-4 h-4 text-[#7C3AED] dark:text-[#FCD34D]" />
                </Link>
              </div>
            </motion.div>

            {/* Right Dual-Phone Hardware Stage */}
            <div className="lg:col-span-6 xl:col-span-6 relative pt-2 pb-4 sm:py-6">
              <div className="relative mx-auto max-w-[360px] sm:max-w-[500px] lg:max-w-none h-[385px] sm:h-[510px] flex items-center justify-center">
                {/* Ambient Brand Plinth Behind Devices */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-3 sm:inset-x-6 bottom-3 sm:bottom-4 h-52 sm:h-64 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-[#7C3AED]/15 via-[#FCD34D]/20 to-[#110C1D]/5 dark:from-[#7C3AED]/25 dark:via-[#19122B] dark:to-[#FCD34D]/10 border border-[#7C3AED]/15 dark:border-white/10"
                />

                {/* Rear Phone: CalebDeck Business / Campus Brand Screen */}
                <motion.div
                  style={{ y: backPhoneY }}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, x: 24, rotate: 6 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, rotate: 6 }}
                  transition={{ duration: 0.75, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  className="w-[172px] sm:w-[248px] translate-x-12 sm:translate-x-24 -translate-y-2 sm:-translate-y-4 z-10 hover:rotate-2 transition-transform duration-500"
                >
                  <PhoneMockup
                    src="/showcase/business-app-screen.jpg"
                    alt="CalebDeck Business spotlight featuring student brand Isi's Collection"
                    accent="gold"
                    priority
                  />
                </motion.div>

                {/* Front Phone: CalebDeck Fashion Store Screen */}
                <motion.div
                  style={{ y: frontPhoneY }}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, x: -24, rotate: -4 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, rotate: -4 }}
                  transition={{ duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-1 sm:left-8 top-6 sm:top-6 w-[182px] sm:w-[260px] z-20 hover:rotate-0 transition-transform duration-500"
                >
                  <PhoneMockup
                    src="/showcase/fashion-app-screen.jpg"
                    alt="CalebDeck Fashion mobile shopping experience with weekly batch drops"
                    accent="violet"
                    priority
                  />
                </motion.div>

                {/* Tactile Floating Callout 1: Weekly Drops (Visible on Mobile & Desktop) */}
                <motion.div
                  initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.92 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.32 }}
                  className="flex items-center gap-2 sm:gap-3 absolute left-0 sm:-left-3 bottom-1.5 sm:bottom-8 z-30 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-[#110C1D] text-white shadow-[0_20px_45px_-10px_rgba(17,12,29,0.55)] border border-white/15"
                >
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#FCD34D] ring-4 ring-[#FCD34D]/20 shrink-0" />
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-[#FCD34D] leading-tight">
                      Live Storefront
                    </p>
                    <p className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                      Weekly Curated Fashion Drops
                    </p>
                  </div>
                </motion.div>

                {/* Tactile Floating Callout 2: Student Brand Reach (Visible on Mobile & Desktop) */}
                <motion.div
                  initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.92 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.42 }}
                  className="flex items-center gap-2 sm:gap-3 absolute right-0 sm:-right-2 top-0 sm:top-3 z-30 rounded-xl sm:rounded-2xl px-2.5 py-2 sm:px-4 sm:py-3 bg-white/95 dark:bg-[#1A142B]/95 backdrop-blur-md text-[#110C1D] dark:text-white shadow-[0_20px_45px_-12px_rgba(124,58,237,0.28)] border border-[#7C3AED]/25"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#7C3AED] text-white font-black text-[10px] sm:text-xs flex items-center justify-center shrink-0">
                    AD
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C3AED] dark:text-[#FCD34D] leading-tight">
                      CalebDeck Business
                    </p>
                    <p className="text-[11px] sm:text-xs font-bold leading-tight">
                      Homepage Student Brand Slots
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* ── OVERLAPPING ROYAL-OBSIDIAN ECOSYSTEM COMMAND BAR ── */}
          <motion.div
            {...reveal(0.1)}
            className="mt-6 lg:mt-4 relative z-30 rounded-[2rem] bg-[#110C1D] dark:bg-[#151024] text-white p-6 sm:p-8 lg:px-10 lg:py-8 shadow-[0_28px_70px_-15px_rgba(17,12,29,0.45)] border border-white/10 overflow-hidden"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#7C3AED]/30 blur-3xl"
            />

            <div className="relative z-10 grid md:grid-cols-3 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Pillar 01 */}
              <Link
                to={PRODUCTS_CONFIG.fashion.path}
                className="group pt-2 md:pt-0 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#FCD34D]">
                    01 / Active Store
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-white/45 group-hover:text-[#FCD34D] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div>
                  <h2
                    className="text-xl font-black tracking-tight text-white"
                    style={{ fontFamily: 'Satoshi, Inter, sans-serif', color: '#FFFFFF' }}
                  >
                    {PRODUCTS_CONFIG.fashion.name}
                  </h2>
                  <p className="text-xs text-white/65 mt-1 leading-relaxed">
                    Streetwear, footwear &amp; accessories delivered in structured weekly drops.
                  </p>
                </div>
              </Link>

              {/* Pillar 02 */}
              <Link
                to={PRODUCTS_CONFIG.business.path}
                className="group pt-5 md:pt-0 md:pl-8 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#C4B5FD]">
                    02 / Active Platform
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-white/45 group-hover:text-[#C4B5FD] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div>
                  <h2
                    className="text-xl font-black tracking-tight text-white"
                    style={{ fontFamily: 'Satoshi, Inter, sans-serif', color: '#FFFFFF' }}
                  >
                    {PRODUCTS_CONFIG.business.name}
                  </h2>
                  <p className="text-xs text-white/65 mt-1 leading-relaxed">
                    Put student products in front of real site traffic with tracked WhatsApp leads.
                  </p>
                </div>
              </Link>

              {/* Pillar 03 */}
              <button
                type="button"
                onClick={() => scrollToSection(PRODUCTS_CONFIG.gaming.sectionId)}
                className="group pt-5 md:pt-0 md:pl-8 text-left flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className="text-[11px] font-bold tracking-[0.2em] uppercase text-emerald-300"
                    style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                  >
                    03 / In Development
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/80">
                    Coming Soon
                  </span>
                </div>
                <div>
                  <h2
                    className="text-xl font-bold tracking-tight text-white"
                    style={{ fontFamily: '"Space Grotesk", Satoshi, sans-serif', color: '#FFFFFF' }}
                  >
                    {PRODUCTS_CONFIG.gaming.name}
                  </h2>
                  <p className="text-xs text-white/65 mt-1 leading-relaxed">
                    An upcoming Nigerian social gaming world built to bring massive community energy.
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── SECTIONS 2, 3 & 4: EDITORIAL BENTO — IMPACT, JOURNEY & VOICES ───────── */}
      <section id="our-journey" className="scroll-mt-20 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          {/* 4-Column Architectural Proof Strip (2x2 Bento Mosaic on Mobile, 4-Col on Desktop) */}
          <motion.div
            id="our-impact"
            {...reveal()}
            className="scroll-mt-24 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {HISTORICAL_IMPACT_METRICS.map((metric, idx) => (
              <div
                key={metric.label}
                className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between border ${
                  idx === 0
                    ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                    : 'bg-[#110C1D] text-white border-[#110C1D] dark:bg-[#171228] dark:border-white/10'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3 sm:mb-4">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-white/80">
                    Chapter I
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-[#FCD34D] text-[#110C1D]">
                    Verified
                  </span>
                </div>
                <div>
                  <p
                    className="text-3xl sm:text-5xl font-black tracking-[-0.04em] leading-none text-white mb-1.5 sm:mb-2"
                    style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                  >
                    {metric.value}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-white">{metric.label}</p>
                  <p className="hidden sm:block text-xs text-white/75 mt-1.5 leading-relaxed">{metric.context}</p>
                </div>
              </div>
            ))}

            <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between bg-white dark:bg-[#141022] border border-[#110C1D]/[0.08] dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3 sm:mb-4">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-[#110C1D]/55 dark:text-white/55">
                  Storefront
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#7C3AED]/12 text-[#7C3AED] dark:text-[#C4B5FD]">
                  Live
                </span>
              </div>
              <div>
                <p
                  className="text-3xl sm:text-5xl font-black tracking-[-0.04em] leading-none text-[#110C1D] dark:text-white mb-1.5 sm:mb-2"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                >
                  100+
                </p>
                <p className="text-xs sm:text-sm font-bold">Curated Pieces</p>
                <p className="hidden sm:block text-xs text-[#110C1D]/65 dark:text-white/60 mt-1.5 leading-relaxed">
                  Streetwear, footwear, headwear, and bags live on CalebDeck Fashion today.
                </p>
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between bg-[#FCD34D] text-[#110C1D] border border-[#F59E0B]/30">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3 sm:mb-4">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] text-[#110C1D]/70">
                  Business
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-[#110C1D] text-[#FCD34D]">
                  Live Ads
                </span>
              </div>
              <div>
                <p
                  className="text-3xl sm:text-5xl font-black tracking-[-0.04em] leading-none text-[#110C1D] mb-1.5 sm:mb-2"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                >
                  1-Tap
                </p>
                <p className="text-xs sm:text-sm font-black text-[#110C1D]">Brand Discovery</p>
                <p className="hidden sm:block text-xs text-[#110C1D]/80 mt-1.5 leading-relaxed">
                  Student vendors get homepage visibility, click tracking, and direct WhatsApp buyers.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Asymmetric 3-Block Story & Voices Bento */}
          <div className="grid lg:grid-cols-12 gap-5 items-stretch">
            {/* Block 1: The CalebDeck Story (Dark Obsidian Editorial Tile) */}
            <motion.div
              {...reveal(0.05)}
              className="lg:col-span-4 rounded-[2rem] bg-[#110C1D] dark:bg-[#151024] text-white p-7 sm:p-9 flex flex-col justify-between border border-white/10"
            >
              <div className="space-y-4 sm:space-y-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FCD34D]">
                  Our Story
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-black tracking-tight leading-[1.12] text-white"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif', color: '#FFFFFF' }}
                >
                  Built on real experiences.{' '}
                  <span
                    className="font-normal italic text-[#FCD34D]"
                    style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.12em' }}
                  >
                    Moving towards what’s next.
                  </span>
                </h2>
                <p className="text-sm text-white/82 leading-relaxed">
                  CalebDeck began on campus solving everyday student logistics — running cafeteria food delivery, CalebDeck Mart, and CalebNet data top-ups across hostels.
                </p>
                <p className="text-sm text-white/82 leading-relaxed">
                  Having concluded those Chapter I services, we are pouring every lesson in trust, payments, and execution into products built for far bigger reach.
                </p>
              </div>

              <div className="pt-8 mt-6 border-t border-white/10">
                <Link
                  to="/learn-more"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#FCD34D] hover:underline"
                >
                  Read Full Journey <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Block 2: Documentary Campus Roots (Warm Alabaster Split Photo Tile) */}
            <motion.div
              {...reveal(0.1)}
              className="lg:col-span-4 rounded-[2rem] bg-[#EFECE4] dark:bg-[#171324] p-6 sm:p-7 flex flex-col justify-between border border-[#110C1D]/[0.07] dark:border-white/10"
            >
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-black/10">
                  <ImageWithFallback
                    src="/old-cafe-pic.jpeg"
                    alt="Campus cafeteria origins during CalebDeck Chapter I"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-black/10 translate-y-3">
                  <ImageWithFallback
                    src="/new-cafe pic.jpeg"
                    alt="Campus fulfillment roots during CalebDeck Chapter I"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7C3AED] dark:text-[#FCD34D] mb-1.5">
                  Chapter I Archive · Concluded Operations
                </p>
                <h3
                  className="text-lg sm:text-xl font-black tracking-tight"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
                >
                  Where we earned our stripes.
                </h3>
                <p className="text-xs sm:text-sm text-[#110C1D]/68 dark:text-white/65 mt-1 leading-relaxed">
                  Real riders, real pickup points, and hundreds of campus batches laid the groundwork for our digital ecosystem today.
                </p>
              </div>
            </motion.div>

            {/* Block 3: The People We Served (Interactive Editorial Quote Stage) */}
            <motion.div
              id="people-we-served"
              {...reveal(0.15)}
              onMouseEnter={() => setQuotePaused(true)}
              onMouseLeave={() => setQuotePaused(false)}
              className="lg:col-span-4 rounded-[2rem] bg-white dark:bg-[#141022] p-7 sm:p-8 flex flex-col justify-between border border-[#110C1D]/[0.08] dark:border-white/10 shadow-[0_20px_50px_-20px_rgba(17,12,29,0.12)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7C3AED] dark:text-[#C4B5FD]">
                  The People We Served
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuoteIdx(
                        (prev) =>
                          (prev - 1 + VERIFIED_TESTIMONIALS.length) % VERIFIED_TESTIMONIALS.length
                      )
                    }
                    aria-label="Previous student quote"
                    className="w-8 h-8 rounded-full border border-[#110C1D]/12 dark:border-white/15 flex items-center justify-center hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuoteIdx((prev) => (prev + 1) % VERIFIED_TESTIMONIALS.length)
                    }
                    aria-label="Next student quote"
                    className="w-8 h-8 rounded-full border border-[#110C1D]/12 dark:border-white/15 flex items-center justify-center hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="my-6 min-h-[150px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.blockquote
                    key={currentTestimonial.id}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p
                      className="text-2xl sm:text-[1.7rem] leading-[1.22] text-[#110C1D] dark:text-white"
                      style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
                    >
                      “{currentTestimonial.quote}”
                    </p>
                  </motion.blockquote>
                </AnimatePresence>
              </div>

              <div className="pt-4 border-t border-[#110C1D]/[0.08] dark:border-white/10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#110C1D] dark:text-white">
                    {currentTestimonial.author}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#110C1D]/55 dark:text-white/55">
                    {currentTestimonial.attribution} · {currentTestimonial.eraLabel}
                  </p>
                </div>

                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {VERIFIED_TESTIMONIALS.map((t, i) => (
                    <span
                      key={t.id}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeQuoteIdx
                          ? 'w-5 bg-[#7C3AED] dark:bg-[#FCD34D]'
                          : 'w-1.5 bg-[#110C1D]/20 dark:bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────────── SECTION 5A: 01 / CALEBDECK FASHION (RUNWAY + LOOKBOOK) ─────────────── */}
      <section id="our-products" className="py-16 sm:py-24 border-t border-[#110C1D]/[0.07] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            {...reveal()}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12"
          >
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7C3AED] dark:text-[#FCD34D]">
                01 / Active Product
              </p>
              <h2
                className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-[-0.03em] leading-[1.03]"
                style={{ fontFamily: 'Satoshi, Inter, sans-serif' }}
              >
                {PRODUCTS_CONFIG.fashion.name}
              </h2>
              <p className="text-base sm:text-lg text-[#110C1D]/70 dark:text-white/70 leading-relaxed">
                {PRODUCTS_CONFIG.fashion.description}
              </p>
            </div>

            <Link
              to={PRODUCTS_CONFIG.fashion.path}
              className="group self-start lg:self-auto inline-flex items-center gap-3 px-7 py-4 rounded-full font-bold text-sm bg-[#110C1D] text-white dark:bg-white dark:text-[#110C1D] hover:bg-[#7C3AED] dark:hover:bg-[#FCD34D] transition-colors shrink-0"
            >
              <span>Shop Full Collection</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Asymmetric Lookbook Grid: 1 Monumental Feature + 3 Editorial Cards */}
          <div className="grid lg:grid-cols-12 gap-6 items-stretch">
            {/* Lead Lookbook Feature */}
            <motion.div {...reveal(0.05)} className="lg:col-span-5">
              <Link
                to={`/fashion/product/${leadFashionItem.id}`}
                className="group relative block h-full min-h-[420px] sm:min-h-[520px] rounded-[2rem] overflow-hidden bg-[#191528] border border-[#110C1D]/10 dark:border-white/10"
              >
                <ImageWithFallback
                  src={leadFashionItem.imageUrl}
                  alt={leadFashionItem.name}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0917]/90 via-[#0D0917]/20 to-transparent" />

                <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.16em] bg-[#FCD34D] text-[#110C1D]">
                    Featured Drop · {leadFashionItem.category}
                  </span>
                  <span className="w-10 h-10 rounded-full bg-white/95 text-[#110C1D] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="absolute bottom-6 left-6 right-6 text-white flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FCD34D] mb-1">
                      {leadFashionItem.brand}
                    </p>
                    <h3
                      className="text-2xl sm:text-3xl font-black leading-tight truncate text-white"
                      style={{ fontFamily: 'Satoshi, Inter, sans-serif', color: '#FFFFFF' }}
                    >
                      {leadFashionItem.name}
                    </h3>
                  </div>
                  <span className="px-4 py-2 rounded-full text-sm font-black bg-white text-[#110C1D] shrink-0">
                    ₦{leadFashionItem.price.toLocaleString()}
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Right 7 Columns: Horizontal Swipe Rail on Mobile, 3-Col Grid on Desktop + Live Batch Strip */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-6">
              <div className="flex sm:grid sm:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
                {secondaryFashionItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    {...reveal(0.08 + idx * 0.05)}
                    className="min-w-[66vw] max-w-[250px] sm:min-w-0 sm:max-w-none shrink-0 snap-start"
                  >
                    <Link to={`/fashion/product/${item.id}`} className="group block">
                      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#EAE6DF] dark:bg-[#171226] border border-[#110C1D]/[0.08] dark:border-white/10 mb-3">
                        <ImageWithFallback
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#110C1D]/80 text-white backdrop-blur-sm">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED] dark:text-[#C4B5FD] truncate">
                        {item.brand}
                      </p>
                      <h4 className="font-bold text-sm text-[#110C1D] dark:text-white truncate group-hover:underline mt-0.5">
                        {item.name}
                      </h4>
                      <p className="text-sm font-black mt-1">₦{item.price.toLocaleString()}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Tactile Batch & Wallet Bar */}
              <motion.div
                {...reveal(0.18)}
                className="rounded-3xl p-6 sm:p-7 bg-[#F3EFE6] dark:bg-[#151024] border border-[#110C1D]/[0.07] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7C3AED] dark:text-[#FCD34D]">
                    Structured Weekly Fulfillment
                  </p>
                  <p className="text-base sm:text-lg font-black text-[#110C1D] dark:text-white">
                    Pay seamlessly via Card, Transfer, or your i-CON Wallet.
                  </p>
                  <p className="text-xs sm:text-sm text-[#110C1D]/65 dark:text-white/65">
                    Every piece is consolidated into tracked weekly drops for reliable campus &amp; Lagos delivery.
                  </p>
                </div>

                <Link
                  to={PRODUCTS_CONFIG.fashion.path}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors shrink-0"
                >
                  Browse All Drops <ArrowUpRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── SECTION 5B: 02 / CALEBDECK BUSINESS (FOUNDER VISIBILITY STAGE) ─────────── */}
      <section id="calebdeck-business" className="py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            {...reveal()}
            className="relative rounded-[2.25rem] sm:rounded-[2.5rem] overflow-hidden bg-[#120C22] text-white border border-[#7C3AED]/30 px-5 pt-9 pb-0 sm:px-12 sm:pt-14 sm:pb-0 lg:px-16 lg:py-20 shadow-[0_32px_90px_-20px_rgba(24,12,56,0.55)]"
          >
            {/* Brand Dual-Tone Aura */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-28 left-1/3 w-[480px] h-[480px] rounded-full bg-[#7C3AED]/25 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 right-10 w-[380px] h-[380px] rounded-full bg-[#FCD34D]/15 blur-3xl"
            />

            <div className="relative z-10 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Pitch & Flywheel */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#FCD34D]">
                  02 / Active Founder Platform · {PRODUCTS_CONFIG.business.name}
                </p>

                <h2
                  className="text-[2rem] sm:text-5xl font-black tracking-[-0.03em] leading-[1.06] text-white"
                  style={{ fontFamily: 'Satoshi, Inter, sans-serif', color: '#FFFFFF' }}
                >
                  Put your student brand right where the{' '}
                  <span
                    className="font-normal italic text-[#FCD34D]"
                    style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.1em' }}
                  >
                    crowd already gathers.
                  </span>
                </h2>

                <p className="text-sm sm:text-lg text-white/82 leading-relaxed max-w-xl">
                  Great student products shouldn’t get buried in group chats. As shoppers visit{' '}
                  <strong className="text-white">{PRODUCTS_CONFIG.fashion.name}</strong> today and players arrive for{' '}
                  <strong className="text-white">{PRODUCTS_CONFIG.gaming.name}</strong> tomorrow,{' '}
                  <strong className="text-[#FCD34D]">{PRODUCTS_CONFIG.business.name}</strong> places your catalog directly in front of high-attention traffic.
                </p>

                {/* 3 Crisp Founder Proof Pillars: Horizontal Swipe Strip on Mobile, 3-Col Grid on Desktop */}
                <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 pt-1 sm:pt-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-5 px-5 sm:mx-0 sm:px-0 pb-1 sm:pb-0 hide-scrollbar">
                  <div className="min-w-[210px] sm:min-w-0 shrink-0 snap-start rounded-2xl bg-white/[0.06] border border-white/12 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-[#FCD34D] mb-1">
                      Prime Placement
                    </p>
                    <p className="text-xs text-white/75 leading-relaxed">
                      Featured directly on CalebDeck where real campus &amp; youth traffic lands.
                    </p>
                  </div>
                  <div className="min-w-[210px] sm:min-w-0 shrink-0 snap-start rounded-2xl bg-white/[0.06] border border-white/12 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-[#C4B5FD] mb-1">
                      Click Analytics
                    </p>
                    <p className="text-xs text-white/75 leading-relaxed">
                      Your Vendor Dashboard counts every product tap so you see real ROI.
                    </p>
                  </div>
                  <div className="min-w-[210px] sm:min-w-0 shrink-0 snap-start rounded-2xl bg-white/[0.06] border border-white/12 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-300 mb-1">
                      Direct WhatsApp
                    </p>
                    <p className="text-xs text-white/75 leading-relaxed">
                      Customers tap straight into your WhatsApp chat ready to buy.
                    </p>
                  </div>
                </div>

                <div className="pt-2 sm:pt-3 flex flex-row flex-wrap items-center gap-3 sm:gap-4">
                  <Link
                    to={PRODUCTS_CONFIG.business.path}
                    className="group flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 sm:py-4 rounded-full font-black text-xs sm:text-sm bg-[#FCD34D] text-[#110C1D] hover:bg-[#FDE047] shadow-[0_16px_40px_-10px_rgba(252,211,77,0.45)] transition-all whitespace-nowrap"
                  >
                    <span>Showcase Your Brand</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to={PRODUCTS_CONFIG.business.path}
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-full text-xs sm:text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    Vendor Login
                  </Link>
                </div>
              </div>

              {/* Right Real Campus Brand Mockup — Docked Stage Crop on Mobile, Full Frame on Desktop */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-[240px] sm:w-[275px] lg:w-[285px] max-h-[310px] sm:max-h-[370px] lg:max-h-none overflow-hidden lg:overflow-visible pt-1 lg:pt-0">
                  <PhoneMockup
                    src="/showcase/business-app-screen.jpg"
                    alt="CalebDeck Business live vendor spotlight card for Isi's Collection"
                    accent="gold"
                  />
                </div>
              </div>
            </div>

            {/* Live Active Vendor Products Strip (automatically renders when vendors have active items) */}
            {businessItems.length > 0 && (
              <div className="relative z-10 mt-8 lg:mt-14 pt-8 pb-10 lg:pb-0 lg:pt-10 border-t border-white/10 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FCD34D]">
                    Live Student Brands on CalebDeck Right Now
                  </p>
                  <Link
                    to={PRODUCTS_CONFIG.business.path}
                    className="text-xs font-bold text-white/80 hover:text-[#FCD34D] transition-colors"
                  >
                    Get Listed →
                  </Link>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  {businessItems.map((bItem) => (
                    <Link
                      key={bItem.id}
                      to={`/business/product/${bItem.id}`}
                      className="group rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 p-3 sm:p-3.5 transition-colors"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/30 mb-3">
                        <ImageWithFallback
                          src={getOptimizedDeliveryUrl(bItem.imageUrl, 520)}
                          alt={bItem.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#110C1D]/85 text-[#FCD34D] max-w-[85%] truncate">
                          {bItem.vendorBusinessName || 'Featured Brand'}
                        </span>
                      </div>
                      <h3
                        className="font-bold text-xs sm:text-sm text-white truncate"
                        style={{ color: '#FFFFFF' }}
                      >
                        {bItem.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-white/55 truncate">
                          {bItem.category || 'Catalog'}
                        </span>
                        <span className="text-sm font-black text-[#FCD34D]">
                          ₦{Number(bItem.price || 0).toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─────────── SECTION 5C: 03 / CALEB LIFE (KINETIC CULTURAL GAMING WORLD) ─────────── */}
      <section
        id={PRODUCTS_CONFIG.gaming.sectionId}
        className="scroll-mt-20 py-14 sm:py-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            ref={calebLifeRef}
            onMouseMove={handleCalebLifeMouseMove}
            {...reveal()}
            className="relative rounded-[2.5rem] overflow-hidden bg-[#08060F] text-white border border-white/12 shadow-[0_32px_90px_-20px_rgba(0,0,0,0.7)]"
          >
            {/* Interactive Mouse-Tracking Spotlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-opacity duration-500"
              style={{
                background: `radial-gradient(620px circle at ${spotlight.x}% ${spotlight.y}%, rgba(124,58,237,0.24), rgba(252,211,77,0.08) 42%, transparent 72%)`,
              }}
            />

            {/* Architectural Coordinate Grid */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundSize: '44px 44px',
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
              }}
            />

            {/* Top Kinetic Ticker */}
            <div className="relative z-10 border-b border-white/10 bg-white/[0.03] py-3 overflow-hidden">
              <div
                className="cd-marquee-track text-[11px] font-bold uppercase tracking-[0.26em] text-white/60"
                style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
              >
                {[0, 1].map((dup) => (
                  <div key={dup} className="flex items-center gap-8 pr-8">
                    <span className="text-[#FCD34D]">{PRODUCTS_CONFIG.gaming.name}</span>
                    <span>//</span>
                    <span>COMING SOON · IN ACTIVE DEVELOPMENT</span>
                    <span>//</span>
                    <span>SOCIAL GAMING EXPERIENCE</span>
                    <span>//</span>
                    <span>NOT YET PLAYABLE</span>
                    <span>//</span>
                    <span className="text-[#C4B5FD]">CALEBDECK ORIGINAL</span>
                    <span>//</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 px-6 py-14 sm:px-12 sm:py-20 lg:px-16 lg:py-24 grid lg:grid-cols-12 gap-12 items-end">
              <div className="lg:col-span-7 space-y-6">
                <p
                  className="text-xs font-bold uppercase tracking-[0.26em] text-[#FCD34D]"
                  style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                >
                  03 / Upcoming Original World · Coming Soon
                </p>

                <h2
                  className="text-5xl sm:text-7xl lg:text-[5.5rem] font-bold tracking-[-0.04em] leading-[0.95] text-white"
                  style={{ fontFamily: '"Space Grotesk", Satoshi, sans-serif', color: '#FFFFFF' }}
                >
                  {PRODUCTS_CONFIG.gaming.name}
                </h2>

                <p className="text-xl sm:text-2xl text-white/90 font-medium leading-snug max-w-xl">
                  {PRODUCTS_CONFIG.gaming.tagline}
                </p>

                <p className="text-sm sm:text-base text-white/68 leading-relaxed max-w-xl">
                  {PRODUCTS_CONFIG.gaming.description}
                </p>
              </div>

              {/* Honest World Dossier (Zero invented gameplay claims) */}
              <div
                className="lg:col-span-5 rounded-3xl bg-white/[0.04] backdrop-blur-md border border-white/12 p-6 sm:p-8 space-y-6"
                style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                    Development Dossier
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] bg-[#FCD34D]/15 text-[#FCD34D] border border-[#FCD34D]/35">
                    Pre-Release
                  </span>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-1">
                      Creative DNA
                    </p>
                    <p className="text-white/85 leading-relaxed">
                      Inspired by the social energy, wit, and relatable ambition of modern Nigerian life-sim experiences like Lagos Life — built with its own distinct identity inside CalebDeck.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-2xl bg-black/40 border border-white/10 p-3.5">
                      <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
                        Current Stage
                      </p>
                      <p className="font-bold text-[#FCD34D]">In Development</p>
                    </div>
                    <div className="rounded-2xl bg-black/40 border border-white/10 p-3.5">
                      <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1">
                        Public Access
                      </p>
                      <p className="font-bold text-white/90">Not Yet Playable</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                  <span className="text-white/55">Follow official progress</span>
                  <a
                    href={BRAND_CONFIG.socialXUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-[#FCD34D] hover:underline"
                  >
                    {BRAND_CONFIG.socialXHandle} <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────── SECTION 6: THE TRANSITION / WHAT'S NEXT ─────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            {...reveal()}
            className="rounded-[2.5rem] bg-gradient-to-br from-[#7C3AED] via-[#5B21B6] to-[#1E1038] text-white px-6 py-16 sm:px-14 sm:py-20 text-center relative overflow-hidden"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-[#FCD34D]/25 blur-3xl"
            />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#FCD34D]">
                The Next Chapter
              </p>

              <h2
                className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-[-0.03em] leading-[1.05] text-white"
                style={{ fontFamily: 'Satoshi, Inter, sans-serif', color: '#FFFFFF' }}
              >
                The next chapter is{' '}
                <span
                  className="font-normal italic text-[#FCD34D]"
                  style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '1.1em' }}
                >
                  already taking shape.
                </span>
              </h2>

              <p className="text-base sm:text-lg text-white/82 leading-relaxed max-w-2xl mx-auto">
                We’re carrying everything we learned from serving our campus community into products designed for lasting impact — with{' '}
                <strong className="text-white">{PRODUCTS_CONFIG.fashion.name}</strong> and{' '}
                <strong className="text-white">{PRODUCTS_CONFIG.business.name}</strong> live right now, and{' '}
                <strong className="text-[#FCD34D]">{PRODUCTS_CONFIG.gaming.name}</strong> on the horizon.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={PRODUCTS_CONFIG.fashion.path}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-full font-black text-sm bg-[#FCD34D] text-[#110C1D] hover:bg-[#FDE047] shadow-lg transition-all"
                >
                  <span>Shop {PRODUCTS_CONFIG.fashion.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={PRODUCTS_CONFIG.business.path}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-colors"
                >
                  <span>Explore {PRODUCTS_CONFIG.business.name}</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────── SECTION 7: ARCHITECTURAL FOOTER ─────────────────────── */}
      <Footer />
    </div>
  );
}
