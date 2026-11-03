/**
 * Forecast Engine (bay 3): weather and load streams pour into the recurrent coil; a ribbon of history flows across
 * the screens and the forecast ribbon extends past "now"; a resilience dial reports only the résumé's stated outcome.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import { BaseMachine } from './base';
import type { MachineContext } from './types';
import { ForecastSim, HISTORY } from '@/sim/forecast';
import { tokenColor } from '@/theme/bridge';
import { onThemeChange } from '@/theme/bridge';

function lineMaterial(token: '--fill-teal' | '--fill-amber' | '--ink-3'): LineBasicMaterial {
  const c = tokenColor(token);
  const m = new LineBasicMaterial({ transparent: true, opacity: 0.95 });
  m.color.setRGB(c.r, c.g, c.b, 'srgb');
  return m;
}

export class ForecastMachine extends BaseMachine {
  readonly sim: ForecastSim;
  private coil: Mesh;
  private needle?: Group;
  private history: Line;
  private model: Line;
  private baseline: Line;
  private unsubTheme: () => void;
  private materials: { history: LineBasicMaterial; model: LineBasicMaterial; baseline: LineBasicMaterial };

  constructor(ctx: MachineContext) {
    super('forecast-engine', ctx);
    this.sim = new ForecastSim(ctx.seed);
    const k = ctx.kit;
    this.coil = k.coil(0.32, 7, 1.0, 'brass');
    this.coil.position.set(-0.25, 0.2, -0.1);
    this.group.add(this.coil);
    const base = k.tank(0.45, 0.18, 'steelDark');
    base.position.set(-0.25, 0.08, -0.1);
    this.group.add(base);
    // intake pipes from above (weather, load)
    this.group.add(
      k.pipe(
        [new Vector3(-1.1, 2.4, -0.4), new Vector3(-0.8, 1.7, -0.3), new Vector3(-0.3, 1.3, -0.1)],
        0.04,
        'teal',
      ),
    );
    this.group.add(
      k.pipe(
        [new Vector3(-1.1, 2.4, 0.3), new Vector3(-0.7, 1.6, 0.2), new Vector3(-0.2, 1.3, -0.05)],
        0.04,
        'teal',
      ),
    );
    const gauge = k.gauge(0.2);
    gauge.position.set(1.0, 1.15, 0.45);
    gauge.rotation.y = -0.45;
    this.group.add(gauge);
    this.needle = gauge.userData['needle'] as Group;
    // ribbon board behind the coil
    const board = k.screen(1.5, 0.6);
    board.position.set(0.55, 0.75, -0.6);
    this.group.add(board);
    this.registerLamp(board.userData['panel'] as Mesh);

    this.materials = {
      history: lineMaterial('--fill-teal'),
      model: lineMaterial('--fill-amber'),
      baseline: lineMaterial('--ink-3'),
    };
    this.history = new Line(new BufferGeometry(), this.materials.history);
    this.model = new Line(new BufferGeometry(), this.materials.model);
    this.baseline = new Line(new BufferGeometry(), this.materials.baseline);
    for (const l of [this.history, this.model, this.baseline]) {
      l.frustumCulled = false;
      l.position.set(0.55, 1.05, -0.56);
      this.group.add(l);
    }
    this.unsubTheme = onThemeChange(() => {
      for (const [key, token] of [
        ['history', '--fill-teal'],
        ['model', '--fill-amber'],
        ['baseline', '--ink-3'],
      ] as const) {
        const c = tokenColor(token);
        this.materials[key].color.setRGB(c.r, c.g, c.b, 'srgb');
      }
    });
    for (const [id, v] of Object.entries(this.sim.controls())) this.controls.set(id, v);
    this.rebuildRibbons();
  }

  protected override onControl(id: string, value: number | boolean | string): void {
    this.sim.setControl(id, value);
    this.rebuildRibbons();
  }

  private setLine(
    line: Line,
    values: number[],
    xStart: number,
    xEnd: number,
    yScale: { min: number; max: number },
  ): void {
    const n = values.length;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = xStart + ((xEnd - xStart) * i) / Math.max(1, n - 1);
      const y = ((values[i]! - yScale.min) / Math.max(1e-6, yScale.max - yScale.min)) * 0.5 - 0.25;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = 0;
    }
    line.geometry.dispose();
    line.geometry = new BufferGeometry();
    line.geometry.setAttribute('position', new BufferAttribute(pos, 3));
  }

  private rebuildRibbons(): void {
    const h = this.sim.history();
    const m = this.sim.model();
    const b = this.sim.baseline();
    const all = [...h, ...m, ...b];
    const scale = { min: Math.min(...all), max: Math.max(...all) };
    const span = 1.4;
    const total = HISTORY + this.sim.horizon;
    const nowX = -span / 2 + (span * HISTORY) / total;
    this.setLine(this.history, h, -span / 2, nowX, scale);
    this.setLine(this.model, [h[h.length - 1]!, ...m], nowX, span / 2, scale);
    this.setLine(this.baseline, [h[h.length - 1]!, ...b], nowX, span / 2, scale);
    this.baseline.visible = this.sim.showBaseline;
  }

  private acc = 0;
  protected onUpdate(dt: number): void {
    this.coil.rotation.y += dt * (this.lit ? 0.7 : 0.15);
    if (!this.lit) return;
    this.sim.step(dt);
    this.sim.drain();
    this.acc += dt;
    if (this.acc > 0.5) {
      this.acc = 0;
      this.rebuildRibbons();
    }
    if (this.needle) {
      // the dial shows the stated outcome's magnitude as a fixed sweep per stream (15 / 25 / 35 %), not a live metric
      const pct = this.sim.stream === 'migration' ? 15 : this.sim.stream === 'grid' ? 25 : 35;
      this.needle.rotation.z = Math.PI * 0.4 - (pct / 50) * 1.3;
    }
  }

  readouts() {
    return this.sim.readouts();
  }

  viz() {
    return this.sim.viz();
  }

  override dispose(): void {
    this.unsubTheme();
    for (const l of [this.history, this.model, this.baseline]) l.geometry.dispose();
    for (const m of Object.values(this.materials)) m.dispose();
    super.dispose();
  }
}
