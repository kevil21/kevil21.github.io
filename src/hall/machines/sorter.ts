/**
 * Policy Sorter (bay 2): a policy card drops from the hopper onto the belt and rides through five stations —
 * compiler stamp, drift scanner (violation markers lift), planner (printer), risk gauge, gate (lever) — then the
 * executor files an evidence pack into the cabinet. Driven by SorterSim. Cards fall with Rapier when physics is
 * allowed, otherwise with a scripted drop.
 */
import { BoxGeometry, Mesh, Vector3, type Group, type Material } from 'three';
import { BaseMachine } from './base';
import type { MachineContext } from './types';
import { SorterSim, type Stage } from '@/sim/sorter';
import { loadRapier, physicsAllowed, type RapierModule } from '../physics';
import type { QualityProfile } from '../quality';

const STATION_X: Record<Stage, number> = {
  idle: -1.05,
  compile: -0.75,
  scan: -0.3,
  plan: 0.1,
  risk: 0.45,
  gate: 0.6,
  execute: 0.85,
  evidence: 1.05,
};

export class SorterMachine extends BaseMachine {
  readonly sim = new SorterSim();
  private card: Mesh;
  private markers: Mesh[] = [];
  private needle?: Group;
  private leverArm?: Group;
  private printerSlot?: Mesh;
  private paper: Mesh;
  private pack: Mesh;
  private packT = -1;
  private leverT = -1;
  private cardDrop = -1; // scripted drop timer
  private rapier: RapierModule | null = null;
  private world: InstanceType<RapierModule['World']> | null = null;
  private body: InstanceType<RapierModule['RigidBody']> | null = null;
  private physicsWanted = false;

  constructor(ctx: MachineContext) {
    super('policy-sorter', ctx);
    const k = ctx.kit;
    const hopper = k.hopper(0.42, 0.14, 0.5);
    hopper.position.set(-1.05, 1.25, 0);
    this.group.add(hopper);
    const belt = k.conveyor(2.3, 0.4);
    belt.position.set(0, 0.08, 0);
    this.group.add(belt);
    // stamp (compiler)
    const stamp = k.tank(0.08, 0.4, 'brass');
    stamp.position.set(-0.75, 0.7, -0.25);
    this.group.add(stamp);
    // scanner arch
    this.group.add(
      k.pipe(
        [
          new Vector3(-0.3, 0.4, 0.25),
          new Vector3(-0.3, 0.95, 0.1),
          new Vector3(-0.3, 0.95, -0.1),
          new Vector3(-0.3, 0.4, -0.25),
        ],
        0.03,
        'teal',
      ),
    );
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(new BoxGeometry(0.05, 0.05, 0.05), k.palette.get('ember') as Material);
      m.position.set(-0.3 + (i - 1) * 0.08, 0.42, 0);
      m.visible = false;
      this.group.add(m);
      this.markers.push(m);
    }
    const printer = k.printer(0.42);
    printer.position.set(0.1, 0.38, -0.42);
    this.group.add(printer);
    this.printerSlot = printer.userData['slot'] as Mesh;
    this.paper = new Mesh(new BoxGeometry(0.3, 0.01, 0.001), k.palette.get('enamel') as Material);
    this.paper.position.set(0.1, 0.66, -0.3);
    this.paper.visible = false;
    this.group.add(this.paper);
    const gauge = k.gauge(0.18);
    gauge.position.set(0.45, 1.15, -0.55);
    this.group.add(gauge);
    this.needle = gauge.userData['needle'] as Group;
    const lever = k.lever(0.38);
    lever.position.set(0.6, 0.45, 0.42);
    this.group.add(lever);
    this.leverArm = lever.userData['arm'] as Group;
    const cabinet = k.cabinet(0.5, 0.9, 4);
    cabinet.position.set(1.15, 0.08, 0.5);
    cabinet.rotation.y = -0.35;
    this.group.add(cabinet);
    this.pack = new Mesh(new BoxGeometry(0.18, 0.05, 0.14), k.palette.get('sage') as Material);
    this.pack.visible = false;
    this.group.add(this.pack);

    this.card = new Mesh(new BoxGeometry(0.22, 0.02, 0.16), k.palette.get('enamel') as Material);
    this.card.visible = false;
    this.group.add(this.card);

