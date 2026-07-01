import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Theme, AccessibilityOptions } from '../types';

interface ThemeContextProps {
  theme: Theme;
  accessibility: AccessibilityOptions;
  setTheme: (theme: Theme) => void;
  setAccessibility: (options: AccessibilityOptions) => void;
  resetToDefaults: () => void;
  saveCurrentAsDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// Safe storage wrapper using localStorage
class SafeStore {
  get(key: string, defaultValue: any): any {
    try {
      const val = localStorage.getItem(`nettool_${key}`);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  set(key: string, value: any): void {
    try {
      localStorage.setItem(`nettool_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }
}
const store = new SafeStore();

const defaultTheme: Theme = 'dark'; // NetTool's default is dark theme
const defaultAccessibility: AccessibilityOptions = { highContrast: false, fontSize: 16 };

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Load saved defaults if they exist, otherwise use initial default
  const savedDefaultTheme = store.get('defaultTheme', defaultTheme) as Theme;
  const savedDefaultAccessibility = store.get('defaultAccessibility', defaultAccessibility) as AccessibilityOptions;

  const [theme, setThemeState] = useState<Theme>(store.get('theme', savedDefaultTheme) as Theme);
  const [accessibility, setAccessibilityState] = useState<AccessibilityOptions>(
    store.get('accessibility', savedDefaultAccessibility) as AccessibilityOptions
  );

  // Apply CSS classes for themes (CSS variables are now purely in index.css)
  useEffect(() => {
    const root = document.documentElement;
    
    // In previous versions, highContrast with light theme forced light mode class rules in CSS, 
    // but the cleanest way is just toggling classes.
    root.classList.toggle('dark', theme === 'dark' || (accessibility.highContrast && theme !== 'light'));
    root.classList.toggle('high-contrast', accessibility.highContrast);
    root.style.fontSize = `${accessibility.fontSize}px`;
  }, [theme, accessibility]);

  // Persist current settings in localStorage
  useEffect(() => {
    store.set('theme', theme);
    store.set('accessibility', accessibility);
  }, [theme, accessibility]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccessibility = (options: AccessibilityOptions) => {
    const fontSize = Math.min(24, Math.max(12, options.fontSize));
    setAccessibilityState({ ...options, fontSize });
  };

  const resetToDefaults = () => {
    const defTheme = store.get('defaultTheme', defaultTheme) as Theme;
    const defAcc = store.get('defaultAccessibility', defaultAccessibility) as AccessibilityOptions;
    setThemeState(defTheme);
    setAccessibilityState(defAcc);
  };

  const saveCurrentAsDefaults = () => {
    store.set('defaultTheme', theme);
    store.set('defaultAccessibility', accessibility);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accessibility,
        setTheme,
        setAccessibility,
        resetToDefaults,
        saveCurrentAsDefaults
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
