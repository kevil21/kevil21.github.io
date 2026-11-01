/**
 * Browser-chrome colours for <meta name="theme-color">, derived at build time from the token file so the hex
 * values never drift from --bg-hall. Parsed from src/styles/tokens/color.css (the single source of colour).
 */
import colorCss from '@/styles/tokens/color.css?raw';
import { oklchToHex } from './oklch';

export type ThemeName = 'dark' | 'light' | 'night';

function blockFor(theme: ThemeName): string {
  const selector = theme === 'dark' ? ':root {' : `:root[data-theme='${theme}'] {`;
  const start = colorCss.indexOf(selector);
  if (start < 0) throw new Error(`theme block not found: ${theme}`);
  const end = colorCss.indexOf('\n  }', start);
  return colorCss.slice(start, end);
}

function tokenIn(block: string, name: string): string {
  const m = new RegExp(`${name}:\\s*(oklch\\([^;]+\\));`).exec(block);
  if (!m) throw new Error(`token ${name} not found in theme block`);
  return m[1]!;
}

export const THEME_COLORS: Record<ThemeName, string> = {
  dark: oklchToHex(tokenIn(blockFor('dark'), '--bg-hall')),
  light: oklchToHex(tokenIn(blockFor('light'), '--bg-hall')),
  night: oklchToHex(tokenIn(blockFor('night'), '--bg-hall')),
};
