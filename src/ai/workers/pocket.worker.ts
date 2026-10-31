/// <reference lib="webworker" />
/**
 * Pocket Brain worker (Tier 1). Brings up lexical search instantly from knowledge-index.json, then,
 * only when allowed, loads the MiniLM embedder for semantic search. Also runs the JD matcher.
 * Nothing here touches the DOM; results go back as messages.
 */
import type {
  AnswerIndex,
  Chunk,
  KnowledgeIndex,
  PocketRequest,
  PocketResponse,
  RetrievedChunk,
  SemanticIndex,
} from '../protocol';
import { bm25, buildLexicalIndex, type LexicalIndex } from '../pocket/lexical';
import { cosineTopK, decodeSemanticIndex, fuse, type SemanticStore } from '../pocket/semantic';
import { assemble, extractRequirements } from '../pocket/jd-match';
import { matchAnswer } from '../pocket/answers';
import { EMBEDDER } from '../pocket/embedder-config';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (m: PocketResponse) => ctx.postMessage(m);

let lexical: LexicalIndex | null = null;
let byId = new Map<string, Chunk>();
let answers: AnswerIndex['answers'] = [];
let semanticStore: SemanticStore | null = null;
let semanticUrl: string | null = null;
let wasmBase = '/models/ort/';
let embed: ((text: string) => Promise<Float32Array>) | null = null;
let embedLoading: Promise<void> | null = null;
let expectedVersion = '';

ctx.onmessage = async (ev: MessageEvent<PocketRequest>) => {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case 'init': {
        wasmBase = msg.wasmBase;
        semanticUrl = msg.semanticUrl;
        const [ki, ai] = await Promise.all([
          fetch(msg.indexUrl).then((r) => r.json() as Promise<KnowledgeIndex>),
          fetch(msg.indexUrl.replace('knowledge-index', 'answer-index')).then(
            (r) => r.json() as Promise<AnswerIndex>,
          ),
        ]);
        expectedVersion = ki.version;
        lexical = buildLexicalIndex(ki.chunks);
        byId = new Map(ki.chunks.map((c) => [c.id, c]));
        answers = ai.answers;
        post({ type: 'ready', lexical: true, semantic: false, chunks: ki.chunks.length });
        if (msg.allowDownload && semanticUrl) void enableSemantic();
        break;
      }
      case 'embed-enable': {
        await enableSemantic();
        break;
      }
      case 'search': {
        if (!lexical) throw new Error('index not ready');
        const { chunks, mode } = await retrieve(msg.query, msg.limit ?? 8);
        post({ type: 'results', id: msg.id, chunks, answer: matchAnswer(answers, msg.query), mode });
        break;
      }
      case 'match-jd': {
        if (!lexical) throw new Error('index not ready');
        const reqs = extractRequirements(msg.text);
        const mode: 'lexical' | 'semantic' = embed && semanticStore ? 'semantic' : 'lexical';
        if (mode === 'semantic') {
          const rows = await Promise.all(
            reqs.map(async (r) => ({ r, hits: (await retrieve(r.text, 3)).chunks })),
          );
          const map = new Map(rows.map(({ r, hits }) => [r.id, hits]));
          post({
            type: 'jd-result',
            id: msg.id,
            result: assemble(reqs, (q) => map.get(reqs.find((x) => x.text === q)!.id) ?? [], 'semantic'),
          });
        } else {
          post({
            type: 'jd-result',
            id: msg.id,
            result: assemble(
              reqs,
              (q) => bm25(lexical!, reqs.find((x) => x.text === q)?.terms.join(' ') || q, 3),
              'lexical',
            ),
          });
        }
        break;
      }
      case 'cancel':
        break;
    }
  } catch (err) {
    post({
      type: 'error',
      id: 'id' in msg ? msg.id : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

async function retrieve(
  query: string,
  limit: number,
): Promise<{ chunks: RetrievedChunk[]; mode: 'lexical' | 'semantic' }> {
  const lex = bm25(lexical!, query, limit);
  if (embed && semanticStore) {
    try {
      const v = await embed(query);
      const sem = cosineTopK(semanticStore, v, limit, byId);
      return {
        chunks: fuse([sem, lex], limit).map((c) => ({
          ...c,
          via: sem.some((s) => s.id === c.id) ? 'semantic' : 'lexical',
        })),
        mode: 'semantic',
      };
    } catch {
      /* fall through to lexical */
    }
  }
  return { chunks: lex, mode: 'lexical' };
}

async function enableSemantic() {
  if (embed || !semanticUrl) return;
  if (embedLoading) return embedLoading;
  embedLoading = (async () => {
    try {
      // 1. Validate the index first (cheap), 2. only then import the SDK and download weights.
      const idx = (await fetch(semanticUrl!).then((r) => r.json())) as SemanticIndex;
      if (idx.version !== expectedVersion)
        throw new Error(`semantic index version ${idx.version} ≠ ${expectedVersion}`);
      if (!idx.model.startsWith(`${EMBEDDER.id}@${EMBEDDER.revision}`))
        throw new Error(`semantic index built with ${idx.model}`);
      semanticStore = decodeSemanticIndex(idx);
      const tf = await import('@huggingface/transformers');
      tf.env.allowLocalModels = false;
      tf.env.useBrowserCache = true;
      if (tf.env.backends.onnx.wasm) {
        tf.env.backends.onnx.wasm.wasmPaths = wasmBase;
        tf.env.backends.onnx.wasm.numThreads = 1; // GitHub Pages cannot send COOP/COEP → no SharedArrayBuffer
        tf.env.backends.onnx.wasm.proxy = false;
      }
      let total = 0;
      const loaded = new Map<string, number>();
      const extractor = await tf.pipeline('feature-extraction', EMBEDDER.id, {
        dtype: EMBEDDER.dtype,
        revision: EMBEDDER.revision,
        device: 'wasm',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress' && p.file && p.total) {
            loaded.set(p.file, p.loaded ?? 0);
            total = Math.max(total, [...loaded.keys()].length ? p.total : 0);
            const sum = [...loaded.values()].reduce((a, b) => a + b, 0);
            post({
              type: 'semantic-progress',
              loadedMB: +(sum / 1e6).toFixed(1),
              totalMB: +(Math.max(total, sum) / 1e6).toFixed(1),
            });
          }
        },
      });
      embed = async (text: string) => {
        const t = await extractor(text, { pooling: 'mean', normalize: true });
        const data = Float32Array.from(t.data as ArrayLike<number>);
        t.dispose?.();
        return data;
      };
      post({ type: 'semantic-ready', model: idx.model });
    } catch (err) {
      semanticStore = null;
      embed = null;
      post({ type: 'semantic-failed', reason: err instanceof Error ? err.message : String(err) });
    } finally {
      embedLoading = null;
    }
  })();
  return embedLoading;
}
