import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '../../components/design-system/Logo';
import { Button } from '../../components/design-system/Button';
import { ArrowLeft, Search, ShoppingBag, Plus, Minus, Package } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useTheme } from '../../../context/ThemeContext';
import SEO from '../../components/SEO';
import { useMartCart, CartItem } from '../../../context/MartCartContext';
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

export default function MartPage() {
  const { studentTheme } = useTheme();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<MartItem[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const { items: cartItems, addItem, removeItem, updateQuantity, totalItems } = useMartCart();

  useEffect(() => {
    const unsubscribeItems = subscribeToMartItems((fetchedItems) => {
      setItems(fetchedItems);
      setLoading(false);
    });
    const unsubscribeSettings = subscribeToPlatformSettings((settings) => {
      setPlatformSettings(settings);
    });
    return () => { unsubscribeItems(); unsubscribeSettings(); };
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCartQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };

  const handleAddToCart = (item: MartItem) => {
    if (!item.inStock) return;
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO
        title="CalebDeck Mart — Campus Grocery Delivery"
        description="Order groceries, snacks, drinks, and essentials delivered directly to your hostel at Caleb University."
      />
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <button className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted">
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">🛒</span> CalebDeck Mart
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <Link to="/mart/cart" className="relative p-2 rounded-xl hover:bg-muted transition-colors">
                <ShoppingBag className="w-6 h-6 text-foreground" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 bg-[#10B981] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transform translate-x-1 -translate-y-1">
                    {totalItems}
                  </span>
                )}
             </Link>
          </div>
        </div>
      </header>

      {platformSettings?.isMartComingSoon === true && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center shadow-2xl animate-fade-in-up">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <h2 className="text-3xl font-black mb-4">We're Stocking the Shelves! 📦</h2>
            <p className="text-muted-foreground mb-8 text-lg font-medium">
              CalebDeck Mart is temporarily closed while we restock inventory and upload new product images. We'll be back online shortly!
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
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-muted/50 rounded-3xl aspect-[3/4] p-4"></div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-50">🏪</div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
            {searchQuery && (
              <Button variant="secondary" onClick={() => setSearchQuery('')} className="mt-6">
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredItems.map(item => {
              const qty = getCartQuantity(item.id);
              
              return (
                <div key={item.id} className={`group bg-card border-2 border-border rounded-3xl overflow-hidden hover:border-[#10B981]/30 hover:shadow-xl transition-all duration-500 ${!item.inStock ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className="relative aspect-square bg-muted/20 p-6 flex items-center justify-center">
                    <ImageWithFallback 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                    {!item.inStock && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex items-center justify-center">
                        <Badge variant="outline" className="bg-background font-bold px-4 py-1.5 border-2 text-foreground">Out of Stock</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs font-bold text-[#10B981] uppercase tracking-wider mb-1">{item.category}</p>
                    <h3 className="font-bold text-foreground text-base sm:text-lg mb-2 line-clamp-2">{item.name}</h3>
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-black text-lg sm:text-xl">₦{item.price}</span>
                      
                      {qty > 0 ? (
                        <div className="flex items-center bg-[#10B981] rounded-full p-1 shadow-lg shadow-[#10B981]/20">
                          <button 
                            onClick={() => updateQuantity(item.id, qty - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center text-white font-bold text-sm">{qty}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, qty + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleAddToCart(item)}
                          disabled={!item.inStock}
                          className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondary/10 disabled:hover:text-secondary"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
                <span className="bg-white/20 px-3 py-1 rounded-lg font-bold">{totalItems} items</span>
                <span className="font-bold flex items-center gap-2">View Cart <ArrowLeft className="w-5 h-5 rotate-180" /></span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
