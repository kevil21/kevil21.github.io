import { describe, expect, it } from 'vitest';
import { executeTool } from '../../src/ai/runtime/executors';
import { controls, resetControls } from '../../src/hall/bus';

describe('tool executors validate against the machine definitions (audit 2026-11-02)', () => {
  it('rejects a control that does not exist and changes nothing', () => {
    resetControls();
    const r = executeTool(
      { name: 'setControl', args: { machine: 'policy-sorter', control: 'warp-drive', value: 9 } } as never,
      [],
    );
    expect(r.ok).toBe(false);
    expect(controls.get()['policy-sorter']?.['warp-drive']).toBeUndefined();
  });

  it('clamps ranges, rejects bad select options and wrong types', () => {
    resetControls();
    const ok = executeTool(
      {
        name: 'setControl',
        args: { machine: 'telemetry-refinery', control: 'tenant-count', value: 9999 },
      } as never,
      [],
    );
    expect(ok.ok).toBe(true);
    const n = controls.get()['telemetry-refinery']?.['tenant-count'];
    expect(typeof n).toBe('number');
    expect(n as number).toBeLessThan(9999);
    expect(
      executeTool(
        {
          name: 'setControl',
          args: { machine: 'policy-sorter', control: 'policy', value: 'nonsense' },
        } as never,
        [],
      ).ok,
    ).toBe(false);
    expect(
      executeTool(
        {
          name: 'setControl',
          args: { machine: 'policy-sorter', control: 'mock-mode', value: 'yes' },
        } as never,
        [],
      ).ok,
    ).toBe(false);
  });

  it('runMachine on the refinery pulses sync-now and never stores it', () => {
    resetControls();
    const r = executeTool({ name: 'runMachine', args: { machine: 'telemetry-refinery' } } as never, []);
    expect(r.ok).toBe(true);
    expect(controls.get()['telemetry-refinery']?.['sync-now']).toBeUndefined();
  });
});
