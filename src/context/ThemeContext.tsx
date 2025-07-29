import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../utils/constants';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: typeof THEME;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colors: typeof THEME.colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Charger le thème sauvegardé
    AsyncStorage.getItem('themeMode').then(savedMode => {
      if (savedMode) {
        setThemeModeState(savedMode as ThemeMode);
      }
    });
  }, []);

  useEffect(() => {
    // Déterminer si on est en mode sombre
    if (themeMode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

  // Couleurs adaptées au thème
  const colors = {
    ...THEME.colors,
    background: isDark ? '#1a202c' : THEME.colors.background,
    surface: isDark ? '#2d3748' : THEME.colors.surface,
    text: isDark ? '#f7fafc' : THEME.colors.text,
    textLight: isDark ? '#cbd5e0' : THEME.colors.textLight,
    border: isDark ? '#4a5568' : THEME.colors.border,
  };

  const value: ThemeContextType = {
    theme: { 
      ...THEME, 
      colors,
      fonts: {
        ...THEME.fonts,
        bold: {
          fontFamily: 'System',
          fontWeight: '700'
        },
        medium: {
          fontFamily: 'System',
          fontWeight: '500'
        },
        regular: {
          fontFamily: 'System',
          fontWeight: '400'
        }
      }
    },
    isDark,
    themeMode,
    setThemeMode,
    colors
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}