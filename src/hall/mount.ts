/**
 * Mounts the 3D hall behind the readable page. Loaded lazily by loader.ts after first paint.
 * Renderer: WebGPURenderer, WebGL 2 backend when no adapter (ADR-010). Pauses when hidden or off-screen.
 * Adaptive quality from measured frame time (quality.ts). Theme follows the tokens live.
 * `dispose()` releases everything, so a soft navigation (View Transitions) can leave and re-enter the hall.
 */
import {
  BoxGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  SphereGeometry,
  Vector2,
  Vector3,
  type Camera,
  type Group,
  type Material,
} from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { buildHall } from './scene';
import { buildMachine } from './machines';
import {
  controls as controlBus,
  createControlApplier,
  onPulse,
  publishReadouts,
  publishVisuals,
} from './bus';
import type { MachineAssembly } from './machines/types';
import { machinePosition, railPose } from './layout';
import { FrameProbe, PROFILES, effectiveDpr } from './quality';
import { bindRail } from './rail';
import { createFreeWalk } from './freewalk';
import { buildCables } from './cables';
import { buildPowerMeter } from './power-meter';
import { MachineRoomAudio, soundPref } from './sound';
import { tour, advanceTour, TOUR_STOPS, startTour, stopTour } from './tour';
import { SHELL_EVENT, announce, dispatchAction, type ShellActionDetail } from '@/scripts/shell';
import { ReverseWalkDetector, fireEgg, devConsoleGreeting, EGG_EVENT, type EggDetail } from './eggs';
import { POWER_SERIES } from './data/power';
import { SITE } from '@/lib/site';
import { hall, railProgress, setMode, setOpening, setQuality, setTier, walkTo, type Quality } from './state';
import type { Capability } from './capability';
import { prefersReducedMotion, durationS } from '@/motion/tokens';

export interface HallHandle {
  dispose(): void;
  machines: Map<string, MachineAssembly>;
  camera: Camera;
  /** Light a skill's ceiling cable run (null clears). Returns the matched skill name or null. */
  highlightSkill(skill: string | null): string | null;
}

declare global {
  interface Window {
    /** Probe for tests and the dev-console greeting. `forceSlowFrames` feeds slow samples to the quality probe. */
    __srHall?:
      | {
          tier: string;
          quality: Quality;
          fps: number;
          frameMs: number;
          lit: number;
          machines: string[];
          forceSlowFrames?: number;
        }
      | undefined;
    __srHallHandle?: HallHandle | undefined;
  }
}

const MACHINE_SLUGS = [
  'telemetry-refinery',
  'policy-sorter',
  'forecast-engine',
  'data-workbench',
  'calibration-bench',
  'foundations-generator',
] as const;

