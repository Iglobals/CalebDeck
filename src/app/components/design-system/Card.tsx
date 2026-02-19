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
}

export function GlassCard({ children, className = '', selected = false }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl p-4 backdrop-blur-sm transition-all duration-300 ${selected
          ? 'bg-card/90 border-2 border-primary shadow-lg'
          : 'bg-card/60 border border-border hover:bg-card/80'
        } ${className}`}
    >
      {children}
    </div>
  );
}
