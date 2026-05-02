import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext) || { theme: 'dark', setTheme: () => {}, toggle: () => {} };

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        try { return localStorage.getItem('sln_theme') || 'dark'; } catch { return 'dark'; }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('sln_theme', theme); } catch {}
    }, [theme]);

    const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
};
