/**
 * The kit of parts: geometry factories shared by every machine (ADR-009). Units are metres; machines sit on y = 0.
 * Geometries are cached by parameter key so identical parts share one BufferGeometry.
 */
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  CatmullRomCurve3,
  type Material,
} from 'three';
import type { Palette, PaletteKey } from './materials';

const cache = new Map<string, BufferGeometry>();
function cached(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

export function disposeKitGeometries(): void {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}

export class Kit {
  constructor(readonly palette: Palette) {}

  private mesh(geometry: BufferGeometry, key: PaletteKey): Mesh {
    const m = new Mesh(geometry, this.palette.get(key) as Material);
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }

  /** Vertical cylindrical tank with a domed top and a brass band. */
  tank(radius = 0.6, height = 1.4, key: PaletteKey = 'steel'): Group {
    const g = new Group();
    const body = this.mesh(
      cached(`tank:${radius}:${height}`, () => {
        const pts: Vector2[] = [];
        pts.push(new Vector2(0, 0));
        pts.push(new Vector2(radius, 0));
        pts.push(new Vector2(radius, height * 0.82));
        for (let i = 1; i <= 6; i++) {
          const t = i / 6;
          pts.push(
            new Vector2(
              radius * Math.cos((t * Math.PI) / 2),
              height * 0.82 + radius * 0.6 * Math.sin((t * Math.PI) / 2),
            ),
          );
        }
        return new LatheGeometry(pts, 40);
      }),
      key,
    );
    g.add(body);
    const band = this.mesh(
      cached(`band:${radius}`, () => new TorusGeometry(radius + 0.01, 0.025, 10, 48)),
      'brass',
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = height * 0.5;
    g.add(band);
    return g;
  }

  /** Glass chamber (jar): a transparent cylinder with a steel base and lid. */
  jar(radius = 0.28, height = 0.7): Group {
    const g = new Group();
    const glass = this.mesh(
      cached(`jar:${radius}:${height}`, () => new CylinderGeometry(radius, radius, height, 32, 1, true)),
      'glass',
    );
    glass.position.y = height / 2 + 0.04;
    g.add(glass);
    const base = this.mesh(
      cached(`jarbase:${radius}`, () => new CylinderGeometry(radius + 0.03, radius + 0.05, 0.04, 32)),
      'steelDark',
    );
    base.position.y = 0.02;
    g.add(base);
    const lid = this.mesh(
      cached(`jarlid:${radius}`, () => new CylinderGeometry(radius + 0.03, radius + 0.03, 0.04, 32)),
      'brass',
    );
    lid.position.y = height + 0.06;
    g.add(lid);
    return g;
  }

  /** Pipe along a polyline of points. */
  pipe(points: Vector3[], radius = 0.05, key: PaletteKey = 'steel'): Mesh {
    const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.05);
    const geo = new TubeGeometry(curve, Math.max(8, points.length * 6), radius, 12, false);
    return this.mesh(geo, key);
  }

  /** Valve: a wheel on a short pipe stub. */
  valve(radius = 0.12): Group {
    const g = new Group();
    const wheel = this.mesh(
      cached(`valve:${radius}`, () => new TorusGeometry(radius, 0.018, 10, 32)),
      'brass',
    );
    g.add(wheel);
    const hub = this.mesh(
      cached(`hub:${radius}`, () => new CylinderGeometry(radius * 0.25, radius * 0.25, 0.06, 16)),
      'steelDark',
    );
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    for (let i = 0; i < 4; i++) {
      const spoke = this.mesh(
        cached(`spoke:${radius}`, () => new BoxGeometry(radius * 2 - 0.02, 0.016, 0.016)),
        'brass',
      );
      spoke.rotation.z = (i * Math.PI) / 4;
      g.add(spoke);
    }
    return g;
  }

  /** Round gauge with a needle; the needle group is returned on `userData.needle` for animation. */
  gauge(radius = 0.16): Group {
    const g = new Group();
    const face = this.mesh(
      cached(`gauge:${radius}`, () => new CylinderGeometry(radius, radius, 0.04, 32)),
      'enamel',
    );
    face.rotation.x = Math.PI / 2;
    g.add(face);
    const rim = this.mesh(
      cached(`gaugerim:${radius}`, () => new TorusGeometry(radius, 0.015, 8, 32)),
      'brass',
    );
    g.add(rim);
    const needle = new Group();
    const n = this.mesh(
      cached(`needle:${radius}`, () => new BoxGeometry(0.012, radius * 0.85, 0.012)),
      'ember',
    );
    n.position.y = radius * 0.4;
    needle.add(n);
    needle.position.z = 0.03;
    needle.rotation.z = Math.PI * 0.4; // rest position
    g.add(needle);
    g.userData['needle'] = needle;
    return g;
  }

  /** Lever on a pivot; `userData.arm` rotates between rest (−0.5 rad) and pulled (+0.5 rad). */
  lever(length = 0.4): Group {
    const g = new Group();
    const pivot = this.mesh(
      cached('leverpivot', () => new CylinderGeometry(0.05, 0.05, 0.1, 16)),
      'steelDark',
    );
    pivot.rotation.x = Math.PI / 2;
    g.add(pivot);
    const arm = new Group();
    const bar = this.mesh(
      cached(`leverarm:${length}`, () => new BoxGeometry(0.03, length, 0.03)),
      'steel',
    );
    bar.position.y = length / 2;
    arm.add(bar);
    const knob = this.mesh(
      cached('leverknob', () => new SphereGeometry(0.05, 16, 12)),
      'ember',
    );
    knob.position.y = length;
    arm.add(knob);
    arm.rotation.z = -0.5;
    g.add(arm);
    g.userData['arm'] = arm;
    return g;
  }

  /** Conveyor segment: belt box with two roller cylinders. */
  conveyor(length = 1.2, width = 0.4): Group {
    const g = new Group();
    const belt = this.mesh(
      cached(`belt:${length}:${width}`, () => new BoxGeometry(length, 0.06, width)),
      'steelDark',
    );
    belt.position.y = 0.3;
    g.add(belt);
    for (const x of [-length / 2 + 0.05, length / 2 - 0.05]) {
      const roller = this.mesh(
        cached(`roller:${width}`, () => new CylinderGeometry(0.05, 0.05, width + 0.02, 16)),
        'brass',
      );
      roller.rotation.x = Math.PI / 2;
      roller.position.set(x, 0.3, 0);
      g.add(roller);
    }
    for (const x of [-length / 2 + 0.1, length / 2 - 0.1]) {
      const leg = this.mesh(
        cached('leg', () => new BoxGeometry(0.04, 0.3, 0.04)),
        'steel',
      );
      leg.position.set(x, 0.15, width / 2 - 0.03);
      g.add(leg);
      const leg2 = leg.clone();
      leg2.position.z = -width / 2 + 0.03;
      g.add(leg2);
    }
    return g;
  }

  /** Hopper: an inverted truncated pyramid (cone with 4 segments). */
  hopper(top = 0.5, bottom = 0.15, height = 0.5): Mesh {
    const m = this.mesh(
      cached(
        `hopper:${top}:${bottom}:${height}`,
        () => new CylinderGeometry(top, bottom, height, 4, 1, true),
      ),
      'enamel',
    );
    m.rotation.y = Math.PI / 4;
    return m;
  }

  /** Printer: a box with a slot; `userData.slot` marks where paper appears. */
  printer(width = 0.5): Group {
    const g = new Group();
    const body = this.mesh(
      cached(`printer:${width}`, () => new BoxGeometry(width, 0.25, 0.35)),
      'enamel',
    );
    body.position.y = 0.125;
    g.add(body);
    const slot = this.mesh(
      cached(`slot:${width}`, () => new BoxGeometry(width * 0.8, 0.015, 0.05)),
      'steelDark',
    );
    slot.position.set(0, 0.26, 0.1);
    g.add(slot);
    g.userData['slot'] = slot;
    return g;
  }

  /** Cabinet with N drawers. */
  cabinet(width = 0.6, height = 1.0, drawers = 4): Group {
    const g = new Group();
    const body = this.mesh(
      cached(`cabinet:${width}:${height}`, () => new BoxGeometry(width, height, 0.45)),
      'enamel',
    );
    body.position.y = height / 2;
    g.add(body);
    const dh = (height - 0.08) / drawers;
    for (let i = 0; i < drawers; i++) {
      const front = this.mesh(
        cached(`drawer:${width}:${dh}`, () => new BoxGeometry(width - 0.06, dh - 0.03, 0.02)),
        'steelDark',
      );
      front.position.set(0, 0.04 + dh * (i + 0.5), 0.235);
      g.add(front);
      const handle = this.mesh(
        cached('handle', () => new BoxGeometry(0.12, 0.02, 0.02)),
        'brass',
      );
      handle.position.set(0, 0.04 + dh * (i + 0.5), 0.25);
      g.add(handle);
    }
    return g;
  }

  /** Screen on a stand; the panel mesh is `userData.panel` (emissive, lights when on). */
  screen(width = 0.6, height = 0.36): Group {
    const g = new Group();
    const frame = this.mesh(
      cached(`frame:${width}:${height}`, () => new BoxGeometry(width + 0.04, height + 0.04, 0.04)),
      'steelDark',
    );
    frame.position.y = height / 2 + 0.3;
    g.add(frame);
    const panel = this.mesh(
      cached(`panel:${width}:${height}`, () => new BoxGeometry(width, height, 0.01)),
      'screen',
    );
    panel.position.set(0, height / 2 + 0.3, 0.025);
    g.add(panel);
    g.userData['panel'] = panel;
    const stand = this.mesh(
      cached('stand', () => new CylinderGeometry(0.03, 0.03, 0.3, 12)),
      'steel',
    );
    stand.position.y = 0.15;
    g.add(stand);
    return g;
  }

  /** Practical lamp: a hanging shade with an emissive bulb; `userData.bulb` for switching. */
  lamp(): Group {
    const g = new Group();
    const cord = this.mesh(
      cached('cord', () => new CylinderGeometry(0.008, 0.008, 0.6, 6)),
      'steelDark',
    );
    cord.position.y = 0.3;
    g.add(cord);
    const shade = this.mesh(
      cached('shade', () => new CylinderGeometry(0.08, 0.3, 0.22, 24, 1, true)),
      'enamel',
    );
    shade.position.y = -0.11;
    g.add(shade);
    const bulb = this.mesh(
      cached('bulb', () => new SphereGeometry(0.07, 16, 12)),
      'lampOff',
    );
    bulb.position.y = -0.16;
    g.add(bulb);
    g.userData['bulb'] = bulb;
    return g;
  }

  /** Coil: a helix tube (the recurrent core, the community coil). */
  coil(radius = 0.35, turns = 6, height = 0.9, key: PaletteKey = 'brass'): Mesh {
    const pts: Vector3[] = [];
    const steps = turns * 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = t * turns * Math.PI * 2;
      pts.push(new Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
    }
    return this.pipe(pts, 0.035, key);
  }

  /** Turbine: a hub with blades; `userData.rotor` spins. */
  turbine(radius = 0.5, blades = 6): Group {
    const g = new Group();
    const rotor = new Group();
    const hub = this.mesh(
      cached(`hub2:${radius}`, () => new CylinderGeometry(radius * 0.2, radius * 0.2, 0.12, 20)),
      'steelDark',
    );
    hub.rotation.x = Math.PI / 2;
    rotor.add(hub);
    for (let i = 0; i < blades; i++) {
      const blade = this.mesh(
        cached(`blade:${radius}`, () => new BoxGeometry(radius * 0.18, radius * 0.9, 0.02)),
        'steel',
      );
      blade.position.y = radius * 0.55;
      const holder = new Group();
      holder.add(blade);
      holder.rotation.z = (i / blades) * Math.PI * 2;
      rotor.add(holder);
    }
    g.add(rotor);
    g.userData['rotor'] = rotor;
    const ring = this.mesh(
      cached(`ring:${radius}`, () => new TorusGeometry(radius + 0.05, 0.03, 10, 48)),
      'brass',
    );
    g.add(ring);
    return g;
  }

  /** Dial: a small gauge variant used on the calibration bench. */
  dial(radius = 0.1): Group {
    return this.gauge(radius);
  }

  /** Cable run: a sagging tube between two ceiling points. */
  cable(from: Vector3, to: Vector3, sag = 0.35, key: PaletteKey = 'steelDark'): Mesh {
    const mid = from.clone().lerp(to, 0.5);
    mid.y -= sag;
    return this.pipe([from, mid, to], 0.012, key);
  }

  /** Plinth every machine stands on. */
  plinth(width = 2.6, depth = 2.0): Mesh {
    const m = this.mesh(
      cached(`plinth:${width}:${depth}`, () => new BoxGeometry(width, 0.08, depth)),
      'steelDark',
    );
    m.position.y = 0.04;
    return m;
  }
}
