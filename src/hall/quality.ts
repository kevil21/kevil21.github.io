/**
 * Adaptive quality from measured frame time. Pure logic (no DOM) so it is unit-testable; mount.ts feeds it dt.
 * Profiles: high (DPR ≤ 2, post-processing allowed), medium (DPR ≤ 1.5, no post), phone (DPR ≤ 1.25, instancing caps,
 * no post, fewer particles). Downgrades quickly on sustained slow frames; upgrades slowly after sustained fast ones.
 */
import type { Quality } from './state';

export interface QualityProfile {
  name: Quality;
  maxDpr: number;
  particleCap: number;
  postProcessing: boolean;
  lampsLit: number; // how many practicals cast real light
}

export const PROFILES: Record<Quality, QualityProfile> = {
  high: { name: 'high', maxDpr: 2, particleCap: 6000, postProcessing: true, lampsLit: 8 },
  medium: { name: 'medium', maxDpr: 1.5, particleCap: 3000, postProcessing: false, lampsLit: 5 },
  phone: { name: 'phone', maxDpr: 1.25, particleCap: 1200, postProcessing: false, lampsLit: 3 },
};

const ORDER: Quality[] = ['high', 'medium', 'phone'];

export interface ProbeOptions {
  /** Frame-time budget in ms; above it counts as slow. 1000/50 keeps a little headroom under 60 fps. */
  budgetMs?: number;
  /** Consecutive slow frames before a downgrade. */
  slowFrames?: number;
  /** Consecutive fast frames before an upgrade. */
  fastFrames?: number;
  /** Never upgrade above this (phones stay on the phone profile). */
  ceiling?: Quality;
}

export class FrameProbe {
  private slow = 0;
  private fast = 0;
  private samples: number[] = [];
  readonly budgetMs: number;
  readonly slowFrames: number;
  readonly fastFrames: number;
  ceiling: Quality;
  quality: Quality;

  constructor(initial: Quality, opts: ProbeOptions = {}) {
    this.quality = initial;
    this.budgetMs = opts.budgetMs ?? 20;
    this.slowFrames = opts.slowFrames ?? 45;
    this.fastFrames = opts.fastFrames ?? 240;
    this.ceiling = opts.ceiling ?? 'high';
  }

  /** Feed one frame's delta in ms. Returns the new quality if it changed, else null. */
  sample(dtMs: number): Quality | null {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return null;
    // Ignore tab-switch gaps.
    if (dtMs > 500) return null;
    this.samples.push(dtMs);
    if (this.samples.length > 120) this.samples.shift();

    if (dtMs > this.budgetMs) {
      this.slow++;
      this.fast = 0;
    } else {
      this.fast++;
      this.slow = 0;
    }

    const idx = ORDER.indexOf(this.quality);
    if (this.slow >= this.slowFrames && idx < ORDER.length - 1) {
      this.quality = ORDER[idx + 1]!;
      this.slow = 0;
      this.fast = 0;
      return this.quality;
    }
    const ceilingIdx = ORDER.indexOf(this.ceiling);
    if (this.fast >= this.fastFrames && idx > ceilingIdx) {
      this.quality = ORDER[idx - 1]!;
      this.slow = 0;
      this.fast = 0;
      return this.quality;
    }
    return null;
  }

  /** Average frame time over the recent window (ms). */
  get averageMs(): number {
    if (!this.samples.length) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  get fps(): number {
    const avg = this.averageMs;
    return avg > 0 ? Math.round(1000 / avg) : 0;
  }

  get profile(): QualityProfile {
    return PROFILES[this.quality];
  }
}

/** DPR to use for a profile on this device. */
export function effectiveDpr(profile: QualityProfile, devicePixelRatio: number): number {
  return Math.min(profile.maxDpr, Math.max(1, devicePixelRatio));
}
