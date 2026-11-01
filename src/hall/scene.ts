/**
 * The hall itself: floor, walls, ceiling, the glass control room, practical lamps, fog and base lighting.
 * Every colour comes from the token palette and updates on theme change (fog and lights included).
 */
import {
  AmbientLight,
  BoxGeometry,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  PlaneGeometry,
  PointLight,
  Scene,
  type Material,
  type Mesh as MeshT,
} from 'three';
import { Kit } from './kit/parts';
import { Palette, lightColor } from './kit/materials';
import { onThemeChange, tokenScalar } from '@/theme/bridge';
import {
  BACK_WALL_X,
  CONTROL_ROOM_X,
  HALL_HEIGHT,
  HALL_WIDTH,
  HALL_X_MAX,
  HALL_X_MIN,
  lampPositions,
  type Vec3,
} from './layout';
import type { QualityProfile } from './quality';

export interface HallEnvironment {
  scene: Scene;
  palette: Palette;
  kit: Kit;
  lamps: Array<{ group: Group; bulb: MeshT; light: PointLight; position: Vec3 }>;
  /** Light bay lamps 0..n (0 = all off). Used by the opening sequence. */
  setLitCount(n: number): void;
  /** Tell the hall where the camera is so the nearest lamps are the ones that cast real light. */
  setCameraX(x: number): void;
  setProfile(profile: QualityProfile): void;
  applyTheme(): void;
  dispose(): void;
}

