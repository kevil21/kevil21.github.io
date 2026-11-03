/**
 * Forecast Engine simulation. Three streams (migration risk, grid load, irrigation need) as seeded synthetic series;
 * a simple model forecast (trend + seasonal continuation) against a naive baseline; the horizon is a control.
 * The series are SAMPLE DATA. The "stated outcome" readout repeats only the résumé's numbers, labelled.
 */
import { clamp, rng, type ControlValue, type Sim, type SimEvent } from './types';
import type { VizSpec } from '../viz/spec';

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

export const FORECAST_SCENARIOS = ['live', 'backtest'] as const;
export type ForecastScenario = (typeof FORECAST_SCENARIOS)[number];

export interface Fold {
  cut: number;
  modelMae: number;
  baselineMae: number;
}

const mae = (a: number[], b: number[]) =>
  a.length ? a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0) / a.length : 0;

/**
 * Rolling-origin evaluation (the ledger's rolling cross-validation decision): train on everything before a cut,
 * forecast the next `h` steps, score model and naive baseline, move the cut forward. Pure, so it is unit-tested.
 */
export function rollingFolds(
  history: number[],
  horizon: number,
  count = 5,
): { folds: Fold[]; residuals: number[] } {
  const h = clamp(Math.round(horizon), 1, 12);
  const first = 48;
  const n = history.length;
  if (n < first + h + 1) return { folds: [], residuals: [] };
  const step = Math.max(1, Math.floor((n - h - first) / Math.max(1, count - 1)));
  const folds: Fold[] = [];
  const residuals: number[] = [];
  for (let k = 0; k < count; k++) {
    const cut = first + k * step;
    if (cut + h > n) break;
    const train = history.slice(0, cut);
    const actual = history.slice(cut, cut + h);
    const m = modelForecast(train, h);
    const b = baselineForecast(train, h);
    folds.push({ cut, modelMae: mae(m, actual), baselineMae: mae(b, actual) });
    actual.forEach((v, i) => residuals.push(v - (m[i] ?? 0)));
  }
  return { folds, residuals };
}

