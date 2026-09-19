import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Clock } from 'lucide-react';
import { useMartCart } from '../../../context/MartCartContext';
import { Button } from '../../components/design-system/Button';
import { useTheme } from '../../../context/ThemeContext';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import SEO from '../../components/SEO';
import { PlatformSettings, subscribeToPlatformSettings } from '../../../services/db';

export default function MartCart() {
  const { items, updateQuantity, removeItem, totalItems, subtotal } = useMartCart();
  const navigate = useNavigate();
  const { studentTheme } = useTheme();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const MART_DELIVERY_FEE = platformSettings?.martDeliveryFee || 1500; // Dynamic flat fee for Mart Delivery

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
  const isMartClosed = !!platformSettings && (isOutOfHours || isMaintenance) && !isDev;
  const martClosedMessage = platformSettings?.isMartComingSoon === true
    ? (platformSettings?.martClosedMessage || 'CalebDeck Mart is currently closed for restocking. Fresh items will be available soon.')
    : platformSettings?.isAcceptingOrders === false
      ? (platformSettings?.globalClosedMessage || 'CalebDeck is temporarily paused while we make a quick operational update. Please check back shortly.')
      : `CalebDeck Mart checkout is currently closed. Operating hours are ${openingHour}:00 to ${closingHour}:00.`;

  const fashionOpeningHour = platformSettings?.fashionOpeningHour ?? 0;
  const fashionClosingHour = platformSettings?.fashionClosingHour ?? 24;
  const isFashionOutOfHours = currentHour < fashionOpeningHour || currentHour >= fashionClosingHour;
  const isFashionClosed = !!platformSettings && (isFashionOutOfHours || platformSettings?.isFashionAcceptingOrders === false || platformSettings?.isFashionComingSoon === true) && !isDev;

  const fashionItemsInCart = items.filter(item => item.productType === 'fashion' || ['Apparel', 'Accessories', 'Footwear', 'Merch'].includes(item.category));
  const martItemsInCart = items.filter(item => item.productType === 'mart' || (!['Apparel', 'Accessories', 'Footwear', 'Merch'].includes(item.category) && item.productType !== 'fashion'));

  const hasFashionItems = fashionItemsInCart.length > 0;
  const hasMartItems = martItemsInCart.length > 0;

  // Determine if checkout is blocked for the active items
  const isMartItemsBlocked = hasMartItems && isMartClosed;
  const isFashionItemsBlocked = hasFashionItems && isFashionClosed;
  const isMixedCart = hasMartItems && hasFashionItems;
  const isCheckoutBlocked = isMixedCart || (hasMartItems && isMartItemsBlocked) || (hasFashionItems && isFashionItemsBlocked) || (isMartClosed && isFashionClosed);

  // Default route to fashion checkout if only fashion items exist
  const checkoutRoute = (hasFashionItems && !hasMartItems) ? '/fashion/checkout' : '/mart/checkout';

  const total = subtotal + MART_DELIVERY_FEE;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO
        title={`Cart (${totalItems}) - CalebDeck Mart`}
        description="Review your CalebDeck Mart items, delivery fee, and checkout total before placing your campus essentials order."
        canonical="https://calebdeck.com/cart"
        robots="noindex,follow"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted" aria-label="Go back">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Shopping Cart</h1>
          <Badge className="bg-[#10B981]/10 text-[#10B981] ml-auto">{totalItems} items</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {items.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Looks like you haven't added anything to your cart yet. Discover campus essentials and exclusive fashion items.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
              <Button variant="secondary" onClick={() => navigate('/mart')} className="flex-1 py-4 rounded-2xl">
                Shop Mart
              </Button>
              <Button variant="primary" onClick={() => navigate('/fashion')} className="flex-1 py-4 rounded-2xl bg-[#FDBA74] text-black hover:bg-[#F97316] border-none">
                Shop Fashion
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-card border-2 border-border rounded-3xl overflow-hidden mb-8">
          <ul className="divide-y divide-border">
            {items.map(item => {
              const isItemFashion = item.productType === 'fashion' || ['Apparel', 'Accessories', 'Footwear', 'Merch'].includes(item.category);
              const isItemClosed = isItemFashion ? isFashionClosed : isMartClosed;
              
              return (
                <li key={item.id} className={`p-4 sm:p-6 flex items-center gap-4 sm:gap-6 ${isItemClosed ? 'bg-amber-500/5' : 'bg-card'}`}>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted/50 p-2 flex-shrink-0 flex items-center justify-center">
                    <ImageWithFallback src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl shadow-sm" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight truncate">{item.name}</h3>
                      {isItemClosed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          {isItemFashion ? 'Fashion Closed' : 'Mart Closed'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                      <p className="text-xs text-muted-foreground">
                        {item.category} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                      </p>
                      {(item.size || item.color) && (
                        <div className="flex items-center gap-1.5 sm:ml-2">
                          {item.size && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">{item.size}</span>}
                          {item.color && (
                            <div className="flex items-center">
                              {item.color.startsWith('#') ? (
                                <span className="w-3.5 h-3.5 rounded-full border border-border shadow-sm" style={{ backgroundColor: item.color }} title={item.color} />
                              ) : (
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">{item.color}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Quantity Stepper for Mart/Cart */}
                    <div className="flex items-center gap-3 bg-muted/50 rounded-full px-1 py-1 w-max">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-background transition-colors"
                        aria-label={`Reduce ${item.name} quantity`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center font-semibold text-xs">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-background shadow-sm hover:bg-background/80 transition-colors"
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="bg-foreground text-background font-bold px-3 py-1.5 rounded-full text-xs sm:text-sm">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Order Summary */}
        <div className="bg-muted/30 rounded-3xl p-6 sm:p-8 space-y-4 border border-border/50">
          <h2 className="text-xl font-bold mb-6">Order Summary</h2>
          
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">₦{subtotal.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery Fee</span>
            <span className="font-medium text-foreground">₦{MART_DELIVERY_FEE.toLocaleString()}</span>
          </div>
          
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-black text-2xl text-[#10B981]">₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {isMixedCart && (
            <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/20 text-red-700 dark:text-red-400 flex gap-3">
              <ShoppingBag className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold leading-relaxed">
                Your cart contains both instant-delivery Mart items and weekly-batch Fashion items. Please check out Mart and Fashion items separately to track their different delivery timelines.
              </p>
            </div>
          )}
          {hasMartItems && isMartClosed && !isMixedCart && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 text-amber-700 dark:text-amber-300 flex gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold leading-relaxed">
                {martClosedMessage}
              </p>
            </div>
          )}
          <Link to={isCheckoutBlocked ? "#" : checkoutRoute} onClick={(event) => {
            if (isCheckoutBlocked) {
              event.preventDefault();
            }
          }}>
            <Button variant="primary" disabled={isCheckoutBlocked} className="w-full py-5 text-lg rounded-2xl shadow-xl shadow-[#10B981]/20 bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 disabled:cursor-not-allowed">
              Proceed to Checkout
            </Button>
          </Link>
        </div>
        </>
        )}
      </main>
    </div>
  );
}

// Simple Badge component specifically for this file to avoid import issues
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${className}`}>{children}</span>;
}