    for (const [id, v] of Object.entries(this.sim.controls())) this.controls.set(id, v);
    this.physicsWanted = physicsAllowed(ctx.profile.name);
    if (this.physicsWanted) void this.setupPhysics();
  }

  private async setupPhysics(): Promise<void> {
    const R = await loadRapier();
    if (!R || !this.physicsWanted) return;
    this.rapier = R;
    const world = new R.World({ x: 0, y: -9.81, z: 0 });
    // belt as a fixed cuboid at y = 0.33 (local to the machine group)
    world.createCollider(R.ColliderDesc.cuboid(1.15, 0.03, 0.2).setTranslation(0, 0.33, 0));
    this.world = world;
  }

  private dropCard(): void {
    this.card.visible = true;
    this.card.position.set(STATION_X.idle, 1.0, 0);
    this.card.rotation.set(0, 0, 0);
    if (this.rapier && this.world) {
      if (this.body) this.world.removeRigidBody(this.body);
      const R = this.rapier;
      const body = this.world.createRigidBody(
        R.RigidBodyDesc.dynamic().setTranslation(STATION_X.idle, 1.0, 0).setAngvel({ x: 0.4, y: 0, z: 0.6 }),
      );
      this.world.createCollider(
        R.ColliderDesc.cuboid(0.11, 0.01, 0.08).setRestitution(0.25).setFriction(0.8),
        body,
      );
      this.body = body;
      this.cardDrop = -1;
    } else {
      this.cardDrop = 0;
    }
  }

  protected override onControl(id: string, value: number | boolean | string): void {
    this.sim.setControl(id, value);
    // The approval lever is a button: pull it down and let it spring back.
    if (id === 'approve' && value === true) this.leverT = 0;
  }

  protected override onProfile(profile: QualityProfile): void {
    this.physicsWanted = physicsAllowed(profile.name);
    if (!this.physicsWanted && this.body && this.world) {
      this.world.removeRigidBody(this.body);
      this.body = null;
    }
  }

  protected onUpdate(dt: number): void {
    if (!this.lit) return;
    this.sim.step(dt);
    for (const e of this.sim.drain()) {
      if (e.type === 'card') this.dropCard();
      if (e.type === 'pack') {
        this.packT = 0;
        this.pack.visible = true;
      }
      if (e.type === 'stage' && e['stage'] === 'idle') this.card.visible = false;
    }
    const stage = this.sim.currentStage;
    const prog = this.sim.stageProgress;

    // Card: physics drop during compile, then kinematic ride along the belt
    if (stage === 'compile' && this.body && this.world) {
      this.world.timestep = Math.min(dt, 1 / 30);
      this.world.step();
      const p = this.body.translation();
      const r = this.body.rotation();
      this.card.position.set(p.x, p.y, p.z);
      this.card.quaternion.set(r.x, r.y, r.z, r.w);
    } else if (stage === 'compile' && this.cardDrop >= 0) {
      this.cardDrop += dt;
      const y = Math.max(0.36, 1.0 - 4.9 * this.cardDrop * this.cardDrop);
      this.card.position.set(STATION_X.idle + prog * 0.1, y, 0);
      this.card.rotation.z = Math.sin(this.cardDrop * 6) * 0.1 * Math.max(0, 1 - this.cardDrop);
    } else if (stage !== 'idle') {
      const order: Stage[] = ['compile', 'scan', 'plan', 'risk', 'gate', 'execute', 'evidence'];
      const i = order.indexOf(stage);
      const from = STATION_X[stage];
      const to = STATION_X[order[Math.min(order.length - 1, i + 1)]!];
      const x = stage === 'gate' ? STATION_X.gate : from + (to - from) * prog;
      this.card.position.set(x, 0.36 + (stage === 'execute' ? prog * 0.3 : 0), 0);
      this.card.rotation.set(0, 0, 0);
      if (this.body && this.world) {
        this.world.removeRigidBody(this.body);
        this.body = null;
      }
    }

    // Violation markers lift during the scan
    const violations = this.sim.policy.violations;
    this.markers.forEach((m, i) => {
      const show = stage === 'scan' && i < violations && prog > 0.2 + i * 0.2;
      m.visible = show || (i < violations && ['plan', 'risk', 'gate'].includes(stage));
      // lift during the scan; once scanned, markers stay lifted for the later stages (never sink into the belt)
      const lift = stage === 'scan' ? Math.min(0.3, Math.max(0, (prog - 0.2) * 0.6)) : 0.3;
      m.position.y = 0.42 + (m.visible ? lift : 0);
    });
    // Printer paper during planning
    this.paper.visible = stage === 'plan' || stage === 'risk' || stage === 'gate';
    this.paper.scale.z = stage === 'plan' ? 1 + prog * 120 : 120;
    this.paper.position.z = -0.3 + (this.paper.scale.z * 0.001) / 2;
    // Risk needle: score 0..10 → sweep; red zone pinned at 10
    const r = this.sim.readouts();
    if (this.needle) this.needle.rotation.z = Math.PI * 0.4 - (Number(r['risk-score']) / 10) * 1.35;
    // Approval lever: pulled down and back up; armed (half way) while a plan waits at the gate
    if (this.leverArm) {
      if (this.leverT >= 0) {
        this.leverT += dt;
        const k = Math.min(1, this.leverT / 0.9);
        this.leverArm.rotation.z = -0.5 + 1.0 * Math.sin(k * Math.PI);
        if (k >= 1) this.leverT = -1;
      } else {
        this.leverArm.rotation.z = stage === 'gate' ? -0.2 + 0.05 * Math.sin(this.elapsed * 6) : -0.5;
      }
    }
    // Evidence pack flies into the cabinet
    if (this.packT >= 0) {
      this.packT += dt;
      const k = Math.min(1, this.packT / 0.8);
      this.pack.position.set(
        STATION_X.execute + (1.1 - STATION_X.execute) * k,
        0.5 + Math.sin(k * Math.PI) * 0.35,
        0.5 * k,
      );
      if (k >= 1) {
        this.packT = -1;
        this.pack.visible = false;
      }
    }
    void this.printerSlot;
  }

  readouts() {
    return this.sim.readouts();
  }

  override dispose(): void {
    if (this.world) this.world.free();
    super.dispose();
  }
}
