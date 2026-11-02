/**
 * Telemetry Refinery simulation (A360). Shape from the ledger: customer agents → Postgres staging → ADX (31 MVs) →
 * sync every N minutes into per-tenant ES chambers → JWKS gateway → dashboards; 20 insight types; dogfooding feed.
 * Clock: 1 real second = 1 simulated minute, so the default 10-minute sync fires every 10 s. All values are sample data.
 */
import { clamp, rng, type ControlValue, type Sim, type SimEvent } from './types';

export const REFINERY_VIEWS = 31; // F-C03/F-C06 (as stated in résumé)
export const REFINERY_INSIGHT_TYPES = 20; // F-C11

export interface RefineryReadouts extends Record<string, string | number> {
  'spans-per-second': number;
  'views-synced': number;
  chambers: number;
  insights: number;
}

export class RefinerySim implements Sim<RefineryReadouts> {
  readonly slug = 'telemetry-refinery';
  private ctrl: Record<string, ControlValue> = {
    'tenant-count': 4,
    'sync-interval': 10,
    dogfooding: true,
    gateway: true,
    'sync-now': false,
  };
  private events: SimEvent[] = [];
  private rand: () => number;
  private simMinutes = 0;
  private sinceSync = 0;
  private syncing = false;
  private syncProgress = 0; // 0..1 during a sync
  private viewsSynced = 0;
  private staging = 0; // spans buffered in Postgres (sample units)
  private chamberLevels: number[] = [0, 0, 0, 0, 0, 0];
  private insightsCurated = 0;
  private insightTimer = 0;
  private spansPerSecond = 0;

  constructor(seed = 1) {
    this.rand = rng(seed);
  }

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (!(id in this.ctrl)) return false;
    if (id === 'sync-now') {
      // A button: start a sync immediately (ignored while one is already running).
      if (value === true) this.startSync();
      return true;
    }
    if (id === 'tenant-count') value = clamp(Math.round(Number(value)), 1, 6);
    if (id === 'sync-interval') value = clamp(Math.round(Number(value)), 1, 30);
    this.ctrl[id] = value;
    this.events.push({ type: 'control', id, value });
    return true;
  }

  get tenants(): number {
    return Number(this.ctrl['tenant-count']);
  }
  get syncInterval(): number {
    return Number(this.ctrl['sync-interval']);
  }
  get dogfooding(): boolean {
    return Boolean(this.ctrl['dogfooding']);
  }
  get gatewayOpen(): boolean {
    return Boolean(this.ctrl['gateway']);
  }
  /** 0..1 fill level per tenant chamber (sample). */
  chambers(): number[] {
    return this.chamberLevels.slice(0, this.tenants);
  }
  get isSyncing(): boolean {
    return this.syncing;
  }
  get syncFraction(): number {
    return this.syncProgress;
  }
  get stagingLevel(): number {
    return clamp(this.staging / 600, 0, 1);
  }

  private startSync(): void {
    if (this.syncing) return;
    this.syncing = true;
    this.syncProgress = 0;
    this.sinceSync = 0;
    this.events.push({ type: 'sync-start', views: REFINERY_VIEWS, overlapMinutes: 70 });
  }

  step(dt: number): void {
    const d = clamp(dt, 0, 0.2);
    this.simMinutes += d; // 1 s real = 1 sim minute
    // Span rate: ~60 spans/s per tenant plus the dogfooding tenant, with gentle noise (sample)
    const base = this.tenants * 60 * (this.dogfooding ? 1.25 : 1);
    this.spansPerSecond = Math.round(base * (0.9 + 0.2 * this.rand()));
    const spawned = this.spansPerSecond * d;
    this.staging += spawned;
    this.events.push({ type: 'spawn', count: spawned, dogfooding: this.dogfooding });

    // Sync cycle
    this.sinceSync += d;
    if (this.sinceSync >= this.syncInterval) this.startSync();
    if (this.syncing) {
      this.syncProgress = clamp(this.syncProgress + d / 1.6, 0, 1); // a sync takes ~1.6 s
      this.viewsSynced = Math.round(this.syncProgress * REFINERY_VIEWS);
      const drained = Math.min(this.staging, (this.staging + 50) * d * 0.9);
      this.staging -= drained;
      for (let i = 0; i < this.tenants; i++)
        this.chamberLevels[i] = clamp(this.chamberLevels[i]! + (drained / this.tenants) * 0.004, 0, 1);
      if (this.syncProgress >= 1) {
        this.syncing = false;
        this.events.push({ type: 'sync-done', views: REFINERY_VIEWS, tenants: this.tenants });
      }
    } else {
      // chambers slowly settle as dashboards read them
      for (let i = 0; i < 6; i++) this.chamberLevels[i] = clamp(this.chamberLevels[i]! - d * 0.01, 0, 1);
    }

    // Insights only reach the dashboards through an open gateway
    if (this.gatewayOpen) {
      this.insightTimer += d;
      if (this.insightTimer >= 3) {
        this.insightTimer = 0;
        this.insightsCurated++;
        this.events.push({ type: 'insight', kind: this.insightsCurated % REFINERY_INSIGHT_TYPES });
      }
    }
  }

  readouts(): RefineryReadouts {
    return {
      'spans-per-second': this.spansPerSecond,
      'views-synced': this.viewsSynced,
      chambers: this.chambers().filter((l) => l > 0.05).length,
      insights: this.gatewayOpen ? this.insightsCurated : 0,
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
