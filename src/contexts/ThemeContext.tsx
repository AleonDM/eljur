import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  customColor: string | null;
  setCustomColor: (color: string | null) => void;
  resetColor: () => void;
}

const DEFAULT_PRIMARY_COLOR = '#1976d2';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as ThemeMode) || 'light';
  });

  const [customColor, setCustomColor] = useState<string | null>(() => {
    const savedColor = localStorage.getItem('customThemeColor');
    return savedColor || null;
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  useEffect(() => {
    if (customColor) {
      localStorage.setItem('customThemeColor', customColor);
    } else {
      localStorage.removeItem('customThemeColor');
    }
  }, [customColor]);

  const toggleTheme = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const resetColor = () => {
    setCustomColor(null);
  };

  return (
    <ThemeContext.Provider value={{ 
      mode, 
      toggleTheme, 
      customColor, 
      setCustomColor,
      resetColor
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { DEFAULT_PRIMARY_COLOR }; 