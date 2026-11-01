/**
 * Theme toggle island: renders the current preference. The click itself is handled by the shell (data-action="theme"
 * → cycleTheme) so it works before this island hydrates; the island only re-renders from the store.
 */
import { useStore } from '@nanostores/preact';
import { themePref, resolvedTheme } from '@/theme/store';
import type { ThemePref } from '@/theme/store';

const LABEL: Record<ThemePref, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
  night: 'Night shift',
};

export default function ThemeToggle() {
  const pref = useStore(themePref);
  const resolved = useStore(resolvedTheme);
  const next = pref === 'system' ? 'light' : pref === 'light' ? 'dark' : 'system';
  return (
    <button
      type="button"
      class="theme-toggle"
      aria-label={`${LABEL[pref]} (${resolved}). Switch to ${LABEL[next].toLowerCase()}`}
      title={LABEL[pref]}
      data-theme-pref={pref}
      data-action="theme"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {pref === 'system' && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8 M12 16v4" />
          </>
        )}
        {pref === 'light' && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4" />
          </>
        )}
        {(pref === 'dark' || pref === 'night') && <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
      </svg>
      <span class="visually-hidden">{LABEL[pref]}</span>
    </button>
  );
}
