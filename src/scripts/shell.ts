/**
 * Shell behaviour bound OUTSIDE islands so it works before hydration (inherited lesson): bottom-bar actions, global
 * keyboard shortcuts, live-region announcements. Islands and the 3D hall subscribe to the same custom events.
 */
import { cycleTheme } from '@/theme/store';
import { lens, setLens } from '@/ai/runtime/lens';
import { setNightShift, themePref } from '@/theme/store';
import { fireEgg } from '@/hall/eggs';
import { mapOpen } from '@/hall/state';

export const SHELL_EVENT = 'sr:action';

export type ShellAction =
  'tour' | 'map' | 'operator' | 'resume' | 'contact' | 'theme' | 'lens' | 'night' | 'coffee';

export interface ShellActionDetail {
  action: ShellAction;
  source: 'bar' | 'key' | 'api';
}

export function dispatchAction(action: ShellAction, source: ShellActionDetail['source'] = 'api'): void {
  window.dispatchEvent(new CustomEvent<ShellActionDetail>(SHELL_EVENT, { detail: { action, source } }));
}

/** Announce to assistive tech via the shell's polite live region. */
export function announce(message: string): void {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  // Re-insert on the next frame so repeated identical messages are announced.
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

let bound = false;

export function bindShell(): void {
  if (bound || typeof window === 'undefined') return;
  bound = true;

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action as ShellAction | undefined;
    if (!action) return;
    if (action === 'theme') {
      const next = cycleTheme();
      announce(`Theme: ${next}`);
      return;
    }
    if (action === 'night') {
      const on = themePref.get() !== 'night';
      setNightShift(on);
      fireEgg({
        egg: 'night-shift',
        message: on
          ? 'Breaker thrown: night shift. A deeper dark built from the same tokens.'
          : 'Breaker reset: back to the day shift.',
        href: '/lab-notebook/#night-shift',
        label: 'Lab notebook',
      });
      return;
    }
    if (action === 'coffee') {
      fireEgg({
        egg: 'coffee-mug',
        message:
          'The mug pours its steam as the hall-power series: dated milestones per month, nothing invented.',
        href: '/#hall-power',
        label: 'See the meter',
      });
      return;
    }
    if (action === 'map') {
      const open = !mapOpen.get();
      mapOpen.set(open);
      target.setAttribute('aria-expanded', String(open));
      dispatchAction('map', 'bar');
      return;
    }
    if (action === 'lens') {
      const next = lens.get() === 'engineer' ? 'recruiter' : 'engineer';
      setLens(next);
      announce(
        `${next === 'engineer' ? 'Engineer' : 'Recruiter'} lens: ${next === 'engineer' ? 'source pointers and decision depth shown' : 'headline facts first'}.`,
      );
      return;
    }
    dispatchAction(action, 'bar');
  });

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
    switch (e.key) {
      case 'r':
      case 'R':
        if (e.shiftKey) return;
        window.location.assign('/resume/');
        break;
      case 'c':
      case 'C':
        if (e.shiftKey) return;
        window.location.assign('/contact/');
        break;
      case 'o':
      case 'O':
        dispatchAction('operator', 'key');
        break;
      case 't':
      case 'T':
        dispatchAction('tour', 'key');
        break;
      case 'm':
      case 'M':
        dispatchAction('map', 'key');
        break;
      case '?':
        announce(
          'Shortcuts: R résumé, C contact, O operator, T tour, M map, arrow keys walk the floor, Escape closes panels.',
        );
        break;
      default:
        return;
    }
  });

  // Re-bind nothing on navigation: listeners live on document and survive ClientRouter swaps.
}
