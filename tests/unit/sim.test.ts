import { describe, expect, it } from 'vitest';
import { RefinerySim, REFINERY_VIEWS } from '@/sim/refinery';
import {
  SorterSim,
  SAMPLE_POLICIES,
  riskScore,
  needsHumanGate,
  AUTO_APPROVE_BELOW,
  BLOCKED_SCORE,
  HIGH_RISK_BOOST,
} from '@/sim/sorter';
import { ForecastSim, modelForecast, baselineForecast } from '@/sim/forecast';
import { createSim } from '@/sim';

function run(sim: { step(dt: number): void; drain(): unknown[] }, seconds: number, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) {
    sim.step(dt);
    sim.drain();
  }
}

describe('Telemetry Refinery sim', () => {
  it('is deterministic for a seed and syncs 31 views on the configured interval (1 s = 1 sim minute)', () => {
    const a = new RefinerySim(42);
    const b = new RefinerySim(42);
    run(a, 12);
    run(b, 12);
    expect(a.readouts()).toEqual(b.readouts());
    // default interval 10 → a sync must have started and completed by 12 s
    expect(a.readouts()['views-synced']).toBe(REFINERY_VIEWS);
  });
  it('a shorter interval syncs sooner; chambers follow the tenant count; the gateway gates insights', () => {
    const s = new RefinerySim(1);
    s.setControl('sync-interval', 2);
    s.setControl('tenant-count', 6);
    run(s, 3.8); // first sync starts at 2 s and takes ~1.6 s; the next starts at 4 s
    expect(s.readouts()['views-synced']).toBe(REFINERY_VIEWS);
    expect(s.chambers()).toHaveLength(6);
    expect(s.readouts().chambers).toBeGreaterThan(0);
    const before = s.readouts().insights;
    s.setControl('gateway', false);
    run(s, 4);
    expect(s.readouts().insights).toBe(0);
    s.setControl('gateway', true);
    run(s, 0.1);
    expect(s.readouts().insights).toBeGreaterThanOrEqual(before);
  });
  it('rejects unknown controls and clamps ranges', () => {
    const s = new RefinerySim(1);
    expect(s.setControl('nope', 1)).toBe(false);
    s.setControl('tenant-count', 99);
    expect(s.tenants).toBe(6);
    s.setControl('sync-interval', 0);
    expect(s.syncInterval).toBe(1);
  });
});

describe('Policy Sorter sim', () => {
  it('scores risk with guardrails first: BLOCKED pins 10, HIGH_RISK adds 6, else the rubric', () => {
    expect(riskScore({ blocked: true, highRisk: true, rubric: 1 })).toBe(BLOCKED_SCORE);
    expect(riskScore({ blocked: false, highRisk: true, rubric: 2 })).toBe(2 + HIGH_RISK_BOOST);
    expect(riskScore({ blocked: false, highRisk: false, rubric: 3 })).toBe(3);
    expect(needsHumanGate(AUTO_APPROVE_BELOW - 1)).toBe(false);
    expect(needsHumanGate(AUTO_APPROVE_BELOW)).toBe(true);
  });
  it('auto-approves the low-risk sample policy and files an evidence pack', () => {
    const s = new SorterSim();
    s.setControl('policy', 'bucket-labels');
    run(s, 12);
    expect(s.readouts()['evidence-packs']).toBeGreaterThanOrEqual(1);
  });
  it('holds the high-risk policy at the human gate until the lever is pulled', () => {
    const s = new SorterSim();
    s.setControl('mock-mode', false);
    s.setControl('policy', 'public-ip-ban');
    run(s, 8);
    expect(s.currentStage).toBe('gate');
    expect(s.readouts()['risk-score']).toBe(8);
    run(s, 5);
    expect(s.currentStage).toBe('gate'); // still waiting
    s.setControl('approve', true);
    run(s, 3);
    expect(s.readouts()['evidence-packs']).toBe(1);
  });
  it('pins a blocked pattern to 10 and rejects unknown policies', () => {
    const s = new SorterSim();
    s.setControl('policy', 'sql-backups');
    run(s, 8);
    expect(s.readouts()['risk-score']).toBe(10);
    expect(s.setControl('policy', 'not-a-policy')).toBe(false);
    expect(SAMPLE_POLICIES).toHaveLength(3);
  });
});

describe('Forecast Engine sim', () => {
  it('produces forecasts of the requested horizon and a flat naive baseline', () => {
    const s = new ForecastSim(3);
    s.setControl('horizon', 24);
    expect(s.model()).toHaveLength(24);
    expect(new Set(s.baseline())).toHaveProperty('size', 1);
    s.setControl('horizon', 500);
    expect(s.horizon).toBe(48);
    expect(s.setControl('stream', 'weather')).toBe(false);
    s.setControl('stream', 'irrigation');
    expect(s.readouts().resilience).toContain('as stated in résumé');
    expect(s.readouts().forecast).toContain('not an LSTM');
  });
  it('model and baseline helpers are pure', () => {
    const h = Array.from({ length: 96 }, (_, i) => 100 + 10 * Math.sin(i / 4));
    expect(baselineForecast(h, 5)).toEqual(Array(5).fill(h[95]));
    const m = modelForecast(h, 5);
    expect(m).toHaveLength(5);
    expect(m.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    expect(modelForecast([1, 2, 3], 4)).toEqual([3, 3, 3, 3]); // too little history → baseline
  });
});

describe('factory', () => {
  it('creates sims for bays 1–3 and null otherwise', () => {
    expect(createSim('telemetry-refinery')?.slug).toBe('telemetry-refinery');
    expect(createSim('policy-sorter')?.slug).toBe('policy-sorter');
    expect(createSim('forecast-engine')?.slug).toBe('forecast-engine');
    expect(createSim('calibration-bench')?.slug).toBe('calibration-bench');
    expect(createSim('not-a-machine')).toBeNull();
  });
});

describe('momentary controls (audit 2026-11-02)', () => {
  it('the approval lever only counts while a plan waits at the gate and is consumed when used', () => {
    const s = new SorterSim();
    s.setControl('mock-mode', false);
    s.setControl('approve', true); // pressed with nothing at the gate: ignored, must not pre-approve
    s.setControl('policy', 'public-ip-ban');
    run(s, 8);
    expect(s.currentStage).toBe('gate');
    run(s, 4);
    expect(s.currentStage).toBe('gate'); // the early press did not approve this plan
    s.setControl('approve', true);
    run(s, 4);
    expect(s.readouts()['evidence-packs']).toBe(1);
    // and the next plan at the gate waits again
    run(s, 14);
    expect(s.currentStage).toBe('gate');
  });
  it('sync-now starts a sync at once, not twice, and is never stored as a persistent value', () => {
    const s = new RefinerySim(5);
    s.setControl('sync-interval', 30);
    run(s, 0.5);
    expect(s.isSyncing).toBe(false);
    s.setControl('sync-now', true);
    run(s, 0.1);
    expect(s.isSyncing).toBe(true);
    s.setControl('sync-now', true); // already syncing: ignored
    run(s, 2);
    expect(s.readouts()['views-synced']).toBe(REFINERY_VIEWS);
    expect(s.getControl('sync-now')).toBe(false);
  });
});
