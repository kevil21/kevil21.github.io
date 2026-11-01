/**
 * The control/readout bus between HTML panels (islands), the simulations and the 3D machines.
 * Panels write `controls`; whoever runs the sims (mount.ts with 3D, headless.ts without) applies them and publishes
 * `readouts` a few times a second. Everything is keyed by machine slug.
 */
import { map } from 'nanostores';
import type { ControlValue } from '@/sim/types';

export const controls = map<Record<string, Record<string, ControlValue>>>({});
export const readouts = map<Record<string, Record<string, string | number>>>({});
/** Latest narration line per machine (from decisions when a control changes). */
export const narration = map<Record<string, string>>({});

export function setControlValue(slug: string, id: string, value: ControlValue): void {
  const cur = controls.get()[slug] ?? {};
  controls.setKey(slug, { ...cur, [id]: value });
  window.dispatchEvent(new CustomEvent('sr:control', { detail: { slug, id, value } }));
}

export function getControlValue(slug: string, id: string): ControlValue | undefined {
  return controls.get()[slug]?.[id];
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
  window.dispatchEvent(new CustomEvent('sr:reset'));
}
