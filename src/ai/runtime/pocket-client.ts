/**
 * Main-thread client for the Pocket worker. One shared instance per page. Falls back to an in-thread
 * lexical index when workers are unavailable so search always works (fallback chain, plan.md §11).
 */
import type { AnswerEntry, JDMatchResult, PocketRequest, PocketResponse, RetrievedChunk } from '../protocol';
import { aiState } from '@/lib/stores/ai';
import { detectCapabilities } from './capability';
import type { LexicalIndex, bm25 } from '../pocket/lexical';

const INDEX_URL = '/generated/knowledge-index.json';
const SEMANTIC_URL = '/generated/semantic-index.json';
const WASM_BASE = '/models/ort/';
const CONSENT_KEY = 'trace:pocket-semantic';

export class PocketClient {
  ready: Promise<void>;
  semantic = false;
  chunks = 0;
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private fallback: Promise<{ bm25: typeof bm25; index: LexicalIndex; answers: AnswerEntry[] }> | null = null;

  constructor() {
    this.ready = this.boot();
  }

  private async boot() {
    const caps = await detectCapabilities();
    const consent = readConsent();
    const allowDownload = consent === 'yes' || (consent === null && !caps.saveData && !caps.coarsePointer);
    if (!caps.workers) {
      aiState.setKey('pocket', 'lexical-inline');
      await this.bootInline();
      return;
    }
    try {
      this.worker = new Worker(new URL('../workers/pocket.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      aiState.setKey('pocket', 'lexical-inline');
      await this.bootInline();
      return;
    }
    aiState.setKey('pocket', 'loading');
    await new Promise<void>((resolve, reject) => {
      const w = this.worker!;
      const timer = setTimeout(() => reject(new Error('pocket worker timeout')), 15_000);
      w.onmessage = (ev: MessageEvent<PocketResponse>) => {
        const m = ev.data;
        switch (m.type) {
          case 'ready':
            clearTimeout(timer);
            this.chunks = m.chunks;
            aiState.setKey('pocket', 'lexical');
            aiState.setKey('indexChunks', m.chunks);
            resolve();
            break;
          case 'semantic-progress':
            aiState.setKey('pocket', 'semantic-loading');
            aiState.setKey('semanticProgress', m.totalMB ? m.loadedMB / m.totalMB : 0);
            break;
          case 'semantic-ready':
            this.semantic = true;
            aiState.setKey('pocket', 'semantic');
            aiState.setKey('semanticModel', m.model);
            break;
          case 'semantic-failed':
            aiState.setKey('pocket', 'lexical');
            aiState.setKey('lastError', `semantic: ${m.reason}`);
            break;
          case 'results':
          case 'jd-result': {
            const p = this.pending.get(m.id);
            if (p) {
              this.pending.delete(m.id);
              p.resolve(m);
            }
            break;
          }
          case 'error': {
            if (m.id !== undefined) {
              const p = this.pending.get(m.id);
              if (p) {
                this.pending.delete(m.id);
                p.reject(new Error(m.message));
              }
            } else {
              clearTimeout(timer);
              reject(new Error(m.message));
            }
            break;
          }
        }
      };
      w.onerror = (e) => {
        clearTimeout(timer);
        reject(new Error(e.message || 'pocket worker failed'));
      };
      const init: PocketRequest = {
        type: 'init',
        indexUrl: INDEX_URL,
        semanticUrl: SEMANTIC_URL,
        wasmBase: WASM_BASE,
        allowDownload,
      };
      w.postMessage(init);
    }).catch(async (err: Error) => {
      aiState.setKey('lastError', `pocket: ${err.message}`);
      aiState.setKey('pocket', 'lexical-inline');
      this.worker?.terminate();
      this.worker = null;
      await this.bootInline();
    });
  }

  private async bootInline() {
    this.fallback = (async () => {
      const mod = await import('../pocket/lexical');
      const [ki, ai] = await Promise.all([
        fetch(INDEX_URL).then((r) => r.json()),
        fetch(INDEX_URL.replace('knowledge-index', 'answer-index')).then((r) => r.json()),
      ]);
      this.chunks = ki.chunks.length;
      aiState.setKey('indexChunks', ki.chunks.length);
      return { ...mod, index: mod.buildLexicalIndex(ki.chunks), answers: ai.answers as AnswerEntry[] };
    })();
    await this.fallback;
  }

  enableSemantic() {
    writeConsent('yes');
    this.worker?.postMessage({ type: 'embed-enable', id: ++this.seq } satisfies PocketRequest);
  }

  private call<T>(msg: PocketRequest & { id: number }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(msg.id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker!.postMessage(msg);
    });
  }

  async search(
    query: string,
    limit = 8,
  ): Promise<{ chunks: RetrievedChunk[]; answer: AnswerEntry | null; mode: 'lexical' | 'semantic' }> {
    await this.ready;
    if (this.worker) {
      const r = await this.call<Extract<PocketResponse, { type: 'results' }>>({
        type: 'search',
        id: ++this.seq,
        query,
        limit,
      });
      return { chunks: r.chunks, answer: r.answer, mode: r.mode };
    }
    const fb = await this.fallback!;
    const { matchAnswer } = await import('../pocket/answers');
    return {
      chunks: fb.bm25(fb.index, query, limit),
      answer: matchAnswer(fb.answers, query),
      mode: 'lexical',
    };
  }

  async matchJD(text: string): Promise<JDMatchResult> {
    await this.ready;
    if (this.worker) {
      const r = await this.call<Extract<PocketResponse, { type: 'jd-result' }>>({
        type: 'match-jd',
        id: ++this.seq,
        text,
      });
      return r.result;
    }
    const fb = await this.fallback!;
    const { assemble, extractRequirements } = await import('../pocket/jd-match');
    return assemble(extractRequirements(text), (q) => fb.bm25(fb.index, q, 3), 'lexical');
  }
}

function readConsent(): 'yes' | 'no' | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'yes' || v === 'no' ? v : null;
  } catch {
    return null;
  }
}
function writeConsent(v: 'yes' | 'no') {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* ignore */
  }
}

let instance: PocketClient | null = null;
export function getPocketClient(): PocketClient {
  if (!instance) instance = new PocketClient();
  return instance;
}
