import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    onToggle: () => void;
    variant?: 'floating' | 'inline';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle, variant = 'floating' }) => {
    if (variant === 'inline') {
        return (
            <button
                onClick={onToggle}
                className="w-10 h-10 rounded-xl bg-muted hover:bg-secondary/10 hover:text-secondary transition-all flex items-center justify-center group"
                aria-label="Toggle theme"
            >
                {theme === 'light' ? (
                    <Moon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                ) : (
                    <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                )}
            </button>
        );
    }

    return (
        <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggle}
            className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] w-11 h-11 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-secondary text-secondary-foreground shadow-2xl flex items-center justify-center border-2 sm:border-4 border-background transition-colors duration-300"
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={theme}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {theme === 'light' ? (
                        <Moon className="w-5 h-5 sm:w-7 sm:h-7" />
                    ) : (
                        <Sun className="w-5 h-5 sm:w-7 sm:h-7" />
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.button>
    );
};
