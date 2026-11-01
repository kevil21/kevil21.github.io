/**
 * Render capability by feature detection only (never user agent or screen width). Decides the renderer backend and the
 * starting quality profile; the frame-time probe (quality.ts) adjusts from there.
 */
import type { Quality, RenderTier } from './state';

export interface Capability {
  tier: Exclude<RenderTier, 'pending'>;
  quality: Quality;
  coarsePointer: boolean;
  saveData: boolean;
  deviceMemoryGB: number | null;
  reducedMotion: boolean;
  shaderF16: boolean;
  reasons: string[];
}

interface NavigatorExtras {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
  gpu?: GPU;
}

export async function detectCapability(): Promise<Capability> {
  const reasons: string[] = [];
  const nav = navigator as Navigator & NavigatorExtras;
  const saveData = Boolean(nav.connection?.saveData);
  const deviceMemoryGB = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const coarsePointer = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (saveData) {
    reasons.push('Save-Data is on: static twins only');
    return {
      tier: 'static',
      quality: 'phone',
      coarsePointer,
      saveData,
      deviceMemoryGB,
      reducedMotion,
      shaderF16: false,
      reasons,
    };
  }

  let webgpu = false;
  let shaderF16 = false;
  try {
    if (nav.gpu) {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) {
        webgpu = true;
        shaderF16 = adapter.features.has('shader-f16');
      } else reasons.push('navigator.gpu present but no adapter');
    } else reasons.push('no navigator.gpu');
  } catch (e) {
    reasons.push(`WebGPU probe failed: ${(e as Error).message}`);
  }

  let webgl2 = false;
  try {
    const c = document.createElement('canvas');
    webgl2 = Boolean(c.getContext('webgl2'));
  } catch {
    /* ignore */
  }

  const tier: Capability['tier'] = webgpu ? 'webgpu' : webgl2 ? 'webgl' : 'static';
  if (tier === 'static') reasons.push('no WebGL 2 either: static twins only');

  // Starting quality: coarse pointer or small memory → phone profile; otherwise medium until the probe says high.
  const quality: Quality =
    coarsePointer || (deviceMemoryGB !== null && deviceMemoryGB < 4) ? 'phone' : 'medium';
  if (quality === 'phone')
    reasons.push(coarsePointer ? 'coarse pointer: phone profile' : 'device memory < 4 GB: phone profile');

  return { tier, quality, coarsePointer, saveData, deviceMemoryGB, reducedMotion, shaderF16, reasons };
}
