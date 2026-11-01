/**
 * Forecast Engine simulation. Three streams (migration risk, grid load, irrigation need) as seeded synthetic series;
 * a simple model forecast (trend + seasonal continuation) against a naive baseline; the horizon is a control.
 * The series are SAMPLE DATA. The "stated outcome" readout repeats only the résumé's numbers, labelled.
 */
import { clamp, rng, type ControlValue, type Sim, type SimEvent } from './types';

export type Stream = 'migration' | 'grid' | 'irrigation';
export const STREAMS: Stream[] = ['migration', 'grid', 'irrigation'];

export const STREAM_META: Record<
  Stream,
  { label: string; unit: string; stated: string; ledger: string; model: string }
> = {
  migration: {
    label: 'Climate-induced migration risk',
    unit: 'index',
    stated: '+15% accuracy over baseline (as stated in résumé)',
    ledger: 'F-C50',
    model: 'multi-modal LSTM',
  },
  grid: {
    label: 'Transformer load',
    unit: 'kW',
    stated: '+25% grid resilience in pilot deployment (as stated in résumé)',
    ledger: 'F-C52',
    model: 'per-transformer LSTM',
  },
  irrigation: {
    label: 'Daily water target',
    unit: 'mm',
    stated: '+35% water-use efficiency (as stated in résumé)',
    ledger: 'F-C54',
    model: 'regression + rules (not an LSTM)',
  },
};

export const HISTORY = 96; // points of history shown (sample)

export interface ForecastReadouts extends Record<string, string | number> {
  forecast: string;
  'baseline-delta': string;
  resilience: string;
}

function makeSeries(stream: Stream, seed: number, n: number): number[] {
  const r = rng(seed);
  const out: number[] = [];
  let level = stream === 'grid' ? 420 : stream === 'irrigation' ? 6 : 0.4;
  const amp = stream === 'grid' ? 140 : stream === 'irrigation' ? 2.2 : 0.18;
  const noise = stream === 'grid' ? 18 : stream === 'irrigation' ? 0.35 : 0.03;
  for (let i = 0; i < n; i++) {
    const daily = Math.sin((i / 24) * Math.PI * 2 - Math.PI / 2) * amp;
    const weekly = Math.sin((i / (24 * 7)) * Math.PI * 2) * amp * 0.25;
    level += (r() - 0.5) * noise * 0.6;
    out.push(Math.max(0, level + daily + weekly + (r() - 0.5) * noise));
  }
  return out;
}

/** Naive persistence baseline: the last observed value, repeated. */
export function baselineForecast(history: number[], horizon: number): number[] {
  const last = history[history.length - 1] ?? 0;
  return Array.from({ length: horizon }, () => last);
}

/** Model forecast: continue the recent trend and the 24-step seasonal pattern (a stand-in for the real model). */
export function modelForecast(history: number[], horizon: number): number[] {
  const n = history.length;
  if (n < 48) return baselineForecast(history, horizon);
  const last = history[n - 1]!;
  const prev = history[n - 25]!;
  const trend = (last - prev) / 24;
  const out: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const seasonalIdx = n - 24 + ((h - 1) % 24);
    const seasonal = history[seasonalIdx]! - history[seasonalIdx - 24]!;
    out.push(Math.max(0, last + trend * h * 0.6 + seasonal * 0.5));
  }
  return out;
}

export class ForecastSim implements Sim<ForecastReadouts> {
  readonly slug = 'forecast-engine';
  private ctrl: Record<string, ControlValue> = { stream: 'grid', horizon: 12, baseline: false };
  private events: SimEvent[] = [];
  private histories: Record<Stream, number[]>;
  private phase = 0;
  private seed: number;

  constructor(seed = 7) {
    this.seed = seed;
    this.histories = {
      migration: makeSeries('migration', seed + 1, HISTORY + 24),
      grid: makeSeries('grid', seed + 2, HISTORY + 24),
      irrigation: makeSeries('irrigation', seed + 3, HISTORY + 24),
    };
  }

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (!(id in this.ctrl)) return false;
    if (id === 'stream' && !STREAMS.includes(value as Stream)) return false;
    if (id === 'horizon') value = clamp(Math.round(Number(value)), 1, 48);
    this.ctrl[id] = value;
    this.events.push({ type: 'control', id, value });
    return true;
  }

  get stream(): Stream {
    return this.ctrl['stream'] as Stream;
  }
  get horizon(): number {
    return Number(this.ctrl['horizon']);
  }
  get showBaseline(): boolean {
    return Boolean(this.ctrl['baseline']);
  }

  /** The visible window of history (scrolls slowly so the ribbons move). */
  history(stream: Stream = this.stream): number[] {
    const all = this.histories[stream];
    const start = Math.floor(this.phase) % 24;
    return all.slice(start, start + HISTORY);
  }
  model(stream: Stream = this.stream): number[] {
    return modelForecast(this.history(stream), this.horizon);
  }
  baseline(stream: Stream = this.stream): number[] {
    return baselineForecast(this.history(stream), this.horizon);
  }

  step(dt: number): void {
    this.phase += clamp(dt, 0, 0.2) * 0.5; // one history step every 2 s
    void this.seed;
  }

  readouts(): ForecastReadouts {
    const meta = STREAM_META[this.stream];
    const m = this.model();
    const b = this.baseline();
    const lastM = m[m.length - 1] ?? 0;
    const lastB = b[b.length - 1] ?? 0;
    const delta = lastB ? ((lastM - lastB) / lastB) * 100 : 0;
    const fmt = (v: number) => (this.stream === 'grid' ? v.toFixed(0) : v.toFixed(2));
    return {
      forecast: `${fmt(lastM)} ${meta.unit} at +${this.horizon} h · ${meta.model} · sample`,
      'baseline-delta': `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs naive baseline · sample`,
      resilience: meta.stated,
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
