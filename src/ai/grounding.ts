/**
 * Grounding: every sentence the Operator shows must cite a retrieved chunk. Pure functions with published formulas
 * (see ai-manifest.json): groundedness = cited sentences ÷ sentences; coverage = retrieved chunks that were cited ÷
 * retrieved; refusals are counted by the console.
 */
export interface GroundedAnswer {
  sentences: Array<{ text: string; cites: number[] }>;
  dropped: string[];
  groundedness: number;
  coverage: number;
  toolLine: string | null;
}

const CITE = /\[(\d{1,2})\]/g;

/** Split prose into sentences, keep only those with at least one valid [n] citation (n within 1..max). */
export function ground(prose: string, maxCite: number): GroundedAnswer {
  const lines = prose.trim().split('\n');
  let toolLine: string | null = null;
  const body: string[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (/^\{\s*"tool"\s*:/.test(t) || /^\{\s*"name"\s*:/.test(t)) toolLine = t;
    else if (t) body.push(t);
  }
  const text = body.join(' ');
  const parts = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentences: GroundedAnswer['sentences'] = [];
  const dropped: string[] = [];
  const cited = new Set<number>();
  for (const s of parts) {
    const cites = [...s.matchAll(CITE)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= maxCite);
    if (cites.length) {
      sentences.push({ text: s, cites });
      cites.forEach((c) => cited.add(c));
    } else dropped.push(s);
  }
  const total = sentences.length + dropped.length;
  return {
    sentences,
    dropped,
    groundedness: total ? sentences.length / total : 0,
    coverage: maxCite ? cited.size / maxCite : 0,
    toolLine,
  };
}

export const REFUSAL = 'The lab has no evidence for that.';

/**
 * Decide whether retrieval found anything worth answering with. BM25 scores are unbounded; a single generic match
 * (a name, an org) must not count as evidence, so the top hit needs a real score.
 */
export function hasEvidence(hits: Array<{ score: number }>, floor = 2.0): boolean {
  return hits.length > 0 && hits[0]!.score >= floor;
}
