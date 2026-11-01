/**
 * Main-thread client for the Pocket worker. If the worker cannot start, retrieval runs inline (BM25 on the main
 * thread) so the Operator always answers deterministically. Semantic loading is explicit (never auto on coarse
 * pointers or Save-Data) and reports progress.
 */
import type { Chunk, JdRequirement, NlpParse, PocketRequest, PocketResponse, SearchHit } from '../protocol';
import { buildBm25, bm25Search, type Bm25Index } from '../knowledge';
import { matchJd, type SkillRef } from '../jd';
import { parseQuery, buildDictionary, type Dictionary } from '../nlp';
import { GENERATED_DIR, ORT_WASM_PATH } from '../config';
import type { ScriptedAnswer } from '../answers';

export type SemanticState =
  | { status: 'idle' }
  | { status: 'loading'; loaded: number; total: number; file?: string }
  | { status: 'ready'; model: string }
  | { status: 'error'; message: string };

export class PocketClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, (m: PocketResponse) => void>();
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  chunks: Chunk[] = [];
  answers: ScriptedAnswer[] = [];
  skills: SkillRef[] = [];
  version = '';
  mode: 'worker' | 'inline' = 'worker';
  semantic: SemanticState = { status: 'idle' };
  private inlineIndex: Bm25Index | null = null;
  private dict: Dictionary | null = null;
  onSemantic: ((s: SemanticState) => void) | null = null;

  constructor() {
    this.readyPromise = new Promise((r) => (this.resolveReady = r));
  }

  async init(): Promise<void> {
    const [k, a, g] = await Promise.all([
      fetch(`${GENERATED_DIR}/knowledge-index.json`).then(
        (r) => r.json() as Promise<{ version: string; chunks: Chunk[] }>,
      ),
      fetch(`${GENERATED_DIR}/answer-index.json`).then(
        (r) => r.json() as Promise<{ answers: ScriptedAnswer[] }>,
      ),
      fetch(`${GENERATED_DIR}/skill-graph.json`).then((r) => r.json() as Promise<{ skills: SkillRef[] }>),
    ]);
    this.chunks = k.chunks;
    this.version = k.version;
    this.answers = a.answers;
    this.skills = g.skills;
    const machines = this.chunks
      .filter((c) => c.id.startsWith('machine:'))
      .map((c) => ({ slug: c.id.slice(8), name: c.text.split(' (bay')[0]! }));
    const projects = this.chunks
      .filter((c) => /^project:[^:]+:summary$/.test(c.id))
      .map((c) => ({ id: c.id.split(':')[1]!, name: c.text.split(':')[0]! }));
    this.dict = buildDictionary({ machines, projects, skills: this.skills });
    try {
      this.worker = new Worker(new URL('../workers/pocket.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<PocketResponse>) => this.handle(e.data);
      this.worker.onerror = () => this.fallbackInline();
      const msg: PocketRequest = {
        type: 'init',
        indexUrl: `${GENERATED_DIR}/knowledge-index.json`,
        answersUrl: `${GENERATED_DIR}/answer-index.json`,
      };
      this.worker.postMessage(msg);
      // if the worker does not report ready in time, go inline
      setTimeout(() => {
        if (this.mode === 'worker' && !this.readyFlag) this.fallbackInline();
      }, 4000);
    } catch {
      this.fallbackInline();
    }
    await this.readyPromise;
  }

  private readyFlag = false;
  private fallbackInline(): void {
    if (this.readyFlag) return;
    this.mode = 'inline';
    this.worker?.terminate();
    this.worker = null;
    this.inlineIndex = buildBm25(this.chunks);
    this.readyFlag = true;
    this.resolveReady();
  }

  private handle(m: PocketResponse): void {
    switch (m.type) {
      case 'ready':
        this.readyFlag = true;
        this.resolveReady();
        break;
      case 'semantic:progress':
        this.semantic = {
          status: 'loading',
          loaded: m.loaded,
          total: m.total,
          ...(m.file ? { file: m.file } : {}),
        };
        this.onSemantic?.(this.semantic);
        break;
      case 'semantic:ready':
        this.semantic = { status: 'ready', model: m.model };
        this.onSemantic?.(this.semantic);
        break;
      case 'semantic:error':
        this.semantic = { status: 'error', message: m.message };
        this.onSemantic?.(this.semantic);
        break;
      case 'search:result':
      case 'match-jd:result':
      case 'parse:result':
        this.pending.get(m.id)?.(m);
        this.pending.delete(m.id);
        break;
      case 'error':
        if (m.id !== undefined) {
          this.pending.get(m.id)?.(m);
          this.pending.delete(m.id);
        }
        break;
    }
  }

  private request<T extends PocketResponse>(msg: PocketRequest & { id: number }): Promise<T> {
    return new Promise((resolve) => {
      this.pending.set(msg.id, (m) => resolve(m as T));
      this.worker!.postMessage(msg);
    });
  }

  /** Ask the worker to load MiniLM (23 MB) + the ORT runtime (14 MB). Explicit opt-in or fine-pointer auto. */
  loadSemantic(): void {
    if (!this.worker || this.semantic.status !== 'idle') return;
    this.semantic = { status: 'loading', loaded: 0, total: 1 };
    this.onSemantic?.(this.semantic);
    const msg: PocketRequest = {
      type: 'semantic:load',
      semanticIndexUrl: `${GENERATED_DIR}/semantic-index.json`,
      wasmPath: ORT_WASM_PATH,
    };
    this.worker.postMessage(msg);
  }

  async search(query: string, k = 8): Promise<{ hits: SearchHit[]; mode: 'lexical' | 'hybrid' }> {
    if (this.mode === 'inline' || !this.worker) {
      const hits = bm25Search(this.inlineIndex ?? (this.inlineIndex = buildBm25(this.chunks)), query, k).map(
        (h) => ({ ...h, lexical: h.score }),
      );
      return { hits, mode: 'lexical' };
    }
    const r = await this.request<Extract<PocketResponse, { type: 'search:result' }>>({
      type: 'search',
      id: ++this.seq,
      query,
      k,
    });
    if (r.type !== 'search:result') return { hits: [], mode: 'lexical' };
    return { hits: r.hits, mode: r.mode };
  }

  async matchJd(jd: string): Promise<JdRequirement[]> {
    if (this.mode === 'inline' || !this.worker) return matchJd(jd, this.skills, this.chunks);
    const r = await this.request<Extract<PocketResponse, { type: 'match-jd:result' }>>({
      type: 'match-jd',
      id: ++this.seq,
      jd,
    });
    return r.type === 'match-jd:result' ? r.requirements : [];
  }

  async parse(query: string): Promise<NlpParse> {
    if (this.mode === 'inline' || !this.worker)
      return this.dict ? parseQuery(query, this.dict) : { intent: 'general', entities: [], skills: [] };
    const r = await this.request<Extract<PocketResponse, { type: 'parse:result' }>>({
      type: 'parse',
      id: ++this.seq,
      query,
    });
    return r.type === 'parse:result' ? r.parse : { intent: 'general', entities: [], skills: [] };
  }

  chunk(id: string): Chunk | undefined {
    return this.chunks.find((c) => c.id === id);
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
