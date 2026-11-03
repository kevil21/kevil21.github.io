import { describe, expect, it } from 'vitest';
import machines from '@/content/machines.json';
import { createSim } from '@/sim';
import { RefinerySim } from '@/sim/refinery';
import { SorterSim, SAMPLE_POLICIES } from '@/sim/sorter';
import { ForecastSim, rollingFolds } from '@/sim/forecast';
import { WorkbenchSim } from '@/sim/workbench';
import { CalibrationSim } from '@/sim/calibration';
import { FoundationsSim } from '@/sim/foundations';
import { INSTRUMENTS } from '@/hall/data/instruments';
import { POWER_SERIES } from '@/hall/data/power';
import { Ring, describe as altText, fmt, hash01, niceMax, tableOf, type VizSpec } from '@/viz/spec';

function run(sim: { step(dt: number): void; drain(): unknown[] }, seconds: number, dt = 1 / 30) {
  for (let t = 0; t < seconds; t += dt) {
    sim.step(dt);
    sim.drain();
  }
}

/** Every number in a spec must be a finite number (or null where a line breaks). */
function finiteEverywhere(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(finiteEverywhere);
  if (v && typeof v === 'object') return Object.values(v).every(finiteEverywhere);
  return true;
}

const SLUGS = machines.map((m) => m.slug);
const make = (slug: string) => createSim(slug, 7, { instruments: INSTRUMENTS, power: POWER_SERIES })!;

describe('viz spec helpers', () => {
  it('Ring keeps the newest `cap` values', () => {
    const r = new Ring(3);
    [1, 2, 3, 4, 5].forEach((v) => r.push(v));
    expect(r.values()).toEqual([3, 4, 5]);
    expect(r.last()).toBe(5);
  });
  it('niceMax, fmt and hash01 behave', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(130)).toBe(200);
    expect(niceMax(2.4)).toBe(2.5);
    expect(fmt(null)).toBe('—');
    expect(fmt(12345.6)).toBe('12,346');
    expect(fmt(0.5)).toBe('0.5');
    for (let i = 0; i < 50; i++) {
      const h = hash01(i, 3);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
    expect(hash01(4, 9)).toBe(hash01(4, 9));
  });
});

