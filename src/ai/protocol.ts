/**
 * Typed message protocol between the main thread and the AI workers (Pocket: BM25 + MiniLM + JD matcher;
 * Full: WebLLM). Shared by src/ai/workers/* (WebWorker lib) and src/ai/runtime/* (DOM lib), so it imports nothing
 * environment-specific. Scene 7 implements the workers; the contract is fixed here so both sides compile against it.
 */

export type Tier = 'static' | 'pocket-lexical' | 'pocket-semantic' | 'full';

export interface Chunk {
  id: string; // e.g. "F-C15" or "project:a360#approach-2"
  text: string;
  machine?: string;
  /** Source pointer (KPOS/... or info.md#L..). */
  source: string;
  label: 'public' | 'resume' | 'site-case-study' | 'info-md' | 'sample';
  url?: string; // where showEvidence() navigates
}

export interface SearchHit {
  id: string;
  score: number;
  lexical?: number;
  semantic?: number;
}

export interface JdRequirement {
  text: string;
  terms: string[];
  verdict: 'strong' | 'related' | 'not-demonstrated';
  proof: Array<{ id: string; url?: string; label: string }>;
}

export interface NlpParse {
  intent: string;
  entities: Array<{ text: string; kind: 'machine' | 'project' | 'skill' | 'org' | 'credential' | 'other' }>;
  skills: string[];
}

/* ---------- Pocket worker ---------- */

export type PocketRequest =
  | { type: 'init'; indexUrl: string; answersUrl: string }
  | { type: 'search'; id: number; query: string; k?: number }
  | { type: 'semantic:load'; semanticIndexUrl: string; wasmPath: string }
  | { type: 'match-jd'; id: number; jd: string }
  | { type: 'parse'; id: number; query: string };

export type PocketResponse =
  | { type: 'ready'; chunks: number; version: string }
  | { type: 'semantic:progress'; loaded: number; total: number; file?: string }
  | { type: 'semantic:ready'; dims: number; model: string }
  | { type: 'semantic:error'; message: string }
  | { type: 'search:result'; id: number; hits: SearchHit[]; mode: 'lexical' | 'hybrid' }
  | { type: 'match-jd:result'; id: number; requirements: JdRequirement[] }
  | { type: 'parse:result'; id: number; parse: NlpParse }
  | { type: 'error'; id?: number; message: string };

/* ---------- Full worker (WebLLM) ---------- */

export interface FullModelInfo {
  id: string;
  approxDownloadMB: number;
  vramMB: number;
  requiresF16: boolean;
  f32Fallback?: string;
  contextWindow: number;
  license: string;
}

export type FullRequest =
  | { type: 'load'; modelId: string }
  | {
      type: 'generate';
      id: number;
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      maxTokens?: number;
    }
  | { type: 'cancel'; id: number }
  | { type: 'unload' };

export type FullResponse =
  | { type: 'load:progress'; text: string; progress: number }
  | { type: 'load:ready'; modelId: string }
  | { type: 'load:error'; message: string; fatal: boolean }
  | { type: 'generate:delta'; id: number; delta: string }
  | { type: 'generate:done'; id: number; text: string; usage?: { prompt: number; completion: number } }
  | { type: 'generate:error'; id: number; message: string; fatal: boolean }
  | { type: 'unloaded' };

/** Errors matching this are fatal for the Full tier: unload and fall back to Pocket (inherited from TRACE). */
export const FATAL_GPU_ERROR = /webgpu|adapter|device|out of memory|OOM|shader/i;
