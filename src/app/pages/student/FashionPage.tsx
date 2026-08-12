import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/design-system/Button';
import { GlassCard } from '../../components/design-system/Card';
import { ArrowLeft, Search, ShoppingBag, Plus, Minus, Package, Filter, Shirt } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToFashionItems, FashionItem } from '../../../services/fashion';
import { subscribeToPlatformSettings, PlatformSettings } from '../../../services/db';

const CATEGORIES = ['All', 'Apparel', 'Accessories', 'Footwear', 'Merch'];

export default function FashionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<FashionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const cartIconRef = useRef<HTMLAnchorElement>(null);

  const { items: cartItems, addItem, updateQuantity, totalItems } = useMartCart();

  useEffect(() => {
    // If not authenticated, redirect to login because Fashion is locked to i-CONs only
    if (!user) {
      window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + '/fashion')}`;
      return;
    }
    
    const unsubscribeItems = subscribeToFashionItems((fetchedItems, isFromCache, error) => {
      if (error) {
        setLoading(false);
        return;
      }
      setItems(fetchedItems);
      setLoading(false);
    });

    return () => {
      unsubscribeItems();
    };
  }, [user]);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24 selection:bg-[#F97316]/30">
      <SEO
        title="CalebDeck Fashion — Exclusive i-CON Merch & Style"
        description="Exclusive campus merch, apparel, and style from top student brands. Locked for i-CONs only."
        canonical="https://calebdeck.com/fashion"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
               <span className="text-2xl text-[#7C3AED]"><Shirt className="w-6 h-6" /></span>
               <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#F97316]">CalebDeck Fashion</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Global Cart takes over rendering cart icon, but we have our slide-up cart */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Search & Categories */}
        <div className="mb-8 space-y-6">
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search brands, styles, merch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-muted/50 border-2 border-border focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 outline-none transition-all text-lg font-medium"
            />
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-md shadow-[#7C3AED]/20 scale-105'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-muted/50 rounded-3xl aspect-[3/4] p-4"></div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="text-6xl mb-4 opacity-50 text-[#F97316]"><Shirt className="w-16 h-16 mx-auto" /></div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No fashion items found</h3>
            <p className="text-muted-foreground">Try another search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredItems.map((item, index) => {
              const qty = getCartQuantity(item.id);
              
              return (
                <Link to={`/fashion/product/${item.id}`} key={item.id}>
                  <GlassCard 
                    selected={qty > 0} 
                    unavailable={!item.inStock}
                    className="h-full min-h-[300px] sm:min-h-[350px] group transition-all duration-300 hover:shadow-xl hover:shadow-[#7C3AED]/10 border-border"
                  >
                    <div data-mart-card className="space-y-3 h-full flex flex-col">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center">
                        <ImageWithFallback 
                          src={item.imageUrl} 
                          alt={item.name}
                          loading={index < 8 ? 'eager' : 'lazy'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-[3px] flex items-center justify-center p-4">
                            <span className="bg-background/90 font-black px-3 py-1.5 border-2 text-foreground text-[10px] uppercase tracking-tighter rounded-full">Out of Stock</span>
                          </div>
                        )}
                        {/* Brand Tag Moment */}
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-md rounded-md border border-border flex items-center gap-1.5 shadow-sm">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.brandColor || '#F97316' }}></div>
                          <span className="text-[10px] font-bold uppercase tracking-wider">{item.brand}</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col pt-1">
                        <div>
                          <h3 className="font-bold text-card-foreground text-sm sm:text-base line-clamp-2 min-h-[2.5rem] leading-tight flex items-center group-hover:text-[#7C3AED] transition-colors">{item.name}</h3>
                          <p className="text-base sm:text-lg font-black mt-1 text-[#F97316]">₦{item.price.toLocaleString()}</p>
                        </div>
                        
                        <div className="mt-auto pt-4">
                           {/* Quick add button directly on card */}
                           <button
                             onClick={(e) => handleAddToCart(item, e)}
                             disabled={!item.inStock}
                             className="w-full h-10 rounded-xl bg-background border-2 border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-bold text-xs"
                           >
                             <Plus className="w-4 h-4" /> Quick Add
                           </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Checkout Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto">
            <Link to="/mart/cart">
              <Button variant="primary" className="w-full py-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 bg-gradient-to-r from-[#7C3AED] to-[#F97316] hover:opacity-90 text-white border-none">
                <span className="bg-black/20 px-3 py-1 rounded-lg font-bold">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                <span className="font-bold flex items-center gap-2">View Cart <ArrowLeft className="w-5 h-5 rotate-180" /></span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
