/**
 * Calibration Bench simulation: ten instruments, one per certification, grouped by issuer. The issuer filter dims the
 * others; "print" runs the dot-matrix printer over the selected instruments one by one. Instrument facts (names,
 * issuers, issue months [info.md]) are passed in from the content collection; nothing here is invented.
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';

export interface Instrument {
  id: string;
  name: string;
  issuer: 'AWS' | 'Microsoft' | 'Founderz';
  issued?: string; // YYYY-MM from info.md
  expires?: string;
  lifetime?: boolean;
}

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
  private ctrl: Record<string, ControlValue> = { issuer: 'all', print: false };
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
