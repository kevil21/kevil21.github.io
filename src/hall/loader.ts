/**
 * Small entry that ships in the page bundle: decides whether to load the 3D hall and does so after first paint via a
 * dynamic import (the Three.js chunk never blocks the readable HTML). Sets data-hall on the stage:
 * pending → loading → ready | static.
 *
 * Lifecycle: the site uses Astro's ClientRouter (View Transitions), so navigation between pages is a soft swap and a
 * module script runs only once per session. The hall is therefore (re)started on every `astro:page-load` and torn down
 * on `astro:before-swap`; leaving the hall page disposes the renderer, and coming back mounts a fresh one.
 */
import { detectCapability } from './capability';
import { resetHallState, setOpening, setTier } from './state';
import type { HallHandle } from './mount';

interface Active {
  stage: HTMLElement;
  cancelled: boolean;
  handle: HallHandle | null;
  cleanup: Array<() => void>;
}

let active: Active | null = null;
let listening = false;
const OPENED_KEY = 'sr:opened';

/** The opening plays once per session; later visits to the hall start lit. */
function openingAlreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem(OPENED_KEY) === '1';
  } catch {
    return false;
  }
}
function markOpeningPlayed(): void {
  try {
    sessionStorage.setItem(OPENED_KEY, '1');
  } catch {
    /* storage can be blocked; the opening then simply replays */
  }
}

/** Wait for idle (desktop) or the first interaction / a quiet period (touch), whichever comes first. */
function whenReady(coarsePointer: boolean, cleanup: Array<() => void>): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const;
    let timer = 0;
    let idle = 0;
    const finish = () => {
      if (done) return;
      done = true;
      for (const ev of events) window.removeEventListener(ev, finish);
      window.clearTimeout(timer);
      if (idle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      resolve();
    };
    cleanup.push(finish);
    if (coarsePointer) {
      // Keeps the 3D chunk out of the first-load main-thread budget on a slow phone CPU; the floor plan is on screen.
      for (const ev of events) window.addEventListener(ev, finish, { passive: true });
      timer = window.setTimeout(finish, 5000);
    } else if (typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(finish, { timeout: 800 });
    } else {
      timer = window.setTimeout(finish, 120);
    }
  });
}

async function start(): Promise<void> {
  const stage = document.getElementById('hall-stage');
  if (!stage || active?.stage === stage) return;
  const run: Active = { stage, cancelled: false, handle: null, cleanup: [] };
  active = run;
  stage.setAttribute('data-hall', 'pending');

  const cap = await detectCapability();
  if (run.cancelled) return;
  stage.setAttribute('data-hall-reasons', cap.reasons.join(' · '));
  if (cap.tier === 'static') {
    setTier('static');
    setOpening('skipped');
    stage.setAttribute('data-hall', 'static');
    return;
  }
  if (cap.reducedMotion || openingAlreadyPlayed()) setOpening('skipped');
  stage.setAttribute('data-hall', 'loading');

  await whenReady(cap.coarsePointer, run.cleanup);
  if (run.cancelled) return;
  try {
    const { mountHall } = await import('./mount');
    if (run.cancelled) return;
    const handle = await mountHall(stage, cap);
    if (run.cancelled) {
      handle.dispose(); // left the page while the renderer was initialising
      return;
    }
    run.handle = handle;
    window.__srHallHandle = handle;
    markOpeningPlayed();
  } catch (e) {
    if (run.cancelled) return;
    console.warn('[hall] 3D unavailable, static twins stand alone:', (e as Error).message);
    setTier('static');
    setOpening('skipped');
    stage.setAttribute('data-hall', 'static');
    stage.setAttribute('data-hall-error', (e as Error).message.slice(0, 160));
  }
}

function stop(): void {
  const run = active;
  if (!run) return;
  active = null;
  run.cancelled = true;
  for (const c of run.cleanup) c();
  run.handle?.dispose();
  window.__srHallHandle = undefined;
  resetHallState();
}

/** Start the hall for the current page and keep it in step with soft navigation. Safe to call more than once. */
export function bootHall(): void {
  if (!listening) {
    listening = true;
    document.addEventListener('astro:page-load', () => void start());
    document.addEventListener('astro:before-swap', stop);
  }
  void start();
}
