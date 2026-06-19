export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  gateway?: string;
}

export interface SerialPortInfo {
  path: string;
  friendlyName?: string;
  manufacturer?: string;
}

// Theme related types
export type Theme = "light" | "dark" | "custom";
export type AccessibilityOptions = {
  highContrast: boolean;
  fontSize: number; // in px, limited 12-24
};
export interface ThemeDefaults {
  theme: Theme;
  palette: Record<string, string>; // CSS variable name -> value
  accessibility: AccessibilityOptions;
}
