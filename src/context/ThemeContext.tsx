import React, { createContext, useContext, useState } from 'react';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryGradient: [string, string];
  accent: string;
  accentLight: string;
  navy: string;
  cyan: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  card: string;
  overlay: string;
  success: string;
  warning: string;
  danger: string;
  isDark: boolean;
}

export const LIGHT_THEME: ThemeColors = {
  primary: '#5B4BFF',
  primaryLight: '#EEF0FF',
  primaryGradient: ['#5B4BFF', '#9333EA'],
  accent: '#FF3366',
  accentLight: '#FFE5EC',
  navy: '#0B1F5C',
  cyan: '#06B6D4',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  card: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.55)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  isDark: false,
};

export const DARK_THEME: ThemeColors = {
  primary: '#7C6BFF',
  primaryLight: 'rgba(124, 107, 255, 0.18)',
  primaryGradient: ['#7C6BFF', '#EC4899'],
  accent: '#FF477E',
  accentLight: 'rgba(255, 71, 126, 0.18)',
  navy: '#1E293B',
  cyan: '#22D3EE',
  background: '#090D16',
  surface: '#131A2A',
  surfaceVariant: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  border: '#26334D',
  divider: '#1A2438',
  card: '#131A2A',
  overlay: 'rgba(9, 13, 22, 0.8)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  isDark: true,
};

interface ThemeContextType {
  theme: ThemeColors;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LIGHT_THEME,
  isDarkMode: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
