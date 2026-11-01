/**
 * Small entry that ships in the page bundle: decides whether to load the 3D hall and does so after first paint via a
 * dynamic import (the Three.js chunk never blocks the readable HTML). Sets data-hall on the stage:
 * pending → loading → ready | static.
 */
import { detectCapability } from './capability';
import { setOpening, setTier, hall } from './state';

export async function loadHall(stage: HTMLElement): Promise<void> {
  stage.setAttribute('data-hall', 'pending');
  const cap = await detectCapability();
  stage.setAttribute('data-hall-reasons', cap.reasons.join(' · '));
  if (cap.tier === 'static') {
    setTier('static');
    setOpening('skipped');
    stage.setAttribute('data-hall', 'static');
    return;
  }
  if (cap.reducedMotion) setOpening('skipped');
  stage.setAttribute('data-hall', 'loading');
  // Desktop: after idle. Coarse-pointer devices: on the first interaction or after a quiet period, whichever comes
  // first, so the 3D chunk never lands inside the first-load main-thread budget on a slow phone CPU (the still floor
  // plan is already on screen; the opening then plays).
  await new Promise<void>((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      for (const ev of ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const)
        window.removeEventListener(ev, go);
      resolve();
    };
    if (cap.coarsePointer) {
      for (const ev of ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const)
        window.addEventListener(ev, go, { passive: true });
      setTimeout(go, 5000);
    } else if ('requestIdleCallback' in window) {
      (
        window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }
      ).requestIdleCallback(go, { timeout: 800 });
    } else setTimeout(go, 120);
  });
  try {
    const { mountHall } = await import('./mount');
    const handle = await mountHall(stage, cap);
    (window as Window & { __srHallHandle?: unknown }).__srHallHandle = handle;
  } catch (e) {
    console.warn('[hall] 3D unavailable, static twins stand alone:', (e as Error).message);
    setTier('static');
    setOpening('skipped');
    stage.setAttribute('data-hall', 'static');
    stage.setAttribute('data-hall-error', (e as Error).message.slice(0, 160));
  }
  void hall;
}
