/**
 * Foundations Generator simulation: VIT, the school and GDSC as turbines; selecting one spins it up and the hall-power
 * readout reports the real dated-milestone count for the months that turbine's years cover. The power series itself
 * comes from events.json (see src/hall/data/power.ts); the only fabricated element is the spin animation.
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';

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
}

export class FoundationsSim implements Sim<FoundationsReadouts> {
  readonly slug = 'foundations-generator';
  private ctrl: Record<string, ControlValue> = { turbine: 'vit' };
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
    if (id !== 'turbine' || !TURBINES.includes(value as Turbine)) return false;
    this.ctrl[id] = value;
    this.events.push({ type: 'control', id, value });
    this.events.push({ type: 'spin-up', turbine: value });
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

  step(dt: number): void {
    const d = clamp(dt, 0, 0.2);
    for (const t of TURBINES) {
      const target = t === this.turbine ? 1 : 0.3;
      this.spin[t] += (target - this.spin[t]) * Math.min(1, d * 1.5);
    }
  }

  readouts(): FoundationsReadouts {
    const m = this.milestonesFor(this.turbine);
    return {
      'hall-power': `${m.total} dated milestones across ${TURBINE_META[this.turbine].years.join('–')} · from the ledger`,
      students: '500+ students (as stated in résumé)',
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
