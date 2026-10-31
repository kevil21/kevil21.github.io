import { detectCapabilities } from '@/ai/runtime/capability';
import { reducedMotion } from '@/lib/stores/motion';

/** Upgrades the static signal SVG to an animated renderer when the device can afford it. */
export async function mountSignalField(root: HTMLElement) {
  const caps = await detectCapabilities();
  const host = root.querySelector<HTMLElement>('[data-signal-gl]');
  const json = root.querySelector('[data-signal-series]')?.textContent;
  if (!host || !json || caps.renderTier === 'static' || reducedMotion.get()) return;
  const series = JSON.parse(json) as {
    activity: number[];
    lanes: Record<string, number[]>;
    labels: string[];
  };
  try {
    if (caps.renderTier === 'webgl') {
      const { startWebGL } = await import('./webgl');
      await startWebGL(host, series, root);
    } else {
      const { startCanvas } = await import('./canvas');
      startCanvas(host, series, root);
    }
  } catch (err) {
    console.warn('signal field renderer failed, keeping static SVG', err);
    root.classList.remove('is-gl');
  }
}
