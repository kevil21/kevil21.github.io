/**
 * Runs the simulations without the 3D hall (machine pages, static tier): the HTML control panel still gets live
 * readouts. Applies control changes from the bus and publishes readouts ~4×/s. Pauses when the tab is hidden.
 */
import { createSim } from '@/sim';
import type { Sim } from '@/sim/types';
import { INSTRUMENTS } from './data/instruments';
import { POWER_SERIES } from './data/power';
import { controls, publishReadouts } from './bus';

export function runHeadless(slug: string): () => void {
  const sim: Sim | null = createSim(slug, 1000, { instruments: INSTRUMENTS, power: POWER_SERIES });
  if (!sim) return () => {};
  const initial = controls.get()[slug] ?? {};
  for (const [id, v] of Object.entries(initial)) sim.setControl(id, v);
  // Make sure the panel sees defaults
  publishReadouts(slug, sim.readouts());

  const unsub = controls.subscribe((all) => {
    const mine = all[slug];
    if (!mine) return;
    for (const [id, v] of Object.entries(mine)) if (sim.getControl(id) !== v) sim.setControl(id, v);
  });

  let last = performance.now();
  let acc = 0;
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (document.hidden) return;
    sim.step(dt);
    sim.drain();
    acc += dt;
    if (acc >= 0.25) {
      acc = 0;
      publishReadouts(slug, sim.readouts());
    }
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    unsub();
  };
}
