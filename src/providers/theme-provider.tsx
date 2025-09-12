// providers/theme-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "notebook" | "coffee" | "graphite" | "mono";

interface ThemeContextType {
  theme: Theme;
  darkMode: boolean;
  setTheme: (theme: Theme) => void;
  setDarkMode: (darkMode: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "notebook",
  darkMode: false,
  setTheme: () => {},
  setDarkMode: () => {},
});

// Helper functions for cookie management (no external deps)
function setCookie(name: string, value: string, days: number = 30) {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function ThemeProvider({
  children,
  defaultTheme = "notebook",
  defaultDarkMode = false,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultDarkMode?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [darkMode, setDarkModeState] = useState(defaultDarkMode);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage/cookies on mount
  useEffect(() => {
    try {
      // Try localStorage first (faster)
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      
      // Fallback to cookies if localStorage is empty
      const cookieTheme = getCookie('theme') as Theme | null;
      const cookieDarkMode = getCookie('darkMode') === 'true';
      
      const finalTheme = savedTheme || cookieTheme || defaultTheme;
      const finalDarkMode = savedDarkMode || cookieDarkMode || defaultDarkMode;
      
      if (finalTheme && ["notebook", "coffee", "graphite", "mono"].includes(finalTheme)) {
        setThemeState(finalTheme);
      }
      setDarkModeState(finalDarkMode);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
    
    setMounted(true);
  }, [defaultTheme, defaultDarkMode]);

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return;

    // Remove all theme classes
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
    
    // Apply new theme
    document.documentElement.setAttribute("data-theme", theme);
    
    if (darkMode) {
      document.documentElement.classList.add("dark");
    }

    // Update CSS variables for dynamic font loading
    const fontMap = {
      notebook: "var(--font-architects-daughter)",
      coffee: "ui-sans-serif, system-ui, sans-serif",
      graphite: "var(--font-inter)",
      mono: "var(--font-geist-mono)",
    };

    document.documentElement.style.setProperty("--font-sans", fontMap[theme]);
  }, [theme, darkMode, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Save to both localStorage and cookie
    try {
      localStorage.setItem('theme', newTheme);
      setCookie('theme', newTheme, 30);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setDarkMode = (newDarkMode: boolean) => {
    setDarkModeState(newDarkMode);
    
    // Save to both localStorage and cookie
    try {
      localStorage.setItem('darkMode', String(newDarkMode));
      setCookie('darkMode', String(newDarkMode), 30);
    } catch (error) {
      console.error('Error saving dark mode:', error);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, darkMode, setTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Global theme provider wrapper for the entire app
export function GlobalThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="notebook" defaultDarkMode={false}>
      {children}
    </ThemeProvider>
  );
}