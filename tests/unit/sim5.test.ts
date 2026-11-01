import { describe, expect, it } from 'vitest';
import { WorkbenchSim, STATIONS } from '@/sim/workbench';
import { CalibrationSim } from '@/sim/calibration';
import { FoundationsSim } from '@/sim/foundations';
import { buildPowerSeries, monthRange, POWER_EVENTS } from '@/hall/data/power';
import { INSTRUMENTS } from '@/hall/data/instruments';
import { SKILL_CABLES } from '@/hall/data/skills';

function run(sim: { step(dt: number): void; drain(): unknown[] }, seconds: number, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) {
    sim.step(dt);
    sim.drain();
  }
}

describe('Data Workbench sim', () => {
  it('runs a station through ingest → clean → index → visualise and lights its screen', () => {
    const s = new WorkbenchSim();
    expect(s.readouts()).toEqual({ 'records-cleaned': 0, 'jar-level': 0, screens: 0 });
    s.setControl('run-incidents', true);
    expect(s.getControl('run-incidents')).toBe(false); // momentary
    run(s, 6);
    const st = s.station('incidents');
    expect(st.phase).toBe('done');
    expect(st.lit).toBe(true);
    expect(st.cleaned).toBe(2400);
    expect(s.readouts().screens).toBe(1);
    expect(s.readouts()['jar-level']).toBe(33);
  });
  it('runs three stations independently', () => {
    const s = new WorkbenchSim();
    for (const st of STATIONS) s.setControl(`run-${st}`, true);
    run(s, 6);
    expect(s.readouts().screens).toBe(3);
    expect(s.readouts()['jar-level']).toBe(100);
    expect(s.setControl('run-nope', true)).toBe(false);
  });
});

describe('Calibration Bench sim', () => {
  it('has ten instruments from the certifications collection and filters by issuer', () => {
    expect(INSTRUMENTS).toHaveLength(10);
    const s = new CalibrationSim(INSTRUMENTS);
    expect(s.readouts().instruments).toBe(10);
    s.setControl('issuer', 'Founderz');
    expect(s.readouts().instruments).toBe(3);
    expect(s.readouts().latest).toContain('May 2026');
    expect(s.readouts().latest).toContain('[source: info.md]');
    expect(s.setControl('issuer', 'Google')).toBe(false);
  });
  it('prints the selected instruments one line at a time', () => {
    const s = new CalibrationSim(INSTRUMENTS);
    s.setControl('issuer', 'AWS');
    s.setControl('print', true);
    expect(s.isPrinting).toBe(true);
    const lines: string[] = [];
    for (let t = 0; t < 2; t += 1 / 60) {
      s.step(1 / 60);
      for (const e of s.drain()) if (e.type === 'print-line') lines.push(String(e['name']));
    }
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('AWS');
    expect(s.isPrinting).toBe(false);
  });
});

describe('hall power series and Foundations sim', () => {
  it('counts month-dated milestones per month and spreads year-only ones as 1/12', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    const series = buildPowerSeries(POWER_EVENTS, '2025-01', '2026-12');
    const may26 = series.find((p) => p.month === '2026-05')!;
    expect(may26.count).toBe(2); // Agent Master + Agent Commander [info.md]
    const jul25 = series.find((p) => p.month === '2025-07')!;
    expect(jul25.count).toBe(1); // joins Kyndryl
    expect(jul25.yearShare).toBeCloseTo(1 / 12, 6); // "B.Tech completes" is year-only 2025
    expect(series.every((p) => p.count >= 0)).toBe(true);
  });
  it('reports real milestone totals for a turbine', () => {
    const s = new FoundationsSim(buildPowerSeries(POWER_EVENTS));
    s.setControl('turbine', 'gdsc');
    const m = s.milestonesFor('gdsc');
    expect(m.months).toBe(24);
    expect(m.total).toBeGreaterThanOrEqual(8); // 2023–2024 carries GDSC, Charly, CLF, SAA, five 2024 projects, Climate 2023
    expect(s.readouts()['hall-power']).toContain('2023–2024');
    expect(s.setControl('turbine', 'mit')).toBe(false);
    run(s, 3);
    expect(s.speed('gdsc')).toBeGreaterThan(0.9);
    expect(s.speed('vit')).toBeLessThan(0.4);
  });
});

describe('skills cables data', () => {
  it('maps skills to machines in bay order with aliases', () => {
    const py = SKILL_CABLES.find((s) => s.id === 'python')!;
    expect(py.machines).toEqual(['telemetry-refinery', 'policy-sorter', 'forecast-engine', 'data-workbench']);
    const otel = SKILL_CABLES.find((s) => s.id === 'opentelemetry')!;
    expect(otel.aliases).toContain('otlp');
    expect(SKILL_CABLES.length).toBeGreaterThan(20);
  });
});
