/**
 * Telemetry Refinery simulation (A360). Shape from the ledger: customer agents → Postgres staging → ADX (31 MVs) →
 * sync every N minutes into per-tenant ES chambers → JWKS gateway → dashboards; 20 insight types; dogfooding feed.
 * Clock: 1 real second = 1 simulated minute, so the default 10-minute sync fires every 10 s. All values are sample data.
 */
import { clamp, rng, type ControlValue, type Sim, type SimEvent } from './types';
import { Ring, hash01, type VizSpec } from '../viz/spec';

export const REFINERY_VIEWS = 31; // F-C03/F-C06 (as stated in résumé)
export const REFINERY_INSIGHT_TYPES = 20; // F-C11
/** The sync re-reads a trailing window so late documents are caught; deterministic SHA-256 ids collapse the repeats. */
export const OVERLAP_MINUTES = 70; // F-C03 (the 25-hour overlap is the daily catch-up, not simulated here)

export const REFINERY_SCENARIOS = ['steady', 'late-arrivals', 'tenant-surge'] as const;
export type RefineryScenario = (typeof REFINERY_SCENARIOS)[number];
const SYNC_COLUMNS = 10;

export interface RefineryReadouts extends Record<string, string | number> {
  'spans-per-second': number;
  'views-synced': number;
  chambers: number;
  insights: number;
  'late-docs-caught': number;
  'duplicates-collapsed': number;
}

export class RefinerySim implements Sim<RefineryReadouts> {
  readonly slug = 'telemetry-refinery';
  private ctrl: Record<string, ControlValue> = {
    'tenant-count': 4,
    'sync-interval': 10,
    dogfooding: true,
    gateway: true,
    'sync-now': false,
    scenario: 'steady',
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
  // instruments (all sample data)
  private shares: number[] = [0, 0, 0, 0, 0, 0, 0]; // six tenants + the dogfooding feed, spans/s
  private rings: Ring[] = Array.from({ length: 7 }, () => new Ring(60));
  private sampleT = 0;
  private syncCount = 0;
  private minutesSinceDocs = 0;
  private docsNew = 0;
  private docsReread = 0;
  private docsLate = 0;
  private insightSeen: boolean[] = new Array<boolean>(REFINERY_INSIGHT_TYPES).fill(false);

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
    if (id === 'scenario') {
      if (!REFINERY_SCENARIOS.includes(value as RefineryScenario)) return false;
      this.resetLedger();
    }
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
  get scenario(): RefineryScenario {
    return this.ctrl['scenario'] as RefineryScenario;
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

  private resetLedger(): void {
    this.docsNew = 0;
    this.docsReread = 0;
    this.docsLate = 0;
  }

  /** 0..1 burst envelope for the tenant-surge scenario (smooth, ~38 sim-minute period). */
  private burst(): number {
    return Math.sin(this.simMinutes / 6) ** 2;
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
    const surge = this.scenario === 'tenant-surge' ? this.burst() : 0;
    const noise = 0.9 + 0.2 * this.rand();
    this.spansPerSecond = Math.round((base + 60 * 2.5 * surge) * noise);
    this.splitShares(surge);
    this.sample(d);
    const spawned = this.spansPerSecond * d;
    this.staging += spawned;
    this.events.push({ type: 'spawn', count: spawned, dogfooding: this.dogfooding });

    // Sync cycle
    this.minutesSinceDocs += d;
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
        this.syncCount++;
        this.accountSync();
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
        const kind = this.insightsCurated % REFINERY_INSIGHT_TYPES;
        this.insightSeen[kind] = true;
        this.events.push({ type: 'insight', kind });
      }
    }
  }

