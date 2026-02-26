import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseClasses = 'font-semibold transition-all duration-200 inline-flex items-center justify-center gap-2';

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-98 shadow-sm disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
    secondary: 'border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground active:scale-98 disabled:border-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
    ghost: 'text-foreground hover:bg-muted active:scale-98 disabled:text-muted-foreground disabled:cursor-not-allowed'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-xl'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
});
