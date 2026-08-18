import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useMartCart } from '../../../context/MartCartContext';

export function GlobalCart() {
  const { items } = useMartCart();
  const location = useLocation();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Only show on shopping hubs to prevent clutter
  const showPaths = ['/mart', '/fashion', '/gadgets'];
  const hidePaths = ['/cart', '/checkout', '/profile', '/plate-builder', '/cafeteria'];
  
  const isShoppingPath = showPaths.some(path => location.pathname.startsWith(path));
  const isHiddenPath = hidePaths.some(path => location.pathname.includes(path)) || location.pathname === '/';
  
  if (!isShoppingPath || isHiddenPath) {
    return null;
  }

  return (
    <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50">
      <Link 
        id="global-cart"
        to="/cart" 
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
