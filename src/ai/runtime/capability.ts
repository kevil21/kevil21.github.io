/**
 * Capability engine (plan.md §7). Feature detection only — never user-agent or screen width.
 * Reduced motion is deliberately NOT a capability input (ADR-012).
 */
export interface Capabilities {
  workers: boolean;
  wasm: boolean;
  webgl: boolean;
  webgpu: boolean;
  shaderF16: boolean;
  storageQuotaMB: number | null;
  persistentStorage: boolean;
  saveData: boolean;
  deviceMemoryGB: number | null;
  coarsePointer: boolean;
  online: boolean;
  /** derived */
  renderTier: 'static' | 'canvas' | 'webgl';
  fullBrainEligible: boolean;
  /** why fullBrainEligible is false, for the observatory */
  fullBrainBlockers: string[];
  /** auto-offering the Full Brain download is only allowed on devices that look like laptops/desktops */
  autoOfferFullBrain: boolean;
}

let cached: Promise<Capabilities> | null = null;

export function detectCapabilities(): Promise<Capabilities> {
  if (cached) return cached;
  cached = (async () => {
    const nav = navigator as Navigator & {
      gpu?: {
        requestAdapter: () => Promise<{ features: Set<string>; limits: Record<string, number> } | null>;
      };
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    const workers = typeof Worker !== 'undefined';
    const wasm = typeof WebAssembly !== 'undefined';
    let webgl: boolean;
    try {
      const c = document.createElement('canvas');
      webgl = Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      webgl = false;
    }
    let webgpu = false;
    let shaderF16 = false;
    if (nav.gpu) {
      try {
        const adapter = await nav.gpu.requestAdapter();
        if (adapter) {
          webgpu = true;
          shaderF16 = adapter.features.has('shader-f16');
        }
      } catch {
        webgpu = false;
      }
    }
    let storageQuotaMB: number | null = null;
    let persistentStorage = false;
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        storageQuotaMB = est.quota ? Math.round(est.quota / 1e6) : null;
      }
      persistentStorage = Boolean(navigator.storage?.persisted && (await navigator.storage.persisted()));
    } catch {
      /* ignore */
    }
    const saveData = Boolean(nav.connection?.saveData);
    const deviceMemoryGB = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
    const coarsePointer = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
    const online = navigator.onLine;

    const renderTier: Capabilities['renderTier'] = saveData
      ? 'static'
      : webgl && (deviceMemoryGB === null || deviceMemoryGB >= 4)
        ? 'webgl'
        : 'canvas';
    const blockers: string[] = [];
    if (!workers) blockers.push('no Web Workers');
    if (!webgpu) blockers.push('no WebGPU adapter');
    if (saveData) blockers.push('Save-Data is on');
    if (deviceMemoryGB !== null && deviceMemoryGB < 4)
      blockers.push(`device memory ${deviceMemoryGB} GB < 4 GB`);
    if (storageQuotaMB !== null && storageQuotaMB < 1500)
      blockers.push(`storage quota ${storageQuotaMB} MB < 1.5 GB`);
    const fullBrainEligible = blockers.length === 0;
    // Never auto-offer a model download on touch-only devices (mobile), per ADR-004/ADR-011.
    const autoOfferFullBrain = fullBrainEligible && !coarsePointer;
    return {
      workers,
      wasm,
      webgl,
      webgpu,
      shaderF16,
      storageQuotaMB,
      persistentStorage,
      saveData,
      deviceMemoryGB,
      coarsePointer,
      online,
      renderTier,
      fullBrainEligible,
      fullBrainBlockers: blockers,
      autoOfferFullBrain,
    };
  })();
  return cached;
}
