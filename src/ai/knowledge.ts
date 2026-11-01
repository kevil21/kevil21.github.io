/**
 * Chunking + lexical retrieval, shared by the Build Brain (Node) and the browser (worker or inline fallback).
 * Pure functions: no DOM, no fetch. Chunks carry the source pointer and label so every answer can cite.
 */
import type { Chunk } from './protocol';

export const STOP = new Set(
  'a an and are as at be by for from has have in into is it its of on or that the this to was were will with your you i me my we our about tell what how which who does do did can show give'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[→·—–]/g, ' ')
    .replace(/[^a-z0-9+#./-]+/g, ' ')
    .split(' ')
    .map((t) => t.replace(/^[./-]+|[./-]+$/g, ''))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export interface Bm25Index {
  n: number;
  avgdl: number;
  df: Map<string, number>;
  docs: Array<{ id: string; tf: Map<string, number>; len: number }>;
}

export function buildBm25(chunks: Chunk[]): Bm25Index {
  const df = new Map<string, number>();
  const docs = chunks.map((c) => {
    const toks = tokenize(`${c.text} ${c.machine ?? ''}`);
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { id: c.id, tf, len: toks.length };
  });
  const avgdl = docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length);
  return { n: docs.length, avgdl, df, docs };
}

export function bm25Search(
  index: Bm25Index,
  query: string,
  k = 8,
  k1 = 1.4,
  b = 0.75,
): Array<{ id: string; score: number }> {
  const q = tokenize(query);
  if (!q.length) return [];
  const scores: Array<{ id: string; score: number }> = [];
  for (const d of index.docs) {
    let s = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = index.df.get(t) ?? 0;
      const idf = Math.log(1 + (index.n - n + 0.5) / (n + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / index.avgdl)));
    }
    if (s > 0) scores.push({ id: d.id, score: s });
  }
  return scores.sort((a, b2) => b2.score - a.score).slice(0, k);
}

/** Reciprocal-rank fusion of lexical and semantic rankings. */
export function rrf(
  lists: Array<Array<{ id: string; score: number }>>,
  k = 60,
  limit = 8,
): Array<{ id: string; score: number }> {
  const acc = new Map<string, number>();
  for (const list of lists)
    list.forEach((h, rank) => acc.set(h.id, (acc.get(h.id) ?? 0) + 1 / (k + rank + 1)));
  return [...acc.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function cosine(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot; // both are L2-normalised
}

type NodeBuffer = { from(s: string, enc: string): { toString(enc: string): string } };
const nodeBuffer = (globalThis as unknown as { Buffer?: NodeBuffer }).Buffer;

export function decodeVectors(base64: string, dims: number): Float32Array[] {
  const bin =
    typeof atob === 'function' ? atob(base64) : nodeBuffer!.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const all = new Float32Array(bytes.buffer);
  const out: Float32Array[] = [];
  for (let i = 0; i + dims <= all.length; i += dims) out.push(all.subarray(i, i + dims));
  return out;
}

export function encodeVectors(vectors: Float32Array[]): string {
  const dims = vectors[0]?.length ?? 0;
  const all = new Float32Array(vectors.length * dims);
  vectors.forEach((v, i) => all.set(v, i * dims));
  const bytes = new Uint8Array(all.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return typeof btoa === 'function' ? btoa(bin) : nodeBuffer!.from(bin, 'binary').toString('base64');
}
