import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Button } from '../../components/design-system/Button';
import { GlassCard } from '../../components/design-system/Card';
import { ArrowLeft, Search, ShoppingBag, Plus, Minus, Package } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToMartItems, MartItem } from '../../../services/mart';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { Badge } from '../../components/design-system/Badge';

const CATEGORIES = [
  'All', 
  'Breakfast & Cereals', 
  'Spreads & Snacks', 
  'Sugar & Beverages', 
  'Perfumes', 
  'Personal Care', 
  'Clothing & Accessories', 
  'Home & Living'
];

const MART_ITEMS_CACHE_KEY = 'mart_items_cache_v1';
const MART_ITEMS_CACHE_TIME_KEY = 'mart_items_cache_time_v1';
const LEGACY_MART_ITEMS_CACHE_KEY = 'mart_items_cache';
const MART_CACHE_MAX_AGE_MS = 1000 * 60 * 45;
const SLOW_LOAD_MS = 4500;
const VERY_SLOW_LOAD_MS = 12000;

export default function MartPage() {
  const { studentTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<MartItem[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasServerResponse, setHasServerResponse] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [isVerySlowLoading, setIsVerySlowLoading] = useState(false);
  const cartIconRef = useRef<HTMLAnchorElement>(null);
  const [flyingItem, setFlyingItem] = useState<{
    imageUrl: string;
    name: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    active: boolean;
  } | null>(null);

  const { items: cartItems, addItem, updateQuantity, totalItems } = useMartCart();

  useEffect(() => {
    const readCachedItems = () => {
      const localCache = localStorage.getItem(MART_ITEMS_CACHE_KEY);
      const cacheTime = Number(localStorage.getItem(MART_ITEMS_CACHE_TIME_KEY) || 0);
      const legacySessionCache = sessionStorage.getItem(LEGACY_MART_ITEMS_CACHE_KEY);
      const cachedItems = localCache || legacySessionCache;
      const isFresh = localCache ? Date.now() - cacheTime < MART_CACHE_MAX_AGE_MS : true;

      if (!cachedItems || !isFresh) return;

      try {
        const parsed = JSON.parse(cachedItems);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setLoading(false);
        }
      } catch (e) {}
    };

    readCachedItems();

    const slowLoadingTimeout = window.setTimeout(() => setIsSlowLoading(true), SLOW_LOAD_MS);
    const verySlowLoadingTimeout = window.setTimeout(() => setIsVerySlowLoading(true), VERY_SLOW_LOAD_MS);

    const unsubscribeItems = subscribeToMartItems((fetchedItems, isFromCache, error) => {
      if (error) {
        setLoadError(true);
        setHasServerResponse(true);
        setLoading(false);
        window.clearTimeout(slowLoadingTimeout);
        window.clearTimeout(verySlowLoadingTimeout);
        return;
      }

      setLoadError(false);
      if (fetchedItems.length > 0) {
        setItems(fetchedItems);
        localStorage.setItem(MART_ITEMS_CACHE_KEY, JSON.stringify(fetchedItems));
        localStorage.setItem(MART_ITEMS_CACHE_TIME_KEY, String(Date.now()));
        sessionStorage.setItem(LEGACY_MART_ITEMS_CACHE_KEY, JSON.stringify(fetchedItems));
        setHasServerResponse(!isFromCache);
        setLoading(false);
        window.clearTimeout(slowLoadingTimeout);
        window.clearTimeout(verySlowLoadingTimeout);
        return;
      }

      if (!isFromCache) {
        setItems([]);
        setHasServerResponse(true);
        setLoading(false);
        window.clearTimeout(slowLoadingTimeout);
        window.clearTimeout(verySlowLoadingTimeout);
      }
    });
    const unsubscribeSettings = subscribeToPlatformSettings((settings) => {
      setPlatformSettings(settings);
    });
    return () => {
      window.clearTimeout(slowLoadingTimeout);
      window.clearTimeout(verySlowLoadingTimeout);
      unsubscribeItems();
      unsubscribeSettings();
    };
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const isInitialLoading = loading && items.length === 0;
  const isSearchOrFilterEmpty = !loading && items.length > 0 && filteredItems.length === 0;
  const isConfirmedEmpty = !loading && hasServerResponse && items.length === 0 && !loadError;
  const isLoadFailure = !loading && loadError && items.length === 0;

  const getCartQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };

  const animateToCart = (item: MartItem, sourceElement: HTMLElement) => {
    const imageElement = sourceElement.closest('[data-mart-card]')?.querySelector('img');
    const cartElement = document.getElementById('global-cart');
    if (!imageElement || !cartElement) return;

    const imageRect = imageElement.getBoundingClientRect();
    const cartRect = cartElement.getBoundingClientRect();

    setFlyingItem({
      imageUrl: item.imageUrl,
      name: item.name,
      startX: imageRect.left + imageRect.width / 2,
      startY: imageRect.top + imageRect.height / 2,
      endX: cartRect.left + cartRect.width / 2,
      endY: cartRect.top + cartRect.height / 2,
      active: false
    });

    requestAnimationFrame(() => {
      setFlyingItem(current => current ? { ...current, active: true } : current);
      window.setTimeout(() => setFlyingItem(null), 720);
    });
  };

  const handleAddToCart = (item: MartItem, sourceElement?: HTMLElement) => {
    if (!item.inStock) return;
    if (sourceElement && getCartQuantity(item.id) === 0) {
      animateToCart(item, sourceElement);
    }
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category
    });
  };

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const currentHour = new Date().getHours();
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const isOutOfHours = currentHour < openingHour || currentHour >= closingHour;
  const isMaintenance = platformSettings?.isAcceptingOrders === false || platformSettings?.isMartComingSoon === true;
  const isMartClosed = !!platformSettings && (isOutOfHours || isMaintenance) && !isDev;
  const martClosedMessage = platformSettings?.isMartComingSoon === true
    ? (platformSettings?.martClosedMessage || 'CalebDeck Mart is currently closed for restocking. Fresh items will be available soon.')
    : platformSettings?.isAcceptingOrders === false
      ? (platformSettings?.globalClosedMessage || 'CalebDeck is temporarily paused while we make a quick operational update. Please check back shortly.')
      : `CalebDeck Mart follows CalebDeck operating hours: ${openingHour}:00 to ${closingHour}:00.`;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO
        title="CalebDeck Mart — Campus Grocery & Essentials Delivery | CalebDeck"
        description="Shop groceries, snacks, drinks, and everyday essentials delivered to your hostel at Caleb University. CalebDeck Mart is a service of CalebDeck, powered by IGLOBALS TECHNOLOGY."
        canonical="https://calebdeck.com/mart"
      />

      {flyingItem && (
        <img
          src={flyingItem.imageUrl}
          alt=""
          aria-hidden="true"
          className="fixed z-[100] w-14 h-14 rounded-2xl object-contain bg-card border border-border shadow-2xl pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            left: flyingItem.active ? flyingItem.endX : flyingItem.startX,
            top: flyingItem.active ? flyingItem.endY : flyingItem.startY,
            transform: flyingItem.active
              ? 'translate(-50%, -50%) scale(0.25) rotate(12deg)'
              : 'translate(-50%, -50%) scale(1)',
            opacity: flyingItem.active ? 0.1 : 1
          }}
        />
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {!user && (
              <button 
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">🛒</span> CalebDeck Mart
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {!user && (
              <Link to="/cart" ref={cartIconRef} className="relative p-2 text-foreground/80 hover:text-primary transition-colors">
                <ShoppingBag className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center translate-x-1 -translate-y-1">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {isMartClosed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center shadow-2xl animate-fade-in-up">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <h2 className="text-3xl font-black mb-4">Mart is Closed</h2>
            <p className="text-muted-foreground mb-8 text-lg font-medium">
              {martClosedMessage}
            </p>
            <Link to="/">
              <Button variant="primary" className="w-full py-4 text-base rounded-xl font-bold">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section className="mb-6" aria-labelledby="mart-products-title">
          <h2 id="mart-products-title" className="sr-only">Shop campus groceries and hostel essentials</h2>
          <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
            Browse CalebDeck Mart for snacks, drinks, personal care items, and everyday hostel essentials selected for Caleb University students.
          </p>
        </section>
        
        {/* Search & Categories */}
        <div className="mb-8 space-y-6">
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search snacks, drinks, essentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-muted/50 border-2 border-border focus:border-[#10B981] focus:ring-4 focus:ring-[#10B981]/10 outline-none transition-all text-lg font-medium"
            />
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-[#10B981] text-white shadow-md shadow-[#10B981]/20 scale-105'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {isInitialLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-muted/50 rounded-3xl aspect-[3/4] p-4"></div>
              ))}
            </div>
            {isSlowLoading && (
              <div className="mx-auto max-w-md text-center rounded-2xl border border-border bg-card/70 p-5 shadow-sm">
                <Package className="w-8 h-8 mx-auto mb-3 text-[#10B981]" />
                <h3 className="text-lg font-black text-foreground mb-1">
                  {isVerySlowLoading ? 'Still connecting to Mart' : 'Loading Mart items'}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isVerySlowLoading
                    ? 'The campus network may be slow right now. Your page is still trying to fetch the latest products.'
                    : 'Please hold on while CalebDeck fetches the latest products and prices.'}
                </p>
                {isVerySlowLoading && (
                  <Button variant="secondary" onClick={() => window.location.reload()} className="mt-4">
                    Retry Loading
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : isLoadFailure ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <Package className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-70" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Could not load Mart items</h3>
            <p className="text-muted-foreground">
              Your connection may be unstable. Please try again with a better network.
            </p>
            <Button variant="secondary" onClick={() => window.location.reload()} className="mt-6">
              Retry Loading
            </Button>
          </div>
        ) : isConfirmedEmpty ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <Package className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-70" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Mart items are not available right now</h3>
            <p className="text-muted-foreground">Please check back soon.</p>
          </div>
        ) : isSearchOrFilterEmpty ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="text-6xl mb-4 opacity-50">🏪</div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No matching items</h3>
            <p className="text-muted-foreground">Try another search or category.</p>
            {(searchQuery || activeCategory !== 'All') && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="mt-6"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredItems.map((item, index) => {
              const qty = getCartQuantity(item.id);
              
              return (
                <GlassCard 
                  key={item.id} 
                  selected={qty > 0} 
                  unavailable={!item.inStock}
                  className="h-full min-h-[300px] sm:min-h-[350px] group transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
                >
                  <div data-mart-card className="space-y-3 h-full flex flex-col">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center">
                    <ImageWithFallback 
                      src={item.imageUrl} 
                      alt={item.name}
                      loading={index < 8 ? 'eager' : 'lazy'}
                      decoding="async"
                      sizes="(max-width: 767px) 45vw, (max-width: 1023px) 30vw, 22vw"
                      {...({ fetchPriority: index < 8 ? 'high' : 'auto' } as any)}
                      className="w-[86%] h-[86%] object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    {!item.inStock && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[3px] flex items-center justify-center p-4">
                        <Badge variant="gray" className="bg-background/80 font-black px-3 py-1.5 border-2 text-foreground text-[10px] uppercase tracking-tighter">Out of Stock</Badge>
                      </div>
                    )}
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 bg-[#10B981] text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-background animate-in zoom-in">
                        {qty}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-black text-[#10B981] uppercase tracking-[0.12em] sm:tracking-[0.16em] mb-1 opacity-80 leading-tight line-clamp-2 min-h-[1.4rem]">{item.category}</p>
                      <h3 className="font-bold text-card-foreground text-sm sm:text-base line-clamp-2 min-h-[2.5rem] leading-tight flex items-center group-hover:text-[#10B981] transition-colors">{item.name}</h3>
                      <p className="text-base sm:text-lg text-muted-foreground font-black mt-1">₦{item.price.toLocaleString()}</p>
                    </div>
                    
                    <div className="mt-auto pt-3">
                      {qty === 0 ? (
                        <button
                          onClick={(event) => handleAddToCart(item, event.currentTarget)}
                          disabled={!item.inStock}
                          className="w-full h-10 rounded-xl bg-[#10B981] text-white hover:bg-[#059669] disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] font-black uppercase tracking-[0.14em] text-xs"
                          aria-label={`Select ${item.name}`}
                        >
                          <Plus className="w-4 h-4" />
                          {item.inStock ? 'Select' : 'Sold Out'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => updateQuantity(item.id, qty - 1)}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted hover:bg-secondary hover:text-white transition-colors flex items-center justify-center"
                            aria-label={`Reduce ${item.name} quantity`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-lg sm:text-xl text-card-foreground">{qty}</span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            disabled={!item.inStock}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#10B981] text-white hover:bg-[#059669] disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm hover:scale-105"
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Checkout Button (Mobile only, or always if items in cart) */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto">
            <Link to="/mart/cart">
              <Button variant="primary" className="w-full py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 bg-[#10B981] hover:bg-[#059669] text-white">
                <span className="bg-white/20 px-3 py-1 rounded-lg font-bold">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                <span className="font-bold flex items-center gap-2">View Cart <ArrowLeft className="w-5 h-5 rotate-180" /></span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
