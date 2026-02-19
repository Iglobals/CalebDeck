import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    studentTheme: Theme;
    adminTheme: Theme;
    riderTheme: Theme;
    toggleStudentTheme: () => void;
    toggleAdminTheme: () => void;
    toggleRiderTheme: () => void;
    applyTheme: (role: 'student' | 'admin' | 'rider') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [studentTheme, setStudentTheme] = useState<Theme>(() => (localStorage.getItem('student-theme') as Theme) || 'light');
    const [adminTheme, setAdminTheme] = useState<Theme>(() => (localStorage.getItem('admin-theme') as Theme) || 'light');
    const [riderTheme, setRiderTheme] = useState<Theme>(() => (localStorage.getItem('rider-theme') as Theme) || 'light');

    const toggleStudentTheme = () => setStudentTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    const toggleAdminTheme = () => setAdminTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    const toggleRiderTheme = () => setRiderTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    useEffect(() => localStorage.setItem('student-theme', studentTheme), [studentTheme]);
    useEffect(() => localStorage.setItem('admin-theme', adminTheme), [adminTheme]);
    useEffect(() => localStorage.setItem('rider-theme', riderTheme), [riderTheme]);

    const applyTheme = (role: 'student' | 'admin' | 'rider') => {
        const theme = role === 'student' ? studentTheme : role === 'admin' ? adminTheme : riderTheme;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <ThemeContext.Provider value={{
            studentTheme, adminTheme, riderTheme,
            toggleStudentTheme, toggleAdminTheme, toggleRiderTheme,
            applyTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
