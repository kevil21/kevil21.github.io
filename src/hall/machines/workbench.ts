/**
 * Data Workbench (bay 4): three bench stations. Running one pours raw records (particles) into the cleaning script,
 * fills the Elasticsearch jar and lights the Kibana screen. Driven by WorkbenchSim.
 */
import {
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  Mesh,
  SphereGeometry,
  type Material,
} from 'three';
import { BaseMachine } from './base';
import type { MachineContext } from './types';
import { WorkbenchSim, STATIONS, type Station } from '@/sim/workbench';
import type { QualityProfile } from '../quality';

interface Drop {
  station: number;
  t: number;
}

export class WorkbenchMachine extends BaseMachine {
  readonly sim = new WorkbenchSim();
  private fills: Mesh[] = [];
  private screens: Mesh[] = [];
  private particles: InstancedMesh;
  private drops: Drop[] = [];
  private tmp = new Matrix4();
  private cap: number;
  private acc = [0, 0, 0];

  constructor(ctx: MachineContext) {
    super('data-workbench', ctx);
    const k = ctx.kit;
    const bench = k.conveyor(2.4, 0.6);
    bench.position.set(0, 0.08, 0.2);
    this.group.add(bench);
    STATIONS.forEach((_, i) => {
      const x = -0.8 + i * 0.8;
      const jar = k.jar(0.17, 0.5);
      jar.position.set(x, 0.42, 0.2);
      this.group.add(jar);
      const fill = new Mesh(new CylinderGeometry(0.145, 0.145, 1, 20), k.palette.get('teal') as Material);
      fill.position.set(x, 0.46, 0.2);
      fill.scale.y = 0.01;
      this.group.add(fill);
      this.fills.push(fill);
      const screen = k.screen(0.46, 0.28);
      screen.position.set(x, 0.9, -0.5);
      this.group.add(screen);
      const panel = screen.userData['panel'] as Mesh;
      this.screens.push(panel);
      // intake funnel above each jar
      const funnel = k.hopper(0.16, 0.05, 0.18);
      funnel.position.set(x, 1.35, 0.2);
      this.group.add(funnel);
    });
    this.cap = Math.min(ctx.profile.particleCap, 600);
    this.particles = new InstancedMesh(
      new SphereGeometry(0.014, 6, 6),
      k.palette.get('brass') as Material,
      this.cap,
    );
    this.particles.instanceMatrix.setUsage(DynamicDrawUsage);
    this.particles.count = 0;
    this.particles.frustumCulled = false;
    this.group.add(this.particles);
    for (const [id, v] of Object.entries(this.sim.controls())) this.controls.set(id, v);
  }

  protected override onControl(id: string, value: number | boolean | string): void {
    this.sim.setControl(id, value);
    if (value === true) this.controls.set(id, false);
  }
  protected override onProfile(profile: QualityProfile): void {
    this.cap = Math.min(profile.particleCap, 600);
  }

  protected onUpdate(dt: number): void {
    if (!this.lit) return;
    this.sim.step(dt);
    this.sim.drain();
    STATIONS.forEach((name: Station, i) => {
      const s = this.sim.station(name);
      // pour particles during ingest/clean
      if (s.phase === 'ingest' || s.phase === 'clean') {
        this.acc[i]! += dt * 40;
        while (this.acc[i]! >= 1 && this.drops.length < this.cap) {
          this.acc[i]! -= 1;
          this.drops.push({ station: i, t: 0 });
        }
      }
      const level = s.jar;
      const f = this.fills[i]!;
      f.scale.y = Math.max(0.01, level * 0.46);
      f.position.y = 0.46 + (level * 0.46) / 2;
      this.screens[i]!.material = this.ctx.kit.palette.get(s.lit ? 'lampOn' : 'screen');
    });
    let n = 0;
    for (let j = this.drops.length - 1; j >= 0; j--) {
      const d = this.drops[j]!;
      d.t += dt * 1.4;
      if (d.t >= 1) {
        this.drops.splice(j, 1);
        continue;
      }
      const x = -0.8 + d.station * 0.8 + Math.sin(d.t * 12 + d.station) * 0.02;
      const y = 1.3 - d.t * 0.8;
      this.tmp.makeTranslation(x, y, 0.2);
      this.particles.setMatrixAt(n++, this.tmp);
    }
    this.particles.count = n;
    this.particles.instanceMatrix.needsUpdate = true;
  }

  readouts() {
    return this.sim.readouts();
  }

  viz() {
    return this.sim.viz();
  }
}
