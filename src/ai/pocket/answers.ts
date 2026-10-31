import type { AnswerEntry } from '../protocol';
import { tokenize } from './lexical';

/** Match a question to a pre-generated answer by pattern overlap. Returns null when nothing fits well. */
export function matchAnswer(answers: AnswerEntry[], query: string): AnswerEntry | null {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return null;
  const qTokens = new Set(tokenize(q));
  let best: { a: AnswerEntry; s: number } | null = null;
  for (const a of answers) {
    let s = 0;
    for (const p of a.patterns) {
      const pt = tokenize(p);
      if (!pt.length) continue;
      const hit = pt.filter((t) => qTokens.has(t)).length;
      // specificity: more matched tokens beat fewer; a complete pattern match and a literal substring add a bonus
      // single-token patterns only count as literal substrings; multi-token patterns need full coverage
      let score = 0;
      if (pt.length === 1) score = q.includes(p) ? 2.5 : 0;
      else if (hit === pt.length) score = hit + 1 + (q.includes(p) ? 0.5 : 0);
      else if (hit >= 2 && hit / pt.length >= 0.67) score = hit;
      s = Math.max(s, score);
    }
    if (s > 0 && (!best || s > best.s)) best = { a, s };
  }
  return best && best.s >= 2.5 ? best.a : null;
}
