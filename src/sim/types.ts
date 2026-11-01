/**
 * Simulations are pure TypeScript (no DOM, no Three.js): deterministic, seeded, unit-testable, and shared by the 3D
 * machines, the HTML control panels and the Operator's narration. Every number they emit is SAMPLE DATA; the plaques
 * hold the facts. Shapes (stages, thresholds, intervals) come from the fact ledger.
 */
export type ControlValue = number | boolean | string;

export interface SimEvent {
  type: string;
  [key: string]: unknown;
}

export interface Sim<R extends Record<string, string | number> = Record<string, string | number>> {
  readonly slug: string;
  /** Advance by dt seconds of wall time (each sim scales to its own clock). */
  step(dt: number): void;
  setControl(id: string, value: ControlValue): boolean;
  getControl(id: string): ControlValue | undefined;
  controls(): Record<string, ControlValue>;
  readouts(): R;
  /** Events since the last drain (particle spawns, stage changes, packs filed…). */
  drain(): SimEvent[];
}

/** mulberry32: small, fast, deterministic. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
