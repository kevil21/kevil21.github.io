import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  controls,
  createControlApplier,
  MOMENTARY_CONTROLS,
  onPulse,
  resetControls,
  setControlValue,
} from '@/hall/bus';

beforeEach(() => {
  controls.set({});
});

describe('control bus', () => {
  it('treats momentary buttons as pulses that never persist in the control map', () => {
    const seen: string[] = [];
    const off = onPulse(({ slug, id }) => seen.push(`${slug}:${id}`));
    setControlValue('data-workbench', 'run-incidents', true);
    setControlValue('policy-sorter', 'approve', true);
    setControlValue('telemetry-refinery', 'sync-now', true);
    setControlValue('telemetry-refinery', 'tenant-count', 5);
    off();
    expect(seen).toEqual([
      'data-workbench:run-incidents',
      'policy-sorter:approve',
      'telemetry-refinery:sync-now',
    ]);
    expect(controls.get()['data-workbench']).toBeUndefined();
    expect(controls.get()['policy-sorter']).toBeUndefined();
    expect(controls.get()['telemetry-refinery']).toEqual({ 'tenant-count': 5 });
    for (const id of ['run-overlays', 'run-incidents', 'run-assets', 'print', 'sync-now', 'approve']) {
      expect(MOMENTARY_CONTROLS.has(id)).toBe(true);
    }
  });

  it('ignores a "false" on a momentary control (it is not a press)', () => {
    const spy = vi.fn();
    const off = onPulse(spy);
    setControlValue('data-workbench', 'run-assets', false);
    off();
    expect(spy).not.toHaveBeenCalled();
  });

  it('applier pushes only changed values, so unrelated edits never re-trigger anything', () => {
    const calls: string[] = [];
    const apply = createControlApplier((slug, id, v) => {
      calls.push(`${slug}.${id}=${String(v)}`);
      return true;
    });
    expect(apply({ 'policy-sorter': { policy: 'bucket-labels', 'mock-mode': true } })).toBe(2);
    expect(apply({ 'policy-sorter': { policy: 'bucket-labels', 'mock-mode': true } })).toBe(0);
    expect(apply({ 'policy-sorter': { policy: 'public-ip-ban', 'mock-mode': true } })).toBe(1);
    expect(calls).toEqual([
      'policy-sorter.policy=bucket-labels',
      'policy-sorter.mock-mode=true',
      'policy-sorter.policy=public-ip-ban',
    ]);
  });

  it('applier re-applies defaults after a reset', () => {
    const calls: string[] = [];
    const apply = createControlApplier((slug, id, v) => {
      calls.push(`${slug}.${id}=${String(v)}`);
      return true;
    });
    apply({ 'forecast-engine': { stream: 'grid', horizon: 12 } });
    apply({ 'forecast-engine': { stream: 'irrigation', horizon: 12 } });
    apply({}); // resetFloor cleared the bus
    apply({ 'forecast-engine': { stream: 'grid', horizon: 12 } }); // panels re-seed defaults
    expect(calls.slice(-2)).toEqual(['forecast-engine.stream=grid', 'forecast-engine.horizon=12']);
  });

  it('resetControls clears controls and narration', () => {
    setControlValue('forecast-engine', 'stream', 'irrigation');
    resetControls();
    expect(controls.get()).toEqual({});
  });
});

describe('machines.json ↔ momentary controls (audit 2026-11-02)', () => {
  it('every button control is momentary and every momentary id is a button on some machine', async () => {
    const machines = (await import('../../src/content/machines.json')).default as Array<{
      slug: string;
      controls: Array<{ id: string; kind: string }>;
    }>;
    const buttons = new Set<string>();
    for (const m of machines)
      for (const c of m.controls) {
        if (c.kind === 'button') {
          buttons.add(c.id);
          expect(MOMENTARY_CONTROLS.has(c.id), `${m.slug}/${c.id} is a button but not momentary`).toBe(true);
        } else {
          expect(MOMENTARY_CONTROLS.has(c.id), `${m.slug}/${c.id} is momentary but not a button`).toBe(false);
        }
      }
    for (const id of MOMENTARY_CONTROLS) expect(buttons.has(id), `${id} has no button`).toBe(true);
  });
});
