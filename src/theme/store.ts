/**
 * Theme state. Preference ∈ system | light | dark | night (night is only ever set by the breaker egg).
 * Resolved theme is written to <html data-theme>, the theme-color meta and announced as `sr:themechange`.
 * The inline pre-paint script (components/ThemeScript.astro) does the same work before first paint without this module.
 */
import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export const THEME_STORAGE_KEY = 'sr:theme';
export const THEME_EVENT = 'sr:themechange';

export type ThemePref = 'system' | 'light' | 'dark' | 'night';
export type ResolvedTheme = 'light' | 'dark' | 'night';

export const themePref = persistentAtom<ThemePref>(THEME_STORAGE_KEY, 'system', {
  encode: (v) => v,
  decode: (v) => (v === 'light' || v === 'dark' || v === 'night' ? v : 'system'),
});

/** Mirrors prefers-color-scheme so `system` can be resolved reactively. */
export const systemPrefersLight = atom<boolean>(false);

export const resolvedTheme = computed([themePref, systemPrefersLight], (pref, light): ResolvedTheme => {
  if (pref === 'light' || pref === 'dark' || pref === 'night') return pref;
  return light ? 'light' : 'dark';
});

export interface ThemeChangeDetail {
  theme: ResolvedTheme;
  pref: ThemePref;
}

export function applyTheme(theme: ResolvedTheme, pref: ThemePref): void {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== theme) root.setAttribute('data-theme', theme);
  root.setAttribute('data-theme-pref', pref);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const colour = meta?.getAttribute(`data-${theme}`);
  if (meta && colour) meta.setAttribute('content', colour);
  window.dispatchEvent(new CustomEvent<ThemeChangeDetail>(THEME_EVENT, { detail: { theme, pref } }));
}

let started = false;

/** Wire the store to the document. Idempotent; call once from the shell's client script. */
export function startTheme(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  systemPrefersLight.set(mq.matches);
  mq.addEventListener('change', (e) => systemPrefersLight.set(e.matches));
  // Subscribe to the inputs, not only the computed value: choosing "light" while the system is already light must
  // still persist and re-label even though the resolved theme does not change.
  const apply = () => applyTheme(resolvedTheme.get(), themePref.get());
  themePref.subscribe(apply);
  systemPrefersLight.subscribe(apply);
  // Astro's ClientRouter swaps <html> attributes from the new document, which has no data-theme: re-apply after swap.
  document.addEventListener('astro:after-swap', () => applyTheme(resolvedTheme.get(), themePref.get()));
}

/** Cycle system → light → dark → system (night is reached only through the breaker). */
export function cycleTheme(): ThemePref {
  const order: ThemePref[] = ['system', 'light', 'dark'];
  const current = themePref.get();
  const idx = order.indexOf(current);
  const next = order[(idx + 1) % order.length] ?? 'system';
  themePref.set(next);
  return next;
}

export function setNightShift(on: boolean): void {
  themePref.set(on ? 'night' : 'dark');
}
