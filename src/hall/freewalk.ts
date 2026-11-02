/** Free walk: bounded OrbitControls (orbit, pan, zoom). Enabled by the toggle; "return to rail" hands control back. */
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TOUCH, type Camera } from 'three';
import { FREE_BOUNDS } from './layout';

export interface FreeWalk {
  controls: OrbitControls;
  setEnabled(on: boolean): void;
  update(): void;
  dispose(): void;
}

export function createFreeWalk(camera: Camera, dom: HTMLElement): FreeWalk {
  const controls = new OrbitControls(camera, dom);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = FREE_BOUNDS.minDistance;
  controls.maxDistance = FREE_BOUNDS.maxDistance;
  controls.maxPolarAngle = Math.PI * 0.49; // never below the floor
  controls.minPolarAngle = Math.PI * 0.15;
  controls.screenSpacePanning = false;
  // Free walk is an explicit mode (a button, with a "return to rail" twin): one finger orbits, two fingers pan and zoom.
  // In rail mode the controls are disabled and the canvas keeps `touch-action: pan-y`, so one finger scrolls the page.
  controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
  // OrbitControls forces touch-action: none at construction; hand it back to the stylesheet (hall.css decides per mode).
  dom.style.touchAction = '';

  function clampCamera(): void {
    const p = camera.position;
    p.x = Math.min(FREE_BOUNDS.maxX, Math.max(FREE_BOUNDS.minX, p.x));
    p.y = Math.min(FREE_BOUNDS.maxY, Math.max(FREE_BOUNDS.minY, p.y));
    p.z = Math.min(FREE_BOUNDS.maxZ, Math.max(FREE_BOUNDS.minZ, p.z));
    const t = controls.target;
    t.x = Math.min(FREE_BOUNDS.maxX, Math.max(FREE_BOUNDS.minX, t.x));
    t.y = Math.min(FREE_BOUNDS.maxY, Math.max(0.2, t.y));
    t.z = Math.min(FREE_BOUNDS.maxZ, Math.max(FREE_BOUNDS.minZ, t.z));
  }

  return {
    controls,
    setEnabled(on) {
      controls.enabled = on;
      dom.closest('.hall-stage')?.setAttribute('data-mode', on ? 'free' : 'rail');
      if (on) controls.update();
    },
    update() {
      if (!controls.enabled) return;
      controls.update();
      clampCamera();
    },
    dispose() {
      controls.dispose();
    },
  };
}
