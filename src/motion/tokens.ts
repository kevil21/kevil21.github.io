/**
 * Motion tokens for JS choreography (GSAP, WAAPI, the rail camera). Reads the CSS custom properties so CSS and JS
 * share one vocabulary and reduced-motion collapses both at once.
 */
export type Duration = 'instant' | 'fast' | 'normal' | 'emphasis' | 'cinematic';
export type Easing = 'standard' | 'enter' | 'exit' | 'spring';

const FALLBACK_MS: Record<Duration, number> = {
  instant: 80,
  fast: 160,
  normal: 240,
  emphasis: 400,
  cinematic: 1200,
};
const FALLBACK_EASE: Record<Easing, string> = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  enter: 'cubic-bezier(0, 0, 0, 1)',
  exit: 'cubic-bezier(0.3, 0, 1, 1)',
  spring: 'cubic-bezier(0.2, 0, 0, 1)',
};

function cssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Duration in milliseconds (0 under reduced motion for instant/fast). */
export function durationMs(d: Duration): number {
  const raw = cssVar(`--dur-${d}`);
  if (!raw) return FALLBACK_MS[d];
  const n = raw.endsWith('ms')
    ? Number(raw.slice(0, -2))
    : raw.endsWith('s')
      ? Number(raw.slice(0, -1)) * 1000
      : Number(raw);
  return Number.isFinite(n) ? n : FALLBACK_MS[d];
}

/** Duration in seconds, for GSAP. */
export function durationS(d: Duration): number {
  return durationMs(d) / 1000;
}

/** CSS easing string, for WAAPI. */
export function easing(e: Easing): string {
  return cssVar(`--ease-${e}`) || FALLBACK_EASE[e];
}

export function staggerMs(): number {
  const raw = cssVar('--stagger');
  const n = raw.endsWith('ms') ? Number(raw.slice(0, -2)) : Number(raw);
  return Number.isFinite(n) && raw ? n : 60;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
