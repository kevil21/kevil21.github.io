/**
 * The control/readout bus between HTML panels (islands), the simulations and the 3D machines. DOM-free, so it is
 * unit-testable and safe to import anywhere.
 *
 * - `controls` holds PERSISTENT control values (sliders, selects, toggles). Panels write it; whoever runs the sims
 *   (mount.ts with 3D, headless.ts without) applies it through `createControlApplier`, which only pushes values that
 *   changed since the last apply.
 * - MOMENTARY controls (buttons: run a pipeline, print, sync now, pull the approval lever) are PULSES. They are events,
 *   never stored: a stored `true` would be re-applied whenever any other control on the machine changed.
 * - `readouts` and `narration` flow the other way.
 */
import { map } from 'nanostores';
import type { ControlValue } from '@/sim/types';

export const controls = map<Record<string, Record<string, ControlValue>>>({});
export const readouts = map<Record<string, Record<string, string | number>>>({});
/** Latest narration line per machine (from decisions when a control changes). */
export const narration = map<Record<string, string>>({});

/** Buttons, not state. Keep in sync with the `button` kinds in src/content/machines.json (a unit test checks it). */
export const MOMENTARY_CONTROLS: ReadonlySet<string> = new Set([
  'approve',
  'run-overlays',
  'run-incidents',
  'run-assets',
  'print',
  'sync-now',
]);

export interface PulseDetail {
  slug: string;
  id: string;
}

const pulseListeners = new Set<(d: PulseDetail) => void>();

/** Subscribe to button presses. Returns an unsubscribe function. */
export function onPulse(cb: (d: PulseDetail) => void): () => void {
  pulseListeners.add(cb);
  return () => {
    pulseListeners.delete(cb);
  };
}

export function pulseControl(slug: string, id: string): void {
  for (const cb of [...pulseListeners]) cb({ slug, id });
}

export function setControlValue(slug: string, id: string, value: ControlValue): void {
  if (MOMENTARY_CONTROLS.has(id)) {
    if (value === true) pulseControl(slug, id);
    return;
  }
  const cur = controls.get()[slug] ?? {};
  controls.setKey(slug, { ...cur, [id]: value });
}

export function getControlValue(slug: string, id: string): ControlValue | undefined {
  return controls.get()[slug]?.[id];
}

/**
 * Build a function that applies a controls snapshot to a target, pushing only values that differ from what was last
 * applied. When a machine disappears from the snapshot (resetFloor), its memory is dropped so that the defaults the
 * panels re-seed are applied again. Returns the number of values applied.
 */
export function createControlApplier(
  apply: (slug: string, id: string, value: ControlValue) => boolean,
): (all: Record<string, Record<string, ControlValue>>) => number {
  const last = new Map<string, Map<string, ControlValue>>();
  return (all) => {
    let applied = 0;
    for (const slug of [...last.keys()]) if (!(slug in all)) last.delete(slug);
    for (const [slug, values] of Object.entries(all)) {
      let seen = last.get(slug);
      if (!seen) last.set(slug, (seen = new Map()));
      for (const [id, v] of Object.entries(values)) {
        if (seen.has(id) && seen.get(id) === v) continue;
        seen.set(id, v);
        if (apply(slug, id, v)) applied++;
      }
    }
    return applied;
  };
}

export function publishReadouts(slug: string, values: Record<string, string | number>): void {
  readouts.setKey(slug, values);
}

export function narrate(slug: string, line: string): void {
  narration.setKey(slug, line);
}

/** resetFloor tool: clear every control so panels re-seed their defaults (and the machines follow). */
export function resetControls(): void {
  controls.set({});
  narration.set({});
}
