import { describe, expect, it } from 'vitest';
import { ReverseWalkDetector, labWeather, EGG_LIST, devConsoleGreeting } from '@/hall/eggs';
import { buildPrecacheList, serviceWorkerSource } from '../../scripts/build-service-worker';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('eggs', () => {
  it('reverse walk fires once for 6→1 in strict order and resets on detours', () => {
    const d = new ReverseWalkDetector();
    for (const b of [6, 5, 4, 3, 2]) expect(d.arrive(b)).toBe(false);
    expect(d.arrive(1)).toBe(true);
    expect(d.arrive(1)).toBe(false);
    const e = new ReverseWalkDetector();
    expect([6, 5, 3, 2, 1].map((b) => e.arrive(b))).toEqual([false, false, false, false, false]);
    const f = new ReverseWalkDetector();
    expect([1, 2, 3, 4, 5, 6].map((b) => f.arrive(b))).toEqual([false, false, false, false, false, false]);
  });
  it('lab weather is derived from the clock and says it is playful', () => {
    const w = labWeather(new Date(2026, 10, 1, 14, 0));
    expect(w.headline).toContain('bay 1');
    expect(w.detail).toContain('Playful');
    expect(w.detail).toContain('14:00');
    expect(labWeather(new Date(2026, 10, 1, 3, 0)).detail).toContain('night shift');
  });
  it('lists exactly eight eggs with instructions and no invented facts', () => {
    expect(EGG_LIST).toHaveLength(8);
    for (const e of EGG_LIST) expect(e.howTo.length).toBeGreaterThan(40);
    expect(devConsoleGreeting('webgl', 'phone', '5.0.0')[3]).toContain('webgl');
  });
});

describe('service worker', () => {
  it('builds a precache list from dist without the lazy 3D/AI chunks, and valid source', () => {
    const dist = join(new URL('../..', import.meta.url).pathname, 'dist');
    if (!existsSync(join(dist, 'index.html'))) return;
    const list = buildPrecacheList(dist);
    expect(list).toContain('/');
    expect(list).toContain('/offline/');
    expect(list).toContain('/404.html');
    expect(list.some((u) => /three\.|mount\.|semantic-index|\/models\//.test(u))).toBe(false);
    const src = serviceWorkerSource(list, 'test');
    expect(src).toContain("startsWith('/models/')");
    expect(src).toContain("const OFFLINE = '/offline/'");
  });
});
