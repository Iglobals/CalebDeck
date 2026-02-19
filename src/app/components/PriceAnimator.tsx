import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface PriceAnimatorProps {
  value: number;
  className?: string;
}

export function PriceAnimator({ value, className = "" }: PriceAnimatorProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={displayValue}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={className}
      >
        ₦{displayValue.toLocaleString()}
      </motion.span>
    </AnimatePresence>
  );
}
