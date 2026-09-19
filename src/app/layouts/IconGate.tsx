import React from 'react';
import { Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../components/design-system/Button';

export function IconGate() {
  const { user } = useAuth();
  
  if (user?.icaSub) {
    return <Outlet />;
  }
  
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
      <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
        <span className="text-5xl">🌟</span>
      </div>
      <h2 className="text-3xl font-black mb-4 tracking-tight text-foreground">
        Become an i-CON
      </h2>
      <p className="text-muted-foreground mb-10 text-lg max-w-md leading-relaxed">
        This feature is exclusively for i-CON members. Upgrade your account to access CalebDeck Fashion, your i-CON Profile, and Wallet features.
      </p>
      <Button 
        variant="primary" 
        onClick={() => {
           window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin)}`;
        }}
        className="h-14 px-10 rounded-full font-bold text-lg bg-[#FDBA74] text-black hover:bg-[#F97316] shadow-lg transition-transform hover:scale-105"
      >
        Become an i-CON Now
      </Button>
    </div>
  );
}
