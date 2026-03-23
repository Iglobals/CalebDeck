import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'purple' | 'green' | 'gray' | 'muted' | 'secondary' | 'amber' | 'emerald';
  className?: string;
}

export function Badge({ children, variant = 'gold', className = '' }: BadgeProps) {
  const variantClasses = {
    gold: 'bg-primary/20 text-primary border-primary/40',
    purple: 'bg-secondary/20 text-secondary border-secondary/40',
    green: 'bg-green-500/20 text-green-500 border-green-500/40',
    emerald: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40',
    gray: 'bg-muted text-muted-foreground border-border',
    muted: 'bg-muted/50 text-muted-foreground border-border/50',
    secondary: 'bg-secondary text-secondary-foreground border-secondary/20',
    amber: 'bg-amber-500/20 text-amber-600 border-amber-500/30'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

interface StatusDotProps {
  status: 'active' | 'inactive';
  label?: string;
  className?: string;
}

export function StatusDot({ status, label, className }: StatusDotProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-secondary' : 'bg-muted-foreground'}`}></span>
      {label && <span className={`text-sm font-medium ${className || 'text-foreground'}`}>{label}</span>}
    </div>
  );
}
