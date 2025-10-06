// apps/mobile/src/providers/ThemeProvider.tsx
import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, ThemeName } from '@/constants/themes';
import { useColorScheme } from 'react-native';

interface ThemeState {
  themeName: ThemeName;
  isDark: boolean;
  isLoading: boolean;
}

type ThemeAction =
  | { type: 'SET_THEME'; payload: ThemeName }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_DARK_MODE'; payload: boolean }
  | { type: 'LOAD_SAVED_THEME'; payload: Omit<ThemeState, 'isLoading'> }
  | { type: 'SET_LOADING'; payload: boolean };

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME':
      AsyncStorage.setItem('theme', action.payload);
      return { ...state, themeName: action.payload };
    case 'TOGGLE_DARK_MODE':
      const newDarkMode = !state.isDark;
      AsyncStorage.setItem('darkMode', JSON.stringify(newDarkMode));
      return { ...state, isDark: newDarkMode };
    case 'SET_DARK_MODE':
      AsyncStorage.setItem('darkMode', JSON.stringify(action.payload));
      return { ...state, isDark: action.payload };
    case 'LOAD_SAVED_THEME':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

interface ThemeContextValue {
  theme: typeof themes[ThemeName];
  themeName: ThemeName;
  isDark: boolean;
  isLoading: boolean;
  colors: typeof themes[ThemeName]['colors']['light'];
  setTheme: (theme: ThemeName) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  
  const [state, dispatch] = useReducer(themeReducer, {
    themeName: 'notebook',
    isDark: false,
    isLoading: true,
  });

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [savedTheme, savedDarkMode] = await Promise.all([
          AsyncStorage.getItem('theme'),
          AsyncStorage.getItem('darkMode'),
        ]);
        
        dispatch({
          type: 'LOAD_SAVED_THEME',
          payload: {
            themeName: (savedTheme as ThemeName) || 'notebook',
            isDark: savedDarkMode ? JSON.parse(savedDarkMode) : (systemColorScheme === 'dark'),
          },
        });
      } catch (error) {
        console.error('Error loading theme:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const currentTheme = themes[state.themeName];
    const colors = state.isDark ? currentTheme.colors.dark : currentTheme.colors.light;

    return {
      theme: currentTheme,
      themeName: state.themeName,
      isDark: state.isDark,
      isLoading: state.isLoading,
      colors,
      setTheme: (theme: ThemeName) => dispatch({ type: 'SET_THEME', payload: theme }),
      toggleDarkMode: () => dispatch({ type: 'TOGGLE_DARK_MODE' }),
      setDarkMode: (isDark: boolean) => dispatch({ type: 'SET_DARK_MODE', payload: isDark }),
    };
  }, [state]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};