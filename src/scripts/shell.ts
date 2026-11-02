/**
 * Shell behaviour bound OUTSIDE islands so it works before hydration (inherited lesson): bottom-bar actions, global
 * keyboard shortcuts, live-region announcements. Islands and the 3D hall subscribe to the same custom events.
 * Document-level listeners survive Astro ClientRouter swaps, so everything here is bound once.
 */
import { persistentAtom } from '@nanostores/persistent';
import { cycleTheme, setNightShift, themePref } from '@/theme/store';
import { lens, setLens } from '@/ai/runtime/lens';
import { fireEgg } from '@/hall/eggs';
import { mapOpen } from '@/hall/state';

export const SHELL_EVENT = 'sr:action';

export type ShellAction = 'tour' | 'map' | 'operator' | 'theme' | 'lens' | 'night' | 'coffee' | 'shortcuts';

export interface ShellActionDetail {
  action: ShellAction;
  source: 'bar' | 'key' | 'api';
}

/**
 * WCAG 2.1.4 (Character Key Shortcuts): single-letter shortcuts need a way to be turned off. Arrow keys, Home, End and
 * Page keys are not character keys and stay on; R, C, O, T, M and ? are governed by this switch (footer and floor plan).
 */
export const shortcuts = persistentAtom<'on' | 'off'>('sr:shortcuts', 'on', {
  encode: (v) => v,
  decode: (v) => (v === 'off' ? 'off' : 'on'),
});

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

const onHallPage = () => document.getElementById('hall-stage') !== null;

/** Reflect the shortcuts switch on every control that carries data-action="shortcuts". */
function syncShortcutsUi(v: 'on' | 'off'): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-action="shortcuts"]')) {
    el.setAttribute('aria-pressed', String(v === 'on'));
    el.textContent = `Keyboard shortcuts: ${v}`;
  }
}

/** Tour and Map live on the hall page; from anywhere else they take you there first. */
function goToHall(query: string): void {
  window.location.assign(`/?${query}`);
}

function toggleMap(origin?: Element | null): void {
  const open = !mapOpen.get();
  mapOpen.set(open);
  (origin ?? document.querySelector('#bottom-bar [data-action="map"]'))?.setAttribute(
    'aria-expanded',
    String(open),
  );
}

let bound = false;

export function bindShell(): void {
  if (bound || typeof window === 'undefined') return;
  bound = true;

  syncShortcutsUi(shortcuts.get());
  shortcuts.subscribe(syncShortcutsUi);
  // The footer and the HUD are re-rendered by soft navigation; keep their label in step.
  document.addEventListener('astro:page-load', () => syncShortcutsUi(shortcuts.get()));

  document.addEventListener('click', (e) => {
    // Hall bay cards: show or hide the control panel (works before the island hydrates)
    const toggle = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-toggle-panel]');
    if (toggle) {
      const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
      if (panel) {
        const open = panel.hasAttribute('hidden');
        panel.toggleAttribute('hidden', !open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Close the control panel' : 'Open the control panel';
        // On phones the bay card is a short scrolling sheet: bring the opened panel into it, so the panel is actually on
        // screen (and its island, hydrated on visibility, wakes up) instead of sitting clipped below the fold.
        if (open) requestAnimationFrame(() => panel.scrollIntoView({ block: 'nearest' }));
      }
      return;
    }
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset['action'] as ShellAction | undefined;
    if (!action) return;
    switch (action) {
      case 'theme':
        announce(`Theme: ${cycleTheme()}`);
        return;
      case 'shortcuts': {
        const next = shortcuts.get() === 'on' ? 'off' : 'on';
        shortcuts.set(next);
        announce(
          next === 'on'
            ? 'Keyboard shortcuts on: R résumé, C contact, O operator, T tour, M map.'
            : 'Keyboard shortcuts off. Arrow keys still walk the floor.',
        );
        return;
      }
      case 'night': {
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
      case 'coffee':
        fireEgg({
          egg: 'coffee-mug',
          message:
            'The mug pours its steam as the hall-power series: dated milestones per month, nothing invented.',
          href: '/#hall-power',
          label: 'See the meter',
        });
        return;
      case 'map':
        if (!onHallPage()) return goToHall('map=1');
        toggleMap(target);
        return;
      case 'tour':
        if (!onHallPage()) return goToHall('tour=1');
        dispatchAction('tour', 'bar');
        return;
      case 'lens': {
        const next = lens.get() === 'engineer' ? 'recruiter' : 'engineer';
        setLens(next);
        announce(
          next === 'engineer'
            ? 'Engineer lens: source pointers and decision depth shown.'
            : 'Recruiter lens: headline facts first.',
        );
        return;
      }
      default:
        dispatchAction(action, 'bar');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (shortcuts.get() === 'off') return;
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
        window.location.assign('/operator/');
        break;
      case 't':
      case 'T':
        if (onHallPage()) dispatchAction('tour', 'key');
        else goToHall('tour=1');
        break;
      case 'm':
      case 'M':
        if (onHallPage()) toggleMap();
        else goToHall('map=1');
        break;
      case '?':
        announce(
          'Shortcuts: R résumé, C contact, O operator, T tour, M map. Arrow keys walk the floor, Escape closes panels. Turn shortcuts off with the button in the footer or the floor plan.',
        );
        break;
      default:
        return;
    }
  });
}
