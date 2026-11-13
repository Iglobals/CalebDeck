import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { StatusDot, Badge } from '../../components/design-system/Badge';
import { Search, Wallet, Package, Clock, Utensils, ShoppingBag, Wifi, Shirt, TrendingUp, ChevronRight, ChevronLeft, Store, Plus, Minus, ArrowLeft } from 'lucide-react';
import { CAFETERIA_OPTIONS, NEW_CAFETERIA_SECTIONS, cafeteriaNameForId } from '../../../services/cafeterias';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { subscribeToPlatformSettings, PlatformSettings, PromoSlide } from '../../../services/db';
import { getFoodDeliveryAvailability } from '../../../services/foodSchedule';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToFashionItems, FashionItem } from '../../../services/fashion';
import { subscribeToActiveBusinessProducts, BusinessProduct } from '../../../services/business';
import { Logo } from '../../components/design-system/Logo';

const PROMO_SLIDES: PromoSlide[] = [
  { 
    id: 'slide-fashion',
    badge: 'Fashion Drops',
    title: 'CalebDeck Fashion',
    tagline: 'Exclusive campus merch, hoodies & trendsetting apparel.',
    gradient: 'from-[#6D28D9] via-[#8B5CF6] to-[#2e1065]',
    logoUrl: '/avaters/calebdeck-fashion-logo-transparent.png',
    link: '/fashion',
    buttonText: 'Explore Styles'
  }
];

