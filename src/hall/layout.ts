/**
 * The floor plan as numbers. The hall runs along +x; the control room is at x ≈ −4, bays 1–6 stand at BAY_PITCH
 * intervals, the back wall (hall power meter) closes the far end. Camera rail stops are derived from the same numbers,
 * so the minimap, the 3D scene and the tests agree. Pure data and math; no Three.js imports.
 */
export const BAY_PITCH = 4.2;
export const BAY_COUNT = 6;
export const HALL_WIDTH = 9; // z extent (−4.5 … 4.5)
export const HALL_HEIGHT = 4.2;
export const CONTROL_ROOM_X = -5.2;
export const FIRST_BAY_X = 0;
export const BACK_WALL_X = FIRST_BAY_X + BAY_PITCH * (BAY_COUNT - 1) + 4.0;
export const HALL_X_MIN = CONTROL_ROOM_X - 3.2;
export const HALL_X_MAX = BACK_WALL_X + 0.2;
export const MACHINE_Z = -1.4; // machines stand on the far side of the walkway
export const WALK_Z = 1.9; // the visitor's lane

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function bayX(bay: number): number {
  return FIRST_BAY_X + (bay - 1) * BAY_PITCH;
}

/** World position of a machine's plinth centre for bay 1..6. */
export function machinePosition(bay: number): Vec3 {
  return { x: bayX(bay), y: 0, z: MACHINE_Z };
}

/** Practical lamp positions: one above each bay, one over the control-room door, one over the back wall. */
export function lampPositions(): Vec3[] {
  const lamps: Vec3[] = [{ x: CONTROL_ROOM_X + 2.4, y: HALL_HEIGHT - 0.4, z: 0 }];
  for (let b = 1; b <= BAY_COUNT; b++) lamps.push({ x: bayX(b), y: HALL_HEIGHT - 0.4, z: MACHINE_Z + 0.6 });
  lamps.push({ x: BACK_WALL_X - 1.2, y: HALL_HEIGHT - 0.4, z: 0 });
  return lamps;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

/**
 * Rail stop for an integer stop index: 0 control room (looking down the hall), 1–6 the bays (three-quarter view of
 * the machine), 7 the back wall. `portrait` moves the camera back and up so a tall viewport frames the machine.
 */
export function railStop(stop: number, portrait = false): CameraPose {
  const back = portrait ? 1.35 : 1;
  if (stop <= 0) {
    return {
      position: { x: CONTROL_ROOM_X + 1.6, y: 1.65, z: portrait ? 0.6 : 1.2 },
      target: { x: bayX(3), y: 1.1, z: MACHINE_Z + 0.4 },
    };
  }
  if (stop >= BAY_COUNT + 1) {
    return {
      position: { x: BACK_WALL_X - 5.2 * back, y: 1.7, z: 1.0 },
      target: { x: BACK_WALL_X, y: 1.8, z: 0 },
    };
  }
  const mx = bayX(stop);
  // Landscape: the bay card sits on the right third, so the camera looks slightly right of the machine, which then
  // appears left of centre. Portrait: the card is below, so the machine is centred and framed higher.
  const lookAhead = portrait ? 0 : 1.1;
  return {
    position: { x: mx + 2.4 * back, y: portrait ? 2.6 : 1.9, z: WALK_Z + 2.3 * back },
    target: { x: mx + lookAhead, y: portrait ? 0.15 : 0.95, z: MACHINE_Z },
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpV(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Pose for fractional progress along the rail (0..7), eased between stops. */
export function railPose(progress: number, portrait = false): CameraPose {
  const p = Math.min(BAY_COUNT + 1, Math.max(0, progress));
  const i = Math.floor(p);
  const t = p - i;
  const a = railStop(i, portrait);
  if (t < 1e-6 || i >= BAY_COUNT + 1) return a;
  const b = railStop(i + 1, portrait);
  const e = easeInOut(t);
  return { position: lerpV(a.position, b.position, e), target: lerpV(a.target, b.target, e) };
}

/** Free-walk bounds: keep the camera inside the hall and above the floor. */
export const FREE_BOUNDS = {
  minX: HALL_X_MIN + 0.6,
  maxX: HALL_X_MAX - 0.6,
  minY: 0.6,
  maxY: HALL_HEIGHT - 0.3,
  minZ: -HALL_WIDTH / 2 + 0.6,
  maxZ: HALL_WIDTH / 2 - 0.6,
  minDistance: 1.2,
  maxDistance: 14,
};

/** Minimap geometry in a 0..1000 × 0..(aspect) coordinate space for SVG. */
export function minimapModel(): {
  width: number;
  height: number;
  controlRoom: { x: number; y: number; w: number; h: number };
  bays: Array<{ bay: number; x: number; y: number; w: number; h: number }>;
  backWall: { x: number; y: number; w: number; h: number };
  toMap: (p: Vec3) => { x: number; y: number };
} {
  const W = 1000;
  const scale = W / (HALL_X_MAX - HALL_X_MIN);
  const H = HALL_WIDTH * scale;
  const toMap = (p: Vec3) => ({ x: (p.x - HALL_X_MIN) * scale, y: (p.z + HALL_WIDTH / 2) * scale });
  const cr = toMap({ x: HALL_X_MIN + 0.2, y: 0, z: -HALL_WIDTH / 2 + 0.2 });
  const crSize = toMap({ x: CONTROL_ROOM_X + 2.2, y: 0, z: HALL_WIDTH / 2 - 0.2 });
  const bays = [];
  for (let b = 1; b <= BAY_COUNT; b++) {
    const c = toMap({ x: bayX(b) - 1.4, y: 0, z: MACHINE_Z - 1.1 });
    const s = toMap({ x: bayX(b) + 1.4, y: 0, z: MACHINE_Z + 1.1 });
    bays.push({ bay: b, x: c.x, y: c.y, w: s.x - c.x, h: s.y - c.y });
  }
  const bw = toMap({ x: BACK_WALL_X - 0.3, y: 0, z: -HALL_WIDTH / 2 });
  const bw2 = toMap({ x: BACK_WALL_X, y: 0, z: HALL_WIDTH / 2 });
  return {
    width: W,
    height: H,
    controlRoom: { x: cr.x, y: cr.y, w: crSize.x - cr.x, h: crSize.y - cr.y },
    bays,
    backWall: { x: bw.x, y: bw.y, w: bw2.x - bw.x, h: bw2.y - bw.y },
    toMap,
  };
}
