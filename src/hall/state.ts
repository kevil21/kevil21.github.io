/**
 * Hall state shared by the 3D scene, the HTML islands (minimap, panels) and the Operator's tool executors.
 * Everything that changes the floor goes through these stores; nothing mutates the scene directly from outside.
 */
import { atom, map } from 'nanostores';

export type RenderTier = 'pending' | 'webgpu' | 'webgl' | 'static';
export type Quality = 'high' | 'medium' | 'phone';
export type WalkMode = 'rail' | 'free';
export type OpeningPhase = 'pending' | 'running' | 'done' | 'skipped';

/** 0 = control room; 1–6 = bays; 7 = back wall (hall power meter). */
export const BAY_MIN = 0;
export const BAY_MAX = 7;

export const hall = map<{
  tier: RenderTier;
  quality: Quality;
  mode: WalkMode;
  bay: number;
  opening: OpeningPhase;
  paused: boolean;
  fps: number;
}>({
  tier: 'pending',
  quality: 'high',
  mode: 'rail',
  bay: 0,
  opening: 'pending',
  paused: false,
  fps: 0,
});

/** Phone HUD sheet open state (toggled by the bar's Map button via the shell, before any island hydrates). */
export const mapOpen = atom<boolean>(false);

/** Continuous rail progress 0..BAY_MAX (fractional between bays), driven by scroll or keys. */
export const railProgress = atom<number>(0);

export const HALL_EVENT = 'sr:hall';
export interface HallEventDetail {
  type: 'walk' | 'mode' | 'tier' | 'quality' | 'opening';
  bay?: number;
  mode?: WalkMode;
  tier?: RenderTier;
  quality?: Quality;
}

function emit(detail: HallEventDetail): void {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent<HallEventDetail>(HALL_EVENT, { detail }));
}

export function clampBay(b: number): number {
  return Math.min(BAY_MAX, Math.max(BAY_MIN, Math.round(b)));
}

/** Walk the rail to a bay. The scene animates toward railProgress; the minimap updates from `bay`. */
export function walkTo(bay: number): void {
  const b = clampBay(bay);
  hall.setKey('bay', b);
  railProgress.set(b);
  if (hall.get().mode !== 'rail') hall.setKey('mode', 'rail');
  emit({ type: 'walk', bay: b });
}

export function stepBay(delta: number): void {
  walkTo(hall.get().bay + delta);
}

export function setMode(mode: WalkMode): void {
  if (hall.get().mode === mode) return;
  hall.setKey('mode', mode);
  emit({ type: 'mode', mode });
}

export function setTier(tier: RenderTier): void {
  hall.setKey('tier', tier);
  emit({ type: 'tier', tier });
}

export function setQuality(quality: Quality): void {
  if (hall.get().quality === quality) return;
  hall.setKey('quality', quality);
  emit({ type: 'quality', quality });
}

export function setOpening(phase: OpeningPhase): void {
  hall.setKey('opening', phase);
  emit({ type: 'opening' });
}

export const BAY_SLUGS = [
  'control-room',
  'telemetry-refinery',
  'policy-sorter',
  'forecast-engine',
  'data-workbench',
  'calibration-bench',
  'foundations-generator',
  'hall-power',
] as const;
export type BaySlug = (typeof BAY_SLUGS)[number];

export function bayForSlug(slug: string): number {
  const i = (BAY_SLUGS as readonly string[]).indexOf(slug);
  return i < 0 ? 0 : i;
}

/** Back to the initial state when the hall page is left (soft navigation), so the next visit starts clean. */
export function resetHallState(): void {
  hall.set({
    tier: 'pending',
    quality: 'high',
    mode: 'rail',
    bay: 0,
    opening: 'pending',
    paused: false,
    fps: 0,
  });
  railProgress.set(0);
  mapOpen.set(false);
}
