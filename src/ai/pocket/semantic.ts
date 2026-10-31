import type { Chunk, RetrievedChunk, SemanticIndex } from '../protocol';

export interface SemanticStore {
  ids: string[];
  dims: number;
  vectors: Float32Array;
}

export function decodeSemanticIndex(index: SemanticIndex): SemanticStore {
  const bin = atob(index.vectors);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { ids: index.ids, dims: index.dims, vectors: new Float32Array(bytes.buffer) };
}

export function cosineTopK(
  store: SemanticStore,
  query: Float32Array,
  k: number,
  byId: Map<string, Chunk>,
  minScore = 0.3,
): RetrievedChunk[] {
  const n = store.ids.length;
  const out: { i: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    const off = i * store.dims;
    for (let d = 0; d < store.dims; d++) s += store.vectors[off + d]! * query[d]!;
    if (s >= minScore) out.push({ i, s });
  }
  out.sort((a, b) => b.s - a.s);
  return out.slice(0, k).flatMap(({ i, s }) => {
    const c = byId.get(store.ids[i]!);
    return c ? [{ ...c, score: s, via: 'semantic' as const }] : [];
  });
}

/** Reciprocal-rank fusion of lexical and semantic lists. */
export function fuse(lists: RetrievedChunk[][], limit: number): RetrievedChunk[] {
  const score = new Map<string, { c: RetrievedChunk; s: number }>();
  for (const list of lists) {
    list.forEach((c, rank) => {
      const prev = score.get(c.id);
      const add = 1 / (60 + rank);
      if (prev) prev.s += add;
      else score.set(c.id, { c, s: add });
    });
  }
  return [...score.values()]
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ c, s }) => ({ ...c, score: s }));
}
