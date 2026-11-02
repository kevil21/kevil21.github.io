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

/**
 * Split prose into sentences. A citation written after the full stop ("… views. [1]") belongs to the sentence it
 * follows, so the boundary is placed after any trailing [n] groups. No regex lookbehind: Safari before 16.4 cannot
 * even parse it, and this module loads in the Operator island and the Pocket worker.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const boundary = /[.!?]+(?:\s*\[\d{1,2}\])*(?=\s+[A-Z0-9“"(]|\s*$)/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = boundary.exec(text)) !== null) {
    const end = m.index + m[0].length;
    const piece = text.slice(start, end).trim();
    if (piece) out.push(piece);
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Keep only sentences with at least one valid [n] citation (n within 1..maxCite); read a trailing tool line. */
export function ground(prose: string, maxCite: number): GroundedAnswer {
  const lines = prose.trim().split('\n');
  let toolLine: string | null = null;
  const body: string[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (/^\{\s*"tool"\s*:/.test(t) || /^\{\s*"name"\s*:/.test(t)) toolLine = t;
    else if (t) body.push(t);
  }
  const parts = splitSentences(body.join(' '));
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

/** BM25 floor: a single generic match (a name, an org) scores below this; a real topical hit scores above it. */
export const LEXICAL_FLOOR = 2.0;
/** Cosine floor for MiniLM on this corpus (inherited heuristic from the Atlas model ADR). */
export const SEMANTIC_FLOOR = 0.45;

export interface EvidenceHit {
  /** The score used for ranking: BM25 in lexical mode, a reciprocal-rank-fusion score in hybrid mode. */
  score: number;
  lexical?: number;
  semantic?: number;
}

/**
 * Decide whether retrieval found anything worth answering with. Fused RRF scores are tiny (≈ 0.03) and say nothing
 * about strength, so judge the component scores: any hit with a real BM25 score or a real cosine counts. A plain
 * lexical hit (no components) is judged by its own score.
 */
export function hasEvidence(hits: EvidenceHit[]): boolean {
  return hits.some((h) => {
    if (h.lexical === undefined && h.semantic === undefined) return h.score >= LEXICAL_FLOOR;
    return (h.lexical ?? 0) >= LEXICAL_FLOOR || (h.semantic ?? 0) >= SEMANTIC_FLOOR;
  });
}
