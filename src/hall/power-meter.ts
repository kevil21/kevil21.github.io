/**
 * The hall power meter on the back wall: one bar per month of the real milestone series (dated milestones per month,
 * year-only milestones as a lighter band). Instanced boxes; the current month's bar pulses.
 */
import { BoxGeometry, DynamicDrawUsage, InstancedMesh, Matrix4, Group, Vector3, type Material } from 'three';
import type { Kit } from './kit/parts';
import { POWER_SERIES } from './data/power';
import { BACK_WALL_X } from './layout';

export interface PowerMeter {
  group: Group;
  update(t: number): void;
  dispose(): void;
}

export function buildPowerMeter(kit: Kit, from = '2017-01'): PowerMeter {
  const series = POWER_SERIES.filter((p) => p.month >= from);
  const n = series.length;
  const width = 3.0;
  const barW = width / n;
  const group = new Group();
  group.name = 'hall-power-meter';
  const geo = new BoxGeometry(0.08, 1, barW * 0.82);
  const bars = new InstancedMesh(geo, kit.palette.get('lampOn') as Material, n);
  const bands = new InstancedMesh(geo, kit.palette.get('lampOff') as Material, n);
  bars.instanceMatrix.setUsage(DynamicDrawUsage);
  const tmp = new Matrix4();
  const maxCount = Math.max(1, ...series.map((p) => p.count + p.yearShare));
  const baseY = 1.1;
  const scale = 1.9 / maxCount;
  series.forEach((p, i) => {
    const z = -width / 2 + barW * (i + 0.5);
    const h = Math.max(0.02, p.count * scale);
    tmp.makeScale(1, h, 1).setPosition(BACK_WALL_X - 0.15, baseY + h / 2, z);
    bars.setMatrixAt(i, tmp);
    const bh = Math.max(0.005, p.yearShare * scale);
    tmp.makeScale(1, bh, 1).setPosition(BACK_WALL_X - 0.15, baseY + h + bh / 2, z);
    bands.setMatrixAt(i, tmp);
  });
  bars.instanceMatrix.needsUpdate = true;
  bands.instanceMatrix.needsUpdate = true;
  group.add(bars, bands);
  // baseline rail
  const rail = kit.pipe(
    [
      new Vector3(BACK_WALL_X - 0.15, baseY - 0.02, -width / 2),
      new Vector3(BACK_WALL_X - 0.15, baseY - 0.02, width / 2),
    ],
    0.015,
    'brass',
  );
  group.add(rail);

  const last = n - 1;
  return {
    group,
    update(t) {
      if (last < 0) return;
      const p = series[last]!;
      const h = Math.max(0.02, p.count * scale) * (1 + 0.08 * Math.sin(t * 3));
      const z = -width / 2 + barW * (last + 0.5);
      tmp.makeScale(1, h, 1).setPosition(BACK_WALL_X - 0.15, baseY + h / 2, z);
      bars.setMatrixAt(last, tmp);
      bars.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      group.removeFromParent();
    },
  };
}
