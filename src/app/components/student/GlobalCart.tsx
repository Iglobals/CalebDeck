import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useMartCart } from '../../../context/MartCartContext';

export function GlobalCart() {
  const { items } = useMartCart();
  const location = useLocation();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Hide global cart on the actual cart and checkout pages to avoid duplicate UI
  if (location.pathname.includes('/cart') || location.pathname.includes('/checkout')) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Link 
        id="global-cart"
        to="/mart/cart" 
        className="relative flex items-center justify-center w-12 h-12 bg-card border border-border shadow-md rounded-xl hover:bg-muted/50 transition-colors"
        aria-label={`Open Cart with ${totalItems} items`}
      >
        <ShoppingBag className="w-5 h-5 text-foreground" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-in zoom-in duration-200">
            {totalItems}
          </span>
        )}
      </Link>
    </div>
  );
}