export async function mountHall(stage: HTMLElement, cap: Capability): Promise<HallHandle> {
  const canvas = document.createElement('canvas');
  canvas.className = 'hall-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);

  const renderer = new WebGPURenderer({
    canvas,
    antialias: cap.quality !== 'phone',
    alpha: false,
    forceWebGL: cap.tier !== 'webgpu',
    powerPreference: cap.quality === 'phone' ? 'low-power' : 'high-performance',
  });
  await renderer.init();
  setTier(cap.tier);

  const probe = new FrameProbe(cap.quality, { ceiling: cap.coarsePointer ? 'phone' : 'high' });
  let profile = PROFILES[probe.quality];
  setQuality(probe.quality);

  const camera = new PerspectiveCamera(42, 1, 0.1, 60);
  const env = buildHall(profile);
  const machines = new Map<string, MachineAssembly>();
  // One machine per frame: keeps each main-thread task short on slow CPUs.
  const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  for (const [i, slug] of MACHINE_SLUGS.entries()) {
    const m = buildMachine(slug, { kit: env.kit, profile, seed: 1000 + i });
    const p = machinePosition(i + 1);
    m.group.position.set(p.x, p.y, p.z);
    env.scene.add(m.group);
    machines.set(slug, m);
    await nextFrame();
  }

  const cables = buildCables(env.kit);
  env.scene.add(cables.group);
  const meter = buildPowerMeter(env.kit, '2023-01');
  env.scene.add(meter.group);

  const free = createFreeWalk(camera, canvas);

  // ---- Panels and the Operator talk to the machines through the bus ----------------------------------------------
  const audio = new MachineRoomAudio();
  const applyControls = createControlApplier((slug, id, v) => machines.get(slug)?.setControl(id, v) ?? false);
  const onControlsChanged = (all: Parameters<typeof applyControls>[0]) => {
    if (applyControls(all) > 0) audio.click();
  };
  applyControls(controlBus.get());
  const unsubControls = controlBus.subscribe(onControlsChanged);
  // Buttons (run a pipeline, print, sync now, pull the approval lever) are pulses, never stored values.
  const unsubPulse = onPulse(({ slug, id }) => {
    if (machines.get(slug)?.setControl(id, true)) audio.click();
  });
  let readoutAcc = 0;
  let visualTick = 0;

  // ---- Size and DPR ----------------------------------------------------------------------------------------------
  const resize = () => {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    renderer.setPixelRatio(effectiveDpr(profile, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const portrait = () => window.innerHeight > window.innerWidth;

  // ---- Camera: follows the rail with easing (snaps under reduced motion) -----------------------------------------
  const desiredPos = new Vector3();
  const desiredTarget = new Vector3();
  const currentTarget = new Vector3();
  const reduced = prefersReducedMotion();
  // Laptop opening: start close on the Refinery as it wakes, then dolly back to the rail stop. Portrait: the
  // control-room door pose from the start (the hall recedes down the screen), as in the treatment's phone storyboard.
  const refineryX = machinePosition(1).x;
  const openingStart = {
    position: new Vector3(refineryX + 1.2, 1.3, -0.2 + 1.9),
    target: new Vector3(refineryX - 0.3, 0.9, -1.4),
  };
  {
    const pose = railPose(railProgress.get(), portrait());
    if (!reduced && !portrait() && hall.get().opening !== 'skipped' && railProgress.get() < 0.5) {
      camera.position.copy(openingStart.position);
      currentTarget.copy(openingStart.target);
    } else {
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      currentTarget.set(pose.target.x, pose.target.y, pose.target.z);
    }
    camera.lookAt(currentTarget);
  }

  // ---- Sound (off by default; enabled from the HUD switch, a user gesture) ---------------------------------------
  const unsubSound = soundPref.subscribe((v) => {
    if (v === 'on') void audio.enable();
    else audio.disable();
  });

  // ---- Control-room props and the eggs ---------------------------------------------------------------------------
  const breakerLever = env.scene.getObjectByName('breaker-lever') as Group | undefined;
  const breakerArm = breakerLever?.userData['arm'] as Group | undefined;
  let breakerThrown = false;

  // Reverse walk → the hall printer prints the résumé; coffee mug → steam shaped by the power series.
  const reverse = new ReverseWalkDetector();
  const printer = env.scene.getObjectByName('hall-printer');
  const paper = new Mesh(new BoxGeometry(0.4, 0.002, 0.3), env.palette.get('enamel') as Material);
  paper.visible = false;
  if (printer) {
    paper.position.set(0, 0.3, 0.25);
    printer.add(paper);
  }
  let paperT = -1;
  const unsubBay = hall.subscribe((s, old) => {
    if (old && s.bay !== old.bay && reverse.arrive(s.bay)) {
      paperT = 0;
      paper.visible = true;
      fireEgg({
        egg: 'reverse-walk',
        message: 'You walked the floor backwards. The hall printer is printing the full résumé.',
        href: '/resume/',
        label: 'Read the résumé',
      });
    }
  });
  const mug = env.scene.getObjectByName('coffee-mug');
  const steamCap = 120;
  const steam = new InstancedMesh(
    new SphereGeometry(0.012, 5, 5),
    env.palette.get('glass') as Material,
    steamCap,
  );
  steam.instanceMatrix.setUsage(DynamicDrawUsage);
  steam.count = 0;
  steam.frustumCulled = false;
  if (mug) mug.add(steam);
  let steamT = -1;
  const steamTmp = new Matrix4();
  const recent = POWER_SERIES.filter((p) => p.month >= '2023-01');
  const onEgg = (e: Event) => {
    const d = (e as CustomEvent<EggDetail>).detail;
    if (d.egg === 'coffee-mug') steamT = 0;
  };
  window.addEventListener(EGG_EVENT, onEgg);

  // A brass hatch plate on each plinth (3D twin of the "Maintenance hatch" disclosure)
  const hatchGeometry = new BoxGeometry(0.22, 0.02, 0.14);
  machines.forEach((m, slug) => {
    const plate = new Mesh(hatchGeometry, env.palette.get('brass') as Material);
    plate.position.set(-1.1, 0.09, 0.85);
    plate.userData['pick'] = `hatch:${slug}`;
    m.group.add(plate);
  });

  // Picking: a quick tap or click on the breaker, the mug or a hatch plate. The canvas only receives pointer events
  // where no bay card covers it (hall.css), and its touch-action keeps vertical page scrolling working.
  const ray = new Raycaster();
  const ndc = new Vector2();
  let downAt = { x: 0, y: 0, t: 0 };
  const onDown = (ev: PointerEvent) => (downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() });
  const onUp = (ev: PointerEvent) => {
    if (Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 6 || performance.now() - downAt.t > 400)
      return;
    if (hall.get().mode === 'free') return; // dragging, not tapping
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(env.scene.children, true).find((h) => h.object.userData['pick']);
    if (!hit) return;
    const pick = String(hit.object.userData['pick']);
    if (pick === 'breaker') dispatchAction('night', 'api');
    else if (pick === 'coffee-mug') dispatchAction('coffee', 'api');
    else if (pick.startsWith('hatch:')) {
      const details = document.querySelector<HTMLDetailsElement>(`.hatch[data-machine="${pick.slice(6)}"]`);
      if (details) {
        details.open = true;
        details.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
        fireEgg({
          egg: 'maintenance-hatch',
          message: 'Maintenance hatch open: the real source pointers behind this plaque.',
        });
      }
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  const greeting = devConsoleGreeting(cap.tier, probe.quality, SITE.version);
  console.info(greeting[0], greeting[1], greeting[2]);
  console.info(greeting[3]);
  console.info(greeting[4]);

  // ---- Tour: the schedule lives in tour.ts; here we walk the rail once per stop and announce ---------------------
  let tourState = tour.get();
  let tourStop = -1;
  const unsubTour = tour.subscribe((st) => {
    const was = tourState.running;
    tourState = st;
    if (!st.running) tourStop = -1;
    else if (st.index !== tourStop) {
      // once per stop, so scrolling or the minimap mid-stop is never fought frame by frame
      tourStop = st.index;
      const stop = TOUR_STOPS[st.index];
      if (stop && hall.get().bay !== stop.bay) walkTo(stop.bay);
    }
    if (was && !st.running) announce('Tour ended. You are free to walk the floor.');
  });
  const onShellAction = (e: Event) => {
    const d = (e as CustomEvent<ShellActionDetail>).detail;
    if (d.action !== 'tour') return;
    if (tour.get().running) stopTour();
    else {
      startTour();
      announce('Guided tour started: about 90 seconds, every machine once. Press Escape or Stop to end it.');
    }
  };
  window.addEventListener(SHELL_EVENT, onShellAction);

  // ---- Opening: lights sweep on bay by bay, machines start one after another -------------------------------------
  const reducedOrSkipped = reduced || hall.get().opening === 'skipped';
  let openingT = 0;
  const lampCount = env.lamps.length;
  const openingDuration = durationS('cinematic') * 2; // ~2.4 s for the full sweep
  if (reducedOrSkipped) {
    env.setLitCount(lampCount);
    machines.forEach((m) => m.setLit(true));
    setOpening('done');
  } else {
    env.setLitCount(0);
    setOpening('running');
  }

  // ---- Pause when hidden or off-screen ---------------------------------------------------------------------------
  let visible = true;
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      hall.setKey('paused', !visible || document.hidden);
    },
    { threshold: 0.01 },
  );
  io.observe(stage);
  const onVis = () => hall.setKey('paused', document.hidden || !visible);
  document.addEventListener('visibilitychange', onVis);

  // ---- Walk mode: rail vs free -----------------------------------------------------------------------------------
  const unsubMode = hall.subscribe((s, old) => {
    if (old && s.mode !== old.mode) {
      free.setEnabled(s.mode === 'free');
      if (s.mode === 'free') {
        free.controls.target.copy(currentTarget);
        announce('Free walk: drag to orbit, scroll to zoom. Press Escape or “Return to rail”.');
      } else {
        announce(`Back on the rail at bay ${s.bay}.`);
      }
    }
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (tour.get().running) stopTour();
    if (hall.get().mode === 'free') setMode('rail');
  };
  window.addEventListener('keydown', onKey);

  const rail = bindRail(stage);

  window.__srHall = {
    tier: cap.tier,
    quality: probe.quality,
    fps: 0,
    frameMs: 0,
    lit: 0,
    machines: [...MACHINE_SLUGS],
  };

  // ---- The frame loop --------------------------------------------------------------------------------------------
  let last = performance.now();
  let elapsed = 0;
  let raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dtMs = now - last;
    last = now;
    if (hall.get().paused) return;
    const dt = Math.min(0.1, dtMs / 1000);
    elapsed += dt;

    // Quality probe (tests can inject slow frames)
    const injected = window.__srHall?.forceSlowFrames ?? 0;
    let changed: Quality | null = null;
    if (injected > 0) {
      // Test hook: feed several slow samples per frame so the probe reacts regardless of the real frame rate.
      const n = Math.min(4, injected);
      for (let i = 0; i < n; i++) changed = probe.sample(60) ?? changed;
      window.__srHall!.forceSlowFrames = injected - n;
    } else {
      changed = probe.sample(dtMs);
    }
    if (changed) {
      profile = PROFILES[changed];
      setQuality(changed);
      env.setProfile(profile);
      machines.forEach((m) => m.setProfile(profile));
      resize();
    }

    // Tour schedule
    if (tourState.running) {
      const r = advanceTour(tourState, dt);
      if (r.state !== tourState) tour.set(r.state);
    }

    // Opening sweep: lamp 0 is the control-room lamp, lamp i+1 belongs to bay i+1; a machine starts with its lamp.
    if (hall.get().opening === 'running') {
      openingT += dt;
      if (!breakerThrown && openingT > 0.25) {
        breakerThrown = true;
        if (breakerArm) breakerArm.rotation.z = 0.5;
        audio.thunk();
      }
      const frac = Math.min(1, openingT / openingDuration);
      const lit = Math.round(frac * lampCount);
      env.setLitCount(lit);
      MACHINE_SLUGS.forEach((slug, i) => {
        const m = machines.get(slug)!;
        if (lit >= i + 2 && !m.isLit) m.setLit(true);
      });
      if (frac >= 1) setOpening('done');
    }

    // Camera
    if (hall.get().mode === 'rail') {
      const pose = railPose(railProgress.get(), portrait());
      desiredPos.set(pose.position.x, pose.position.y, pose.position.z);
      desiredTarget.set(pose.target.x, pose.target.y, pose.target.z);
      if (reduced) {
        camera.position.copy(desiredPos);
        currentTarget.copy(desiredTarget);
      } else {
        // slower, more cinematic easing while the opening dolly runs
        const rate = hall.get().opening === 'running' ? 1.1 : 4.5;
        const k = 1 - Math.exp(-dt * rate);
        camera.position.lerp(desiredPos, k);
        currentTarget.lerp(desiredTarget, k);
      }
      camera.lookAt(currentTarget);
    } else {
      free.update();
    }

    // Hums: nearest machines loudest
    if (audio.isEnabled) {
      machines.forEach((m, slug) => {
        const d = Math.abs(m.group.position.x - camera.position.x);
        audio.hum(slug, m.isLit ? Math.max(0, 1 - d / 7) : 0);
      });
    }

    machines.forEach((m) => m.update(dt, elapsed));
    meter.update(elapsed);

    // Egg animations
    if (paperT >= 0) {
      paperT += dt;
      const k = Math.min(1, paperT / 3);
      paper.scale.z = Math.max(0.05, k);
      paper.position.z = 0.25 + (0.3 * k) / 2;
      if (paperT > 10) {
        paperT = -1;
        paper.visible = false;
      }
    }
    if (steamT >= 0) {
      steamT += dt;
      let n = 0;
      for (let i = 0; i < Math.min(steamCap, recent.length) && n < steamCap; i++) {
        const pt = recent[i]!;
        const h = (pt.count + pt.yearShare) * 0.25;
        const life = (steamT * 0.6 + i * 0.013) % 1;
        if (h <= 0.01) continue;
        steamTmp.makeTranslation(
          (i / recent.length - 0.5) * 0.12,
          0.12 + life * (0.4 + h),
          Math.sin(life * 6 + i) * 0.02,
        );
        steam.setMatrixAt(n++, steamTmp);
      }
      steam.count = n;
      steam.instanceMatrix.needsUpdate = true;
      if (steamT > 12) {
        steamT = -1;
        steam.count = 0;
      }
    }

    env.setCameraX(camera.position.x);
    readoutAcc += dt;
    if (readoutAcc >= 0.25) {
      readoutAcc = 0;
      visualTick = (visualTick + 1) % 2;
      machines.forEach((m, slug) => {
        publishReadouts(slug, m.readouts());
        if (visualTick === 0) publishVisuals(slug, m.viz());
      });
    }
    renderer.render(env.scene, camera);

    const h = window.__srHall;
    if (h) {
      h.fps = probe.fps;
      h.frameMs = Math.round(probe.averageMs * 10) / 10;
      h.quality = probe.quality;
      h.lit = Math.round(Math.min(1, openingT / openingDuration) * lampCount);
    }
    if (probe.fps !== hall.get().fps) hall.setKey('fps', probe.fps);
  };
  raf = requestAnimationFrame(loop);
  stage.setAttribute('data-hall', 'ready');
  if (new URLSearchParams(window.location.search).get('tour') === '1') {
    startTour();
    announce('Guided tour started.');
  }

  return {
    camera,
    machines,
    highlightSkill(skill) {
      const hit = cables.highlight(skill);
      return hit ? hit.name : null;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(EGG_EVENT, onEgg);
      window.removeEventListener(SHELL_EVENT, onShellAction);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      unsubMode();
      unsubBay();
      unsubControls();
      unsubPulse();
      unsubSound();
      unsubTour();
      stopTour();
      audio.dispose();
      rail.dispose();
      free.dispose();
      machines.forEach((m) => m.dispose());
      cables.dispose();
      meter.dispose();
      hatchGeometry.dispose();
      paper.geometry.dispose();
      steam.geometry.dispose();
      steam.dispose();
      env.dispose();
      renderer.dispose();
      canvas.remove();
      window.__srHall = undefined;
      stage.setAttribute('data-hall', 'disposed');
    },
  };
}
