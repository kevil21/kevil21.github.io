/**
 * Data Workbench simulation: three ELK stations (overlays, incidents, assets). "Run" a station and raw records enter,
 * the cleaning script processes them, the Elasticsearch jar fills, the Kibana screen lights. Record counts are SAMPLE
 * DATA; the station shapes (clustering, deterministic doc IDs, MTTR rollups) come from the ledger (F-C61, F-C63, F-C65).
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';
import { Ring, type VizSpec } from '../viz/spec';

export type Station = 'overlays' | 'incidents' | 'assets';
export const STATIONS: Station[] = ['overlays', 'incidents', 'assets'];
export const STATION_META: Record<Station, { label: string; records: number; step: string; ledger: string }> =
  {
    overlays: {
      label: 'Overlay-Insights',
      records: 1800,
      step: 'n-gram cosine clustering · frequency × impact × tickets',
      ledger: 'F-C61',
    },
    incidents: {
      label: 'Incident Ticket Management',
      records: 2400,
      step: 'pandas cleaner · deterministic doc IDs · MTTR rollups',
      ledger: 'F-C63',
    },
    assets: {
      label: 'IT Asset Analytics',
      records: 3100,
      step: 'pandas / NumPy · EoL and owner resolution',
      ledger: 'F-C65',
    },
  };

export const WORKBENCH_SCENARIOS = ['fresh', 'replay'] as const;
export type WorkbenchScenario = (typeof WORKBENCH_SCENARIOS)[number];

export type Phase = 'idle' | 'ingest' | 'clean' | 'index' | 'visualise' | 'done';
const PHASE_SECONDS: Record<Phase, number> = {
  idle: 0,
  ingest: 1.2,
  clean: 1.6,
  index: 1.8,
  visualise: 0.8,
  done: 0,
};

export interface WorkbenchReadouts extends Record<string, string | number> {
  'records-cleaned': number;
  'jar-level': number;
  screens: number;
  'docs-in-index': number;
  'duplicates-collapsed': number;
}

interface StationState {
  phase: Phase;
  t: number;
  cleaned: number;
  jar: number; // 0..1
  lit: boolean;
  /** Unique documents in this station's index (sample). */
  indexed: number;
  /** Re-ingested records that landed on an existing document id (replay scenario). */
  collapsed: number;
}

