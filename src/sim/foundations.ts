/**
 * Foundations Generator simulation: VIT, the school and GDSC as turbines; selecting one spins it up and the hall-power
 * readout reports the real dated-milestone count for the months that turbine's years cover. The power series itself
 * comes from events.json (see src/hall/data/power.ts); the only fabricated element is the spin animation.
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';
import { fmtMonth } from './calibration';
import type { VizSpec } from '../viz/spec';

export type Turbine = 'vit' | 'gdsc' | 'school';
export const TURBINES: Turbine[] = ['vit', 'gdsc', 'school'];
export const TURBINE_META: Record<Turbine, { label: string; years: [number, number]; ledger: string }> = {
  vit: { label: 'Vellore Institute of Technology · B.Tech CSE', years: [2021, 2025], ledger: 'F-F01' },
  gdsc: { label: 'GDSC VIT · Technical Core Member', years: [2023, 2024], ledger: 'F-B10' },
  school: {
    label: 'L.P. Savani International School · 10th & 12th CBSE',
    years: [2017, 2020],
    ledger: 'F-F02',
  },
};

export interface PowerPoint {
  month: string; // YYYY-MM
  count: number; // month-precision milestones
  yearShare: number; // year-only milestones spread as 1/12 across that year
}

export interface FoundationsReadouts extends Record<string, string | number> {
  'hall-power': string;
  students: string;
  playhead: string;
}

export class FoundationsSim implements Sim<FoundationsReadouts> {
  readonly slug = 'foundations-generator';
  private ctrl: Record<string, ControlValue> = { turbine: 'vit', playback: true };
  /** Playhead along the power series, in months (fractional). */
  private cursor = 0;
  private events: SimEvent[] = [];
  private spin: Record<Turbine, number> = { vit: 0.3, gdsc: 0.3, school: 0.3 }; // 0..1 speed fraction

  constructor(readonly power: PowerPoint[]) {}

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (id === 'playback') {
      this.ctrl[id] = Boolean(value);
      this.events.push({ type: 'control', id, value: Boolean(value) });
      return true;
    }
    if (id !== 'turbine' || !TURBINES.includes(value as Turbine)) return false;
    this.ctrl[id] = value;
    this.events.push({ type: 'control', id, value });
    this.events.push({ type: 'spin-up', turbine: value });
    // The playhead jumps to the first month of that turbine's years, so the chart and the turbine tell one story.
    const first = this.power.findIndex(
      (p) => Number(p.month.slice(0, 4)) >= TURBINE_META[value as Turbine].years[0],
    );
    if (first >= 0) this.cursor = first;
    return true;
  }

  get turbine(): Turbine {
    return this.ctrl['turbine'] as Turbine;
  }
  speed(t: Turbine): number {
    return this.spin[t];
  }

  /** Milestones in the selected turbine's years (month-precision + year-only, from the real series). */
  milestonesFor(t: Turbine): { months: number; total: number } {
    const [a, b] = TURBINE_META[t].years;
    let total = 0;
    let months = 0;
    for (const p of this.power) {
      const y = Number(p.month.slice(0, 4));
      if (y >= a && y <= b) {
        months++;
        total += p.count + p.yearShare;
      }
    }
    return { months, total: Math.round(total) };
  }

  get playing(): boolean {
    return Boolean(this.ctrl['playback']);
  }
  /** Index of the month the playhead is on. */
  get playheadIndex(): number {
    return Math.min(this.power.length - 1, Math.max(0, Math.floor(this.cursor)));
  }

  step(dt: number): void {
    const d = clamp(dt, 0, 0.2);
    if (this.playing && this.power.length) {
      this.cursor += d * 3; // three months per second
      if (this.cursor >= this.power.length) this.cursor = 0;
    }
    for (const t of TURBINES) {
      const target = t === this.turbine ? 1 : 0.3;
      this.spin[t] += (target - this.spin[t]) * Math.min(1, d * 1.5);
    }
  }

  viz(): VizSpec[] {
    const t = this.turbine;
    const [a, b] = TURBINE_META[t].years;
    const years: number[] = [];
    for (const p of this.power) {
      const y = Number(p.month.slice(0, 4));
      if (!years.includes(y)) years.push(y);
    }
    const perYear = years.map((y) =>
      this.power.filter((p) => p.month.startsWith(String(y))).reduce((s, p) => s + p.count + p.yearShare, 0),
    );
    const specs: VizSpec[] = [
      {
        id: 'power-series',
        kind: 'lines',
        title: 'Hall power, month by month',
        caption: `Dated milestones from the ledger (year-only events spread 1/12 per month). The playhead is ${this.playing ? 'running' : 'paused'}.`,
        unit: 'milestones',
        series: [
          {
            id: 'power',
            label: 'Milestones',
            tone: 'amber',
            points: this.power.map((p) => p.count + p.yearShare),
          },
        ],
        cursor: this.playheadIndex,
        xLabels: [fmtMonth(this.power[0]?.month), fmtMonth(this.power[this.power.length - 1]?.month)],
      },
      {
        id: 'power-years',
        kind: 'columns',
        title: 'Milestones per year',
        caption: `${TURBINE_META[t].label}: ${a}–${b} highlighted.`,
        categories: years.map((y) => String(y)),
        series: [
          {
            id: 'in',
            label: 'Selected turbine’s years',
            tone: 'amber',
            values: years.map((y, i) => (y >= a && y <= b ? Math.round(perYear[i]! * 10) / 10 : 0)),
          },
          {
            id: 'out',
            label: 'Other years',
            tone: 'muted',
            values: years.map((y, i) => (y >= a && y <= b ? 0 : Math.round(perYear[i]! * 10) / 10)),
          },
        ],
      },
      {
        id: 'turbines',
        kind: 'bars',
        title: 'Turbine speed',
        caption: 'The selected turbine spins up; the others idle (animation only).',
        max: 100,
        unit: '%',
        items: TURBINES.map((x) => ({
          label: TURBINE_META[x].label.split(' · ')[0]!,
          value: Math.round(this.spin[x] * 100),
          tone: x === t ? ('amber' as const) : ('muted' as const),
          note: `${TURBINE_META[x].years[0]}–${TURBINE_META[x].years[1]}`,
        })),
      },
    ];
    return specs;
  }

  readouts(): FoundationsReadouts {
    const m = this.milestonesFor(this.turbine);
    const head = this.power[this.playheadIndex];
    return {
      'hall-power': `${m.total} dated milestones across ${TURBINE_META[this.turbine].years.join('–')} · from the ledger`,
      students: '500+ students (as stated in résumé)',
      playhead: head
        ? `${fmtMonth(head.month)}: ${Math.round((head.count + head.yearShare) * 10) / 10} milestone${head.count + head.yearShare === 1 ? '' : 's'} that month · from the ledger`
        : '—',
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