  /** Split the span rate across tenants (a gentle drift each, the surge on tenant 1) and the dogfooding feed. */
  private splitShares(surge: number): void {
    const dog = this.dogfooding ? this.spansPerSecond * 0.2 : 0;
    const rest = this.spansPerSecond - dog;
    const w: number[] = [];
    for (let i = 0; i < this.tenants; i++) {
      let wi = 1 + 0.12 * Math.sin(this.simMinutes / 7 + i * 1.7);
      if (i === 0) wi *= 1 + 2.5 * surge;
      w.push(wi);
    }
    const total = w.reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < 6; i++) this.shares[i] = i < this.tenants ? (rest * w[i]!) / total : 0;
    this.shares[6] = dog;
  }

  /** Push one sample into every trace every half sim-minute. */
  private sample(d: number): void {
    this.sampleT += d;
    if (this.sampleT < 0.5) return;
    this.sampleT = 0;
    this.rings.forEach((r, i) => r.push(Math.round(this.shares[i] ?? 0)));
  }

  /** What one finished sync did to the index: new documents, the overlap re-read, late arrivals the overlap caught. */
  private accountSync(): void {
    const fresh = Math.round(this.spansPerSecond * this.minutesSinceDocs);
    this.minutesSinceDocs = 0;
    const late = this.scenario === 'late-arrivals' ? Math.round(fresh * (0.03 + 0.05 * this.rand())) : 0;
    this.docsNew += fresh + late;
    this.docsReread += Math.round(this.spansPerSecond * OVERLAP_MINUTES);
    this.docsLate += late;
    this.events.push({
      type: 'overlap',
      fresh,
      late,
      reread: Math.round(this.spansPerSecond * OVERLAP_MINUTES),
    });
  }

  viz(): VizSpec[] {
    const names = ['Tenant 1', 'Tenant 2', 'Tenant 3', 'Tenant 4', 'Tenant 5', 'Tenant 6'];
    const tones = ['teal', 'amber', 'sage', 'brass', 'ember', 'muted'] as const;
    const series = this.rings.slice(0, this.tenants).map((r, i) => ({
      id: `t${i + 1}`,
      label: names[i]!,
      tone: tones[i]!,
      points: r.values(),
    }));
    if (this.dogfooding)
      series.push({
        id: 'dogfood',
        label: 'Dogfooding feed',
        tone: 'muted',
        points: this.rings[6]!.values(),
      });

    // sync heatmap: 31 views × the last 10 syncs (the newest column fills top to bottom while a sync runs)
    const latest = this.syncCount + (this.syncing ? 1 : 0);
    const cols: string[] = [];
    const cells: number[][] = Array.from({ length: REFINERY_VIEWS }, () =>
      new Array<number>(SYNC_COLUMNS).fill(0),
    );
    for (let j = 0; j < SYNC_COLUMNS; j++) {
      const s = latest - (SYNC_COLUMNS - 1 - j);
      cols.push(s > 0 ? `#${s}` : '·');
      if (s <= 0) continue;
      const inProgress = this.syncing && s === latest;
      const age = latest - s;
      for (let v = 0; v < REFINERY_VIEWS; v++) {
        if (inProgress && v >= this.viewsSynced) continue;
        cells[v]![j] = (0.3 + 0.7 * hash01(v + 1, s)) * Math.max(0.35, 1 - 0.07 * age);
      }
    }
    const intervalLeft = Math.max(0, this.syncInterval - this.sinceSync);

    return [
      {
        id: 'spans',
        kind: 'lines',
        title: 'Spans per second, by tenant',
        caption: `Sample data, one point per half sim-minute (1 s = 1 sim minute). Scenario: ${this.scenario}.`,
        unit: 'spans/s',
        stacked: true,
        series,
        xLabels: ['−30 min', 'now'],
      },
      {
        id: 'sync-heat',
        kind: 'heat',
        title: 'ADX → Elasticsearch sync, view by view',
        caption: `${REFINERY_VIEWS} materialised views (as stated in résumé) across the last ${SYNC_COLUMNS} syncs; darker = more documents read (sample).`,
        rows: Array.from({ length: REFINERY_VIEWS }, (_, v) => `mv${v + 1}`),
        cols,
        cells,
        tone: 'teal',
        legend: ['fewer docs', 'more docs'],
      },
      {
        id: 'sync-clock',
        kind: 'gauge',
        title: 'Next sync',
        value: this.syncing ? 0 : intervalLeft,
        max: this.syncInterval,
        unit: 'min',
        tone: this.syncing ? 'amber' : 'teal',
        text: this.syncing
          ? `Syncing now: ${this.viewsSynced} of ${REFINERY_VIEWS} views`
          : `Every ${this.syncInterval} min (sample interval; the ledger's default is 10)`,
      },
      {
        id: 'chambers',
        kind: 'bars',
        title: 'Tenant chambers',
        caption: 'Elasticsearch chamber fill per tenant (sample).',
        unit: '%',
        max: 100,
        items: this.chambers().map((l, i) => ({
          label: `Tenant ${i + 1}`,
          value: Math.round(l * 100),
          tone: 'teal' as const,
        })),
      },
      {
        id: 'overlap-ledger',
        kind: 'bars',
        title: 'Overlap ledger',
        caption: `Each sync re-reads the last ${OVERLAP_MINUTES} minutes; deterministic SHA-256 document ids collapse the repeats. Sample documents since the scenario started.`,
        items: [
          { label: 'Read by the overlap window', value: this.docsReread + this.docsNew, tone: 'brass' },
          { label: 'Duplicates collapsed by id', value: this.docsReread, tone: 'muted' },
          { label: 'Late documents caught', value: this.docsLate, tone: 'ember' },
          { label: 'New documents indexed', value: this.docsNew, tone: 'sage' },
        ],
      },
      {
        id: 'insight-types',
        kind: 'heat',
        title: 'Insight types seen',
        caption: `${this.insightSeen.filter(Boolean).length} of ${REFINERY_INSIGHT_TYPES} insight types (as stated in résumé) have reached a dashboard; a closed gateway shows none new.`,
        rows: ['types'],
        cols: this.insightSeen.map((_, i) => String(i + 1)),
        cells: [this.insightSeen.map((v) => (v ? 1 : 0))],
        tone: 'amber',
        legend: ['not yet', 'seen'],
      },
    ];
  }

  readouts(): RefineryReadouts {
    return {
      'spans-per-second': this.spansPerSecond,
      'views-synced': this.viewsSynced,
      chambers: this.chambers().filter((l) => l > 0.05).length,
      insights: this.gatewayOpen ? this.insightsCurated : 0,
      'late-docs-caught': this.docsLate,
      'duplicates-collapsed': this.docsReread,
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
