/** Shared behaviour for machine assemblies: plinth, lamps, lit state, control registry, readouts. */
import { Group, type Mesh, type Object3D } from 'three';
import type { MachineAssembly, MachineContext } from './types';
import type { QualityProfile } from '../quality';
import type { PaletteKey } from '../kit/materials';

export abstract class BaseMachine implements MachineAssembly {
  readonly group = new Group();
  protected lit = false;
  protected profile: QualityProfile;
  protected readonly lamps: Mesh[] = [];
  protected readonly controls = new Map<string, number | boolean | string>();
  protected elapsed = 0;

  constructor(
    readonly slug: string,
    protected readonly ctx: MachineContext,
  ) {
    this.profile = ctx.profile;
    this.group.name = slug;
    this.group.add(ctx.kit.plinth());
  }

  /** Register an emissive mesh (lamp bulb, screen panel) that switches with `setLit`. */
  protected registerLamp(mesh: Mesh): void {
    this.lamps.push(mesh);
  }

  protected swap(mesh: Mesh, key: PaletteKey): void {
    mesh.material = this.ctx.kit.palette.get(key);
  }

  setLit(lit: boolean): void {
    this.lit = lit;
    for (const l of this.lamps) this.swap(l, lit ? 'lampOn' : 'lampOff');
    this.onLit(lit);
  }
  protected onLit(_lit: boolean): void {}

  setControl(id: string, value: number | boolean | string): boolean {
    if (!this.controls.has(id)) return false;
    this.controls.set(id, value);
    this.onControl(id, value);
    return true;
  }
  protected onControl(_id: string, _value: number | boolean | string): void {}

  getControl<T extends number | boolean | string>(id: string, fallback: T): T {
    const v = this.controls.get(id);
    return (v === undefined ? fallback : v) as T;
  }

  setProfile(profile: QualityProfile): void {
    this.profile = profile;
    this.onProfile(profile);
  }
  protected onProfile(_profile: QualityProfile): void {}

  update(dt: number, t: number): void {
    this.elapsed = t;
    this.onUpdate(dt, t);
  }
  protected abstract onUpdate(dt: number, t: number): void;

  abstract readouts(): Record<string, string | number>;

  dispose(): void {
    this.group.traverse((o: Object3D) => {
      const m = o as Mesh;
      if (m.geometry && !(m.geometry as { __kitCached?: boolean }).__kitCached) {
        // Kit geometries are cached and disposed centrally; per-machine tube geometries are disposed here.
        if (m.userData['ownGeometry']) m.geometry.dispose();
      }
    });
    this.group.removeFromParent();
  }
}
