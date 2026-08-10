import React from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { ShoppingBag, Wifi, Home, Shirt, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const navItems = [
  { id: 'mart', label: 'Mart', icon: ShoppingBag, path: '/mart' },
  { id: 'calebnet', label: 'CalebNet', icon: Wifi, path: '/calebnet' },
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'fashion', label: 'Fashion', icon: Shirt, path: '/fashion', disabled: true },
  { id: 'profile', label: 'i-CON', icon: User, path: '/profile' },
];

export function FloatingNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <>
      {/* Mobile Bottom Pill */}
      <div className="fixed bottom-6 left-0 right-0 z-[60] flex justify-center px-4 md:hidden pointer-events-none">
        <nav className="glass rounded-[2rem] px-2 py-2 flex items-center gap-2 shadow-2xl pointer-events-auto border border-border/40 relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const isCenter = item.id === 'home';
            
            return (
              <NavLink
                key={item.id}
                to={item.disabled ? '#' : item.path}
                onClick={(e) => item.disabled && e.preventDefault()}
                className={`relative flex flex-col items-center justify-center w-[3.25rem] h-[3.25rem] rounded-2xl transition-all duration-300 ${
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
                    className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <item.icon
                    className={`w-5 h-5 transition-transform duration-300 ${
                      isCenter 
                        ? 'text-primary-foreground scale-110' 
                        : isActive 
                          ? 'text-primary fill-primary/20 scale-110' 
                          : 'text-muted-foreground'
                    }`}
                    strokeWidth={isActive || isCenter ? 2.5 : 2}
                  />
                  <span
                    className={`text-[9px] font-black tracking-wide ${
                      isCenter 
                        ? 'text-primary-foreground' 
                        : isActive 
                          ? 'text-primary' 
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
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed top-0 left-0 bottom-0 z-[60] w-24 flex-col items-center py-8 glass border-r border-border/40">
        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-black text-xl shadow-lg mb-8 squircle">
          C
        </div>
        
        <nav className="flex flex-col gap-4 w-full px-4 flex-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
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
                    className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <item.icon
                    className={`w-6 h-6 transition-all duration-300 ${
                      isCenter 
                        ? 'text-primary-foreground scale-110' 
                        : isActive 
                          ? 'text-primary fill-primary/20 scale-110' 
                          : 'text-muted-foreground group-hover:scale-110'
                    }`}
                    strokeWidth={isActive || isCenter ? 2.5 : 2}
                  />
                  <span
                    className={`text-[10px] font-black tracking-wide ${
                      isCenter 
                        ? 'text-primary-foreground mt-0.5' 
                        : isActive 
                          ? 'text-primary' 
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
      </div>
    </>
  );
}
