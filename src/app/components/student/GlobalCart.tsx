import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useMartCart } from '../../../context/MartCartContext';

export function GlobalCart() {
  const { items } = useMartCart();
  const location = useLocation();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Hide global cart on the actual cart, checkout, profile, and food pages to avoid duplicate UI/clutter
  const hidePaths = ['/cart', '/checkout', '/profile', '/plate-builder', '/cafeteria'];
  const isHiddenPath = hidePaths.some(path => location.pathname.includes(path)) || location.pathname === '/';
  
  if (isHiddenPath) {
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
