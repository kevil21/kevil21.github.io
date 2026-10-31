import { paletteOpen } from '@/lib/stores/ui';

/** Global ⌘K / Ctrl+K and [data-open-palette] handling. Lives outside the island so the shortcut works
 *  before hydration: the island reads the store on mount and opens immediately. */
let bound = false;
export function bindPaletteShortcut() {
  if (bound) return;
  bound = true;
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteOpen.set(!paletteOpen.get());
    }
  });
  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-open-palette]')) {
      e.preventDefault();
      paletteOpen.set(true);
    }
  });
}
