import chroma from 'chroma-js';

/**
 * Generates a complete 9-token theme palette from a single primary hex color.
 * Uses LCH color space (CIELAB LCH) for perceptually uniform luminance changes
 * and enforces WCAG AA contrast ratio compliance (>= 4.5:1) against the dark background.
 *
 * @param primaryHex The source primary/accent color chosen by the user.
 * @returns A record containing CSS variable keys and their corresponding color values.
 */
export function generateThemeFromPrimary(primaryHex: string): Record<string, string> {
  // Safe parsing fallback
  let primary;
  try {
    primary = chroma(primaryHex);
  } catch {
    primary = chroma('#74c7ec'); // fallback default
  }

  // Convert to LCH (Lightness: 0-100, Chroma: 0-100+, Hue: 0-360)
  const [pL, pC, pH] = primary.lch();

  // 1. Background Color (--bg-color)
  // Deep dark tech background using primary hue, low lightness and restrained chroma
  const bgL = 6;
  const bgC = Math.min(pC * 0.25, 8);
  const bg = chroma.lch(bgL, bgC, pH);
  const bgHex = bg.hex();

  // 2. Panel/Surface Color (--panel-bg)
  // Slightly lighter panel background, allowing glassmorphism blending
  const panelL = 12;
  const panelC = Math.min(pC * 0.3, 10);
  const panelColor = chroma.lch(panelL, panelC, pH);
  const [pR, pG, pB] = panelColor.rgb();
  const panelBg = `rgba(${pR}, ${pG}, ${pB}, 0.55)`;

  // 3. Panel Border (--panel-border)
  // Translucent border tinted with the primary color for visual cohesion
  const [accentR, accentG, accentB] = primary.rgb();
  const panelBorder = `rgba(${accentR}, ${accentG}, ${accentB}, 0.12)`;

  // 4. Accent Color (--accent-color)
  // Start with user chosen primary color, and scale up lightness if contrast is below WCAG AA (4.5:1)
  let accent = primary;
  let contrast = chroma.contrast(accent, bg);
  if (contrast < 4.5) {
    let currentL = pL;
    let currentC = pC;
    // Walk up lightness
    while (currentL < 95 && chroma.contrast(chroma.lch(currentL, currentC, pH), bg) < 4.5) {
      currentL += 2;
      currentC = Math.max(currentC, 35); // Keep accent vibrant
    }
    accent = chroma.lch(currentL, currentC, pH);
  }
  const accentHex = accent.hex();

  // 5. Text Primary (--text-primary)
  // Almost white, but tinted with the primary hue
  const textPri = chroma.lch(94, Math.min(pC * 0.12, 5), pH);
  const textPriHex = textPri.hex();

  // 6. Text Secondary (--text-secondary)
  // Muted text color, legible but distinct from primary text
  const textSec = chroma.lch(74, Math.min(pC * 0.18, 8), pH);
  const textSecHex = textSec.hex();

  // 7. Success Status Color (--success)
  // Perceptually distinct green (hue ~135) with guaranteed WCAG contrast
  let success = chroma.lch(74, 45, 135);
  if (chroma.contrast(success, bg) < 4.5) {
    let sL = 74;
    while (sL < 95 && chroma.contrast(chroma.lch(sL, 45, 135), bg) < 4.5) {
      sL += 2;
    }
    success = chroma.lch(sL, 45, 135);
  }
  const successHex = success.hex();

  // 8. Danger Status Color (--danger)
  // Perceptually distinct red (hue ~18) with guaranteed WCAG contrast
  let danger = chroma.lch(68, 55, 18);
  if (chroma.contrast(danger, bg) < 4.5) {
    let dL = 68;
    while (dL < 95 && chroma.contrast(chroma.lch(dL, 55, 18), bg) < 4.5) {
      dL += 2;
    }
    danger = chroma.lch(dL, 55, 18);
  }
  const dangerHex = danger.hex();

  // 9. Warning Status Color (--warning)
  // Yellow/orange hue (~72) with guaranteed WCAG contrast
  let warning = chroma.lch(80, 50, 72);
  if (chroma.contrast(warning, bg) < 4.5) {
    let wL = 80;
    while (wL < 95 && chroma.contrast(chroma.lch(wL, 50, 72), bg) < 4.5) {
      wL += 2;
    }
    warning = chroma.lch(wL, 50, 72);
  }
  const warningHex = warning.hex();

  return {
    '--bg-color': bgHex,
    '--panel-bg': panelBg,
    '--panel-border': panelBorder,
    '--text-primary': textPriHex,
    '--text-secondary': textSecHex,
    '--accent-color': accentHex,
    '--success': successHex,
    '--danger': dangerHex,
    '--warning': warningHex,
  };
}
