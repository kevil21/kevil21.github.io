/**
 * Main-thread client for the Full worker (WebLLM). Opt-in only: the console shows the download size first, then
 * progress and a cancel button; never auto on coarse pointers. Eligibility is feature-detected (WebGPU adapter,
 * memory, storage, Save-Data). Fatal GPU errors unload and the router falls back to Pocket.
 */
import type { FullRequest, FullResponse } from '../protocol';
import { FULL_MODELS, type FullModel } from '../config';

export interface FullEligibility {
  eligible: boolean;
  shaderF16: boolean;
  coarsePointer: boolean;
  blockers: string[];
}

export async function checkFullEligibility(): Promise<FullEligibility> {
  const blockers: string[] = [];
  const nav = navigator as Navigator & {
    gpu?: GPU;
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (typeof Worker === 'undefined') blockers.push('no Web Workers');
  let shaderF16 = false;
  if (!nav.gpu) blockers.push('no WebGPU');
  else {
    try {
      const adapter = await nav.gpu.requestAdapter();
      if (!adapter) blockers.push('no WebGPU adapter');
      else shaderF16 = adapter.features.has('shader-f16');
    } catch (e) {
      blockers.push(`WebGPU error: ${(e as Error).message}`);
    }
  }
  if (nav.connection?.saveData) blockers.push('Save-Data is on');
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) blockers.push('device memory under 4 GB');
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.quota && est.quota < 1500 * 1024 * 1024) blockers.push('storage quota under 1.5 GB');
  } catch {
    /* ignore */
  }
  const coarsePointer = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  return { eligible: blockers.length === 0, shaderF16, coarsePointer, blockers };
}

/** Pick the model to actually load: the chosen id, or its f32 twin when shader-f16 is absent. */
export function resolveModel(id: string, shaderF16: boolean): FullModel {
  const m = FULL_MODELS.find((x) => x.id === id) ?? FULL_MODELS[0]!;
  if (m.requiresF16 && !shaderF16 && m.f32Fallback)
    return FULL_MODELS.find((x) => x.id === m.f32Fallback) ?? m;
  return m;
}

export type FullState =
  | { status: 'idle' }
  | { status: 'loading'; modelId: string; progress: number; text: string }
  | { status: 'ready'; modelId: string }
  | { status: 'error'; message: string; fatal: boolean };

export class FullClient {
  private worker: Worker | null = null;
  private seq = 0;
  state: FullState = { status: 'idle' };
  onState: ((s: FullState) => void) | null = null;
  private generations = new Map<
    number,
    { onDelta: (d: string) => void; resolve: (text: string) => void; reject: (e: Error) => void }
  >();
  private startedAt = 0;
  loadSeconds = 0;

  private set(s: FullState): void {
    this.state = s;
    this.onState?.(s);
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<FullResponse>) => this.handle(e.data);
      this.worker.onerror = (e) =>
        this.set({ status: 'error', message: e.message || 'worker failed', fatal: true });
    }
    return this.worker;
  }

  private handle(m: FullResponse): void {
    switch (m.type) {
      case 'load:progress':
        if (this.state.status === 'loading') this.set({ ...this.state, progress: m.progress, text: m.text });
        break;
      case 'load:ready':
        this.loadSeconds = (performance.now() - this.startedAt) / 1000;
        this.set({ status: 'ready', modelId: m.modelId });
        break;
      case 'load:error':
        this.set({ status: 'error', message: m.message, fatal: m.fatal });
        if (m.fatal) this.terminate();
        break;
      case 'generate:delta':
        this.generations.get(m.id)?.onDelta(m.delta);
        break;
      case 'generate:done':
        this.generations.get(m.id)?.resolve(m.text);
        this.generations.delete(m.id);
        break;
      case 'generate:error':
        this.generations.get(m.id)?.reject(new Error(m.message));
        this.generations.delete(m.id);
        if (m.fatal) {
          this.set({ status: 'error', message: m.message, fatal: true });
          this.terminate();
        }
        break;
      case 'unloaded':
        if (this.state.status !== 'error') this.set({ status: 'idle' });
        break;
    }
  }

  load(modelId: string): void {
    this.startedAt = performance.now();
    this.set({ status: 'loading', modelId, progress: 0, text: 'Starting download…' });
    const msg: FullRequest = { type: 'load', modelId };
    this.ensureWorker().postMessage(msg);
  }

  cancel(): void {
    this.terminate();
    this.set({ status: 'idle' });
  }

  generate(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    onDelta: (d: string) => void,
    maxTokens = 320,
  ): { promise: Promise<string>; cancel: () => void } {
    const id = ++this.seq;
    const promise = new Promise<string>((resolve, reject) => {
      this.generations.set(id, { onDelta, resolve, reject });
      const msg: FullRequest = { type: 'generate', id, messages, maxTokens };
      this.ensureWorker().postMessage(msg);
    });
    return {
      promise,
      cancel: () => {
        const msg: FullRequest = { type: 'cancel', id };
        this.worker?.postMessage(msg);
      },
    };
  }

  unload(): void {
    const msg: FullRequest = { type: 'unload' };
    this.worker?.postMessage(msg);
  }

  private terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const g of this.generations.values()) g.reject(new Error('terminated'));
    this.generations.clear();
  }

  dispose(): void {
    this.terminate();
  }
}
