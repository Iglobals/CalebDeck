import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/design-system/Button';
import { ArrowLeft, ShoppingBag, Plus, Minus, CalendarClock } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToFashionItems, FashionItem } from '../../../services/fashion';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';
import { toast } from 'sonner';
import { getFashionBatchState, isFashionCheckoutAllowed, formatArrivalDate, DEFAULT_FASHION_BATCH_CONFIG } from '../../../services/fashionBatch';
import type { FashionBatchState } from '../../../services/fashionBatch';

export default function FashionPDP() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<FashionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeThumbnail, setActiveThumbnail] = useState<string>('');
  const [showCartOverlay, setShowCartOverlay] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [batchState, setBatchState] = useState<FashionBatchState | null>(null);
  
  // Animation states
  const cartIconRef = useRef<HTMLAnchorElement>(null);
  const [flyingItem, setFlyingItem] = useState<{
    imageUrl: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    active: boolean;
  } | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  const FALLBACK_ITEMS: FashionItem[] = [
    {
      id: 'f1',
      name: "Men's Pullover Hoodie",
      brand: 'Caleb Originals',
      brandColor: '#FDBA74', // Match the orange bg from inspo
      category: 'Apparel',
      price: 19900,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop',
      thumbnails: [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1556821832-75d117e0ecfa?q=80&w=600&auto=format&fit=crop'
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
      colors: ['#F59E0B', '#000000', '#3B82F6', '#93C5FD'],
      description: 'Crafted with premium materials, these pullovers are designed to keep you warm and stylish all season long. Features a relaxed fit and dropped shoulders for maximum comfort.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'f2',
      name: 'Campus Vibe Tote Bag',
      brand: 'Urban Dept',
      brandColor: '#E2E8F0', 
      category: 'Bags',
      price: 4500,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1597589827317-4c6d6e0a90bd?q=80&w=600&auto=format&fit=crop',
      sizes: ['One Size'],
      colors: ['#E2E8F0', '#1E293B'],
      description: 'Durable canvas tote bag perfect for carrying laptops and books.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'f3',
      name: 'Retro High-Top Sneakers',
      brand: 'Kicks NG',
      brandColor: '#A7F3D0', 
      category: 'Shoes',
      price: 32000,
      inStock: false,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
      sizes: ['40', '41', '42', '43', '44', '45'],
      colors: ['#10B981', '#FFFFFF'],
      description: 'Vintage styled high-tops with premium cushioning.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'f4',
      name: 'Essential Graphic Tee',
      brand: 'Caleb Originals',
      brandColor: '#DDD6FE', 
      category: 'Shirts',
      price: 7500,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#7C3AED', '#FFFFFF', '#000000'],
      description: '100% cotton graphic tee with minimalist front design.',
      createdAt: new Date().toISOString()
    }
  ];

  const { items: cartItems, addItem, updateQuantity, removeItem, totalItems, subtotal } = useMartCart();
  const FASHION_DELIVERY_FEE = platformSettings?.fashionDeliveryFee || 1500;

  useEffect(() => {
    if (!user) {
      window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + `/fashion/product/${id}`)}`;
      return;
    }
    
    const unsubscribeItems = subscribeToFashionItems((fetchedItems, isFromCache, error) => {
      if (error) {
        setLoading(false);
        const fallback = FALLBACK_ITEMS.find(i => i.id === id);
        setItem(fallback || null);
        return;
      }
      const dataToSearch = fetchedItems.length > 0 ? fetchedItems : FALLBACK_ITEMS;
      const found = dataToSearch.find(i => i.id === id);
      setItem(found || null);
      setLoading(false);
    });

    const unsubscribeSettings = subscribeToPlatformSettings((settings) => {
      setPlatformSettings(settings);
    });

    return () => {
      unsubscribeItems();
      unsubscribeSettings();
    };
  }, [id, user]);

  // Batch state for delivery timing
  useEffect(() => {
    const config = platformSettings?.fashionBatchConfig || DEFAULT_FASHION_BATCH_CONFIG;
    setBatchState(getFashionBatchState(config));
    const interval = setInterval(() => {
      setBatchState(getFashionBatchState(config));
    }, 60_000);
    return () => clearInterval(interval);
  }, [platformSettings]);

  useEffect(() => {
    if (item) {
      if (item.sizes && item.sizes.length > 0) setSelectedSize(item.sizes[0]);
      if (item.colors && item.colors.length > 0) setSelectedColor(item.colors[0]);
      setActiveThumbnail(item.imageUrl);
    }
  }, [item]);

  const handleAddToCart = () => {
    if (!item || !item.inStock) return;
    
    if (item.sizes && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    
    const cartItemId = `${item.id}-${selectedSize || 'nosize'}-${selectedColor?.replace('#', '') || 'nocolor'}`;
    const existing = cartItems.find(i => i.id === cartItemId);
    if (!existing) {
      addItem({
        id: cartItemId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        category: item.category,
        productType: 'fashion',
        size: selectedSize,
        color: selectedColor
      });
      
      // Update quantity if greater than 1
      if (quantity > 1) {
        setTimeout(() => updateQuantity(cartItemId, quantity), 100);
      }
    } else {
      updateQuantity(cartItemId, existing.quantity + quantity);
    }
    
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);

    // Trigger Flying Animation
    const button = document.activeElement as HTMLElement;
    if (button && cartIconRef.current && item) {
      const buttonRect = button.getBoundingClientRect();
      const cartRect = cartIconRef.current.getBoundingClientRect();
      
      setFlyingItem({
        imageUrl: item.imageUrl,
        startX: buttonRect.left + buttonRect.width / 2,
        startY: buttonRect.top + buttonRect.height / 2,
        endX: cartRect.left + cartRect.width / 2,
        endY: cartRect.top + cartRect.height / 2,
        active: false
      });

      requestAnimationFrame(() => {
        setFlyingItem(current => current ? { ...current, active: true } : current);
        window.setTimeout(() => setFlyingItem(null), 720);
      });
    }
  };

  const handleBuyNow = () => {
    setShowCartOverlay(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <Button variant="primary" onClick={() => navigate('/fashion')}>Back to Fashion</Button>
      </div>
    );
  }

  // Define images array including the main image and thumbnails
  const allImages = item.thumbnails?.length ? [item.imageUrl, ...item.thumbnails.filter(t => t !== item.imageUrl)] : [item.imageUrl];

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const currentHour = new Date().getHours();
  const openingHour = platformSettings?.fashionOpeningHour ?? 0;
  const closingHour = platformSettings?.fashionClosingHour ?? 24;
  const isOutOfHours = currentHour < openingHour || currentHour >= closingHour;
  const isMaintenance = platformSettings?.isFashionAcceptingOrders === false || platformSettings?.isFashionComingSoon === true;
  const isFashionClosed = !!platformSettings && (isOutOfHours || isMaintenance) && !isDev;
  const fashionClosedMessage = platformSettings?.isFashionComingSoon === true
    ? 'CalebDeck Fashion is launching soon! Get ready for exclusive campus merch and premium apparel.'
    : platformSettings?.isFashionAcceptingOrders === false
      ? (platformSettings?.fashionClosedMessage || 'CalebDeck Fashion is currently closed for restocking. Check back shortly.')
      : `CalebDeck Fashion follows operating hours: ${openingHour}:00 to ${closingHour}:00.`;

  return (
    <div className="fixed inset-0 w-full overflow-hidden bg-[#F5F5F5] dark:bg-[#121212] text-foreground selection:bg-amber-500/30">
      <SEO
        title={`${item.name} | Fashion`}
        description={item.description || `Buy ${item.name}`}
        canonical={`https://calebdeck.com/fashion/product/${item.id}`}
        image={item.imageUrl}
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

      {isFashionClosed && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center shadow-2xl animate-fade-in-up">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {platformSettings?.isFashionComingSoon ? 'Coming Soon' : 'Fashion is Closed'}
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              {fashionClosedMessage}
            </p>
            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full h-14 rounded-2xl text-lg font-bold bg-[#FDBA74] text-black hover:bg-[#F97316] border-none"
                onClick={() => navigate('/')}
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Card: Hero Image Section (Fixed, Stacked Container 1) */}
      <div 
        className="absolute top-0 left-0 right-0 h-[46dvh] md:h-[100dvh] md:w-1/2 transition-colors rounded-b-[32px] md:rounded-b-none shadow-md z-0 overflow-hidden bg-muted/20"
      >
        {/* Transparent Header with Safe Area Top */}
        <header 
          className="absolute top-0 left-0 right-0 z-40 px-4 sm:px-6 flex items-center justify-between"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <button 
            onClick={() => navigate('/fashion')}
            className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          
          <span className="font-bold text-black/80">Details</span>
          
          <Link to="/cart" ref={cartIconRef} className="relative w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/50 transition-colors shadow-sm">
            <ShoppingBag className="w-5 h-5 text-black" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
        </header>

        {/* Main Image */}
        <div className="absolute inset-0 flex items-center justify-center pt-16 pb-12 px-12 md:relative md:h-[100vh]">
          <ImageWithFallback
            src={activeThumbnail}
            alt={item.name}
            className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl transition-all duration-300"
          />
        </div>

        {/* Vertical Thumbnails (Right Side) */}
        {allImages.length > 1 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
            {allImages.slice(0, 4).map((thumb, idx) => (
              <button
                key={idx}
                onClick={() => setActiveThumbnail(thumb)}
                className={`w-12 h-12 rounded-xl bg-white/40 backdrop-blur-md overflow-hidden border-2 transition-all ${
                  activeThumbnail === thumb ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:bg-white/60'
                }`}
              >
                <ImageWithFallback src={thumb} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover mix-blend-multiply" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Card: Info Panel (Stacked Container 2 - Fixed position, internal scroll only) */}
      <div className="absolute top-[48dvh] bottom-0 left-0 right-0 md:top-0 md:h-[100dvh] md:left-[50%] md:w-1/2 bg-card border-t border-border/60 rounded-t-[32px] md:rounded-none shadow-[0_-10px_30px_rgba(0,0,0,0.08)] md:shadow-none flex flex-col z-10 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32 space-y-6">
        
        {/* Header Row: Title & Stepper */}
        <div className="flex justify-between items-start gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-[70%]">{item.name}</h1>
          
          <div className="flex items-center justify-between bg-muted/50 rounded-full px-1 py-1 shrink-0">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1 || !item.inStock}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold text-sm">
              {quantity < 10 ? `0${quantity}` : quantity}
            </span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              disabled={!item.inStock}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-200 text-amber-900 hover:bg-amber-300 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Price & Color Row */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-muted-foreground text-sm mb-1">From:</p>
            <p className="text-2xl sm:text-3xl font-bold">₦{item.price.toLocaleString()}</p>
          </div>

          {/* Color Selection (Circles) */}
          {item.colors && item.colors.length > 0 && (
            <div className="flex gap-2">
              {item.colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] transition-all flex items-center justify-center ${
                    selectedColor === color ? 'border-primary scale-110 shadow-sm' : 'border-transparent shadow-sm'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                >
                  {selectedColor === color && (
                    <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-background mix-blend-difference" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Size Selection (Pills) */}
        {item.sizes && item.sizes.length > 0 && (
          <div className="mb-8">
            <p className="font-semibold mb-3">Select Size</p>
            <div className="flex flex-wrap gap-2">
              {item.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                    selectedSize === size
                      ? 'bg-amber-300 text-amber-900 shadow-sm scale-105'
                      : 'bg-muted/50 text-foreground hover:bg-muted'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-8">
          <p className="font-semibold mb-2">Description</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.description || 'Premium exclusive fashion item.'}
          </p>
        </div>
      </div>
    </div>

      {/* Delivery Timing + Sticky Bottom Actions */}
      <div 
        className="absolute bottom-0 left-0 right-0 md:left-[50%] z-40 pointer-events-none"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="px-6 mb-4 sm:mb-6 pointer-events-auto space-y-2">
          {/* Delivery timing line */}
          {batchState && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
              <CalendarClock className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
              {batchState.isOpen || batchState.isGracePeriod ? (
                <span>
                  Joins this week's batch — arrives <strong>{formatArrivalDate(batchState.expectedArrivalDate)}</strong>
                </span>
              ) : (
                <span>
                  Next batch opens <strong>{batchState.nextOpenDate.toLocaleDateString('en-US', { weekday: 'long' })}</strong> — orders arrive <strong>{formatArrivalDate(batchState.expectedArrivalDate)}</strong>
                </span>
              )}
            </div>
          )}
          {/* Action buttons */}
          <div className="flex items-center gap-2 bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-white/40 dark:border-white/10 p-2 rounded-[2rem] shadow-xl">
            <Button 
              onClick={handleAddToCart}
              disabled={!item.inStock || isAdded || (batchState ? !batchState.isOpen && !batchState.isGracePeriod : false)}
              variant="secondary"
              className={`flex-1 h-14 rounded-full font-bold border-none transition-colors ${isAdded ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              {isAdded ? 'Added! ✓' : batchState && !batchState.isOpen && !batchState.isGracePeriod ? 'Batch Closed' : 'Add to Cart'}
            </Button>
            <Button 
              onClick={handleBuyNow}
              disabled={!item.inStock || (batchState ? !batchState.isOpen && !batchState.isGracePeriod : false)}
              variant="primary"
              className="flex-1 h-14 rounded-full text-black border-none font-bold shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: item.brandColor || '#FDBA74' }}
            >
              {batchState && !batchState.isOpen && !batchState.isGracePeriod ? 'Next Batch' : 'Buy Now'}
            </Button>
          </div>
        </div>
      </div>

      {/* Cart Overlay Slide-up */}
      {showCartOverlay && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowCartOverlay(false)}
        >
          <div 
            className="bg-[#F8F9FA] dark:bg-card w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle (Mobile) */}
            <div 
              className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mt-4 mb-2 sm:hidden cursor-pointer" 
              onClick={() => setShowCartOverlay(false)}
            />

            {/* Overlay Header */}
            <div className="flex items-center justify-between px-6 pt-2 pb-6">
              <h2 className="text-xl font-bold">My Cart</h2>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => navigate('/fashion/checkout')} 
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-white dark:bg-background border border-border/50 shadow-sm hover:bg-muted hidden sm:flex items-center"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" /> Checkout
                </Button>
              </div>
            </div>
            
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-6 space-y-4">
              {cartItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
              ) : (
                cartItems.map(cartItem => (
                  <div key={cartItem.id} className="relative flex gap-4 items-center bg-white dark:bg-background p-3 rounded-[20px] shadow-sm border border-border/30">
                    <div className="w-20 h-20 rounded-[16px] p-2 flex-shrink-0" style={{ backgroundColor: item?.brandColor || '#FDBA74' }}>
                      <ImageWithFallback src={cartItem.imageUrl} alt={cartItem.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-sm leading-tight text-foreground">{cartItem.name}</h3>
                      {(cartItem.size || cartItem.color) && (
                        <div className="flex items-center gap-2 mt-1">
                          {cartItem.size && <span className="text-xs text-muted-foreground font-semibold px-1.5 py-0.5 bg-muted rounded-md">{cartItem.size}</span>}
                          {cartItem.color && (
                            <div className="flex items-center gap-1">
                              {cartItem.color.startsWith('#') ? (
                                <span className="w-3.5 h-3.5 rounded-full border border-border shadow-sm" style={{ backgroundColor: cartItem.color }} title={cartItem.color} />
                              ) : (
                                <span className="text-xs text-muted-foreground">{cartItem.color}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end justify-between h-full py-1 shrink-0">
                      <button 
                        onClick={() => removeItem(cartItem.id)} 
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-red-500 bg-muted/30 hover:bg-red-50 rounded-full transition-colors mb-2"
                        aria-label="Remove item"
                      >
                        <span className="text-xs font-bold leading-none">&times;</span>
                      </button>
                      <div className="bg-black dark:bg-white text-white dark:text-black font-bold px-4 py-1.5 rounded-full text-xs shadow-md">
                        ₦{cartItem.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Summary & Checkout */}
            {cartItems.length > 0 && (
              <div className="p-6 mt-4 space-y-4">
                <div className="space-y-3 px-2">
                  <div className="flex justify-between text-sm font-medium text-muted-foreground">
                    <span>Sub-total</span>
                    <span className="text-foreground">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span className="text-foreground">₦{FASHION_DELIVERY_FEE.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-px bg-border/50 my-2" />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total Price</span>
                    <span>₦{(subtotal + FASHION_DELIVERY_FEE).toLocaleString()}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => navigate('/fashion/checkout')}
                  className="w-full h-14 rounded-2xl text-black border-none font-bold text-base shadow-sm transition-transform hover:scale-[1.02] mt-2"
                  style={{ backgroundColor: item?.brandColor || '#FDBA74' }}
                >
                  Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
