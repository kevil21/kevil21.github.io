/**
 * Calibration Bench simulation: ten instruments, one per certification, grouped by issuer. The issuer filter dims the
 * others; "print" runs the dot-matrix printer over the selected instruments one by one. Instrument facts (names,
 * issuers, issue months [info.md]) are passed in from the content collection; nothing here is invented.
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';
import type { VizSpec } from '../viz/spec';

export interface Instrument {
  id: string;
  name: string;
  issuer: 'AWS' | 'Microsoft' | 'Founderz';
  issued?: string; // YYYY-MM from info.md
  expires?: string;
  lifetime?: boolean;
}

export const CALIBRATION_SCENARIOS = ['issuers', 'timeline'] as const;
export type CalibrationScenario = (typeof CALIBRATION_SCENARIOS)[number];

export interface CalibrationReadouts extends Record<string, string | number> {
  instruments: number;
  latest: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtMonth(v: string | undefined): string {
  if (!v) return '—';
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : v;
}

export class CalibrationSim implements Sim<CalibrationReadouts> {
  readonly slug = 'calibration-bench';
  private ctrl: Record<string, ControlValue> = { issuer: 'all', print: false, scenario: 'issuers' };
  private events: SimEvent[] = [];
  private printing: Instrument[] = [];
  private printT = 0;
  private printed = 0;

  constructor(readonly instruments: Instrument[]) {}

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (!(id in this.ctrl)) return false;
    if (id === 'issuer' && !['all', 'AWS', 'Microsoft', 'Founderz'].includes(String(value))) return false;
    if (id === 'scenario' && !CALIBRATION_SCENARIOS.includes(value as CalibrationScenario)) return false;
    this.ctrl[id] = value;
    this.events.push({ type: 'control', id, value });
    if (id === 'print' && value === true) {
      this.printing = this.selected();
      this.printT = 0;
      this.printed = 0;
      this.ctrl['print'] = false;
      this.events.push({ type: 'print-start', count: this.printing.length });
    }
    return true;
  }

  get scenario(): CalibrationScenario {
    return this.ctrl['scenario'] as CalibrationScenario;
  }
  get issuer(): string {
    return String(this.ctrl['issuer']);
  }
  selected(): Instrument[] {
    return this.issuer === 'all'
      ? this.instruments
      : this.instruments.filter((i) => i.issuer === this.issuer);
  }
  /** 0..1 how far the current print job has got. */
  get printProgress(): number {
    return this.printing.length ? clamp(this.printed / this.printing.length, 0, 1) : 0;
  }
  get isPrinting(): boolean {
    return this.printed < this.printing.length;
  }

  step(dt: number): void {
    if (!this.isPrinting) return;
    this.printT += clamp(dt, 0, 0.2);
    if (this.printT >= 0.45) {
      this.printT = 0;
      const inst = this.printing[this.printed]!;
      this.printed++;
      this.events.push({
        type: 'print-line',
        id: inst.id,
        name: inst.name,
        issued: fmtMonth(inst.issued),
        issuer: inst.issuer,
      });
      if (!this.isPrinting) this.events.push({ type: 'print-done', count: this.printed });
    }
  }

  /** Certifications per issue month, split by issuer, over the span they cover. Months come from info.md. */
  private monthSpan(): string[] {
    const months = this.instruments.map((i) => i.issued).filter((m): m is string => Boolean(m));
    if (!months.length) return [];
    const sorted = [...months].sort();
    const out: string[] = [];
    let [y, m] = sorted[0]!.split('-').map(Number) as [number, number];
    const [ey, em] = sorted[sorted.length - 1]!.split('-').map(Number) as [number, number];
    while (y < ey || (y === ey && m <= em)) {
      out.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }

  viz(): VizSpec[] {
    const ISSUERS = ['AWS', 'Microsoft', 'Founderz'] as const;
    const TONE = { AWS: 'amber', Microsoft: 'teal', Founderz: 'sage' } as const;
    const selected = new Set(this.selected().map((i) => i.id));
    const out: VizSpec[] = [];
    const span = this.monthSpan();
    const count = (is: string, m: string) =>
      this.instruments.filter((i) => i.issuer === is && i.issued === m && selected.has(i.id)).length;
    const monthLabel = (m: string) => fmtMonth(m).replace(' 20', " '");
    if (this.scenario === 'timeline') {
      const undated = this.instruments.filter((i) => !i.issued).length;
      out.push({
        id: 'cert-timeline',
        kind: 'columns',
        title: 'Certifications by issue month',
        caption: `Issue months from info.md, one count per instrument${undated ? `; ${undated} without a recorded month` : ''}. Filtered-out issuers show as zero.`,
        categories: span.map(monthLabel),
        series: ISSUERS.map((is) => ({
          id: is,
          label: is,
          tone: TONE[is],
          values: span.map((m) => count(is, m)),
        })),
      });
      let running = 0;
      out.push({
        id: 'cert-cumulative',
        kind: 'lines',
        title: 'Instruments certified, cumulative',
        caption: 'Running total by issue month (months from info.md); the issuer filter applies.',
        unit: 'instruments',
        series: [
          {
            id: 'cum',
            label: 'Certified',
            tone: 'sage',
            points: span.map((m) => (running += ISSUERS.reduce((a, is) => a + count(is, m), 0))),
          },
        ],
        xLabels: [fmtMonth(span[0]), fmtMonth(span[span.length - 1])],
      });
    } else {
      out.push({
        id: 'cert-issuers',
        kind: 'bars',
        title: 'Instruments by issuer',
        caption: 'Counts from the certifications collection; the filter dims the others.',
        items: ISSUERS.map((is) => {
          const mine = this.instruments.filter((i) => i.issuer === is);
          const latest = mine
            .map((i) => i.issued ?? '')
            .filter(Boolean)
            .sort()
            .at(-1);
          const on = mine.some((i) => selected.has(i.id));
          return {
            label: is,
            value: mine.length,
            tone: on ? TONE[is] : ('muted' as const),
            note: `latest ${fmtMonth(latest)}`,
          };
        }),
      });
    }
    if (this.scenario !== 'timeline')
      out.push({
        id: 'cert-heat',
        kind: 'heat',
        title: 'Issuer by issue month',
        caption: 'Which issuer issued in which month (months from info.md); darker = more instruments.',
        rows: [...ISSUERS],
        cols: span.map(monthLabel),
        cells: ISSUERS.map((is) => span.map((m) => Math.min(1, count(is, m) / 2))),
        tone: 'amber',
        legend: ['none', '2 or more'],
      });
    const total = this.printing.length;
    out.push({
      id: 'printer',
      kind: 'gauge',
      title: 'Certificate printer',
      value: this.printed,
      max: Math.max(1, total || this.selected().length),
      tone: this.isPrinting ? 'amber' : 'sage',
      text: total
        ? this.isPrinting
          ? `Printing line ${this.printed + 1} of ${total}`
          : `Printed ${this.printed} of ${total} lines`
        : 'Press print to run the printer over the selected instruments',
    });
    return out;
  }

  readouts(): CalibrationReadouts {
    const sel = this.selected();
    const latest = sel
      .map((i) => i.issued ?? '')
      .filter(Boolean)
      .sort()
      .at(-1);
    return {
      instruments: sel.length,
      latest: this.isPrinting
        ? `printing ${this.printed}/${this.printing.length}…`
        : `${fmtMonth(latest)} [source: info.md]`,
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
