import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Theme, AccessibilityOptions } from '../types';
import { generateThemeFromPrimary } from '../utils/themeGenerator';

interface ThemeContextProps {
  theme: Theme;
  palette: Record<string, string>;
  customPalette: Record<string, string>;
  accessibility: AccessibilityOptions;
  setTheme: (theme: Theme) => void;
  setPalette: (palette: Record<string, string>) => void;
  setCustomPalette: (palette: Record<string, string>) => void;
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

export const darkPalette: Record<string, string> = {
  '--bg-color': '#08080d',
  '--bg-gradient': 'radial-gradient(circle at 50% 0%, #161624 0%, #08080d 100%)',
  '--panel-bg': 'rgba(17, 17, 27, 0.55)',
  '--panel-border': 'rgba(255, 255, 255, 0.04)',
  '--text-primary': '#cdd6f4',
  '--text-secondary': '#a6adc8',
  '--accent-color': '#74c7ec',
  '--accent-hover': '#89b4fa',
  '--sidebar-bg': 'rgba(10, 10, 15, 0.45)',
  '--content-bg': 'rgba(8, 8, 13, 0.2)',
  '--card-bg': 'rgba(17, 17, 27, 0.35)',
  '--input-bg': 'rgba(0, 0, 0, 0.35)',
  '--hover-overlay': 'rgba(255, 255, 255, 0.05)',
  '--border-subtle': 'rgba(255, 255, 255, 0.04)',
  '--button-text': '#11111b',
  '--scrollbar-thumb': 'rgba(255, 255, 255, 0.1)',
  '--scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.2)',
  '--nav-active-bg': 'rgba(116, 199, 236, 0.08)',
  '--success': '#a6e3a1',
  '--success-rgb': '166, 227, 161',
  '--danger': '#f38ba8',
  '--warning': '#f9e2af',
  '--terminal-selection': 'rgba(116, 199, 236, 0.3)',
};

export const lightPalette: Record<string, string> = {
  '--bg-color': '#f4f4f7',
  '--bg-gradient': 'radial-gradient(circle at 50% 0%, #ffffff 0%, #f4f4f7 100%)',
  '--panel-bg': 'rgba(255, 255, 255, 0.7)',
  '--panel-border': 'rgba(0, 0, 0, 0.08)',
  '--text-primary': '#1e1e2e',
  '--text-secondary': '#5c5f77',
  '--accent-color': '#1e66f5',
  '--accent-hover': '#209fb5',
  '--sidebar-bg': 'rgba(240, 240, 245, 0.85)',
  '--content-bg': 'rgba(244, 244, 247, 0.5)',
  '--card-bg': 'rgba(255, 255, 255, 0.8)',
  '--input-bg': 'rgba(0, 0, 0, 0.04)',
  '--hover-overlay': 'rgba(0, 0, 0, 0.04)',
  '--border-subtle': 'rgba(0, 0, 0, 0.08)',
  '--button-text': '#ffffff',
  '--scrollbar-thumb': 'rgba(0, 0, 0, 0.15)',
  '--scrollbar-thumb-hover': 'rgba(0, 0, 0, 0.25)',
  '--nav-active-bg': 'rgba(30, 102, 245, 0.08)',
  '--success': '#40a02b',
  '--success-rgb': '64, 160, 43',
  '--danger': '#d20f39',
  '--warning': '#df8e1d',
  '--terminal-selection': 'rgba(30, 102, 245, 0.3)',
};

export const highContrastDarkPalette: Record<string, string> = {
  '--bg-color': '#000000',
  '--bg-gradient': '#000000',
  '--panel-bg': '#000000',
  '--panel-border': '#ffffff',
  '--text-primary': '#ffffff',
  '--text-secondary': '#ffff00',
  '--accent-color': '#ffff00',
  '--accent-hover': '#ffff00',
  '--sidebar-bg': '#000000',
  '--content-bg': '#000000',
  '--card-bg': '#000000',
  '--input-bg': '#000000',
  '--hover-overlay': 'rgba(255, 255, 255, 0.25)',
  '--border-subtle': '#ffffff',
  '--button-text': '#000000',
  '--scrollbar-thumb': 'rgba(255, 255, 255, 0.3)',
  '--scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.5)',
  '--nav-active-bg': 'rgba(255, 255, 0, 0.15)',
  '--success': '#00ff00',
  '--success-rgb': '0, 255, 0',
  '--danger': '#ff0000',
  '--warning': '#ffff00',
  '--terminal-selection': 'rgba(255, 255, 255, 0.4)',
};

export const highContrastLightPalette: Record<string, string> = {
  '--bg-color': '#ffffff',
  '--bg-gradient': '#ffffff',
  '--panel-bg': '#ffffff',
  '--panel-border': '#000000',
  '--text-primary': '#000000',
  '--text-secondary': '#0000ff',
  '--accent-color': '#0000ff',
  '--accent-hover': '#0000ff',
  '--sidebar-bg': '#ffffff',
  '--content-bg': '#ffffff',
  '--card-bg': '#ffffff',
  '--input-bg': '#ffffff',
  '--hover-overlay': 'rgba(0, 0, 0, 0.15)',
  '--border-subtle': '#000000',
  '--button-text': '#ffffff',
  '--scrollbar-thumb': 'rgba(0, 0, 0, 0.2)',
  '--scrollbar-thumb-hover': 'rgba(0, 0, 0, 0.4)',
  '--nav-active-bg': 'rgba(0, 0, 255, 0.1)',
  '--success': '#008000',
  '--success-rgb': '0, 128, 0',
  '--danger': '#ff0000',
  '--warning': '#ff8c00',
  '--terminal-selection': 'rgba(0, 0, 255, 0.3)',
};

const defaultTheme: Theme = 'dark'; // NetTool's default is dark theme
const defaultPalette = { ...darkPalette };
const defaultAccessibility: AccessibilityOptions = { highContrast: false, fontSize: 16 };

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Load saved defaults if they exist, otherwise use initial default
  const savedDefaultTheme = store.get('defaultTheme', defaultTheme) as Theme;
  const savedDefaultPalette = store.get('defaultPalette', defaultPalette) as Record<string, string>;
  const savedDefaultAccessibility = store.get('defaultAccessibility', defaultAccessibility) as AccessibilityOptions;

