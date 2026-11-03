/**
 * Telemetry Refinery (bay 1): particles fall as spans from the agents' inlet into the staging tank, flow through the
 * analytical core, fan out through the sync manifold into per-tenant chambers, pass the gateway valve and light the
 * dashboard screen. Driven by RefinerySim; every count is sample data.
 */
import {
  CatmullRomCurve3,
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  Mesh,
  SphereGeometry,
  Vector3,
  type Group,
  type Material,
} from 'three';
import { BaseMachine } from './base';
import type { MachineContext } from './types';
import { RefinerySim } from '@/sim/refinery';
import type { QualityProfile } from '../quality';

interface Particle {
  t: number; // 0..1 along its path
  path: number; // index into paths
  speed: number;
}

export class RefineryMachine extends BaseMachine {
  readonly sim: RefinerySim;
  private particles: InstancedMesh;
  private pool: Particle[] = [];
  private paths: CatmullRomCurve3[] = [];
  private tmp = new Matrix4();
  private v = new Vector3();
  private needle?: Group;
  private valve?: Group;
  private chamberFills: Mesh[] = [];
  private screen?: Mesh;
  private cap: number;
  private spawnAccumulator = 0;

  constructor(ctx: MachineContext) {
    super('telemetry-refinery', ctx);
    this.sim = new RefinerySim(ctx.seed);
    const k = ctx.kit;

    // Stations (x along the plinth): inlet (−1.1) → staging tank (−0.7) → core (0.1) → manifold (0.55) → chambers (1.0)
    const tank = k.tank(0.42, 1.1);
    tank.position.set(-0.75, 0.08, 0.15);
    this.group.add(tank);
    const core = k.tank(0.36, 1.5, 'enamel');
    core.position.set(0.05, 0.08, -0.35);
    this.group.add(core);
    for (let i = 0; i < 6; i++) {
      const jar = k.jar(0.13, 0.46);
      jar.position.set(1.0, 0.08, -0.75 + i * 0.3);
      jar.visible = i < this.sim.tenants;
      this.group.add(jar);
      // fill cylinder inside the jar (scaled in y with the chamber level)
      const fill = new Mesh(new CylinderGeometry(0.11, 0.11, 1, 20), k.palette.get('teal') as Material);
      fill.position.set(1.0, 0.12, -0.75 + i * 0.3);
      fill.scale.y = 0.01;
      fill.userData['jar'] = jar;
      fill.visible = i < this.sim.tenants;
      this.group.add(fill);
      this.chamberFills.push(fill);
    }
    this.group.add(
      k.pipe(
        [new Vector3(-0.75, 1.0, 0.15), new Vector3(-0.35, 1.35, -0.1), new Vector3(0.05, 1.45, -0.35)],
        0.045,
      ),
    );
    this.group.add(
      k.pipe(
        [new Vector3(0.05, 0.9, -0.35), new Vector3(0.55, 0.9, -0.3), new Vector3(1.0, 0.75, -0.2)],
        0.04,
      ),
    );
    const valve = k.valve(0.1);
    valve.position.set(0.55, 0.95, -0.3);
    this.group.add(valve);
    this.valve = valve;
    const gauge = k.gauge(0.14);
    gauge.position.set(-0.3, 1.1, 0.72);
    this.group.add(gauge);
    this.needle = gauge.userData['needle'] as Group;
    const screen = k.screen(0.7, 0.4);
    screen.position.set(0.95, 0.9, 0.75);
    screen.rotation.y = -0.5;
    this.group.add(screen);
    this.screen = screen.userData['panel'] as Mesh;
    this.registerLamp(this.screen);

    // Particle paths: spans from the inlet, through the tank, core and manifold into the chambers
    this.paths = [
      new CatmullRomCurve3([
        new Vector3(-1.25, 1.9, 0.3),
        new Vector3(-1.0, 1.5, 0.2),
        new Vector3(-0.75, 1.0, 0.15),
      ]),
      new CatmullRomCurve3([
        new Vector3(-0.75, 1.0, 0.15),
        new Vector3(-0.35, 1.35, -0.1),
        new Vector3(0.05, 1.45, -0.35),
        new Vector3(0.05, 1.0, -0.35),
      ]),
      ...Array.from(
        { length: 6 },
        (_, i) =>
          new CatmullRomCurve3([
            new Vector3(0.05, 0.9, -0.35),
            new Vector3(0.55, 0.92, -0.3),
            new Vector3(1.0, 0.8, -0.75 + i * 0.3),
            new Vector3(1.0, 0.25, -0.75 + i * 0.3),
          ]),
      ),
    ];

    this.cap = Math.min(ctx.profile.particleCap, 1200);
    this.particles = new InstancedMesh(
      new SphereGeometry(0.018, 6, 6),
      k.palette.get('teal') as Material,
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
    const tenants = this.sim.tenants;
    this.chamberFills.forEach((f, i) => {
      f.visible = i < tenants;
      (f.userData['jar'] as Group).visible = i < tenants;
    });
  }

  protected override onProfile(profile: QualityProfile): void {
    this.cap = Math.min(profile.particleCap, 1200);
    if (this.pool.length > this.cap) this.pool.length = this.cap;
  }

  protected onUpdate(dt: number, t: number): void {
    if (!this.lit) {
      this.particles.count = 0;
      return;
    }
    this.sim.step(dt);
    const events = this.sim.drain();
    for (const e of events) {
      if (e.type === 'spawn') this.spawnAccumulator += (e['count'] as number) * 0.02; // 1 particle per 50 spans
    }
    const tenants = this.sim.tenants;
    while (this.spawnAccumulator >= 1 && this.pool.length < this.cap) {
      this.spawnAccumulator -= 1;
      this.pool.push({ t: 0, path: 0, speed: 0.6 + Math.random() * 0.3 });
    }
    if (this.spawnAccumulator > 4) this.spawnAccumulator = 4;

    // Advance particles along paths; the manifold stage only flows while a sync runs
    const syncing = this.sim.isSyncing;
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i]!;
      const inManifold = p.path >= 2;
      if (p.path === 1 && p.t >= 1 && !syncing) continue; // wait in the core for the next sync
      p.t += dt * p.speed * (inManifold ? 1.4 : 1);
      if (p.t >= 1) {
        if (p.path === 0) {
          p.path = 1;
          p.t = 0;
        } else if (p.path === 1) {
          if (syncing) {
            p.path = 2 + Math.floor(Math.random() * tenants);
            p.t = 0;
          } else p.t = 1;
        } else {
          this.pool.splice(i, 1);
        }
      }
    }
    let n = 0;
    for (const p of this.pool) {
      const curve = this.paths[p.path]!;
      curve.getPointAt(Math.min(0.999, p.t), this.v);
      this.tmp.makeTranslation(this.v.x, this.v.y, this.v.z);
      this.particles.setMatrixAt(n++, this.tmp);
    }
    this.particles.count = n;
    this.particles.instanceMatrix.needsUpdate = true;

    // Chambers, needle, valve, screen
    const levels = this.sim.chambers();
    this.chamberFills.forEach((f, i) => {
      const l = levels[i] ?? 0;
      f.scale.y = Math.max(0.01, l * 0.42);
      f.position.y = 0.12 + (l * 0.42) / 2;
    });
    if (this.needle)
      this.needle.rotation.z =
        Math.PI * 0.4 - Math.min(1, this.sim.readouts()['spans-per-second'] / 500) * 1.3;
    if (this.valve) this.valve.rotation.z += dt * (this.sim.gatewayOpen ? 1.2 : 0);
    if (this.screen)
      this.screen.material = this.ctx.kit.palette.get(this.sim.gatewayOpen ? 'lampOn' : 'lampOff');
    void t;
  }

  readouts() {
    return this.sim.readouts();
  }

  viz() {
    return this.sim.viz();
  }
}
