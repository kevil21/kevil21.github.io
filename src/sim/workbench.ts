/**
 * Data Workbench simulation: three ELK stations (overlays, incidents, assets). "Run" a station and raw records enter,
 * the cleaning script processes them, the Elasticsearch jar fills, the Kibana screen lights. Record counts are SAMPLE
 * DATA; the station shapes (clustering, deterministic doc IDs, MTTR rollups) come from the ledger (F-C61, F-C63, F-C65).
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';

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
}

interface StationState {
  phase: Phase;
  t: number;
  cleaned: number;
  jar: number; // 0..1
  lit: boolean;
}

export class WorkbenchSim implements Sim<WorkbenchReadouts> {
  readonly slug = 'data-workbench';
  private ctrl: Record<string, ControlValue> = {
    'run-overlays': false,
    'run-incidents': false,
    'run-assets': false,
  };
  private events: SimEvent[] = [];
  private state: Record<Station, StationState> = {
    overlays: { phase: 'idle', t: 0, cleaned: 0, jar: 0, lit: false },
    incidents: { phase: 'idle', t: 0, cleaned: 0, jar: 0, lit: false },
    assets: { phase: 'idle', t: 0, cleaned: 0, jar: 0, lit: false },
  };

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (!(id in this.ctrl)) return false;
    this.ctrl[id] = value;
    if (value === true) {
      const station = id.replace('run-', '') as Station;
      this.run(station);
      this.ctrl[id] = false; // buttons are momentary
    }
    this.events.push({ type: 'control', id, value });
    return true;
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
    for (const name of STATIONS) {
      const s = this.state[name];
      if (s.phase === 'idle' || s.phase === 'done') continue;
      s.t += d;
      const total = STATION_META[name].records;
      const dur = PHASE_SECONDS[s.phase];
      const p = clamp(s.t / dur, 0, 1);
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
        s.phase = next[s.phase];
        s.t = 0;
        if (s.phase === 'visualise') s.lit = true;
        this.events.push({ type: 'phase', station: name, phase: s.phase });
      }
    }
  }

  readouts(): WorkbenchReadouts {
    const all = STATIONS.map((n) => this.state[n]);
    return {
      'records-cleaned': all.reduce((a, s) => a + s.cleaned, 0),
      'jar-level': Math.round((all.reduce((a, s) => a + s.jar, 0) / 3) * 100),
      screens: all.filter((s) => s.lit).length,
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
