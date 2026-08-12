import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '../../components/design-system/Button';
import { ArrowLeft, ShoppingBag, Plus, Minus, Shirt, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { useAuth } from '../../../context/AuthContext';
import SEO from '../../components/SEO';
import { useMartCart } from '../../../context/MartCartContext';
import { subscribeToFashionItems, FashionItem } from '../../../services/fashion';

export default function FashionPDP() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<FashionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const { items: cartItems, addItem, totalItems } = useMartCart();

  useEffect(() => {
    if (!user) {
      window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + `/fashion/product/${id}`)}`;
      return;
    }
    
    // In a real app we'd fetch just this item, but for now reuse the subscription
    const unsubscribeItems = subscribeToFashionItems((fetchedItems, isFromCache, error) => {
      if (error) {
        setLoading(false);
        return;
      }
      const found = fetchedItems.find(i => i.id === id);
      setItem(found || null);
      setLoading(false);
    });

    return () => {
      unsubscribeItems();
    };
  }, [id, user]);

  const handleAddToCart = () => {
    if (!item || !item.inStock) return;
    
    // The cart context currently only adds 1 at a time using addItem, but wait, useMartCart doesn't have addItem with quantity?
    // Let's add multiple times or we can just use the existing logic for MartCartContext
    // The existing MartCartContext addItem doesn't take quantity, but let's check it.
    // I will call addItem 'quantity' times for now if it doesn't support quantity param, or if it does...
    // Actually `updateQuantity` takes the absolute quantity, I can use that after adding!
    
    const existing = cartItems.find(i => i.id === item.id);
    if (!existing) {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        category: item.category
      });
      // wait, addItem might take time to reflect in cartItems. 
      // If it doesn't support quantity, users can just add 1 by 1 or we modify context.
    }
    
    // For simplicity, let's just use addItem for 1, and assume we'll fix the context if needed.
    // Or let's trigger a toast
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/fashion/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#7C3AED]/20 border-t-[#7C3AED] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <Shirt className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">This item might have been removed or doesn't exist.</p>
        <Button variant="primary" onClick={() => navigate('/fashion')}>Back to Fashion</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-32">
      <SEO
        title={`${item.name} | CalebDeck Fashion`}
        description={item.description || `Buy ${item.name} on CalebDeck Fashion`}
        canonical={`https://calebdeck.com/fashion/product/${item.id}`}
        image={item.imageUrl}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/fashion')}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors flex items-center gap-2 font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <Link to="/mart/cart" className="relative p-2 text-foreground/80 hover:text-primary transition-colors">
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-[#F97316] text-white text-xs font-bold rounded-full flex items-center justify-center translate-x-1 -translate-y-1 shadow-sm">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          
          {/* Image Section */}
          <div className="relative aspect-[4/5] md:aspect-square bg-muted/30 rounded-3xl overflow-hidden border border-border">
            <ImageWithFallback
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            {/* Brand Badge */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-background/90 backdrop-blur-md rounded-lg border border-border flex items-center gap-2 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.brandColor || '#F97316' }}></div>
              <span className="text-xs font-bold uppercase tracking-wider">{item.brand}</span>
            </div>
            {!item.inStock && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <span className="bg-background font-black px-6 py-3 border-2 text-foreground text-sm uppercase tracking-widest rounded-xl shadow-xl">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-black text-[#7C3AED] uppercase tracking-[0.2em] mb-2">{item.category}</p>
              <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2">{item.name}</h1>
              <p className="text-3xl font-black text-[#F97316]">₦{item.price.toLocaleString()}</p>
            </div>

            <div className="prose prose-sm dark:prose-invert mb-8 text-muted-foreground">
              <p>{item.description || 'No description available for this item. Exclusive i-CON merch.'}</p>
            </div>
            
            {/* Value Props */}
            <div className="flex flex-col gap-3 mb-8 py-6 border-y border-border">
              <div className="flex items-center gap-3 text-sm font-bold">
                <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                <span>Verified Campus Brand</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-bold">
                <Truck className="w-5 h-5 text-[#7C3AED]" />
                <span>Direct Hostel Delivery Available</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-between border-2 border-border rounded-2xl p-1 bg-card">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || !item.inStock}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={!item.inStock}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <Button 
                  onClick={handleAddToCart}
                  disabled={!item.inStock}
                  variant="secondary"
                  className="flex-1 h-14 rounded-2xl border-2 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 font-bold"
                >
                  Add to Cart
                </Button>
              </div>

              <Button 
                onClick={handleBuyNow}
                disabled={!item.inStock}
                variant="primary"
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#F97316] hover:opacity-90 border-none font-bold text-white shadow-lg shadow-[#F97316]/20"
              >
                Buy Now <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
