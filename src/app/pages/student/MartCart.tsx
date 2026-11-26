import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Clock, Shirt, Sparkles } from 'lucide-react';
import { useMartCart } from '../../../context/MartCartContext';
import { Button } from '../../components/design-system/Button';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import SEO from '../../components/SEO';
import { PlatformSettings, subscribeToPlatformSettings } from '../../../services/db';
import { getHexColorName } from '../../../utils/formatColor';
import { PRODUCTS_CONFIG } from '../../../config/brand';

export default function MartCart() {
  const { items, updateQuantity, removeItem } = useMartCart();
  const navigate = useNavigate();
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setPlatformSettings);
    return () => unsub();
  }, []);

  // Automatically purge any legacy Mart items left in localStorage from prior sessions
  useEffect(() => {
    items.forEach((item) => {
      if (item.productType === 'mart') {
        removeItem(item.id);
      }
    });
  }, [items, removeItem]);

  const fashionItems = items.filter((item) => item.productType !== 'mart');
  const fashionCount = fashionItems.reduce((sum, item) => sum + item.quantity, 0);
  const fashionSubtotal = fashionItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const isDev =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const currentHour = new Date().getHours();
  const fashionOpeningHour = platformSettings?.fashionOpeningHour ?? 0;
  const fashionClosingHour = platformSettings?.fashionClosingHour ?? 24;
  const isFashionOutOfHours = currentHour < fashionOpeningHour || currentHour >= fashionClosingHour;
  const isFashionClosed =
    !!platformSettings &&
    (isFashionOutOfHours ||
      platformSettings?.isFashionAcceptingOrders === false ||
      platformSettings?.isFashionComingSoon === true) &&
    !isDev;

  const fashionClosedMessage =
    platformSettings?.fashionClosedMessage ||
    'CalebDeck Fashion checkout is momentarily paused while we prepare the next drop.';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-24">
      <SEO
        title={`Shopping Bag (${fashionCount}) | ${PRODUCTS_CONFIG.fashion.name}`}
        description="Review your selected CalebDeck Fashion pieces before proceeding to checkout."
        canonical="https://calebdeck.com/cart"
        robots="noindex,follow"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl transition-colors hover:bg-muted"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {PRODUCTS_CONFIG.fashion.name}
            </p>
            <h1 className="text-xl font-bold text-foreground leading-tight">Shopping Bag</h1>
          </div>
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA]">
            {fashionCount} {fashionCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {fashionItems.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your bag is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Explore curated streetwear, footwear, and accessories on {PRODUCTS_CONFIG.fashion.name}.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/fashion')}
              className="px-8 py-4 rounded-2xl bg-foreground text-background hover:opacity-90 border-none inline-flex items-center gap-2"
            >
              <Shirt className="w-4 h-4" />
              Browse {PRODUCTS_CONFIG.fashion.name}
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-3xl overflow-hidden mb-8">
              <ul className="divide-y divide-border">
                {fashionItems.map((item) => (
                  <li
                    key={item.id}
                    className={`p-4 sm:p-6 flex items-center gap-4 sm:gap-6 ${
                      isFashionClosed ? 'bg-amber-500/5' : 'bg-card'
                    }`}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted/50 p-2 flex-shrink-0 flex items-center justify-center">
                      <ImageWithFallback
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-xl shadow-sm"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight truncate">
                          {item.name}
                        </h3>
                        {isFashionClosed && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1 mb-2">
                        <p className="text-xs text-muted-foreground">
                          {item.category} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                        </p>
                        {item.size && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">
                            {item.size}
                          </span>
                        )}
                        {item.color && (
                          <div className="flex items-center gap-1">
                            {item.color.startsWith('#') ? (
                              <>
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-border shadow-sm"
                                  style={{ backgroundColor: item.color }}
                                  title={item.color}
                                />
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                  {item.colorName || getHexColorName(item.color)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                {item.color}
                              </span>
                            )}
                          </div>
                        )}
                        {item.variation && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">
                            {item.variation}
                          </span>
                        )}
                      </div>

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
                        aria-label={`Remove ${item.name} from bag`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="bg-foreground text-background font-bold px-3 py-1.5 rounded-full text-xs sm:text-sm">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Order Summary */}
            <div className="bg-muted/30 rounded-3xl p-6 sm:p-8 space-y-4 border border-border/50">
              <h2 className="text-xl font-bold mb-4">Bag Summary</h2>

              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span className="font-semibold text-foreground">₦{fashionSubtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Delivery</span>
                <span className="font-medium text-foreground">Calculated at checkout</span>
              </div>

              <div className="border-t border-border pt-4 mt-4 flex justify-between items-center">
                <span className="font-bold text-lg">Estimated Subtotal</span>
                <span className="font-black text-2xl text-foreground">
                  ₦{fashionSubtotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-8">
              {isFashionClosed && (
                <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex gap-3">
                  <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold leading-relaxed">{fashionClosedMessage}</p>
                </div>
              )}

              <Link
                to={isFashionClosed ? '#' : '/fashion/checkout'}
                onClick={(event) => {
                  if (isFashionClosed) event.preventDefault();
                }}
              >
                <Button
                  variant="primary"
                  disabled={isFashionClosed}
                  className="w-full py-5 text-lg rounded-2xl bg-foreground text-background hover:opacity-90 border-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Continue to Fashion Checkout
                </Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
