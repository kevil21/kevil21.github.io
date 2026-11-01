/**
 * Foundations Generator (bay 6): VIT and the school as turbines, GDSC as the community coil. Selecting a turbine spins
 * it up; the coil glows with the GDSC turbine. Driven by FoundationsSim with the real hall-power series.
 */
import { type Group, type Mesh } from 'three';
import { BaseMachine } from './base';
import type { MachineContext } from './types';
import { FoundationsSim, type Turbine } from '@/sim/foundations';
import { POWER_SERIES } from '../data/power';

export class FoundationsMachine extends BaseMachine {
  readonly sim = new FoundationsSim(POWER_SERIES);
  private rotors: Record<Turbine, Group>;
  private coil: Mesh;

  constructor(ctx: MachineContext) {
    super('foundations-generator', ctx);
    const k = ctx.kit;
    const vit = k.turbine(0.55, 6);
    vit.position.set(-0.8, 1.0, 0);
    this.group.add(vit);
    const school = k.turbine(0.36, 5);
    school.position.set(0.95, 0.82, 0.15);
    this.group.add(school);
    this.coil = k.coil(0.26, 8, 1.0, 'teal');
    this.coil.position.set(0.1, 0.1, -0.55);
    this.group.add(this.coil);
    const gdsc = k.turbine(0.22, 4);
    gdsc.position.set(0.1, 1.35, -0.55);
    this.group.add(gdsc);
    for (const [x, r] of [
      [-0.8, 0.12],
      [0.95, 0.1],
    ] as const) {
      const stand = k.tank(r, 0.46, 'steelDark');
      stand.position.set(x, 0.08, 0);
      this.group.add(stand);
    }
    this.rotors = {
      vit: vit.userData['rotor'] as Group,
      school: school.userData['rotor'] as Group,
      gdsc: gdsc.userData['rotor'] as Group,
    };
    for (const [id, v] of Object.entries(this.sim.controls())) this.controls.set(id, v);
  }

  protected override onControl(id: string, value: number | boolean | string): void {
    this.sim.setControl(id, value);
  }

  protected onUpdate(dt: number): void {
    this.sim.step(dt);
    this.sim.drain();
    const base = this.lit ? 2.2 : 0.3;
    this.rotors.vit.rotation.z += dt * base * this.sim.speed('vit');
    this.rotors.school.rotation.z -= dt * base * 1.3 * this.sim.speed('school');
    this.rotors.gdsc.rotation.z += dt * base * 1.8 * this.sim.speed('gdsc');
    this.coil.rotation.y += dt * 0.4 * this.sim.speed('gdsc');
    this.coil.material = this.ctx.kit.palette.get(
      this.sim.turbine === 'gdsc' && this.lit ? 'lampOn' : 'teal',
    );
  }

  readouts() {
    return this.sim.readouts();
  }
}