  const [theme, setThemeState] = useState<Theme>(store.get('theme', savedDefaultTheme) as Theme);
  const [customPalette, setCustomPaletteState] = useState<Record<string, string>>(() => {
    const saved = store.get('customPalette', null);
    const defaults = savedDefaultPalette || defaultPalette;
    const base = saved
      ? { ...darkPalette, ...defaults, ...saved }
      : { ...darkPalette, ...defaults };
    if (!base['--primary-color']) {
      base['--primary-color'] = '#74c7ec';
    }
    return base;
  });
  const [accessibility, setAccessibilityState] = useState<AccessibilityOptions>(
    store.get('accessibility', savedDefaultAccessibility) as AccessibilityOptions
  );

  // Active palette depends on the current theme and accessibility settings
  const activePalette = useMemo((): Record<string, string> => {
    if (accessibility.highContrast) {
      return theme === 'light' ? highContrastLightPalette : highContrastDarkPalette;
    }
    if (theme === 'light') {
      return lightPalette;
    }
    if (theme === 'dark') {
      return darkPalette;
    }
    
    // Custom theme: derive full palette from user's primary color
    const primaryColor = customPalette['--primary-color'] || '#74c7ec';
    const generated = generateThemeFromPrimary(primaryColor);
    const merged: Record<string, string> = { ...generated, '--primary-color': primaryColor };

    const hexToRgb = (hex: string) => {
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      return `${r}, ${g}, ${b}`;
    };

    const isHex = (str: string) => typeof str === 'string' && str.startsWith('#');

    const bg = merged['--bg-color'];
    const panel = merged['--panel-bg'];
    const border = merged['--panel-border'];
    const textPri = merged['--text-primary'];
    const accent = merged['--accent-color'];
    const success = merged['--success'];

    const derived = { ...merged };

    // 1. Genel Arka Plan
    derived['--bg-gradient'] = bg; // No complex gradient for custom hex
    derived['--content-bg'] = bg;

    // 2. Paneller ve Yan Menü
    derived['--card-bg'] = panel;
    derived['--sidebar-bg'] = panel;
    derived['--input-bg'] = isHex(bg) ? bg : panel; // Input is usually slightly darker, or same as bg

    // 3. Kenarlıklar
    derived['--border-subtle'] = border;

    // 4. Metin Renkleri
    derived['--button-text'] = bg; // Provide contrast to accent

    // 5. Vurgu Rengi
    derived['--accent-hover'] = accent;
    if (isHex(accent)) {
      derived['--nav-active-bg'] = `rgba(${hexToRgb(accent)}, 0.15)`;
    }

    // 6. Durum Renkleri
    if (isHex(success)) {
      derived['--success-rgb'] = hexToRgb(success);
    }

    // Hover ve Scrollbar efektleri metin renginden türetilir
    if (isHex(textPri)) {
      derived['--hover-overlay'] = `rgba(${hexToRgb(textPri)}, 0.05)`;
      derived['--scrollbar-thumb'] = `rgba(${hexToRgb(textPri)}, 0.15)`;
      derived['--scrollbar-thumb-hover'] = `rgba(${hexToRgb(textPri)}, 0.25)`;
    }

    return derived;
  }, [theme, customPalette, accessibility.highContrast]);

  // Apply CSS variables and classes
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply current active palette variables to root
    Object.entries(activePalette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.classList.toggle('dark', theme === 'dark' || (accessibility.highContrast && theme !== 'light'));
    root.classList.toggle('high-contrast', accessibility.highContrast);
    root.style.fontSize = `${accessibility.fontSize}px`;
  }, [theme, activePalette, accessibility]);

  // Persist current settings in localStorage
  useEffect(() => {
    store.set('theme', theme);
    store.set('customPalette', customPalette);
    store.set('accessibility', accessibility);
  }, [theme, customPalette, accessibility]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setPalette = (newPalette: Record<string, string>) => {
    setCustomPaletteState(prev => {
      const updated = { ...prev, ...newPalette };
      // If we update custom palette, also force theme to custom
      setThemeState('custom');
      return updated;
    });
  };

  const setAccessibility = (options: AccessibilityOptions) => {
    const fontSize = Math.min(24, Math.max(12, options.fontSize));
    setAccessibilityState({ ...options, fontSize });
  };

  const resetToDefaults = () => {
    // Reset to the stored default values
    const defTheme = store.get('defaultTheme', defaultTheme) as Theme;
    const defPalette = store.get('defaultPalette', defaultPalette) as Record<string, string>;
    const defAcc = store.get('defaultAccessibility', defaultAccessibility) as AccessibilityOptions;

    setThemeState(defTheme);
    setCustomPaletteState(defPalette);
    setAccessibilityState(defAcc);
  };

  const saveCurrentAsDefaults = () => {
    store.set('defaultTheme', theme);
    store.set('defaultPalette', theme === 'custom' ? customPalette : (theme === 'light' ? lightPalette : darkPalette));
    store.set('defaultAccessibility', accessibility);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        palette: activePalette,
        customPalette,
        accessibility,
        setTheme,
        setPalette,
        setCustomPalette: (newPalette: Record<string, string>) => setCustomPaletteState(newPalette),
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
