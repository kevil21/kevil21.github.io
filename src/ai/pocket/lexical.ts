/**
 * Dependency-free BM25 over chunks. This is the deterministic tier of the fallback chain:
 * it works without any model download and is the first thing the Pocket worker brings up.
 */
import type { Chunk, RetrievedChunk } from '../protocol';

const STOP = new Set(
  'a an the and or of to in on for with by at from as is are was were be been being this that these those it its into over under about what which who whom whose how when where why does do did done has have had can could should would will shall may might must not no yes i you he she they we me him her them us my your his their our kevil patel'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[→·]/g, ' ')
    .replace(/[^a-z0-9+#. -]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

/** very small suffix stemmer — enough to match "dashboards" ↔ "dashboard", "forecasting" ↔ "forecast" */
export function stem(t: string): string {
  if (t.length <= 4) return t;
  for (const suf of ['ations', 'ation', 'ings', 'ing', 'ies', 'ers', 'er', 'es', 's', 'ed', 'ly']) {
    if (t.endsWith(suf) && t.length - suf.length >= 3) {
      const base = t.slice(0, -suf.length);
      return suf === 'ies' ? base + 'y' : base;
    }
  }
  return t;
}

export interface LexicalIndex {
  chunks: Chunk[];
  docTokens: string[][];
  df: Map<string, number>;
  avgLen: number;
}

export function buildLexicalIndex(chunks: Chunk[]): LexicalIndex {
  const docTokens = chunks.map((c) => tokenize(c.text));
  const df = new Map<string, number>();
  for (const toks of docTokens) for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docTokens.reduce((a, b) => a + b.length, 0) / Math.max(1, docTokens.length);
  return { chunks, docTokens, df, avgLen };
}

export function bm25(index: LexicalIndex, query: string, limit = 8, k1 = 1.4, b = 0.75): RetrievedChunk[] {
  const q = tokenize(query);
  if (!q.length) return [];
  const N = index.chunks.length;
  const scores: { i: number; s: number }[] = [];
  for (let i = 0; i < N; i++) {
    const toks = index.docTokens[i]!;
    if (!toks.length) continue;
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    let s = 0;
    for (const term of new Set(q)) {
      const f = tf.get(term);
      if (!f) continue;
      const n = index.df.get(term) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * toks.length) / index.avgLen)));
    }
    if (s > 0) scores.push({ i, s });
  }
  scores.sort((a, b) => b.s - a.s);
  return scores
    .slice(0, limit)
    .map(({ i, s }) => ({ ...index.chunks[i]!, score: s, via: 'lexical' as const }));
}

/** Term overlap used by the JD matcher to explain *why* a requirement matched. */
export function overlap(a: string, b: string): string[] {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  return [...ta].filter((t) => tb.has(t));
}
