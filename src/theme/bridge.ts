/**
 * The token bridge: the single way non-CSS surfaces (Three.js materials and lights, particles, canvas, SVG written
 * from JS) obtain colours. Reads computed custom properties from <html>, converts OKLCH → sRGB, caches per theme, and
 * re-reads on `sr:themechange`. Nothing outside src/styles/tokens may hold a literal colour (scripts/lint-tokens.ts).
 */
import { parseCssColor, type Rgba } from './oklch';
import { THEME_EVENT, type ThemeChangeDetail } from './store';

export type TokenName =
  | '--bg-hall'
  | '--bg-floor'
  | '--surface'
  | '--surface-2'
  | '--surface-3'
  | '--line'
  | '--ink'
  | '--ink-2'
  | '--ink-3'
  | '--fog'
  | '--fill-amber'
  | '--fill-amber-dim'
  | '--ink-amber'
  | '--fill-brass'
  | '--ink-brass'
  | '--fill-ember'
  | '--ink-ember'
  | '--fill-teal'
  | '--ink-teal'
  | '--fill-sage'
  | '--ink-sage'
  | '--fill-steel'
  | '--fill-steel-dark'
  | '--fill-enamel'
  | '--fill-glass';

export type ScalarToken = '--lamp-intensity' | '--emissive-boost' | '--fog-near' | '--fog-far';

const cache = new Map<string, Rgba>();
const scalarCache = new Map<string, number>();

function computed(): CSSStyleDeclaration {
  return getComputedStyle(document.documentElement);
}

/** Read a colour token as sRGB (0..1 channels). Throws if the token is missing or unparsable. */
export function tokenColor(name: TokenName): Rgba {
  const hit = cache.get(name);
  if (hit) return hit;
  const raw = computed().getPropertyValue(name).trim();
  const rgba = parseCssColor(raw);
  if (!rgba) throw new Error(`Token ${name} is not a parsable colour: "${raw}"`);
  cache.set(name, rgba);
  return rgba;
}

/** Read a numeric token (e.g. lamp intensity). */
export function tokenScalar(name: ScalarToken, fallback = 1): number {
  const hit = scalarCache.get(name);
  if (hit !== undefined) return hit;
  const raw = computed().getPropertyValue(name).trim();
  const n = raw === '' ? fallback : Number(raw);
  const v = Number.isFinite(n) ? n : fallback;
  scalarCache.set(name, v);
  return v;
}

/** Hex form for SVG/canvas attributes. */
export function tokenHex(name: TokenName): string {
  const { r, g, b } = tokenColor(name);
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** `rgba()` form for canvas fill styles that need alpha. */
export function tokenCss(name: TokenName, alpha?: number): string {
  const { r, g, b, a } = tokenColor(name);
  const al = alpha ?? a;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${al})`;
}

export function invalidateTokenCache(): void {
  cache.clear();
  scalarCache.clear();
}

/**
 * Subscribe to theme changes. The callback runs after the cache is cleared, so reading tokens inside it yields the
 * new theme's values. Returns an unsubscribe function.
 */
export function onThemeChange(cb: (detail: ThemeChangeDetail) => void): () => void {
  const handler = (e: Event) => {
    invalidateTokenCache();
    cb((e as CustomEvent<ThemeChangeDetail>).detail);
  };
  window.addEventListener(THEME_EVENT, handler);
  return () => window.removeEventListener(THEME_EVENT, handler);
}
