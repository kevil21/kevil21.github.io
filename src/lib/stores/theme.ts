import { atom, computed } from 'nanostores';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export const THEME_KEY = 'trace:theme';

function readPreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export const themePreference = atom<ThemePreference>(readPreference());

export const systemTheme = atom<ResolvedTheme>(
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
);

export const resolvedTheme = computed([themePreference, systemTheme], (pref, sys) =>
  pref === 'system' ? sys : pref,
);

export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content =
      theme === 'dark' ? (meta.dataset.dark ?? meta.content) : (meta.dataset.light ?? meta.content);
  }
  document.dispatchEvent(new CustomEvent('tracethemechange', { detail: { theme } }));
}

export function setThemePreference(pref: ThemePreference) {
  themePreference.set(pref);
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* storage unavailable: preference lives for this page only */
  }
}

let bound = false;
/** Bind the stores to the document. Idempotent; safe to call from any island. */
export function bindTheme() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => systemTheme.set(e.matches ? 'dark' : 'light'));
  resolvedTheme.subscribe((t) => applyTheme(t));
  // keep other tabs in sync
  addEventListener('storage', (e: StorageEvent) => {
    if (e.key === THEME_KEY) themePreference.set(readPreference());
  });
}
