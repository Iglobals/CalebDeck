import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Clock } from 'lucide-react';
import { useMartCart } from '../../../context/MartCartContext';
import { Button } from '../../components/design-system/Button';
import { useTheme } from '../../../context/ThemeContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import SEO from '../../components/SEO';
import { PlatformSettings, subscribeToPlatformSettings } from '../../../services/db';

const MART_DELIVERY_FEE = 1500; // Flat fee for Mart Delivery

export default function MartCart() {
  const { items, updateQuantity, removeItem, totalItems, subtotal } = useMartCart();
  const navigate = useNavigate();
  const { studentTheme } = useTheme();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
  }, []);

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const currentHour = new Date().getHours();
  const openingHour = platformSettings?.systemOpeningHour ?? 10;
  const closingHour = platformSettings?.systemClosingHour ?? 18;
  const isOutOfHours = currentHour < openingHour || currentHour >= closingHour;
  const isMaintenance = platformSettings?.isAcceptingOrders === false || platformSettings?.isMartComingSoon === true;
  const isMartClosed = (isOutOfHours || isMaintenance) && !isDev;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <SEO title="Your Cart — CalebDeck Mart" description="View your CalebDeck Mart shopping cart." />
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/mart">
          <Button variant="primary" className="px-8 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669]">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  const total = subtotal + MART_DELIVERY_FEE;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO title={`Cart (${totalItems}) — CalebDeck Mart`} description="Review your CalebDeck Mart items." />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/mart')} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Shopping Cart</h1>
          <Badge className="bg-[#10B981]/10 text-[#10B981] ml-auto">{totalItems} items</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-card border-2 border-border rounded-3xl overflow-hidden mb-8">
          <ul className="divide-y divide-border">
            {items.map(item => (
              <li key={item.id} className="p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-muted/30 p-2 flex-shrink-0 flex items-center justify-center">
                  <ImageWithFallback src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#10B981] uppercase mb-1">{item.category}</p>
                  <h3 className="font-bold text-foreground text-sm sm:text-lg mb-1 truncate">{item.name}</h3>
                  <p className="font-black text-lg">₦{item.price}</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center bg-muted rounded-full p-1 border border-border">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-background/80 transition-colors shadow-sm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-background/80 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Order Summary */}
        <div className="bg-muted/30 rounded-3xl p-6 sm:p-8 space-y-4 border border-border/50">
          <h2 className="text-xl font-bold mb-6">Order Summary</h2>
          
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">₦{subtotal}</span>
          </div>
          
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery Fee (Mart)</span>
            <span className="font-medium text-foreground">₦{MART_DELIVERY_FEE}</span>
          </div>
          
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-black text-2xl text-[#10B981]">₦{total}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {isMartClosed && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 text-amber-700 dark:text-amber-300 flex gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold leading-relaxed">
                Mart checkout is currently closed. CalebDeck operating hours are {openingHour}:00 to {closingHour}:00.
                {isMaintenance && " Ordering is paused for maintenance."}
              </p>
            </div>
          )}
          <Link to={isMartClosed ? "#" : "/mart/checkout"} onClick={(event) => {
            if (isMartClosed) {
              event.preventDefault();
            }
          }}>
            <Button variant="primary" disabled={isMartClosed} className="w-full py-5 text-lg rounded-2xl shadow-xl shadow-[#10B981]/20 bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 disabled:cursor-not-allowed">
              Proceed to Checkout
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

// Simple Badge component specifically for this file to avoid import issues
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${className}`}>{children}</span>;
}
