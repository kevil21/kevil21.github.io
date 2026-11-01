/**
 * Optional physics (ADR-011): Rapier WASM, loaded lazily and only on the medium/high profiles. Used for the Policy
 * Sorter's falling policy cards. If loading fails or the profile is `phone`, callers use their scripted fallback.
 */
import type { Quality } from './state';
import type * as RapierNS from '@dimforge/rapier3d-compat';

export type RapierModule = typeof RapierNS;

let loading: Promise<RapierModule | null> | null = null;

export function physicsAllowed(quality: Quality): boolean {
  return quality !== 'phone';
}

export function loadRapier(): Promise<RapierModule | null> {
  if (!loading) {
    loading = import('@dimforge/rapier3d-compat')
      .then(async (R) => {
        await R.init();
        return R;
      })
      .catch((e: unknown) => {
        console.warn('[hall] physics unavailable, using scripted motion:', (e as Error).message);
        return null;
      });
  }
  return loading;
}
