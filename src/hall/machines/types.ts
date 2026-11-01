/** Contract every machine assembly implements. Scene 3 ships static assemblies; scenes 4–5 add the simulations. */
import type { Group } from 'three';
import type { Kit } from '../kit/parts';
import type { QualityProfile } from '../quality';

export interface MachineContext {
  kit: Kit;
  profile: QualityProfile;
  /** Seed for deterministic sample data. */
  seed: number;
}

export interface MachineAssembly {
  slug: string;
  group: Group;
  /** Called every frame with dt in seconds and the elapsed time; idle animation when not running. */
  update(dt: number, t: number): void;
  /** Lamps on/off (the opening sequence lights bays one by one). */
  setLit(lit: boolean): void;
  /** Apply a control value from the panel/Operator. Returns false if unknown. */
  setControl(id: string, value: number | boolean | string): boolean;
  /** Current readouts for the HTML panel (sample data). */
  readouts(): Record<string, string | number>;
  /** Quality profile changed: cap particles etc. */
  setProfile(profile: QualityProfile): void;
  dispose(): void;
}

/** Small deterministic PRNG (mulberry32) so sample data is stable per machine. */
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
