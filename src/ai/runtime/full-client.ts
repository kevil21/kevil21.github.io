/**
 * Main-thread client for the Full Brain worker. Opt-in only: nothing downloads until `load()` is
 * called by a user action. Progress and cancellation are first-class; failures mark the tier as
 * unavailable so the router falls back to the Pocket Brain (plan.md §11).
 */
import type { FullRequest, FullResponse } from '../protocol';
import { aiState } from '@/lib/stores/ai';
import { modelById } from '../full/models';

export const FULL_CONSENT_KEY = 'trace:ai-consent';
export const FULL_MODEL_KEY = 'trace:ai-model';

export class FullClient {
  private worker: Worker | null = null;
  private seq = 0;
  private listeners = new Map<
    number,
    { onToken: (d: string) => void; resolve: (t: string) => void; reject: (e: Error) => void }
  >();
  private loadPromise: Promise<void> | null = null;
  modelId: string | null = null;

  private ensureWorker() {
    if (this.worker) return this.worker;
    this.worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (ev: MessageEvent<FullResponse>) => {
      const m = ev.data;
      switch (m.type) {
        case 'progress':
          aiState.setKey(
            'full',
            m.progress < 1 && /fetch|download|Loading model from cache/i.test(m.text)
              ? 'downloading'
              : 'loading',
          );
          aiState.setKey('fullProgress', m.progress);
          aiState.setKey('fullProgressText', m.text);
          break;
        case 'loaded':
          this.modelId = m.modelId;
          aiState.setKey('full', 'ready');
          aiState.setKey('fullModel', m.modelId);
          aiState.setKey('fullProgress', 1);
          break;
        case 'token':
          this.listeners.get(m.id)?.onToken(m.delta);
          break;
        case 'done': {
          const l = this.listeners.get(m.id);
          this.listeners.delete(m.id);
          aiState.setKey('full', 'ready');
          l?.resolve(m.text);
          break;
        }
        case 'error': {
          aiState.setKey('lastError', `full: ${m.message}`);
          if (m.id !== undefined) {
            const l = this.listeners.get(m.id);
            this.listeners.delete(m.id);
            l?.reject(new Error(m.message));
          }
          if (m.fatal) {
            aiState.setKey('full', 'error');
            this.modelId = null;
            this.worker?.terminate();
            this.worker = null;
          } else if (aiState.get().full === 'generating') aiState.setKey('full', 'ready');
          break;
        }
        case 'unloaded':
          this.modelId = null;
          aiState.setKey('full', 'unloaded');
          aiState.setKey('fullModel', null);
          break;
      }
    };
    this.worker.onerror = (e) => {
      aiState.setKey('full', 'error');
      aiState.setKey('lastError', `full worker: ${e.message}`);
    };
    return this.worker;
  }

  /** Download (first time) and load a model. Resolves when ready; rejects on failure. */
  load(modelId: string): Promise<void> {
    if (this.modelId === modelId) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    writeConsent(modelId);
    aiState.setKey('full', 'downloading');
    aiState.setKey('fullProgress', 0);
    aiState.setKey('fullProgressText', 'Starting…');
    const w = this.ensureWorker();
    this.loadPromise = new Promise<void>((resolve, reject) => {
      const handler = (ev: MessageEvent<FullResponse>) => {
        if (ev.data.type === 'loaded') {
          w.removeEventListener('message', handler);
          resolve();
        } else if (ev.data.type === 'error' && ev.data.id === undefined) {
          w.removeEventListener('message', handler);
          reject(new Error(ev.data.message));
        }
      };
      w.addEventListener('message', handler);
      w.postMessage({ type: 'load', modelId } satisfies FullRequest);
    }).finally(() => (this.loadPromise = null));
    return this.loadPromise;
  }

  /** Cancel a running download/load by terminating the worker (the Cache API keeps partial files). */
  cancelLoad() {
    this.worker?.terminate();
    this.worker = null;
    this.loadPromise = null;
    this.modelId = null;
    aiState.setKey('full', 'available');
    aiState.setKey('fullProgress', 0);
    aiState.setKey('fullProgressText', 'Cancelled');
  }

  generate(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    onToken: (d: string) => void,
    maxTokens = 320,
  ): { promise: Promise<string>; cancel: () => void } {
    const w = this.ensureWorker();
    const id = ++this.seq;
    aiState.setKey('full', 'generating');
    const promise = new Promise<string>((resolve, reject) => {
      this.listeners.set(id, { onToken, resolve, reject });
      w.postMessage({ type: 'generate', id, system, messages, maxTokens } satisfies FullRequest);
    });
    return { promise, cancel: () => w.postMessage({ type: 'cancel', id } satisfies FullRequest) };
  }

  unload() {
    this.worker?.postMessage({ type: 'unload' } satisfies FullRequest);
  }

  /** Remove every cached model and the saved consent (user control, SECURITY.md). */
  async clearModels(): Promise<number> {
    this.unload();
    let removed = 0;
    try {
      const keys = await caches.keys();
      for (const k of keys) {
        if (/webllm|wasm|model|transformers/i.test(k)) {
          await caches.delete(k);
          removed++;
        }
      }
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(FULL_CONSENT_KEY);
      localStorage.removeItem(FULL_MODEL_KEY);
      localStorage.removeItem('trace:pocket-semantic');
    } catch {
      /* ignore */
    }
    aiState.setKey('full', 'available');
    aiState.setKey('fullModel', null);
    return removed;
  }
}

function writeConsent(modelId: string) {
  try {
    localStorage.setItem(FULL_CONSENT_KEY, 'yes');
    localStorage.setItem(FULL_MODEL_KEY, modelId);
  } catch {
    /* ignore */
  }
}
export function savedModel(): string | null {
  try {
    const id = localStorage.getItem(FULL_MODEL_KEY);
    return id && modelById(id) && localStorage.getItem(FULL_CONSENT_KEY) === 'yes' ? id : null;
  } catch {
    return null;
  }
}

let instance: FullClient | null = null;
export function getFullClient(): FullClient {
  if (!instance) instance = new FullClient();
  return instance;
}
