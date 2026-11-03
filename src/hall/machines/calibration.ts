/**
 * Calibration Bench (bay 5): ten dials, one per certification, grouped by issuer (AWS left, Microsoft centre,
 * Founderz right). The issuer filter brightens a group; "print" feeds a certificate strip out of the dot-matrix printer.
 */
import { BoxGeometry, Mesh, type Group, type Material } from 'three';
import { BaseMachine } from './base';
import type { MachineContext } from './types';
import { CalibrationSim } from '@/sim/calibration';
import { INSTRUMENTS } from '../data/instruments';

export class CalibrationMachine extends BaseMachine {
  readonly sim = new CalibrationSim(INSTRUMENTS);
  private dials: Array<{ group: Group; needle: Group; issuer: string }> = [];
  private paper: Mesh;

  constructor(ctx: MachineContext) {
    super('calibration-bench', ctx);
    const k = ctx.kit;
    const bench = k.cabinet(2.4, 0.8, 2);
    bench.position.set(0, 0.08, 0);
    this.group.add(bench);
    // issuer groups: AWS (2) · Microsoft (5) · Founderz (3)
    const groups: Record<string, number[]> = { AWS: [], Microsoft: [], Founderz: [] };
    INSTRUMENTS.forEach((inst, i) => groups[inst.issuer]!.push(i));
    const layout: Array<{ issuer: string; x0: number; cols: number }> = [
      { issuer: 'AWS', x0: -1.0, cols: 1 },
      { issuer: 'Microsoft', x0: -0.55, cols: 3 },
      { issuer: 'Founderz', x0: 0.65, cols: 2 },
    ];
    for (const l of layout) {
      groups[l.issuer]!.forEach((idx, j) => {
        const col = j % l.cols;
        const row = Math.floor(j / l.cols);
        const dial = k.dial(0.09);
        dial.position.set(l.x0 + col * 0.33, 1.18 + row * 0.26, 0.26 - row * 0.04);
        this.group.add(dial);
        this.dials.push({
          group: dial,
          needle: dial.userData['needle'] as Group,
          issuer: INSTRUMENTS[idx]!.issuer,
        });
      });
      // issuer label plate
      const plate = new Mesh(new BoxGeometry(l.cols * 0.33, 0.04, 0.02), k.palette.get('brass') as Material);
      plate.position.set(l.x0 + ((l.cols - 1) * 0.33) / 2, 0.98, 0.28);
      this.group.add(plate);
    }
    const printer = k.printer(0.6);
    printer.position.set(0, 0.88, -0.1);
    this.group.add(printer);
    this.paper = new Mesh(new BoxGeometry(0.46, 0.002, 0.3), k.palette.get('enamel') as Material);
    this.paper.position.set(0, 1.15, 0.05);
    this.paper.visible = false;
    this.group.add(this.paper);
    for (const [id, v] of Object.entries(this.sim.controls())) this.controls.set(id, v);
  }

  protected override onControl(id: string, value: number | boolean | string): void {
    this.sim.setControl(id, value);
    if (id === 'print') this.controls.set('print', false);
  }

  protected onUpdate(dt: number, t: number): void {
    if (!this.lit) return;
    this.sim.step(dt);
    this.sim.drain();
    const issuer = this.sim.issuer;
    this.dials.forEach((d, i) => {
      const active = issuer === 'all' || d.issuer === issuer;
      d.group.scale.setScalar(active ? 1 : 0.85);
      d.needle.rotation.z = Math.PI * 0.4 - (active ? 0.75 + 0.05 * Math.sin(t * 0.9 + i) : 0.2) * 1.2;
    });
    const p = this.sim.printProgress;
    this.paper.visible = this.sim.isPrinting || p >= 1;
    this.paper.scale.z = Math.max(0.05, p);
    this.paper.position.z = 0.05 + (0.3 * p) / 2;
    this.paper.position.y = 1.15 - 0.02 * p;
  }

  readouts() {
    return this.sim.readouts();
  }

  viz() {
    return this.sim.viz();
  }
}