export class WorkbenchSim implements Sim<WorkbenchReadouts> {
  readonly slug = 'data-workbench';
  private ctrl: Record<string, ControlValue> = {
    'run-overlays': false,
    'run-incidents': false,
    'run-assets': false,
    scenario: 'fresh',
  };
  private rate = new Ring(48);
  private moved = 0;
  private sampleT = 0;
  private tally = { ingested: 0, cleaned: 0 };
  private events: SimEvent[] = [];
  private state: Record<Station, StationState> = {
    overlays: { phase: 'idle', t: 0, cleaned: 0, jar: 0, lit: false, indexed: 0, collapsed: 0 },
    incidents: { phase: 'idle', t: 0, cleaned: 0, jar: 0, lit: false, indexed: 0, collapsed: 0 },
    assets: { phase: 'idle', t: 0, cleaned: 0, jar: 0, lit: false, indexed: 0, collapsed: 0 },
  };

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (!(id in this.ctrl)) return false;
    if (id === 'scenario' && !WORKBENCH_SCENARIOS.includes(value as WorkbenchScenario)) return false;
    this.ctrl[id] = value;
    if (id !== 'scenario' && value === true) {
      const station = id.replace('run-', '') as Station;
      this.run(station);
      this.ctrl[id] = false; // buttons are momentary
    }
    this.events.push({ type: 'control', id, value });
    return true;
  }

  get scenario(): WorkbenchScenario {
    return this.ctrl['scenario'] as WorkbenchScenario;
  }

  run(station: Station): void {
    const s = this.state[station];
    if (s.phase !== 'idle' && s.phase !== 'done') return;
    s.phase = 'ingest';
    s.t = 0;
    s.cleaned = 0;
    s.jar = 0;
    s.lit = false;
    this.events.push({ type: 'run', station, records: STATION_META[station].records });
  }

  station(station: Station): Readonly<StationState> {
    return this.state[station];
  }

  step(dt: number): void {
    const d = clamp(dt, 0, 0.2);
    this.flushRate(d);
    for (const name of STATIONS) {
      const s = this.state[name];
      if (s.phase === 'idle' || s.phase === 'done') continue;
      const before = s.t;
      s.t += d;
      const total = STATION_META[name].records;
      const dur = PHASE_SECONDS[s.phase];
      const p = clamp(s.t / dur, 0, 1);
      if (s.phase !== 'visualise') {
        const step = (total * clamp(dur - before, 0, d)) / dur; // never past the end of the phase
        this.moved += step;
        if (s.phase === 'ingest') this.tally.ingested += step;
        if (s.phase === 'clean') this.tally.cleaned += step;
      }
      if (s.phase === 'clean') s.cleaned = Math.round(total * p);
      if (s.phase === 'index') s.jar = p;
      if (s.t >= dur) {
        const next: Record<Phase, Phase> = {
          idle: 'idle',
          ingest: 'clean',
          clean: 'index',
          index: 'visualise',
          visualise: 'done',
          done: 'done',
        };
        if (s.phase === 'index') this.land(name);
        s.phase = next[s.phase];
        s.t = 0;
        if (s.phase === 'visualise') s.lit = true;
        this.events.push({ type: 'phase', station: name, phase: s.phase });
      }
    }
  }

  /**
   * The index step finishing. `fresh`: every run brings new documents. `replay`: the same records come back with the
   * same deterministic document ids, so they land on existing documents and the index does not grow.
   */
  private land(name: Station): void {
    const s = this.state[name];
    const total = STATION_META[name].records;
    if (this.scenario === 'replay') {
      const before = s.indexed;
      s.indexed = Math.max(s.indexed, total);
      s.collapsed += total - (s.indexed - before);
    } else s.indexed += total;
    this.events.push({ type: 'indexed', station: name, indexed: s.indexed, collapsed: s.collapsed });
  }

  viz(): VizSpec[] {
    const all = STATIONS.map((n) => ({ n, s: this.state[n], meta: STATION_META[n] }));
    const sum = (f: (s: StationState) => number) => all.reduce((a, x) => a + f(x.s), 0);
    const specs: VizSpec[] = [
      {
        id: 'stations',
        kind: 'stages',
        title: 'Three stations, one line',
        caption: 'Ingest → clean → index → visualise per station; press a run button to start one.',
        items: all.map(({ s, meta }) => ({
          label: meta.label,
          state: s.phase === 'idle' ? 'todo' : s.phase === 'done' ? 'done' : 'active',
          progress:
            s.phase === 'idle'
              ? 0
              : s.phase === 'done'
                ? 1
                : clamp(s.t / (PHASE_SECONDS[s.phase] || 1), 0, 1),
          note: s.phase === 'idle' ? meta.step : `${s.phase} · ${meta.step}`,
        })),
      },
      {
        id: 'throughput',
        kind: 'lines',
        title: 'Records moving through the line',
        caption: 'Sample records per second across all stations, last 12 s.',
        unit: 'rec/s',
        series: [{ id: 'rate', label: 'records/s', tone: 'teal', points: this.rate.values() }],
        xLabels: ['−12 s', 'now'],
      },
      {
        id: 'funnel',
        kind: 'bars',
        title: 'Records through the line, this session',
        caption:
          this.scenario === 'replay'
            ? 'Replay: the same records come back with the same deterministic document ids, so the index does not grow.'
            : 'Fresh: every run brings new records, so every run adds documents.',
        items: [
          { label: 'Ingested', value: Math.round(this.tally.ingested), tone: 'brass' },
          { label: 'Cleaned', value: Math.round(this.tally.cleaned), tone: 'amber' },
          { label: 'Unique documents in the index', value: sum((s) => s.indexed), tone: 'sage' },
          { label: 'Duplicates collapsed by id', value: sum((s) => s.collapsed), tone: 'muted' },
        ],
      },
      {
        id: 'jars',
        kind: 'bars',
        title: 'Documents in each station’s index',
        unit: 'docs',
        items: all.map(({ s, meta }) => ({
          label: meta.label,
          value: s.indexed,
          tone: 'teal' as const,
          ...(s.collapsed ? { note: `${s.collapsed.toLocaleString('en-US')} collapsed` } : {}),
        })),
      },
    ];
    return specs;
  }

  private flushRate(d: number): void {
    this.sampleT += d;
    if (d > 0 && this.sampleT >= 0.25) {
      this.rate.push(Math.round(this.moved / this.sampleT));
      this.moved = 0;
      this.sampleT = 0;
    }
  }

  readouts(): WorkbenchReadouts {
    const all = STATIONS.map((n) => this.state[n]);
    return {
      'records-cleaned': all.reduce((a, s) => a + s.cleaned, 0),
      'jar-level': Math.round((all.reduce((a, s) => a + s.jar, 0) / 3) * 100),
      screens: all.filter((s) => s.lit).length,
      'docs-in-index': all.reduce((a, s) => a + s.indexed, 0),
      'duplicates-collapsed': all.reduce((a, s) => a + s.collapsed, 0),
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
