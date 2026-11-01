/// <reference lib="webworker" />
/**
 * Pocket worker: BM25 immediately; MiniLM (pinned) lazily for semantic retrieval; the JD matcher; the NLP parse.
 * Validates the semantic index (version + model@revision) BEFORE importing the SDK or downloading anything.
 * WASM runs single-threaded (GitHub Pages sets no COOP/COEP). Messages: src/ai/protocol.ts.
 */
import type { Chunk, PocketRequest, PocketResponse, SearchHit } from '../protocol';
import { buildBm25, bm25Search, cosine, decodeVectors, rrf, type Bm25Index } from '../knowledge';
import { EMBEDDER } from '../config';
import { matchJd, type SkillRef } from '../jd';
import { parseQuery, buildDictionary, type Dictionary } from '../nlp';

const post = (m: PocketResponse) => (self as unknown as Worker).postMessage(m);

let chunks: Chunk[] = [];
let bm25: Bm25Index | null = null;
let vectors: Float32Array[] | null = null;
let vectorIds: string[] = [];
let embed: ((text: string) => Promise<Float32Array>) | null = null;
let skills: SkillRef[] = [];
let dict: Dictionary | null = null;

async function init(indexUrl: string, answersUrl: string): Promise<void> {
  const [k, g] = await Promise.all([
    fetch(indexUrl).then((r) => r.json() as Promise<{ version: string; chunks: Chunk[] }>),
    fetch(indexUrl.replace('knowledge-index', 'skill-graph'))
      .then((r) => r.json() as Promise<{ skills: SkillRef[] }>)
      .catch(() => ({ skills: [] as SkillRef[] })),
  ]);
  void answersUrl;
  chunks = k.chunks;
  bm25 = buildBm25(chunks);
  skills = g.skills;
  const machines = chunks
    .filter((c) => c.id.startsWith('machine:'))
    .map((c) => ({ slug: c.id.slice(8), name: c.text.split(' (bay')[0]! }));
  const projects = chunks
    .filter((c) => /^project:[^:]+:summary$/.test(c.id))
    .map((c) => ({ id: c.id.split(':')[1]!, name: c.text.split(':')[0]! }));
  dict = buildDictionary({ machines, projects, skills });
  post({ type: 'ready', chunks: chunks.length, version: k.version });
}

async function loadSemantic(semanticIndexUrl: string, wasmPath: string): Promise<void> {
  try {
    const idx = (await fetch(semanticIndexUrl).then((r) => r.json())) as {
      version: string;
      model: string;
      dims: number;
      ids: string[];
      vectors: string;
    };
    if (!idx.model.startsWith(`${EMBEDDER.id}@${EMBEDDER.revision}`))
      throw new Error(`semantic index model mismatch: ${idx.model}`);
    if (idx.dims !== EMBEDDER.dims) throw new Error('semantic index dims mismatch');
    vectorIds = idx.ids;
    vectors = decodeVectors(idx.vectors, idx.dims);
    post({ type: 'semantic:progress', loaded: 0, total: 1, file: 'runtime' });
    const tf = await import('@huggingface/transformers');
    tf.env.allowLocalModels = false;
    tf.env.backends.onnx.wasm!.wasmPaths = wasmPath;
    tf.env.backends.onnx.wasm!.numThreads = 1;
    tf.env.backends.onnx.wasm!.proxy = false;
    const extractor = await tf.pipeline('feature-extraction', EMBEDDER.id, {
      dtype: EMBEDDER.dtype,
      revision: EMBEDDER.revision,
      device: 'wasm',
      progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status === 'progress' && p.total)
          post({
            type: 'semantic:progress',
            loaded: p.loaded ?? 0,
            total: p.total,
            ...(p.file ? { file: p.file } : {}),
          });
      },
    });
    embed = async (text: string) => {
      const out = await extractor(text, { pooling: 'mean', normalize: true });
      return new Float32Array(out.data as Float32Array);
    };
    post({ type: 'semantic:ready', dims: idx.dims, model: idx.model });
  } catch (e) {
    vectors = null;
    embed = null;
    post({ type: 'semantic:error', message: (e as Error).message });
  }
}

async function search(id: number, query: string, k = 8): Promise<void> {
  if (!bm25) return post({ type: 'error', id, message: 'index not loaded' });
  const lexical = bm25Search(bm25, query, k);
  if (!embed || !vectors)
    return post({
      type: 'search:result',
      id,
      hits: lexical.map((h) => ({ ...h, lexical: h.score })),
      mode: 'lexical',
    });
  const q = await embed(query);
  const semantic = vectors
    .map((v, i) => ({ id: vectorIds[i]!, score: cosine(q, v) }))
    .filter((h) => h.score > 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  const fused = rrf([lexical, semantic], 60, k);
  const hits: SearchHit[] = fused.map((h) => ({
    id: h.id,
    score: h.score,
    ...(lexical.find((l) => l.id === h.id) ? { lexical: lexical.find((l) => l.id === h.id)!.score } : {}),
    ...(semantic.find((s) => s.id === h.id) ? { semantic: semantic.find((s) => s.id === h.id)!.score } : {}),
  }));
  post({ type: 'search:result', id, hits, mode: 'hybrid' });
}

self.onmessage = (e: MessageEvent<PocketRequest>) => {
  const m = e.data;
  switch (m.type) {
    case 'init':
      void init(m.indexUrl, m.answersUrl).catch((err: Error) =>
        post({ type: 'error', message: err.message }),
      );
      break;
    case 'semantic:load':
      void loadSemantic(m.semanticIndexUrl, m.wasmPath);
      break;
    case 'search':
      void search(m.id, m.query, m.k);
      break;
    case 'match-jd':
      post({ type: 'match-jd:result', id: m.id, requirements: matchJd(m.jd, skills, chunks) });
      break;
    case 'parse':
      post({
        type: 'parse:result',
        id: m.id,
        parse: dict ? parseQuery(m.query, dict) : { intent: 'general', entities: [], skills: [] },
      });
      break;
  }
};
