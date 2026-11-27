import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import {
  Search,
  Wallet,
  Package,
  Receipt,
  ShoppingBag,
  Gamepad2,
  CalendarClock,
  Store,
  Plus,
  Minus,
  ArrowRight,
  X,
} from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { subscribeToPlatformSettings, PlatformSettings, PromoSlide } from '../../../services/db';
import {
  getFashionBatchState,
  formatFashionCountdown,
  formatArrivalDate,
  DEFAULT_FASHION_BATCH_CONFIG,
  type FashionBatchState,
} from '../../../services/fashionBatch';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToFashionItems, FashionItem } from '../../../services/fashion';
import { subscribeToActiveBusinessProducts, BusinessProduct } from '../../../services/business';
import { getOptimizedDeliveryUrl } from '../../../services/cloudinary';
import { PRODUCTS_CONFIG } from '../../../config/brand';

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'slide-fashion',
    badge: 'Weekly Drops',
    title: 'CalebDeck Fashion',
    tagline: 'Curated streetwear, footwear, bags & accessories delivered in structured drops.',
    gradient: 'from-[#5B21B6] via-[#7C3AED] to-[#1E1038]',
    logoUrl: '/avaters/calebdeck-fashion-logo-transparent.png',
    link: '/fashion',
    buttonText: 'Shop Styles',
  },
  {
    id: 'slide-business',
    badge: 'Campus Brands',
    title: 'CalebDeck Business',
    tagline: 'Put your student brand right in front of real CalebDeck traffic & WhatsApp buyers.',
    gradient: 'from-[#92400E] via-[#B45309] to-[#451A03]',
    logoUrl: '/avaters/calebdeck-business-logo-transparent.png',
    link: '/business',
    buttonText: 'List Your Brand',
  },
  {
    id: 'slide-caleb-life',
    badge: 'Coming Soon',
    title: 'Caleb Life',
    tagline: 'Our upcoming Nigerian social gaming experience is in active development.',
    gradient: 'from-[#110C1D] via-[#3B0764] to-[#090612]',
    link: '/caleb-life',
    buttonText: 'See Preview',
  },
];

