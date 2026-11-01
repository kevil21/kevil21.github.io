import { describe, expect, it } from 'vitest';
import {
  bayX,
  machinePosition,
  minimapModel,
  railPose,
  railStop,
  FREE_BOUNDS,
  BAY_COUNT,
  HALL_X_MIN,
  HALL_X_MAX,
} from '@/hall/layout';
import { FrameProbe, PROFILES, effectiveDpr } from '@/hall/quality';
import { progressFromScroll } from '@/hall/rail';
import { clampBay, bayForSlug, BAY_MAX } from '@/hall/state';

describe('floor plan', () => {
  it('places six bays at a constant pitch along +x inside the hall', () => {
    for (let b = 1; b <= BAY_COUNT; b++) {
      const p = machinePosition(b);
      expect(p.x).toBeGreaterThan(HALL_X_MIN);
      expect(p.x).toBeLessThan(HALL_X_MAX);
      if (b > 1) expect(bayX(b) - bayX(b - 1)).toBeCloseTo(bayX(2) - bayX(1), 6);
    }
  });
  it('rail stops look at the machine they stand before and stay inside the free-walk bounds', () => {
    for (let s = 0; s <= BAY_COUNT + 1; s++) {
      const pose = railStop(s);
      expect(pose.position.y).toBeGreaterThan(FREE_BOUNDS.minY);
      expect(pose.position.x).toBeGreaterThan(HALL_X_MIN);
      expect(pose.position.x).toBeLessThan(HALL_X_MAX);
      if (s >= 1 && s <= BAY_COUNT) expect(Math.abs(pose.target.x - bayX(s))).toBeLessThan(1.3);
    }
  });
  it('fractional rail progress interpolates monotonically along x between bays', () => {
    let lastX = railPose(1).position.x;
    for (let p = 1.05; p <= 2; p += 0.05) {
      const x = railPose(p).position.x;
      expect(x).toBeGreaterThanOrEqual(lastX - 1e-9);
      lastX = x;
    }
    expect(railPose(2).position.x).toBeCloseTo(railStop(2).position.x, 6);
    expect(railPose(-3).position.x).toBeCloseTo(railStop(0).position.x, 6);
    expect(railPose(99).position.x).toBeCloseTo(railStop(BAY_COUNT + 1).position.x, 6);
  });
  it('portrait poses stand further back and higher', () => {
    const a = railStop(3, false);
    const b = railStop(3, true);
    expect(b.position.y).toBeGreaterThan(a.position.y);
    expect(Math.hypot(b.position.x - b.target.x, b.position.z - b.target.z)).toBeGreaterThan(
      Math.hypot(a.position.x - a.target.x, a.position.z - a.target.z),
    );
  });
  it('minimap model is normalised to a 1000-wide box with six bays inside', () => {
    const m = minimapModel();
    expect(m.width).toBe(1000);
    expect(m.bays).toHaveLength(6);
    for (const b of m.bays) {
      expect(b.x).toBeGreaterThan(0);
      expect(b.x + b.w).toBeLessThan(m.width);
      expect(b.y).toBeGreaterThan(0);
      expect(b.y + b.h).toBeLessThan(m.height);
    }
    expect(m.controlRoom.x).toBeLessThan(m.bays[0]!.x);
    expect(m.backWall.x).toBeGreaterThan(m.bays[5]!.x + m.bays[5]!.w);
  });
});

describe('adaptive quality', () => {
  it('downgrades after sustained slow frames and not on a single spike', () => {
    const p = new FrameProbe('high', { budgetMs: 20, slowFrames: 10, fastFrames: 50 });
    expect(p.sample(80)).toBeNull();
    for (let i = 0; i < 8; i++) expect(p.sample(12)).toBeNull();
    let changed: string | null = null;
    for (let i = 0; i < 10; i++) changed = p.sample(40) ?? changed;
    expect(changed).toBe('medium');
    expect(p.profile).toBe(PROFILES.medium);
  });
  it('keeps degrading to the phone profile and upgrades slowly, never above the ceiling', () => {
    const p = new FrameProbe('medium', { budgetMs: 20, slowFrames: 5, fastFrames: 20, ceiling: 'medium' });
    for (let i = 0; i < 5; i++) p.sample(50);
    expect(p.quality).toBe('phone');
    let up: string | null = null;
    for (let i = 0; i < 20; i++) up = p.sample(8) ?? up;
    expect(up).toBe('medium');
    for (let i = 0; i < 40; i++) expect(p.sample(8)).toBeNull(); // ceiling holds
    expect(p.quality).toBe('medium');
  });
  it('ignores tab-switch gaps and reports fps', () => {
    const p = new FrameProbe('high');
    expect(p.sample(5000)).toBeNull();
    for (let i = 0; i < 10; i++) p.sample(16.7);
    expect(p.fps).toBe(60);
  });
  it('caps device pixel ratio per profile', () => {
    expect(effectiveDpr(PROFILES.phone, 3)).toBe(1.25);
    expect(effectiveDpr(PROFILES.high, 3)).toBe(2);
    expect(effectiveDpr(PROFILES.medium, 1)).toBe(1);
  });
});

describe('rail and state helpers', () => {
  it('maps scroll centre to fractional progress between anchors', () => {
    const anchors = [100, 300, 500];
    expect(progressFromScroll(0, anchors)).toBe(0);
    expect(progressFromScroll(200, anchors)).toBeCloseTo(0.5, 6);
    expect(progressFromScroll(400, anchors)).toBeCloseTo(1.5, 6);
    expect(progressFromScroll(900, anchors)).toBe(2);
  });
  it('clamps bays and resolves slugs', () => {
    expect(clampBay(-2)).toBe(0);
    expect(clampBay(3.6)).toBe(4);
    expect(clampBay(99)).toBe(BAY_MAX);
    expect(bayForSlug('policy-sorter')).toBe(2);
    expect(bayForSlug('nope')).toBe(0);
  });
});

describe('tour schedule', async () => {
  const { TOUR_STOPS, TOUR_TOTAL_SECONDS, advanceTour } = await import('@/hall/tour');
  it('visits every stop once in about 90 seconds and ends at the control room', () => {
    expect(TOUR_STOPS[0]!.bay).toBe(0);
    expect(TOUR_STOPS.at(-1)!.bay).toBe(0);
    const bays = TOUR_STOPS.map((s) => s.bay);
    for (let b = 1; b <= 7; b++) expect(bays.filter((x) => x === b)).toHaveLength(1);
    expect(TOUR_TOTAL_SECONDS).toBeGreaterThanOrEqual(85);
    expect(TOUR_TOTAL_SECONDS).toBeLessThanOrEqual(100);
    for (const s of TOUR_STOPS) expect(s.caption.length).toBeGreaterThan(20);
  });
  it('advances stop by stop and finishes', () => {
    let st = { running: true, index: 0, progress: 0 };
    let changes = 0;
    let finished = false;
    for (let t = 0; t < TOUR_TOTAL_SECONDS + 5 && !finished; t += 0.5) {
      const r = advanceTour(st, 0.5);
      st = r.state;
      if (r.changed !== null) changes++;
      finished = r.finished;
    }
    expect(changes).toBe(TOUR_STOPS.length - 1);
    expect(finished).toBe(true);
    expect(st.running).toBe(false);
  });
});
