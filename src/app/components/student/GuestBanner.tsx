import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../design-system/Button';
import { X, Sparkles, LogIn } from 'lucide-react';

export function GuestBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if not logged in and not dismissed in this session
    if (user === null && !sessionStorage.getItem('calebdeck_guest_banner_dismissed')) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!isVisible || user !== null) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('calebdeck_guest_banner_dismissed', 'true');
    setIsVisible(false);
  };

  const handleLogin = () => {
    // Navigate to the central ICA login flow and pass current origin so we return locally
    window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin)}`;
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-2xl">
      <div 
        className="bg-background/95 backdrop-blur-xl border-2 border-[#7C3AED]/20 shadow-2xl rounded-3xl p-5 md:p-6 overflow-hidden relative group"
        style={{ animation: 'fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors z-10"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row gap-5 items-start md:items-center pr-8">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-[#7C3AED]" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-black tracking-tight mb-1">
              Unlock CalebDeck Fashion & More
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              CalebDeck Fashion is locked for <span className="text-[#7C3AED] font-bold">i-CONs</span> only. Become an i-CON to shop exclusive merch, save your hostel/phone details, and connect your activity across all iGLOBALS products.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 shrink-0">
            <Button 
              variant="secondary" 
              onClick={handleDismiss}
              className="text-xs px-4"
            >
              Continue as guest
            </Button>
            <Button 
              variant="primary" 
              onClick={handleLogin}
              className="text-xs px-4 bg-[#7C3AED] hover:bg-[#6D28D9] border-[#7C3AED] shadow-lg shadow-[#7C3AED]/20"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Become an i-CON
            </Button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
