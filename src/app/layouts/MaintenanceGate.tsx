import React, { useState, useEffect } from 'react';
import { subscribeToPlatformSettings, PlatformSettings } from '../../services/db';
import { ShieldAlert, Construction, Settings, Wrench } from 'lucide-react';
import { Logo } from '../components/design-system/Logo';
import { useLocation } from 'react-router';

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsub = subscribeToPlatformSettings(setSettings);
    return () => unsub();
  }, []);

  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!settings) return <>{children}</>;

  // Global ordering pause
  const isGlobalMaintenance = settings.isAcceptingOrders === false;
  
  // Feature specific gates based on path
  const isMartPath = location.pathname.startsWith('/mart');
  const isIPizzaPath = location.pathname.startsWith('/ipizza');

  // Global Maintenance Gate
  if (isGlobalMaintenance && !isDev) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <Wrench className="w-12 h-12 text-primary" />
        </div>
        <Logo size="lg" className="mb-6" />
        <h1 className="text-4xl font-black mb-4">System Maintenance</h1>
        <p className="text-xl text-muted-foreground max-w-lg mb-8">
          We are currently upgrading CalebDeck to serve you better. The platform is temporarily paused. Please check back shortly!
        </p>
      </div>
    );
  }

  // Mart Gate
  if (isMartPath && settings.isMartComingSoon === true && !isDev) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-8">
          <Construction className="w-12 h-12 text-yellow-500" />
        </div>
        <Logo size="lg" className="mb-6" />
        <h1 className="text-4xl font-black mb-4">Mart is Restocking!</h1>
        <p className="text-xl text-muted-foreground max-w-lg mb-8">
          CalebDeck Mart is currently closed for stocking. We'll be back shortly with fresh items!
        </p>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // iPizza Gate
  if (isIPizzaPath && settings.isIPizzaComingSoon !== false && !isDev) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-8">
          <Settings className="w-12 h-12 text-orange-500" />
        </div>
        <Logo size="lg" className="mb-6" />
        <h1 className="text-4xl font-black mb-4">iPizza is Coming Soon!</h1>
        <p className="text-xl text-muted-foreground max-w-lg mb-8">
          We are in the lab crafting the perfect slices. iPizza will be launching very soon. Stay tuned!
        </p>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      {isDev && (isGlobalMaintenance || (isMartPath && settings.isMartComingSoon) || (isIPizzaPath && settings.isIPizzaComingSoon !== false)) && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-red-500 text-white text-xs px-3 py-2 rounded-lg font-bold shadow-lg opacity-80 pointer-events-none">
          DEV MODE: Bypassing Maintenance Gates
        </div>
      )}
      {children}
    </>
  );
}