describe('every machine publishes live instruments', () => {
  it.each(SLUGS)('%s: unique ids, finite numbers, JSON-able, a text twin for each', (slug) => {
    const sim = make(slug);
    run(sim, 25);
    const specs = sim.viz();
    expect(specs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
    expect(JSON.parse(JSON.stringify(specs))).toEqual(specs);
    for (const s of specs) {
      expect(
        finiteEverywhere(
          s.kind === 'lines' ? { ...s, series: s.series.map((x) => x.points.filter((p) => p !== null)) } : s,
        ),
      ).toBe(true);
      const twin = tableOf(s);
      expect(twin.head.length).toBeGreaterThan(0);
      expect(twin.rows.length).toBeGreaterThan(0);
      expect(altText(s).length).toBeGreaterThan(10);
      if (s.kind === 'heat')
        for (const row of s.cells) for (const c of row) expect(c >= 0 && c <= 1).toBe(true);
    }
  });
  it.each(SLUGS)('%s: every scenario option in machines.json is accepted, anything else is not', (slug) => {
    const def = machines
      .find((m) => m.slug === slug)!
      .controls.find((c) => c.id === 'scenario' || c.id === 'playback');
    expect(def).toBeTruthy();
    const sim = make(slug);
    if (def!.id === 'scenario') {
      for (const o of def!.options!) expect(sim.setControl('scenario', o)).toBe(true);
      expect(sim.setControl('scenario', 'nonsense')).toBe(false);
    } else expect(sim.setControl('playback', false)).toBe(true);
  });
  it('machines.json controls and readouts line up with what the sims produce', () => {
    for (const m of machines) {
      const sim = make(m.slug);
      run(sim, 2);
      const controls = sim.controls();
      for (const c of m.controls) expect(c.id in controls).toBe(true);
      const keys = Object.keys(sim.readouts());
      for (const r of m.readouts) expect(keys).toContain(r.id);
    }
  });
});

describe('Telemetry Refinery scenarios', () => {
  it('late arrivals are caught by the overlap only in that scenario; duplicates collapse in all', () => {
    const steady = new RefinerySim(3);
    const late = new RefinerySim(3);
    late.setControl('scenario', 'late-arrivals');
    run(steady, 45);
    run(late, 45);
    expect(steady.readouts()['late-docs-caught']).toBe(0);
    expect(late.readouts()['late-docs-caught']).toBeGreaterThan(0);
    expect(steady.readouts()['duplicates-collapsed']).toBeGreaterThan(0);
    const ledger = late.viz().find((s) => s.id === 'overlap-ledger')!;
    expect(ledger.kind).toBe('bars');
  });
  it('a surge adds spans on tenant 1 and the stacked chart carries every tenant', () => {
    const calm = new RefinerySim(3);
    const surge = new RefinerySim(3);
    surge.setControl('scenario', 'tenant-surge');
    let calmMax = 0;
    let surgeMax = 0;
    for (let t = 0; t < 60; t += 1 / 30) {
      calm.step(1 / 30);
      surge.step(1 / 30);
      calm.drain();
      surge.drain();
      calmMax = Math.max(calmMax, Number(calm.readouts()['spans-per-second']));
      surgeMax = Math.max(surgeMax, Number(surge.readouts()['spans-per-second']));
    }
    expect(surgeMax).toBeGreaterThan(calmMax * 1.3);
    const spans = surge.viz().find((s) => s.id === 'spans')!;
    expect(spans.kind === 'lines' && spans.series.length).toBe(4 + 1); // four tenants + the dogfooding feed
  });
  it('the sync heat map fills column by column as views sync, and the insight grid fills over time', () => {
    const s = new RefinerySim(1);
    run(s, 20);
    const heat = s.viz().find((v) => v.id === 'sync-heat')!;
    expect(heat.kind === 'heat' && heat.rows.length).toBe(31);
    const insights = s.viz().find((v) => v.id === 'insight-types')!;
    expect(insights.kind === 'heat' && insights.cells[0]!.filter((c) => c === 1).length).toBeGreaterThan(0);
  });
  it('stays deterministic per seed with instruments on', () => {
    const a = new RefinerySim(9);
    const b = new RefinerySim(9);
    a.setControl('scenario', 'late-arrivals');
    b.setControl('scenario', 'late-arrivals');
    run(a, 30);
    run(b, 30);
    expect(a.viz()).toEqual(b.viz());
  });
});

describe('Policy Sorter scenarios', () => {
  function drive(s: SorterSim, seconds: number) {
    const seen: string[] = [];
    for (let t = 0; t < seconds; t += 1 / 30) {
      s.step(1 / 30);
      for (const e of s.drain()) if (e.type === 'card') seen.push(String(e['policy']));
      if (s.currentStage === 'gate') s.setControl('approve', true);
    }
    return seen;
  }
  it('rotate walks all three sample policies in order, starting at the selected one', () => {
    const s = new SorterSim();
    s.setControl('scenario', 'rotate');
    const seen = drive(s, 60);
    expect(seen.slice(0, 3)).toEqual(SAMPLE_POLICIES.map((p) => p.id));
    expect(seen[3]).toBe(SAMPLE_POLICIES[0]!.id);
  });
  it('single keeps the selected policy', () => {
    const s = new SorterSim();
    s.setControl('policy', 'public-ip-ban');
    const seen = drive(s, 30);
    expect(new Set(seen)).toEqual(new Set(['public-ip-ban']));
  });
  it('the waterfall ends at the real score for each sample policy and the ledger records how it was approved', () => {
    for (const [id, score] of [
      ['bucket-labels', 3],
      ['public-ip-ban', 8],
      ['sql-backups', 10],
    ] as const) {
      const s = new SorterSim();
      s.setControl('policy', id);
      const w = s.viz().find((v) => v.id === 'risk-build')!;
      expect(w.kind).toBe('waterfall');
      if (w.kind === 'waterfall') {
        const total = w.steps.at(-1)!;
        expect(total.kind).toBe('total');
        expect(total.delta).toBe(score);
      }
    }
    const s = new SorterSim();
    drive(s, 20); // bucket-labels: score 3, auto-approved
    const ledger = s.viz().find((v) => v.id === 'evidence-ledger')!;
    expect(ledger.kind === 'bars' && ledger.items.length).toBeGreaterThan(0);
    expect(ledger.kind === 'bars' && ledger.items[0]!.note).toBe('auto-approved');
  });
  it('the pipeline view shows the gate waiting for a high-risk plan, and skips it for a low-risk one', () => {
    const s = new SorterSim();
    s.setControl('policy', 'sql-backups');
    for (let t = 0; t < 30 && s.currentStage !== 'gate'; t += 1 / 30) {
      s.step(1 / 30);
      s.drain();
    }
    const stages = s.viz().find((v) => v.id === 'pipeline')!;
    expect(stages.kind === 'stages' && stages.items.find((i) => i.label === 'Human gate')!.state).toBe(
      'waiting',
    );
    const low = new SorterSim();
    for (let t = 0; t < 30 && low.currentStage !== 'execute'; t += 1 / 30) {
      low.step(1 / 30);
      low.drain();
    }
    const lowStages = low.viz().find((v) => v.id === 'pipeline')!;
    expect(lowStages.kind === 'stages' && lowStages.items.find((i) => i.label === 'Human gate')!.state).toBe(
      'skipped',
    );
  });
});

describe('Forecast Engine scenarios', () => {
  it('rollingFolds scores every fold against the naive baseline and is pure', () => {
    const f = new ForecastSim(5);
    const h = f.history();
    const a = rollingFolds(h, 12);
    expect(a.folds).toHaveLength(5);
    expect(a.residuals).toHaveLength(60);
    expect(a.folds.every((x) => x.modelMae >= 0 && x.baselineMae >= 0)).toBe(true);
    expect(rollingFolds(h, 12)).toEqual(a);
    expect(rollingFolds([1, 2, 3], 5)).toEqual({ folds: [], residuals: [] });
  });
  it('live shows the forecast line and the landing bars; backtest adds folds, residuals and the win count', () => {
    const s = new ForecastSim(5);
    const live = s.viz().map((v) => v.id);
    expect(live).toEqual(['forecast-line', 'daily-shape', 'horizon-values']);
    s.setControl('scenario', 'backtest');
    expect(s.viz().map((v) => v.id)).toEqual([
      'forecast-line',
      'daily-shape',
      'folds',
      'residuals',
      'fold-wins',
    ]);
    expect(String(s.readouts()['backtest'])).toMatch(/of 5 folds beat the naive baseline/);
  });
  it('the forecast line joins history at "now" and carries a band', () => {
    const s = new ForecastSim(5);
    s.setControl('horizon', 8);
    s.setControl('baseline', true);
    const line = s.viz()[0]!;
    expect(line.kind).toBe('lines');
    if (line.kind === 'lines') {
      expect(line.series.map((x) => x.id)).toEqual(['history', 'model', 'baseline']);
      expect(line.series[0]!.points).toHaveLength(96 + 8);
      expect(line.split).toBe(95);
      expect(line.band?.hi).toHaveLength(96 + 8);
    }
  });
});

describe('Data Workbench scenarios', () => {
  function runStation(s: WorkbenchSim) {
    s.setControl('run-overlays', true);
    run(s, 6);
  }
  it('fresh: every run adds documents; replay: re-ingesting the same ids collapses them', () => {
    const fresh = new WorkbenchSim();
    runStation(fresh);
    runStation(fresh);
    expect(fresh.readouts()['docs-in-index']).toBe(3600);
    expect(fresh.readouts()['duplicates-collapsed']).toBe(0);

    const replay = new WorkbenchSim();
    replay.setControl('scenario', 'replay');
    runStation(replay);
    runStation(replay);
    runStation(replay);
    expect(replay.readouts()['docs-in-index']).toBe(1800);
    expect(replay.readouts()['duplicates-collapsed']).toBe(3600);
  });
  it('the funnel and the throughput trace move while a station runs', () => {
    const s = new WorkbenchSim();
    s.setControl('run-assets', true);
    run(s, 2.5);
    const specs = s.viz();
    const rate = specs.find((v) => v.id === 'throughput')!;
    expect(rate.kind === 'lines' && Math.max(...(rate.series[0]!.points as number[]))).toBeGreaterThan(500);
    const funnel = specs.find((v) => v.id === 'funnel')!;
    expect(funnel.kind === 'bars' && funnel.items[0]!.value).toBeGreaterThan(0);
  });
});

describe('Calibration Bench scenarios', () => {
  it('timeline counts every dated instrument once; the issuer filter zeroes the rest', () => {
    const s = new CalibrationSim(INSTRUMENTS);
    s.setControl('scenario', 'timeline');
    const sum = (spec: VizSpec) =>
      spec.kind === 'columns' ? spec.series.reduce((a, x) => a + x.values.reduce((b, v) => b + v, 0), 0) : -1;
    const all = s.viz().find((v) => v.id === 'cert-timeline')!;
    expect(sum(all)).toBe(10);
    expect(all.kind === 'columns' && all.categories.length).toBe(27); // 2024-03 … 2026-05
    s.setControl('issuer', 'AWS');
    expect(sum(s.viz().find((v) => v.id === 'cert-timeline')!)).toBe(2);
  });
  it('issuers view lists the three issuers with their latest month from info.md', () => {
    const s = new CalibrationSim(INSTRUMENTS);
    const bars = s.viz().find((v) => v.id === 'cert-issuers')!;
    expect(bars.kind === 'bars' && bars.items.map((i) => [i.label, i.value])).toEqual([
      ['AWS', 2],
      ['Microsoft', 5],
      ['Founderz', 3],
    ]);
    expect(bars.kind === 'bars' && bars.items[2]!.note).toBe('latest May 2026');
  });
  it('the printer gauge follows a print job', () => {
    const s = new CalibrationSim(INSTRUMENTS);
    s.setControl('print', true);
    run(s, 1.5);
    const g = s.viz().find((v) => v.id === 'printer')!;
    expect(g.kind === 'gauge' && g.max).toBe(10);
    expect(g.kind === 'gauge' && g.value).toBeGreaterThan(0);
  });
});

describe('Foundations Generator playback', () => {
  it('the playhead runs along the real series, pauses, and jumps to a turbine’s first year', () => {
    const s = new FoundationsSim(POWER_SERIES);
    const a = s.playheadIndex;
    run(s, 4);
    expect(s.playheadIndex).toBeGreaterThan(a);
    s.setControl('playback', false);
    const frozen = s.playheadIndex;
    run(s, 4);
    expect(s.playheadIndex).toBe(frozen);
    s.setControl('turbine', 'gdsc');
    expect(s.power[s.playheadIndex]!.month.startsWith('2023')).toBe(true);
    expect(String(s.readouts()['playhead'])).toContain('2023');
  });
  it('the per-year chart highlights only the selected turbine’s years', () => {
    const s = new FoundationsSim(POWER_SERIES);
    s.setControl('turbine', 'school');
    const cols = s.viz().find((v) => v.id === 'power-years')!;
    expect(cols.kind).toBe('columns');
    if (cols.kind === 'columns') {
      const idx = cols.categories.indexOf('2018');
      expect(cols.series[0]!.values[idx]).toBeGreaterThanOrEqual(0);
      expect(cols.series[1]!.values[idx]).toBe(0);
      const idx2 = cols.categories.indexOf('2025');
      expect(cols.series[0]!.values[idx2]).toBe(0);
    }
  });
});

describe('Data Workbench tallies', () => {
  it('never count more cleaned or ingested records than were run', () => {
    const s = new WorkbenchSim();
    s.setControl('run-overlays', true);
    run(s, 8, 1 / 20);
    const funnel = s.viz().find((v) => v.id === 'funnel')!;
    expect(funnel.kind === 'bars' && funnel.items[0]!.value).toBe(1800);
    expect(funnel.kind === 'bars' && funnel.items[1]!.value).toBe(1800);
  });
});
