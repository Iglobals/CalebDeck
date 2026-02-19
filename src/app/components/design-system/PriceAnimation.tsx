import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface PriceAnimationProps {
  amount: number;
  currency?: string;
  className?: string;
}

export function PriceAnimation({ amount, currency = '₦', className = '' }: PriceAnimationProps) {
  const [prevAmount, setPrevAmount] = useState(amount);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (amount !== prevAmount) {
      setIsAnimating(true);
      setPrevAmount(amount);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [amount, prevAmount]);

  return (
    <motion.span
      animate={{
        scale: isAnimating ? [1, 1.1, 1] : 1,
        color: isAnimating ? ['#121212', '#FCD34D', '#121212'] : '#121212'
      }}
      transition={{ duration: 0.3 }}
      className={`font-bold ${className}`}
    >
      {currency}{amount.toLocaleString()}
    </motion.span>
  );
}