export function SignedInHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { items: cartItems, addItem, updateQuantity } = useMartCart();
  const [exploreFashionItems, setExploreFashionItems] = useState<any[]>([]);
  const [exploreBusinessItems, setExploreBusinessItems] = useState<BusinessProduct[]>([]);
  const [loadingFashion, setLoadingFashion] = useState(true);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  const campusBrandRef = React.useRef<HTMLDivElement>(null);
  const [selectedCafeteria, setSelectedCafeteria] = useState<string | null>(null);

  const handlePromoDestination = (slide: PromoSlide) => {
    if (slide.destination === 'CAMPUS_BRAND') {
      sessionStorage.setItem('calebdeck_promo_target', 'campus-brand-section');
      if (window.location.pathname !== '/') navigate('/');
      else campusBrandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(slide.link || '/');
  };

  useEffect(() => {
    if (loadingBusiness) return;
    if (sessionStorage.getItem('calebdeck_promo_target') !== 'campus-brand-section') return;
    sessionStorage.removeItem('calebdeck_promo_target');
    requestAnimationFrame(() => campusBrandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [loadingBusiness]);

  useEffect(() => {
    const unsubSettings = subscribeToPlatformSettings((s) => {
      setPlatformSettings(s);
    });

    const unsubFashion = subscribeToFashionItems((items) => {
      setExploreFashionItems(items.filter(i => i.inStock).slice(0, 4).map(item => ({
        id: item.id,
        type: 'Fashion',
        productType: 'fashion',
        name: item.name,
        price: item.price,
        path: `/fashion/product/${item.id}`,
        disabled: false,
        image: item.imageUrl,
        category: item.category || 'Fashion',
        brandColor: item.brandColor
      })));
      setLoadingFashion(false);
    });

    const unsubBusiness = subscribeToActiveBusinessProducts((items) => {
      // Pick random up to 6 products for the homepage
      const shuffled = [...items].sort(() => 0.5 - Math.random());
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
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentTime = new Date();
  const hour = currentTime.getHours();
  
  const getGreeting = () => {
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  };
  
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const isOutOfHours = hour < openingHour || hour >= closingHour;
  const isFoodLocked = platformSettings?.isFoodOrderingClosed === true;
  const isGlobalLocked = platformSettings?.isAcceptingOrders === false;
  const isClosed = !!platformSettings && (isGlobalLocked || isFoodLocked || isOutOfHours);
  
  const statusLabel = isClosed ? 'Closed' : 'Open now';
  const statusType = isClosed ? 'inactive' : 'active';

  const cafeterias = CAFETERIA_OPTIONS.map((cafeteria) => ({
    ...cafeteria,
    status: isClosed ? 'closed' : 'open',
  }));

  const handleCafeteriaClick = (cafeteriaId: string) => {
    if (isClosed) return;
    const cafeteria = cafeterias.find((item) => item.id === cafeteriaId);
    if (!cafeteria?.hasSections) {
      navigate(`/plate-builder/${cafeteriaId}`, {
        state: { cafeteria: cafeteria?.name || cafeteriaNameForId(cafeteriaId), cafeteriaId, sectionId: 'none' }
      });
      return;
    }
    setSelectedCafeteria(cafeteriaId);
  };

  const handleSectionSelect = (sectionId: string) => {
    if (!selectedCafeteria) return;
    navigate(`/plate-builder/${selectedCafeteria}`, {
      state: {
        cafeteria: cafeteriaNameForId(selectedCafeteria),
        cafeteriaId: selectedCafeteria,
        sectionId,
      }
    });
  };

  const getCartQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };

  const rawName = user?.displayNameFromProfile || user?.fullName || user?.email?.split('@')[0] || 'Student';
  const displayName = rawName.split(' ')[0];
  const money = (amount: number) => `₦${amount.toLocaleString()}`;
  const foodAvailability = getFoodDeliveryAvailability(platformSettings);

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Top Header Section */}
      <header className="px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">{getGreeting()}</h1>
          <p className="text-3xl font-black text-primary truncate max-w-[200px]">{displayName}</p>
        </div>
        <div className="flex items-center justify-end gap-4">
          <Link to="/cart" className="relative rounded-full hover:bg-muted transition-colors">
            <ShoppingBag className="w-6 h-6" />
            {cartItems.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center translate-x-1.5 -translate-y-1.5">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </Link>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shadow-sm overflow-hidden border-2 border-border shrink-0">
            {user?.avatar ? (
              <span className="text-2xl leading-none">{user.avatar}</span>
            ) : user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-black">{displayName.charAt(0)}</span>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 space-y-8">
        
        {/* At-a-Glance Row */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/wallet">
            <Card hover className="p-4 flex flex-col justify-between h-full border-border bg-card shadow-sm squircle">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Wallet</span>
              </div>
              <h2 className="text-xl font-black">{money(user?.walletBalance || 0)}</h2>
            </Card>
          </Link>
          <Link to="/my-orders">
            <Card hover className="p-4 flex flex-col justify-between h-full border-border bg-card shadow-sm squircle">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">Orders</span>
              </div>
              <h2 className="text-sm font-bold leading-tight">View live<br/>history</h2>
            </Card>
          </Link>
        </div>

        {/* Food Delivery Availability Banner */}
        <div className={`rounded-2xl p-4 border flex items-start gap-3 ${foodAvailability.isAvailable ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'}`}>
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-bold">
              {foodAvailability.isAvailable
                ? `Food Delivery Open Today (${foodAvailability.currentDayName})`
                : `Food Delivery Closed Today (${foodAvailability.currentDayName})`}
            </p>
            <p className="opacity-90 mt-0.5">{foodAvailability.userMessage}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search food, fashion, campus brands..."
            className="w-full pl-14 pr-6 py-5 rounded-[2rem] bg-card border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-lg font-medium shadow-sm"
          />
        </div>

        {/* Promo Carousel */}
        {(() => {
          const rawSlides = (platformSettings?.promoSlides && platformSettings.promoSlides.length > 0) 
            ? platformSettings.promoSlides 
            : PROMO_SLIDES;
          const slides = rawSlides.filter(
            (s) =>
              s.isActive !== false &&
              s.destination !== 'MART' &&
              s.destination !== 'CALEBNET' &&
              !String(s.link || '').startsWith('/mart') &&
              !String(s.link || '').startsWith('/calebnet')
          );
          const activeSlides = slides.length > 0 ? slides : PROMO_SLIDES;
          const slideIndex = currentSlide % activeSlides.length;
          const activeSlide = activeSlides[slideIndex] || activeSlides[0];
          const bgGradient = activeSlide.gradient || 'from-[#6D28D9] via-[#8B5CF6] to-[#2e1065]';

          return (
            <div className={`relative rounded-[2rem] overflow-hidden bg-gradient-to-r ${bgGradient} text-white p-8 shadow-xl transition-all duration-700 min-h-[190px] flex items-center`}>
              {activeSlide.bgImage && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 z-0" 
                  style={{ backgroundImage: `url(${activeSlide.bgImage})` }} 
                />
              )}
              {/* Solid left gradient fading into logo on right */}
              <div className="relative z-10 max-w-[65%]">
                <Badge variant="gray" className="bg-white/20 text-white font-bold border-none mb-3 backdrop-blur-md">
                  {activeSlide.badge}
                </Badge>
                <h2 className="text-2xl font-black mb-2 leading-tight drop-shadow-sm">{activeSlide.title}</h2>
                <p className="font-medium text-white/90 mb-4 text-xs sm:text-sm leading-relaxed">{activeSlide.tagline}</p>
                <button type="button" onClick={() => handlePromoDestination(activeSlide)}>
                  <Button variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100 border-none font-bold rounded-xl text-xs py-2.5 px-5 h-auto shadow-lg">
                    {activeSlide.buttonText || 'Explore'}
                  </Button>
                </button>
              </div>

              {/* Right Side Transparent Brand Asset */}
              {activeSlide.logoUrl && (
                <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-48 h-48 opacity-25 dark:opacity-35 pointer-events-none z-0 transition-opacity duration-700">
                  <img 
                    src={activeSlide.logoUrl} 
                    alt="" 
                    aria-hidden="true"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              {/* Carousel indicators */}
              {activeSlides.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                  {activeSlides.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all ${idx === slideIndex ? 'bg-white w-6' : 'bg-white/40 w-2'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Cross-Product Preview Cards */}
        <div>
          <h3 className="text-lg font-black mb-4">Explore CalebDeck</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
            <Link to="/business" className="flex flex-col min-w-[140px] max-w-[140px] group">
              <div className="w-full aspect-square rounded-2xl bg-primary/10 border-primary/20 mb-3 overflow-hidden border shadow-sm squircle flex items-center justify-center group-hover:shadow-md group-hover:bg-primary/20 transition-all p-3">
                <img 
                  src="/avaters/calebdeck-business-logo-transparent.png" 
                  alt="CalebDeck Business" 
                  className="w-full h-full object-contain opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
              <h4 className="text-sm font-bold truncate leading-tight mb-1 group-hover:text-primary transition-colors">Campus Brands</h4>
              <p className="text-[10px] text-muted-foreground font-bold mb-2 uppercase tracking-wider">Vendors</p>
              
              <div className="w-full h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center shadow-sm font-black uppercase tracking-wider text-[10px]">
                Explore
              </div>
            </Link>
            {loadingFashion && [...Array(3)].map((_, i) => (
              <div key={`skel-explore-${i}`} className="flex flex-col min-w-[140px] max-w-[140px] animate-pulse">
                <div className="w-full aspect-square rounded-2xl bg-muted mb-3 squircle" />
                <div className="h-3 bg-muted rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded-full w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded-xl w-full" />
              </div>
            ))}
            {exploreFashionItems.map((product) => {
              if (product.type === 'Mart' || product.type === 'Fashion') {
                const qty = getCartQuantity(product.id);
                const isFashion = product.type === 'Fashion';
                const badgeBg = isFashion ? 'bg-purple-600/90 text-white' : 'bg-background/90 text-foreground';
                const buttonBg = isFashion ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#10B981] hover:bg-[#059669]';

                return (
                  <div key={product.id} className="flex flex-col min-w-[140px] max-w-[140px] group relative">
                    <Link 
                      to={product.path}
                      className="w-full aspect-square rounded-2xl bg-muted mb-3 overflow-hidden border border-border shadow-sm squircle relative flex items-center justify-center group-hover:shadow-md transition-shadow cursor-pointer"
                      style={product.brandColor ? { backgroundColor: product.brandColor } : undefined}
                    >
                      <ImageWithFallback 
                        src={product.image} 
                        alt={product.name} 
                        className={`w-full h-full object-cover rounded-xl shadow-sm p-1 opacity-90 group-hover:opacity-100 transition-opacity`} 
                      />
                      <div className={`absolute top-2 left-2 backdrop-blur text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-border/50 ${badgeBg}`}>
                        {product.type}
                      </div>
                      {qty > 0 && (
                        <div className={`absolute top-2 right-2 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-background animate-in zoom-in z-10 ${isFashion ? 'bg-purple-600' : 'bg-[#10B981]'}`}>
                          {qty}
                        </div>
                      )}
                    </Link>
                    <Link to={product.path} className="text-sm font-bold truncate leading-tight mb-1 hover:text-primary transition-colors">
                      {product.name}
                    </Link>
                    <p className="text-primary font-black text-sm mb-2">{money(product.price)}</p>
                    
                    {qty === 0 ? (
                      <button
                        onClick={() => addItem({ 
                          id: product.id, 
                          name: product.name, 
                          price: product.price, 
                          imageUrl: product.image, 
                          category: product.category || 'General',
                          productType: product.productType || (isFashion ? 'fashion' : 'mart')
                        })}
                        className={`w-full h-8 rounded-xl text-white transition-all flex items-center justify-center gap-1 shadow-sm font-black uppercase tracking-wider text-[10px] ${buttonBg}`}
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full h-8">
                        <button
                          onClick={() => updateQuantity(product.id, qty - 1)}
                          className="w-8 h-8 rounded-lg bg-muted hover:bg-secondary hover:text-white transition-colors flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm">{qty}</span>
                        <button
                          onClick={() => updateQuantity(product.id, qty + 1)}
                          className={`w-8 h-8 rounded-lg text-white transition-colors flex items-center justify-center ${buttonBg}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link 
                  key={product.id} 
                  to={product.disabled ? '#' : product.path}
                  state={{ preSelectedPlanId: product.id, preSelectedType: 'DATA', preSelectedNetwork: product.network }}
                  className={`flex flex-col min-w-[140px] max-w-[140px] group ${product.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={(e) => product.disabled && e.preventDefault()}
                >
                  <div className={`w-full aspect-square rounded-2xl ${product.icon ? 'bg-[#7C3AED]/10 border-[#7C3AED]/20' : 'bg-muted border-border'} mb-3 overflow-hidden border shadow-sm squircle relative flex items-center justify-center group-hover:shadow-md transition-shadow`}>
                    {product.icon ? (
                      <Wifi className="w-12 h-12 text-[#7C3AED] opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300" />
                    ) : (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    )}
                    <div className="absolute top-2 left-2 bg-background/90 backdrop-blur text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-border">
                      {product.type}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold truncate leading-tight mb-1">{product.name}</h4>
                  <p className="text-primary font-black text-sm mb-2">{money(product.price)}</p>
                  
                  <div className="w-full h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center shadow-sm font-black uppercase tracking-wider text-[10px]">
                    Select
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Vendor Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            {selectedCafeteria ? (
              <button
                type="button"
                onClick={() => setSelectedCafeteria(null)}
                className="flex items-center gap-2 text-lg font-black"
                aria-label="Back to cafeteria list"
              >
                <ArrowLeft className="w-5 h-5" />
                Choose Your Serving Point
              </button>
            ) : (
              <h3 className="text-lg font-black">Food Vendors</h3>
            )}
          </div>
          {!selectedCafeteria ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cafeterias.map((cafeteria) => (
                <Card 
                  key={cafeteria.id} 
                  hover 
                  className={`relative overflow-hidden cursor-pointer border-border shadow-sm squircle group ${isClosed ? 'opacity-70' : ''}`}
                  onClick={() => handleCafeteriaClick(cafeteria.id)}
                >
                  {cafeteria.popular && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant="gold" className="flex items-center gap-1 shadow-md bg-white text-black border-none">
                        <TrendingUp className="w-3 h-3" /> Popular
                      </Badge>
                    </div>
                  )}
                  <div className="relative h-48 rounded-t-[1.25rem] overflow-hidden">
                    <ImageWithFallback
                      src={cafeteria.image}
                      alt={cafeteria.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <h2 className="text-2xl font-black text-white mb-1">{cafeteria.name}</h2>
                      <StatusDot status={statusType} label={statusLabel} className="text-white text-xs drop-shadow-md" />
                    </div>
                  </div>
                  <div className="p-4 bg-card flex items-center justify-between border-t border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold">
                      <Clock className="w-4 h-4" />
                      <span>{cafeteria.prepTime}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Utensils className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {NEW_CAFETERIA_SECTIONS.map((section) => (
                <Card
                  key={section.id}
                  hover
                  className="relative overflow-hidden cursor-pointer border-border shadow-sm squircle group"
                  onClick={() => handleSectionSelect(section.id)}
                >
                  <div className="p-6 text-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-secondary/10 flex items-center justify-center mx-auto group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                      <span className="text-3xl font-black">{section.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black mb-1">{section.name}</h2>
                      <p className="text-sm text-muted-foreground font-medium">{section.description}</p>
                    </div>
                    <Button variant="primary" className="w-full">
                      Select {section.name}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* CalebDeck Campus Brand */}
        {/* Campus Brand Section — show skeleton while loading, then content or nothing */}
        {(loadingBusiness || exploreBusinessItems.length > 0) && (
          <div id="campus-brand-section" ref={campusBrandRef} className="scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Campus Brand</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
              {loadingBusiness ? (
                // Skeleton loaders
                [...Array(3)].map((_, i) => (
                  <div key={`skel-biz-${i}`} className="min-w-[240px] p-3 flex items-center gap-3 rounded-2xl border border-border bg-card animate-pulse">
                    <div className="w-16 h-16 rounded-xl bg-muted shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-3.5 bg-muted rounded-full w-3/4" />
                      <div className="h-2.5 bg-muted rounded-full w-1/2" />
                      <div className="h-3.5 bg-muted rounded-full w-1/3" />
                    </div>
                  </div>
                ))
              ) : (
                exploreBusinessItems.map((product) => (
                  <Link to={`/business/product/${product.id}`} key={product.id}>
                    <Card className="min-w-[240px] p-3 flex items-center gap-3 border-border shadow-sm squircle group hover:border-orange-500/30 transition-colors">
                      <div className="w-16 h-16 rounded-xl bg-muted shrink-0 overflow-hidden flex items-center justify-center border border-border group-hover:border-orange-500/30">
                        <ImageWithFallback src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black truncate group-hover:text-orange-500 transition-colors">{product.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold mt-0.5 truncate">{product.vendorBusinessName}</p>
                        <p className="text-sm font-black text-orange-500 mt-1">{money(product.price)}</p>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