export interface ForecastReadouts extends Record<string, string | number> {
  forecast: string;
  'baseline-delta': string;
  backtest: string;
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
  private ctrl: Record<string, ControlValue> = {
    stream: 'grid',
    horizon: 12,
    baseline: false,
    scenario: 'live',
  };
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
    if (id === 'scenario' && !FORECAST_SCENARIOS.includes(value as ForecastScenario)) return false;
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
  get scenario(): ForecastScenario {
    return this.ctrl['scenario'] as ForecastScenario;
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

  viz(): VizSpec[] {
    const meta = STREAM_META[this.stream];
    const h = this.history();
    const m = this.model();
    const b = this.baseline();
    const { folds, residuals } = rollingFolds(h, this.horizon);
    const sigma = residuals.length
      ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length)
      : 0;
    const pad = (arr: number[], before: number): Array<number | null> => [
      ...new Array<null>(before).fill(null),
      ...arr,
    ];
    const joinAt = h.length - 1;
    const histPts: Array<number | null> = [...h, ...new Array<null>(m.length).fill(null)];
    const modelPts = pad([h[joinAt]!, ...m], joinAt);
    const baselinePts = pad([h[joinAt]!, ...b], joinAt);
    const lo = pad([h[joinAt]!, ...m.map((v) => v - sigma)], joinAt);
    const hi = pad([h[joinAt]!, ...m.map((v) => v + sigma)], joinAt);
    const wins = folds.filter((f) => f.modelMae < f.baselineMae).length;

    const out: VizSpec[] = [
      {
        id: 'forecast-line',
        kind: 'lines',
        title: `${meta.label}: history and forecast`,
        caption: `Seeded synthetic series (sample data), ${meta.model}. Band = ±1 σ of the rolling-fold residuals.`,
        unit: meta.unit,
        series: [
          { id: 'history', label: 'History', tone: 'teal', points: histPts },
          { id: 'model', label: 'Model forecast', tone: 'amber', points: modelPts },
          ...(this.showBaseline
            ? [
                {
                  id: 'baseline',
                  label: 'Naive baseline',
                  tone: 'muted' as const,
                  dashed: true,
                  points: baselinePts,
                },
              ]
            : []),
        ],
        ...(sigma > 0 ? { band: { label: '±1 σ', tone: 'amber' as const, lo, hi } } : {}),
        split: joinAt,
        xLabels: [`−${h.length} h`, `+${this.horizon} h`],
      },
    ];
    // Daily shape: the average value at each hour of the day against the latest 24 hours (sample).
    const hourly = Array.from({ length: 24 }, (_, hr) => {
      const vals = h.filter((_v, i) => i % 24 === hr);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    out.push({
      id: 'daily-shape',
      kind: 'columns',
      title: 'Daily shape',
      caption:
        'Average value by hour of the day against the latest 24 hours; the model continues this seasonal pattern (sample).',
      unit: meta.unit,
      categories: hourly.map((_v, i) => String(i)),
      series: [
        { id: 'avg', label: 'Average day', tone: 'teal', values: hourly },
        { id: 'latest', label: 'Latest 24 h', tone: 'amber', values: h.slice(-24) },
      ],
    });
    if (this.scenario === 'backtest') {
      out.push(
        {
          id: 'folds',
          kind: 'columns',
          title: 'Rolling-origin folds: error per fold',
          caption: 'Mean absolute error of each fold; lower is better (sample series).',
          unit: meta.unit,
          categories: folds.map((_f, i) => `fold ${i + 1}`),
          series: [
            { id: 'model', label: 'Model', tone: 'amber', values: folds.map((f) => f.modelMae) },
            {
              id: 'baseline',
              label: 'Naive baseline',
              tone: 'muted',
              values: folds.map((f) => f.baselineMae),
            },
          ],
        },
        (() => {
          const r = Math.max(1e-9, ...residuals.map((v) => Math.abs(v)));
          const bins = new Array<number>(9).fill(0);
          for (const v of residuals) bins[clamp(Math.floor(((v + r) / (2 * r)) * 9), 0, 8)]!++;
          const labels = bins.map((_, i) => {
            const c = -r + ((i + 0.5) * 2 * r) / 9;
            return (c >= 0 ? '+' : '') + (Math.abs(r) >= 100 ? c.toFixed(0) : c.toFixed(1));
          });
          return {
            id: 'residuals',
            kind: 'columns' as const,
            title: 'Residuals, all folds',
            caption: `How far the model sits from what happened, ${residuals.length} points (sample).`,
            categories: labels,
            series: [{ id: 'count', label: 'Points', tone: 'teal' as const, values: bins }],
          };
        })(),
        {
          id: 'fold-wins',
          kind: 'gauge',
          title: 'Folds beating the baseline',
          value: wins,
          max: Math.max(1, folds.length),
          tone: wins >= folds.length / 2 ? 'sage' : 'ember',
          text: `${wins} of ${folds.length} folds: model error below the naive baseline's (this sample series only)`,
        },
      );
    } else {
      const lastM = m[m.length - 1] ?? 0;
      const lastB = b[b.length - 1] ?? 0;
      out.push({
        id: 'horizon-values',
        kind: 'bars',
        title: `Where it lands at +${this.horizon} h`,
        caption: 'Sample values.',
        unit: meta.unit,
        items: [
          { label: 'Now', value: h[joinAt] ?? 0, tone: 'teal' },
          { label: 'Model', value: lastM, tone: 'amber' },
          { label: 'Naive baseline', value: lastB, tone: 'muted' },
        ],
      });
    }
    return out;
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
      backtest: (() => {
        const { folds } = rollingFolds(this.history(), this.horizon);
        const wins = folds.filter((f) => f.modelMae < f.baselineMae).length;
        return `${wins} of ${folds.length} folds beat the naive baseline · sample series`;
      })(),
      resilience: meta.stated,
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
