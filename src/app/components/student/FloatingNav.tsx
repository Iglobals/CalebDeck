import React from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Home, Shirt, Store, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// Routes where the nav should slide away to avoid blocking product/checkout UI
const HIDDEN_ROUTE_PREFIXES = [
  '/plate-builder',
  '/checkout',
  '/order-success',
  '/mart',
  '/calebnet',
  '/wallet',
  '/my-orders',
  '/fashion/product',
  '/fashion/checkout',
  '/business/product',
];

const navItems: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  disabled?: boolean;
  badgeDot?: boolean;
}> = [
  { id: 'business', label: 'Business', icon: Store, path: '/business' },
  { id: 'caleb-life', label: 'Caleb Life', icon: Gamepad2, path: '/caleb-life', badgeDot: true },
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'fashion', label: 'Fashion', icon: Shirt, path: '/fashion' },
  { id: 'profile', label: 'i-CON', icon: User, path: '/profile' },
];

export function FloatingNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user?.icaSub) return null;

  const isProductPage = HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix + '/')
  );

  return (
    <>
      {/* Mobile Bottom Pill — Home Elevated in the Exact Center */}
      <AnimatePresence>
        {!isProductPage && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-0 right-0 z-[60] flex justify-center px-3 md:hidden pointer-events-none"
          >
            <nav
              aria-label="App navigation"
              className="glass rounded-[2rem] px-2 py-2 flex items-center gap-1.5 sm:gap-2 shadow-2xl pointer-events-auto border border-border/40 relative"
            >
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                const isCenter = item.id === 'home';

                return (
                  <NavLink
                    key={item.id}
                    to={item.disabled ? '#' : item.path}
                    onClick={(e) => item.disabled && e.preventDefault()}
                    className={`relative flex flex-col items-center justify-center w-[3.4rem] h-[3.25rem] rounded-2xl transition-all duration-300 ${
                      isCenter
                        ? '-translate-y-5 bg-primary shadow-xl border-[4px] border-background'
                        : item.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-muted/50'
                    }`}
                    aria-disabled={item.disabled}
                  >
                    {isActive && !isCenter && (
                      <motion.div
                        layoutId="mobile-active-pill"
                        className="absolute inset-0 bg-primary/15 dark:bg-primary/15 rounded-2xl border border-primary/30"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-0.5">
                      <div className="relative">
                        <item.icon
                          className={`w-5 h-5 transition-transform duration-300 ${
                            isCenter
                              ? 'text-primary-foreground scale-110'
                              : isActive
                                ? 'text-secondary dark:text-primary scale-110'
                                : 'text-muted-foreground'
                          }`}
                          strokeWidth={isActive || isCenter ? 2.5 : 2}
                        />
                        {item.badgeDot && !isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[#7C3AED] dark:bg-[#FCD34D]"
                          />
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-black tracking-tight whitespace-nowrap leading-none ${
                          isCenter
                            ? 'text-primary-foreground'
                            : isActive
                              ? 'text-secondary dark:text-primary'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar — Home Elevated in the Exact Center */}
      <AnimatePresence>
        {!isProductPage && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="hidden md:flex fixed top-0 left-0 bottom-0 z-[60] w-24 flex-col items-center py-8 glass border-r border-border/40"
          >
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-black text-xl shadow-lg mb-6 squircle">
              C
            </div>

            <nav aria-label="Desktop app navigation" className="flex flex-col justify-center gap-4 w-full px-3.5 flex-1">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                const isCenter = item.id === 'home';

                return (
                  <NavLink
                    key={item.id}
                    to={item.disabled ? '#' : item.path}
                    onClick={(e) => item.disabled && e.preventDefault()}
                    className={`relative flex flex-col items-center justify-center w-full aspect-square rounded-2xl transition-all duration-300 group ${
                      isCenter
                        ? 'translate-x-3 bg-primary shadow-xl border-[4px] border-background z-10'
                        : item.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-muted/50'
                    }`}
                  >
                    {isActive && !isCenter && (
                      <motion.div
                        layoutId="desktop-active-pill"
                        className="absolute inset-0 bg-primary/15 rounded-2xl border border-primary/30"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <div className="relative">
                        <item.icon
                          className={`w-6 h-6 transition-all duration-300 ${
                            isCenter
                              ? 'text-primary-foreground scale-110'
                              : isActive
                                ? 'text-secondary dark:text-primary scale-110'
                                : 'text-muted-foreground group-hover:scale-110'
                          }`}
                          strokeWidth={isActive || isCenter ? 2.5 : 2}
                        />
                        {item.badgeDot && !isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-[#FCD34D]"
                          />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-black tracking-tight whitespace-nowrap ${
                          isCenter
                            ? 'text-primary-foreground mt-0.5'
                            : isActive
                              ? 'text-secondary dark:text-primary'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