export function SignedInHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [batchState, setBatchState] = useState<FashionBatchState | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { items: cartItems, addItem, updateQuantity } = useMartCart();
  const [allFashionItems, setAllFashionItems] = useState<FashionItem[]>([]);
  const [allBusinessItems, setAllBusinessItems] = useState<BusinessProduct[]>([]);
  const [exploreBusinessItems, setExploreBusinessItems] = useState<BusinessProduct[]>([]);
  const [loadingFashion, setLoadingFashion] = useState(true);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  const campusBrandRef = React.useRef<HTMLDivElement>(null);

  const handlePromoDestination = (slide: PromoSlide) => {
    if (slide.destination === 'CAMPUS_BRAND') {
      sessionStorage.setItem('calebdeck_promo_target', 'campus-brand-section');
      if (window.location.pathname !== '/') navigate('/');
      else campusBrandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(slide.link || '/fashion');
  };

  useEffect(() => {
    if (loadingBusiness) return;
    if (sessionStorage.getItem('calebdeck_promo_target') !== 'campus-brand-section') return;
    sessionStorage.removeItem('calebdeck_promo_target');
    requestAnimationFrame(() =>
      campusBrandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }, [loadingBusiness]);

  useEffect(() => {
    const unsubSettings = subscribeToPlatformSettings((s) => {
      setPlatformSettings(s);
    });

    const unsubFashion = subscribeToFashionItems((items) => {
      setAllFashionItems(items.filter((i) => i.inStock));
      setLoadingFashion(false);
    });

    const unsubBusiness = subscribeToActiveBusinessProducts((items) => {
      const active = items.filter((i) => i.inStock !== false);
      setAllBusinessItems(active);
      const shuffled = [...active].sort(() => 0.5 - Math.random());
      setExploreBusinessItems(shuffled.slice(0, 6));
      setLoadingBusiness(false);
    });

    return () => {
      unsubSettings();
      unsubFashion();
      unsubBusiness();
    };
  }, []);

  useEffect(() => {
    const config = platformSettings?.fashionBatchConfig || DEFAULT_FASHION_BATCH_CONFIG;
    setBatchState(getFashionBatchState(config));
    const id = window.setInterval(() => {
      setBatchState(getFashionBatchState(config));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [platformSettings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const hour = new Date().getHours();
  const getGreeting = () => {
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  };

  const getCartQuantity = (itemId: string) => {
    return cartItems.find((i) => i.id === itemId)?.quantity || 0;
  };

  const totalBagItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const rawName =
    user?.displayNameFromProfile || user?.fullName || user?.email?.split('@')[0] || 'Student';
  const displayName = rawName.split(' ')[0];
  const money = (amount: number) => `₦${Number(amount || 0).toLocaleString()}`;

  const exploreRailFashion = useMemo(() => allFashionItems.slice(0, 4), [allFashionItems]);
  const feedFashionItems = useMemo(() => allFashionItems.slice(0, 6), [allFashionItems]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return { fashion: [] as FashionItem[], business: [] as BusinessProduct[] };
    const fashion = allFashionItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(trimmedQuery) ||
          (item.brand || '').toLowerCase().includes(trimmedQuery) ||
          (item.category || '').toLowerCase().includes(trimmedQuery)
      )
      .slice(0, 4);
    const business = allBusinessItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(trimmedQuery) ||
          (item.vendorBusinessName || '').toLowerCase().includes(trimmedQuery) ||
          (item.category || '').toLowerCase().includes(trimmedQuery)
      )
      .slice(0, 4);
    return { fashion, business };
  }, [trimmedQuery, allFashionItems, allBusinessItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/fashion?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Native App Top Header — Orders + Bag right next to Profile Avatar */}
      <header className="max-w-5xl mx-auto px-5 sm:px-6 pt-[max(2.75rem,env(safe-area-inset-top))] pb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-3xl font-black text-primary tracking-tight truncate max-w-[190px] sm:max-w-xs leading-tight">
            {displayName}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 shrink-0">
          {/* Orders quick button right beside Bag & Avatar */}
          <Link
            to="/my-orders"
            aria-label="My Orders"
            title="My Orders"
            className="w-10 h-10 rounded-full bg-muted/65 hover:bg-muted border border-border/60 flex items-center justify-center transition-colors"
          >
            <Receipt className="w-5 h-5 text-foreground" />
          </Link>

          {/* Fashion Shopping Bag */}
          <Link
            to="/cart"
            aria-label="Shopping Bag"
            title="Shopping Bag"
            className="relative w-10 h-10 rounded-full bg-muted/65 hover:bg-muted border border-border/60 flex items-center justify-center transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-foreground" />
            {totalBagItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#7C3AED] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                {totalBagItems}
              </span>
            )}
          </Link>

          {/* Clickable Profile Avatar */}
          <Link
            to="/profile"
            aria-label="i-CON Profile"
            className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shadow-sm overflow-hidden border-2 border-primary/50 shrink-0 hover:scale-105 transition-transform"
          >
            {user?.avatar ? (
              <span className="text-2xl leading-none">{user.avatar}</span>
            ) : user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-black">{displayName.charAt(0)}</span>
            )}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-6 space-y-7">
        {/* At-a-Glance Row (Wallet & Orders) */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          <Link to="/wallet">
            <Card
              hover
              className="p-4 flex flex-col justify-between h-full border-border bg-card shadow-sm squircle"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Wallet className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Wallet</span>
              </div>
              <h2 className="text-xl font-black tracking-tight">{money(user?.walletBalance || 0)}</h2>
            </Card>
          </Link>

          <Link to="/my-orders">
            <Card
              hover
              className="p-4 flex flex-col justify-between h-full border-border bg-card shadow-sm squircle"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Package className="w-4 h-4 text-[#7C3AED] dark:text-primary shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Orders</span>
              </div>
              <h2 className="text-sm font-bold leading-snug">
                Fashion &amp; past
                <br />
                order history
              </h2>
            </Card>
          </Link>
        </div>

        {/* Live Fashion Weekly Batch Status Pill */}
        {batchState && (
          <Link
            to="/fashion"
            className="block rounded-2xl p-3.5 sm:p-4 border border-[#7C3AED]/20 bg-[#7C3AED]/[0.06] dark:bg-[#7C3AED]/[0.12] hover:border-[#7C3AED]/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/15 text-[#7C3AED] dark:text-[#C4B5FD] flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-xs sm:text-sm leading-snug">
                  {batchState.isOpen ? (
                    <>
                      <p className="font-bold text-foreground truncate">
                        Weekly Fashion Batch Open
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                        Closes in{' '}
                        <span className="font-bold text-[#7C3AED] dark:text-[#FCD34D]">
                          {formatFashionCountdown(batchState)}
                        </span>{' '}
                        · Arrives {formatArrivalDate(batchState.expectedArrivalDate)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-foreground truncate">
                        Browse Next Week’s Fashion Drop
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                        Next batch opens{' '}
                        {batchState.nextOpenDate.toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#7C3AED] text-white shrink-0">
                Shop
              </span>
            </div>
          </Link>
        )}

        {/* Native Search Bar (Fashion & Campus Brands) */}
        <div className="relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fashion drops, campus brands..."
              className="w-full pl-12 pr-11 py-4 rounded-[1.75rem] bg-card border-2 border-border focus:border-[#7C3AED] dark:focus:border-primary outline-none transition-all text-sm sm:text-base font-medium shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute inset-y-0 right-3 my-auto w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {trimmedQuery && (
            <div className="mt-2.5 rounded-3xl bg-card border border-border shadow-xl p-4 space-y-4">
              {searchResults.fashion.length === 0 && searchResults.business.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No matching Fashion or Campus Brand items for “{searchQuery}”.
                </p>
              ) : (
                <>
                  {searchResults.fashion.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7C3AED] dark:text-[#C4B5FD]">
                        CalebDeck Fashion
                      </p>
                      <div className="space-y-2">
                        {searchResults.fashion.map((item) => (
                          <Link
                            key={item.id}
                            to={`/fashion/product/${item.id}`}
                            className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ImageWithFallback
                                src={getOptimizedDeliveryUrl(item.imageUrl, 160)}
                                alt={item.name}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 bg-muted"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {item.brand}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-[#7C3AED] dark:text-primary shrink-0">
                              {money(item.price)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.business.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-primary">
                        Campus Brands
                      </p>
                      <div className="space-y-2">
                        {searchResults.business.map((item) => (
                          <Link
                            key={item.id}
                            to={`/business/product/${item.id}`}
                            className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ImageWithFallback
                                src={getOptimizedDeliveryUrl(item.imageUrl, 160)}
                                alt={item.name}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 bg-muted"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {item.vendorBusinessName}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-amber-600 dark:text-primary shrink-0">
                              {money(item.price)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Promo Carousel (Filtered of Discontinued Services) */}
        {(() => {
          const rawSlides =
            platformSettings?.promoSlides && platformSettings.promoSlides.length > 0
              ? platformSettings.promoSlides
              : PROMO_SLIDES;
          const slides = rawSlides.filter((s) => {
            const link = String(s.link || '').toLowerCase();
            return (
              s.isActive !== false &&
              s.destination !== 'MART' &&
              s.destination !== 'CALEBNET' &&
              s.destination !== 'FOOD' &&
              !link.startsWith('/mart') &&
              !link.startsWith('/calebnet') &&
              !link.startsWith('/cafeteria') &&
              !link.startsWith('/plate-builder')
            );
          });
          const activeSlides = slides.length > 0 ? slides : PROMO_SLIDES;
          const slideIndex = currentSlide % activeSlides.length;
          const activeSlide = activeSlides[slideIndex] || activeSlides[0];
          const bgGradient =
            activeSlide.gradient || 'from-[#5B21B6] via-[#7C3AED] to-[#1E1038]';

          return (
            <div
              className={`relative rounded-[2rem] overflow-hidden bg-gradient-to-r ${bgGradient} text-white p-6 sm:p-8 shadow-xl transition-all duration-700 min-h-[188px] flex items-center`}
            >
              {activeSlide.bgImage && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30 z-0"
                  style={{ backgroundImage: `url(${activeSlide.bgImage})` }}
                />
              )}

              <div className="relative z-10 max-w-[72%] sm:max-w-[65%]">
                <Badge
                  variant="gray"
                  className="bg-white/20 text-white font-bold border-none mb-2.5 backdrop-blur-md"
                >
                  {activeSlide.badge}
                </Badge>
                <h2
                  className="text-2xl font-black mb-1.5 leading-tight drop-shadow-sm text-white"
                  style={{ color: '#FFFFFF' }}
                >
                  {activeSlide.title}
                </h2>
                <p className="font-medium text-white/90 mb-4 text-xs sm:text-sm leading-relaxed">
                  {activeSlide.tagline}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => handlePromoDestination(activeSlide)}
                  className="bg-white text-gray-900 hover:bg-gray-100 border-none font-bold rounded-full text-xs py-2.5 px-5 h-auto shadow-lg"
                >
                  {activeSlide.buttonText || 'Explore'}
                </Button>
              </div>

              {activeSlide.logoUrl ? (
                <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-40 h-40 sm:w-48 sm:h-48 opacity-25 dark:opacity-35 pointer-events-none z-0 transition-opacity duration-700">
                  <img
                    src={activeSlide.logoUrl}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-28 h-28 rounded-3xl bg-white/10 border border-white/15 flex items-center justify-center rotate-6 pointer-events-none z-0"
                >
                  <Gamepad2 className="w-14 h-14 text-[#FCD34D]/80" />
                </div>
              )}

              {activeSlides.length > 1 && (
                <div className="absolute bottom-3.5 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {activeSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === slideIndex ? 'bg-white w-6' : 'bg-white/40 w-1.5'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Explore CalebDeck — Campus Brands + Caleb Life (Coming Soon) + Fashion Drops */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-lg font-black tracking-tight">Explore CalebDeck</h3>
            <Link
              to="/fashion"
              className="text-xs font-bold text-[#7C3AED] dark:text-primary hover:underline"
            >
              View Store →
            </Link>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-3 hide-scrollbar -mx-5 px-5 sm:-mx-6 sm:px-6">
            {/* Tile 1: Campus Brands (CalebDeck Business) */}
            <Link to="/business" className="flex flex-col min-w-[142px] max-w-[142px] shrink-0 group">
              <div className="w-full aspect-square rounded-2xl bg-primary/15 border border-primary/30 mb-2.5 overflow-hidden shadow-sm squircle flex items-center justify-center group-hover:shadow-md group-hover:bg-primary/25 transition-all p-3">
                <img
                  src="/avaters/calebdeck-business-logo-transparent.png"
                  alt="CalebDeck Business"
                  className="w-full h-full object-contain opacity-95 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h4 className="text-sm font-bold truncate leading-tight mb-0.5 group-hover:text-primary transition-colors">
                Campus Brands
              </h4>
              <p className="text-[10px] text-muted-foreground font-bold mb-2 uppercase tracking-wider">
                Vendors
              </p>
              <div className="w-full h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center shadow-sm font-black uppercase tracking-wider text-[10px]">
                Explore
              </div>
            </Link>

            {/* Tile 2: Caleb Life (Coming Soon Container) */}
            <Link
              to={PRODUCTS_CONFIG.gaming.path}
              className="flex flex-col min-w-[142px] max-w-[142px] shrink-0 group"
            >
              <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-[#160E2B] via-[#2B1254] to-[#090612] border border-[#7C3AED]/40 mb-2.5 overflow-hidden shadow-sm squircle flex flex-col items-center justify-center p-3 group-hover:shadow-md transition-all">
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#FCD34D] text-[#110C1D]">
                  Coming Soon
                </span>
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mt-2 group-hover:scale-110 transition-transform duration-300">
                  <Gamepad2 className="w-6 h-6 text-[#FCD34D]" />
                </div>
                <span
                  className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75"
                  style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
                >
                  Caleb Life
                </span>
              </div>
              <h4 className="text-sm font-bold truncate leading-tight mb-0.5 group-hover:text-[#7C3AED] dark:group-hover:text-primary transition-colors">
                {PRODUCTS_CONFIG.gaming.name}
              </h4>
              <p className="text-[10px] text-[#7C3AED] dark:text-[#FCD34D] font-bold mb-2 uppercase tracking-wider">
                Coming Soon
              </p>
              <div className="w-full h-8 rounded-xl bg-[#160E2B] dark:bg-white/10 text-[#FCD34D] border border-[#7C3AED]/35 hover:bg-[#231542] transition-all flex items-center justify-center shadow-sm font-black uppercase tracking-wider text-[10px]">
                Preview
              </div>
            </Link>

            {/* Loading Skeletons for Fashion Rail */}
            {loadingFashion &&
              [...Array(3)].map((_, i) => (
                <div
                  key={`skel-explore-${i}`}
                  className="flex flex-col min-w-[142px] max-w-[142px] shrink-0 animate-pulse"
                >
                  <div className="w-full aspect-square rounded-2xl bg-muted mb-2.5 squircle" />
                  <div className="h-3 bg-muted rounded-full w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded-full w-1/2 mb-2" />
                  <div className="h-8 bg-muted rounded-xl w-full" />
                </div>
              ))}

            {/* Live Fashion Items in Explore Rail */}
            {exploreRailFashion.map((product) => {
              const qty = getCartQuantity(product.id);
              const productPath = `/fashion/product/${product.id}`;

              return (
                <div
                  key={product.id}
                  className="flex flex-col min-w-[142px] max-w-[142px] shrink-0 group relative"
                >
                  <Link
                    to={productPath}
                    className="w-full aspect-square rounded-2xl bg-muted mb-2.5 overflow-hidden border border-border shadow-sm squircle relative flex items-center justify-center group-hover:shadow-md transition-shadow"
                    style={product.brandColor ? { backgroundColor: product.brandColor } : undefined}
                  >
                    <ImageWithFallback
                      src={getOptimizedDeliveryUrl(product.imageUrl, 360)}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl shadow-sm p-1 opacity-95 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute top-2 left-2 backdrop-blur text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-[#7C3AED] text-white">
                      Fashion
                    </div>
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-background z-10 bg-[#7C3AED]">
                        {qty}
                      </div>
                    )}
                  </Link>
                  <Link
                    to={productPath}
                    className="text-sm font-bold truncate leading-tight mb-0.5 hover:text-[#7C3AED] transition-colors"
                  >
                    {product.name}
                  </Link>
                  <p className="text-primary font-black text-sm mb-2">{money(product.price)}</p>

                  {qty === 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        addItem({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          imageUrl: product.imageUrl,
                          category: product.category || 'Fashion',
                          productType: 'fashion',
                        })
                      }
                      className="w-full h-8 rounded-xl text-white transition-all flex items-center justify-center gap-1 shadow-sm font-black uppercase tracking-wider text-[10px] bg-[#7C3AED] hover:bg-[#6D28D9]"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full h-8">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, qty - 1)}
                        className="w-8 h-8 rounded-lg bg-muted hover:bg-[#7C3AED] hover:text-white transition-colors flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, qty + 1)}
                        className="w-8 h-8 rounded-lg text-white transition-colors flex items-center justify-center bg-[#7C3AED] hover:bg-[#6D28D9]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Campus Brands Section (CalebDeck Business) */}
        <div id="campus-brand-section" ref={campusBrandRef} className="scroll-mt-24">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-lg font-black tracking-tight">Campus Brands</h3>
            <Link
              to="/business"
              className="text-xs font-bold text-[#7C3AED] dark:text-primary hover:underline"
            >
              List Your Brand →
            </Link>
          </div>

          {loadingBusiness ? (
            <div className="flex gap-3.5 overflow-x-auto pb-2 hide-scrollbar -mx-5 px-5 sm:-mx-6 sm:px-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={`skel-biz-${i}`}
                  className="min-w-[235px] p-3 flex items-center gap-3 rounded-2xl border border-border bg-card animate-pulse"
                >
                  <div className="w-16 h-16 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3.5 bg-muted rounded-full w-3/4" />
                    <div className="h-2.5 bg-muted rounded-full w-1/2" />
                    <div className="h-3.5 bg-muted rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : exploreBusinessItems.length > 0 ? (
            <div className="flex gap-3.5 overflow-x-auto pb-2 hide-scrollbar -mx-5 px-5 sm:-mx-6 sm:px-6">
              {exploreBusinessItems.map((product) => (
                <Link to={`/business/product/${product.id}`} key={product.id} className="shrink-0">
                  <Card className="min-w-[238px] max-w-[260px] p-3 flex items-center gap-3 border-border shadow-sm squircle group hover:border-primary/50 transition-colors">
                    <div className="w-16 h-16 rounded-xl bg-muted shrink-0 overflow-hidden flex items-center justify-center border border-border">
                      <ImageWithFallback
                        src={getOptimizedDeliveryUrl(product.imageUrl, 240)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black truncate group-hover:text-[#7C3AED] dark:group-hover:text-primary transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-bold mt-0.5 truncate">
                        {product.vendorBusinessName}
                      </p>
                      <p className="text-sm font-black text-[#7C3AED] dark:text-primary mt-1">
                        {money(product.price)}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Link
              to="/business"
              className="group rounded-3xl bg-card border border-border p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-amber-800 dark:text-primary flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black">Sell a Student Brand?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    Showcase your catalog right here on CalebDeck with direct WhatsApp buyers.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
        </div>

        {/* Fresh on CalebDeck Fashion — Native 2-Column App Grid */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-lg font-black tracking-tight">Trending Fashion Drops</h3>
            <Link
              to="/fashion"
              className="text-xs font-bold text-[#7C3AED] dark:text-primary hover:underline"
            >
              See All →
            </Link>
          </div>

          {loadingFashion ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={`skel-feed-${idx}`}
                  className="aspect-[3/4] rounded-3xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {feedFashionItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/fashion/product/${item.id}`}
                  className="group relative aspect-[3/4] rounded-3xl overflow-hidden bg-muted border border-border shadow-sm block"
                >
                  <ImageWithFallback
                    src={getOptimizedDeliveryUrl(item.imageUrl, 520)}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  {item.brand && (
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/90 text-black max-w-[75%] truncate">
                      {item.brand}
                    </span>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white truncate">
                        {item.category || 'Apparel'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white shrink-0">
                        {money(item.price)}
                      </span>
                    </div>
                    <h4
                      className="text-xs sm:text-sm font-bold truncate text-white"
                      style={{ color: '#FFFFFF' }}
                    >
                      {item.name}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
