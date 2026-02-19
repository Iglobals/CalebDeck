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
            className="fixed bottom-8 right-8 z-[100] w-14 h-14 rounded-3xl bg-secondary text-secondary-foreground shadow-2xl flex items-center justify-center border-4 border-background transition-colors duration-300"
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
                        <Moon className="w-7 h-7" />
                    ) : (
                        <Sun className="w-7 h-7" />
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.button>
    );
};
