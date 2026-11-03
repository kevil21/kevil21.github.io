/**
 * Visualization specs: plain, JSON-able descriptions of the instruments a simulation shows while it runs. Pure data (no
 * DOM, no Three.js) so the sims can produce them, the unit tests can check them, and the HTML panel renders them as SVG
 * or HTML (`src/viz/Charts.tsx`). Every spec also yields a text twin (`tableOf`) so a chart is never the only way to
 * read its numbers. All values in specs are SAMPLE DATA unless a spec's caption says otherwise.
 */

export type Tone = 'amber' | 'teal' | 'sage' | 'ember' | 'brass' | 'muted';

interface Base {
  id: string;
  title: string;
  /** One sentence: what it shows and what its numbers are (sample data unless stated). */
  caption?: string;
}

export interface LinesViz extends Base {
  kind: 'lines';
  unit?: string;
  stacked?: boolean;
  series: Array<{ id: string; label: string; tone: Tone; dashed?: boolean; points: Array<number | null> }>;
  band?: { label: string; tone: Tone; lo: Array<number | null>; hi: Array<number | null> };
  hlines?: Array<{ label: string; value: number }>;
  /** Index where "now" is (history to the left, forecast to the right). */
  split?: number;
  /** Index of a moving playhead. */
  cursor?: number;
  xLabels?: [string, string];
}

export interface ColumnsViz extends Base {
  kind: 'columns';
  unit?: string;
  categories: string[];
  series: Array<{ id: string; label: string; tone: Tone; values: number[] }>;
}

export interface BarsViz extends Base {
  kind: 'bars';
  unit?: string;
  /** Common scale; defaults to the largest value. */
  max?: number;
  items: Array<{ label: string; value: number; tone: Tone; note?: string }>;
  marker?: { label: string; value: number };
}

export interface HeatViz extends Base {
  kind: 'heat';
  rows: string[];
  cols: string[];
  /** 0..1 per cell, [row][col]. */
  cells: number[][];
  tone: Tone;
  legend: [string, string];
}

export interface StagesViz extends Base {
  kind: 'stages';
  items: Array<{
    label: string;
    state: 'done' | 'active' | 'waiting' | 'todo' | 'skipped';
    progress: number;
    note?: string;
  }>;
}

export interface WaterfallViz extends Base {
  kind: 'waterfall';
  max: number;
  steps: Array<{ label: string; delta: number; kind: 'add' | 'pin' | 'total'; tone: Tone }>;
  thresholds: Array<{ label: string; value: number }>;
}

export interface GaugeViz extends Base {
  kind: 'gauge';
  value: number;
  max: number;
  unit?: string;
  tone: Tone;
  threshold?: { label: string; value: number };
  text: string;
}

export type VizSpec = LinesViz | ColumnsViz | BarsViz | HeatViz | StagesViz | WaterfallViz | GaugeViz;

/** Fixed-capacity history buffer: the sims keep their instrument traces in these. */
export class Ring {
  private buf: number[] = [];
  constructor(readonly cap: number) {}
  push(v: number): void {
    this.buf.push(v);
    if (this.buf.length > this.cap) this.buf.shift();
  }
  values(): number[] {
    return this.buf.slice();
  }
  get length(): number {
    return this.buf.length;
  }
  last(): number {
    return this.buf[this.buf.length - 1] ?? 0;
  }
  clear(): void {
    this.buf = [];
  }
}

export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const a = Math.abs(v);
  if (Number.isInteger(v) && a < 1000) return String(v);
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2).replace(/\.?0+$/, '') || '0';
}

export interface TextTwin {
  head: string[];
  rows: string[][];
}

/** The same numbers as text: rendered in a <details> under every chart. */
export function tableOf(spec: VizSpec): TextTwin {
  switch (spec.kind) {
    case 'lines': {
      const n = Math.max(0, ...spec.series.map((s) => s.points.length));
      // Large series are summarised at ~12 rows so the twin stays readable.
      const step = Math.max(1, Math.ceil(n / 12));
      const rows: string[][] = [];
      for (let i = 0; i < n; i += step) {
        const row = [String(i + 1), ...spec.series.map((s) => fmt(s.points[i]))];
        if (spec.band) row.push(`${fmt(spec.band.lo[i])} to ${fmt(spec.band.hi[i])}`);
        rows.push(row);
      }
      return {
        head: ['Step', ...spec.series.map((s) => s.label), ...(spec.band ? [spec.band.label] : [])],
        rows,
      };
    }
    case 'columns':
      return {
        head: ['Group', ...spec.series.map((s) => s.label)],
        rows: spec.categories.map((c, i) => [c, ...spec.series.map((s) => fmt(s.values[i]))]),
      };
    case 'bars':
      return {
        head: ['Item', spec.unit ? `Value (${spec.unit})` : 'Value', 'Note'],
        rows: spec.items.map((it) => [it.label, fmt(it.value), it.note ?? '']),
      };
    case 'heat': {
      const rows = spec.rows.map((r, i) => [
        r,
        ...spec.cols.map((_, j) => `${Math.round((spec.cells[i]?.[j] ?? 0) * 100)}%`),
      ]);
      return { head: ['Row', ...spec.cols], rows };
    }
    case 'stages':
      return {
        head: ['Stage', 'State', 'Progress', 'Note'],
        rows: spec.items.map((s) => [s.label, s.state, `${Math.round(s.progress * 100)}%`, s.note ?? '']),
      };
    case 'waterfall':
      return {
        head: ['Step', 'Change', 'Kind'],
        rows: [
          ...spec.steps.map((s) => [s.label, fmt(s.delta), s.kind]),
          ...spec.thresholds.map((t) => [t.label, fmt(t.value), 'threshold']),
        ],
      };
    case 'gauge':
      return {
        head: ['Reading', 'Value', 'Scale'],
        rows: [
          [spec.title, `${fmt(spec.value)}${spec.unit ? ` ${spec.unit}` : ''}`, `0 to ${fmt(spec.max)}`],
        ],
      };
  }
}

/** One-sentence alt text for the chart's role="img". */
export function describe(spec: VizSpec): string {
  switch (spec.kind) {
    case 'lines': {
      const last = spec.series.map(
        (s) => `${s.label} ${fmt([...s.points].reverse().find((p) => p !== null))}`,
      );
      return `${spec.title}. Latest: ${last.join(', ')}.`;
    }
    case 'columns':
      return `${spec.title}. ${spec.categories.length} groups, ${spec.series.length} series.`;
    case 'bars':
      return `${spec.title}. ${spec.items.map((i) => `${i.label} ${fmt(i.value)}`).join(', ')}.`;
    case 'heat':
      return `${spec.title}. ${spec.rows.length} rows by ${spec.cols.length} columns.`;
    case 'stages':
      return `${spec.title}. ${spec.items.map((i) => `${i.label} ${i.state}`).join(', ')}.`;
    case 'waterfall':
      return `${spec.title}. ${spec.steps.map((s) => `${s.label} ${fmt(s.delta)}`).join(', ')}.`;
    case 'gauge':
      return `${spec.title}. ${spec.text}`;
  }
}

/** Largest finite value across arrays, never below `floor`. */
export function maxOf(arrs: Array<Array<number | null>>, floor = 0): number {
  let m = floor;
  for (const a of arrs) for (const v of a) if (v !== null && Number.isFinite(v) && v > m) m = v;
  return m;
}

/** Round an axis maximum up to a friendly number (1, 2, 2.5, 5, 10 × 10^k). */
export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return n * p;
}

/** Deterministic 0..1 hash for sample cells (no RNG state consumed). */
export function hash01(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