export function buildHall(profile: QualityProfile): HallEnvironment {
  const scene = new Scene();
  const palette = new Palette();
  const kit = new Kit(palette);

  const length = HALL_X_MAX - HALL_X_MIN;
  const cx = (HALL_X_MAX + HALL_X_MIN) / 2;

  // Floor and ceiling
  const floor = new Mesh(new PlaneGeometry(length, HALL_WIDTH), palette.get('floor') as Material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0, 0);
  scene.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(length, HALL_WIDTH), palette.get('wall') as Material);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(cx, HALL_HEIGHT, 0);
  scene.add(ceiling);

  // Walls (back of the machines, visitor side left open to the camera, far end, control-room end)
  const wallBack = new Mesh(new PlaneGeometry(length, HALL_HEIGHT), palette.get('wall') as Material);
  wallBack.position.set(cx, HALL_HEIGHT / 2, -HALL_WIDTH / 2);
  scene.add(wallBack);
  const wallFront = new Mesh(new PlaneGeometry(length, HALL_HEIGHT), palette.get('wall') as Material);
  wallFront.rotation.y = Math.PI;
  wallFront.position.set(cx, HALL_HEIGHT / 2, HALL_WIDTH / 2);
  scene.add(wallFront);
  const wallEnd = new Mesh(new PlaneGeometry(HALL_WIDTH, HALL_HEIGHT), palette.get('wall') as Material);
  wallEnd.rotation.y = -Math.PI / 2;
  wallEnd.position.set(BACK_WALL_X, HALL_HEIGHT / 2, 0);
  scene.add(wallEnd);
  const wallStart = new Mesh(new PlaneGeometry(HALL_WIDTH, HALL_HEIGHT), palette.get('wall') as Material);
  wallStart.rotation.y = Math.PI / 2;
  wallStart.position.set(HALL_X_MIN, HALL_HEIGHT / 2, 0);
  scene.add(wallStart);

  // Hall power meter housing on the back wall (the real meter is drawn in scene 5)
  const meter = new Mesh(new BoxGeometry(0.12, 2.2, 3.4), palette.get('enamel') as Material);
  meter.position.set(BACK_WALL_X - 0.08, 1.9, 0);
  scene.add(meter);

  // Control room: a glass box with a steel frame at the start of the hall
  const cr = new Group();
  const crW = 3.0;
  const crD = HALL_WIDTH - 1.2;
  const glass = new Mesh(new BoxGeometry(crW, HALL_HEIGHT - 0.4, crD), palette.get('glass') as Material);
  glass.position.set(CONTROL_ROOM_X + crW / 2, (HALL_HEIGHT - 0.4) / 2, 0);
  cr.add(glass);
  for (const z of [-crD / 2, crD / 2]) {
    for (const x of [CONTROL_ROOM_X, CONTROL_ROOM_X + crW]) {
      const post = new Mesh(
        new BoxGeometry(0.08, HALL_HEIGHT - 0.4, 0.08),
        palette.get('steelDark') as Material,
      );
      post.position.set(x, (HALL_HEIGHT - 0.4) / 2, z);
      cr.add(post);
    }
  }
  const desk = kit.cabinet(2.0, 0.8, 2);
  desk.position.set(CONTROL_ROOM_X + 0.9, 0, 0.6);
  desk.rotation.y = Math.PI / 2;
  cr.add(desk);
  const console = kit.screen(1.2, 0.5);
  console.position.set(CONTROL_ROOM_X + 1.2, 0.8, 0.6);
  console.rotation.y = Math.PI / 2;
  cr.add(console);
  // breaker panel on the control-room wall (the opening's breaker; also the night-shift egg)
  const breaker = new Mesh(new BoxGeometry(0.1, 0.9, 0.6), palette.get('enamel') as Material);
  breaker.position.set(CONTROL_ROOM_X + 0.1, 1.5, -2.6);
  breaker.name = 'breaker';
  cr.add(breaker);
  const breakerLever = kit.lever(0.35);
  breakerLever.position.set(CONTROL_ROOM_X + 0.2, 1.3, -2.6);
  breakerLever.rotation.y = Math.PI / 2;
  breakerLever.name = 'breaker-lever';
  cr.add(breakerLever);
  // the hall's dot-matrix printer (reverse-walk egg) and the coffee mug (steam egg)
  const hallPrinter = kit.printer(0.5);
  hallPrinter.position.set(CONTROL_ROOM_X + 0.9, 0.8, -1.2);
  hallPrinter.rotation.y = Math.PI / 2;
  hallPrinter.name = 'hall-printer';
  cr.add(hallPrinter);
  const mug = kit.jar(0.06, 0.1);
  mug.position.set(CONTROL_ROOM_X + 1.0, 0.8, 1.4);
  mug.name = 'coffee-mug';
  mug.traverse((o) => (o.userData['pick'] = 'coffee-mug'));
  cr.add(mug);
  breakerLever.traverse((o) => (o.userData['pick'] = 'breaker'));
  scene.add(cr);

  // Practical lamps with real point lights (count limited by the quality profile)
  const lamps: HallEnvironment['lamps'] = lampPositions().map((p) => {
    const group = kit.lamp();
    group.position.set(p.x, p.y, p.z);
    scene.add(group);
    const light = new PointLight(lightColor('--fill-amber'), 0, 9, 1.6);
    light.position.set(p.x, p.y - 0.3, p.z);
    scene.add(light);
    return { group, bulb: group.userData['bulb'] as MeshT, light, position: p };
  });

  const hemi = new HemisphereLight(lightColor('--ink'), lightColor('--bg-floor'), 0.35);
  scene.add(hemi);
  const ambient = new AmbientLight(lightColor('--fog'), 0.4);
  scene.add(ambient);
  scene.fog = new Fog(lightColor('--fog'), 6, 30);

  let litCount = 0;
  let currentProfile = profile;
  let cameraX = CONTROL_ROOM_X;

  function applyLamps(): void {
    const intensity = tokenScalar('--lamp-intensity', 1);
    // Only `lampsLit` lamps cast real light (cost control): the ones nearest the camera. The rest glow but do not light.
    const nearest = lamps
      .map((l, i) => ({ i, d: Math.abs(l.position.x - cameraX) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, currentProfile.lampsLit)
      .map((x) => x.i);
    lamps.forEach((l, i) => {
      const on = i < litCount;
      l.bulb.material = palette.get(on ? 'lampOn' : 'lampOff');
      l.light.intensity = on && nearest.includes(i) ? 18 * intensity : 0;
      l.light.visible = l.light.intensity > 0;
    });
  }

  function applyTheme(): void {
    palette.apply();
    const fogColor = lightColor('--fog');
    const fog = scene.fog as Fog;
    fog.color.copy(fogColor);
    fog.near = tokenScalar('--fog-near', 7);
    fog.far = tokenScalar('--fog-far', 32);
    hemi.color.copy(lightColor('--ink'));
    hemi.groundColor.copy(lightColor('--bg-floor'));
    ambient.color.copy(fogColor);
    const lampIntensity = tokenScalar('--lamp-intensity', 1);
    // Light theme: daylit lab — brighter ambient, dimmer practicals
    ambient.intensity = 0.4 + (1 - lampIntensity) * 0.9;
    hemi.intensity = 0.35 + (1 - lampIntensity) * 0.6;
    for (const l of lamps) l.light.color.copy(lightColor('--fill-amber'));
    applyLamps();
  }

  const unsubscribe = onThemeChange(() => applyTheme());
  applyTheme();

  return {
    scene,
    palette,
    kit,
    lamps,
    setLitCount(n) {
      litCount = Math.max(0, Math.min(lamps.length, n));
      applyLamps();
    },
    setProfile(p) {
      currentProfile = p;
      applyLamps();
    },
    setCameraX(x) {
      if (Math.abs(x - cameraX) < 0.5) return;
      cameraX = x;
      applyLamps();
    },
    applyTheme,
    dispose() {
      unsubscribe();
      palette.dispose();
      scene.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry && (m.geometry as { type?: string }).type === 'PlaneGeometry') m.geometry.dispose();
      });
    },
  };
}
