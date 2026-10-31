import { useStore } from '@nanostores/preact';
import { bindTheme, setThemePreference, themePreference, type ThemePreference } from '@/lib/stores/theme';
import { reducedMotion } from '@/lib/stores/motion';

const options: { id: ThemePreference; label: string; icon: string }[] = [
  { id: 'system', label: 'System', icon: 'M4 6h16v10H4zM2 19h20' },
  {
    id: 'light',
    label: 'Light',
    icon: 'M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5-1.4 1.4M7.9 16.1l-1.4 1.4m0-11 1.4 1.4m8.2 8.2 1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  },
  { id: 'dark', label: 'Dark', icon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  bindTheme();
  const pref = useStore(themePreference);

  function choose(next: ThemePreference, ev: MouseEvent | KeyboardEvent) {
    if (next === pref) return;
    const root = document.documentElement;
    const before = root.dataset.theme;
    const canTransition = 'startViewTransition' in document && !reducedMotion.get();
    if (!canTransition) {
      setThemePreference(next);
      return;
    }
    const target = ev.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : innerHeight / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('is-theme-switching');
    const vt = (
      document as Document & {
        startViewTransition: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
      }
    ).startViewTransition(() => setThemePreference(next));
    vt.ready
      .then(() => {
        if (root.dataset.theme === before) return; // system → same theme: nothing to reveal
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 520, easing: 'cubic-bezier(.2,0,0,1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove('is-theme-switching'));
  }

  return (
    <div
      class={`theme-toggle ${compact ? 'theme-toggle--compact' : ''}`}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={pref === o.id}
          aria-label={o.label}
          title={o.label}
          class="theme-toggle__btn"
          onClick={(e) => choose(o.id, e)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d={o.icon} />
          </svg>
          {!compact && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
