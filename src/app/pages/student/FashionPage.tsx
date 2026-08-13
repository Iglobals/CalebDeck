import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/design-system/Button';
import { Search, ShoppingBag, Plus, Minus, ArrowLeft, Shirt, SlidersHorizontal } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToFashionItems, FashionItem } from '../../../services/fashion';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';

const CATEGORIES = ['Trending', 'Shoes', 'Bags', 'Shirts', 'Apparel'];

export default function FashionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [items, setItems] = useState<FashionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

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
      description: 'Crafted with premium materials, these pullovers are designed to keep you warm and stylish all season long.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'f2',
      name: 'Campus Vibe Tote Bag',
      brand: 'Urban Dept',
      brandColor: '#E2E8F0', // Soft gray
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
      brandColor: '#A7F3D0', // Soft green
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
      brandColor: '#DDD6FE', // Soft purple
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

  const { items: cartItems, addItem, updateQuantity, totalItems } = useMartCart();

  useEffect(() => {
    if (!user) {
      window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + '/fashion')}`;
      return;
    }
    
    const unsubscribeItems = subscribeToFashionItems((fetchedItems, isFromCache, error) => {
      if (error) {
        setLoading(false);
        setItems(FALLBACK_ITEMS);
        return;
      }
      setItems(fetchedItems.length > 0 ? fetchedItems : FALLBACK_ITEMS);
      setLoading(false);
    });

    const unsubscribeSettings = subscribeToPlatformSettings((settings) => {
      setPlatformSettings(settings);
    });

    return () => {
      unsubscribeItems();
      unsubscribeSettings();
    };
  }, [user]);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'Trending' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = item.price >= priceRange.min && item.price <= priceRange.max;
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const getCartQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };

  const handleAddToCart = (item: FashionItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.inStock) return;
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category
    });
  };

  if (!user) return null;

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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO
        title="CalebDeck Fashion"
        description="Exclusive campus merch, apparel, and style."
        canonical="https://calebdeck.com/fashion"
      />

      {isFashionClosed && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center shadow-2xl animate-fade-in-up">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shirt className="w-10 h-10 text-amber-500" />
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

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md pt-4 pb-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="text-xl font-bold">Fashion</h1>
          
          <div className="w-10"></div> {/* Spacer to keep title centered */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        
        {/* Categories (Pills) */}
        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-amber-300 text-amber-900 shadow-sm'
                  : 'bg-muted/50 text-foreground hover:bg-muted'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search & Filter Options */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-card border-none shadow-sm focus:ring-2 focus:ring-amber-300 outline-none transition-all text-base font-medium"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-4 rounded-3xl flex items-center justify-center transition-colors ${showFilters ? 'bg-amber-300 text-amber-900' : 'bg-card text-foreground shadow-sm'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Price Filter Panel */}
          {showFilters && (
            <div className="p-4 bg-card rounded-3xl shadow-sm border border-border animate-in slide-in-from-top-4">
              <h3 className="font-bold text-sm mb-4">Price Range</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Min (₦)</label>
                  <input 
                    type="number" 
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    className="w-full p-3 rounded-2xl bg-muted/50 border-none outline-none font-bold"
                  />
                </div>
                <div className="text-muted-foreground mt-4">-</div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Max (₦)</label>
                  <input 
                    type="number" 
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    className="w-full p-3 rounded-2xl bg-muted/50 border-none outline-none font-bold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-[32px] aspect-[4/5] p-4"></div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="text-6xl mb-4 opacity-50"><Shirt className="w-16 h-16 mx-auto" /></div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground">Adjust your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              return (
                <Link to={`/fashion/product/${item.id}`} key={item.id} className="block group">
                  <div className="bg-[#F8F9FA] dark:bg-[#1C1C1C] rounded-[32px] p-2 sm:p-2.5 shadow-sm border border-border/50 transition-all hover:shadow-md flex flex-col gap-2">
                    {/* Image Area */}
                    <div 
                      className="relative aspect-square rounded-[24px] overflow-hidden flex items-center justify-center p-4 transition-colors"
                      style={{ backgroundColor: item.brandColor || '#FDBA74' }}
                    >
                      <ImageWithFallback 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 mix-blend-multiply"
                      />
                      {!item.inStock && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="bg-background font-bold px-4 py-2 text-xs uppercase tracking-wider rounded-full">Out of Stock</span>
                        </div>
                      )}
                    </div>

                    {/* Details Area */}
                    <div className="flex justify-between items-start gap-2 bg-card p-4 rounded-[24px] shadow-sm border border-border/20">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight mb-1">{item.name}</h3>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{item.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider font-bold">Price</p>
                        <p className="font-black text-sm sm:text-base text-primary">₦{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
