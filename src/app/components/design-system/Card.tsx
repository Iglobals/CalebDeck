import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  const hoverClass = hover ? 'hover:shadow-xl transition-shadow duration-300 cursor-pointer' : '';

  return (
    <div
      className={`bg-card text-card-foreground rounded-2xl p-6 transition-all duration-300 ${hoverClass} ${className}`}
      style={{
        boxShadow: 'var(--caleb-shadow)',
        border: '1px solid var(--border)'
      }}
    >
      {children}
    </div>
  );
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  unavailable?: boolean;
}

export function GlassCard({ children, className = '', selected = false, unavailable = false }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl p-4 backdrop-blur-sm transition-all duration-300 relative overflow-hidden ${selected
          ? 'bg-card/90 border-2 border-primary shadow-lg'
          : 'bg-card/60 border border-border hover:bg-card/80'
        } ${unavailable ? 'opacity-75' : ''} ${className}`}
    >
      {unavailable && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl
          bg-background/60 dark:bg-black/65 backdrop-blur-[2px]
          border-2 border-dashed border-border">
          <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Unavailable</span>
        </div>
      )}
      <div className={unavailable ? 'pointer-events-none select-none' : ''}>
        {children}
      </div>
    </div>
  );
}
