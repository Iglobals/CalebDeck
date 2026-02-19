import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`inline-flex items-baseline ${sizeClasses[size]} ${className}`}>
      <span className="font-bold" style={{ color: '#7C3AED' }}>Caleb</span>
      <span className="font-bold relative" style={{ color: '#FCD34D' }}>
        Deck!
        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#FCD34D]"></span>
      </span>
    </div>
  );
}
