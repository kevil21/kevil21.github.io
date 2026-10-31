export interface Capabilities {
  secure: boolean; worker: boolean; wasm: boolean; gpu: boolean; adapter: boolean | null;
  shaderF16: boolean | null; storage: boolean; saveData: boolean; coarsePointer: boolean;
  deviceMemoryGB: number | null; storageAvailableBytes: number | null; reasons: string[];
}
export function eligibility(c: Capabilities): string[] {
  return [!c.secure && 'secure-context-required', !c.worker && 'worker-unavailable', !c.wasm && 'wasm-unavailable', !c.gpu && 'webgpu-api-unavailable', c.adapter === false && 'webgpu-adapter-unavailable', c.shaderF16 === false && 'shader-f16-unavailable', !c.storage && 'cache-storage-unavailable', c.saveData && 'save-data-enabled', c.coarsePointer && 'coarse-pointer-conservative-guard', c.deviceMemoryGB !== null && c.deviceMemoryGB < 4 && 'low-device-memory', c.storageAvailableBytes !== null && c.storageAvailableBytes < 360000000 && 'insufficient-storage-estimate'].filter((r): r is string => typeof r === 'string');
}
export async function detectCapabilities(): Promise<Capabilities> {
  const bounded = async <T>(value: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([value, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Capability probe timeout')), 5000); })]); }
    finally { clearTimeout(timer); }
  };
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean }; gpu?: { requestAdapter(): Promise<{ features: { has(name: string): boolean } } | null> } };
  let storage = false;
  try { storage = typeof caches !== 'undefined'; } catch { /* A browser policy can deny the getter itself. */ }
  const c: Capabilities = { secure: isSecureContext, worker: typeof Worker !== 'undefined', wasm: typeof WebAssembly !== 'undefined', gpu: !!nav.gpu, adapter: null, shaderF16: null, storage, saveData: nav.connection?.saveData ?? false, coarsePointer: matchMedia('(pointer: coarse)').matches, deviceMemoryGB: nav.deviceMemory ?? null, storageAvailableBytes: null, reasons: [] };
  try { const estimate = await bounded(navigator.storage?.estimate() ?? Promise.resolve(undefined)); if (estimate?.quota !== undefined && estimate.usage !== undefined) c.storageAvailableBytes = Math.max(0, estimate.quota - estimate.usage); } catch { /* Unknown, not zero. */ }
  if (c.gpu && c.secure) {
    try { const adapter = await bounded(nav.gpu!.requestAdapter()); c.adapter = !!adapter; c.shaderF16 = adapter?.features.has('shader-f16') ?? false; } catch { c.adapter = false; }
  }
  if (c.storage) { try { await bounded(caches.keys()); } catch { c.storage = false; } }
  c.reasons = eligibility(c); return c;
}