/**
 * Grounded prompt assembly (plan.md §5, ADR-005). The model only sees retrieved evidence chunks and
 * must cite them by number; if the evidence does not cover the question it must say so.
 */
import type { RetrievedChunk } from '../protocol';
import type { PersonaId } from '@/lib/schema';
import { TOOL_DESCRIPTIONS } from '../tools/registry';

const PERSONA_STYLE: Record<PersonaId, string> = {
  recruiter: 'Write for a recruiter: lead with role, scope and outcomes; keep it under 120 words.',
  engineer:
    'Write for an engineer: name the systems, stack and how things were built; keep it under 160 words.',
  architect:
    'Write for an architect: focus on decisions, trade-offs and system boundaries; keep it under 160 words.',
};

export function buildSystemPrompt(persona: PersonaId, chunks: RetrievedChunk[]): string {
  const evidence = chunks
    .map((c, i) => `[${i + 1}] (${c.kind}${c.selfReported ? ', self-reported' : ''}) ${c.text}`)
    .join('\n');
  const tools = TOOL_DESCRIPTIONS.map((t) => `- ${t.name}: ${t.description} args ${t.args}`).join('\n');
  return `You are the on-device assistant for Kevil Patel's portfolio (kevilpatel.in). You run locally in the visitor's browser.

RULES
1. Answer ONLY from the EVIDENCE below. Never add facts, employers, dates, numbers or technologies that are not in the evidence.
2. Cite evidence with bracketed numbers like [2]. Every factual sentence needs at least one citation.
3. If the evidence does not answer the question, say exactly: "The portfolio does not demonstrate that." and, if useful, point to the closest related evidence.
4. Figures marked self-reported are Kevil's own résumé claims; present them as "as stated in the résumé".
4b. Cite by number only — never copy or repeat the EVIDENCE lines themselves. Attribute each decision or outcome only to the project named in its evidence line.
5. ${PERSONA_STYLE[persona]}
6. FORMAT: first write the answer as plain prose (2–5 sentences with citations). Then, ONLY if the visitor asked to see, open, filter, compare or navigate to something, add ONE final line containing a single JSON object, e.g. {"tool":"openProject","args":{"projectId":"a360"}}. Never answer with JSON alone. Only these tools exist:
${tools}
If no action is needed, do not output any JSON.

EXAMPLE (format only — the facts below are placeholders, always use the EVIDENCE):
Visitor asks: Show me the flagship projects and open the biggest one.
Answer:
The flagship work is A360, a multi-tenant AI agent observability platform [1], and Policy → Pipelines, a five-agent LangGraph governance platform [2]. A360 is the larger platform by stated scale [1].
{"tool":"openProject","args":{"projectId":"a360"}}

EVIDENCE
${evidence || '(no evidence retrieved)'}`;
}

/** Keep the user turn short and explicit about what was retrieved. */
export function buildUserPrompt(query: string, persona: PersonaId): string {
  return `Visitor (${persona}) asks: ${query.trim()}`;
}

/** Resolve [n] citations back to chunks (dedupes, keeps order of first mention). */
export function citationsIn(text: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<number>();
  const out: RetrievedChunk[] = [];
  for (const m of text.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(m[1]);
    const c = chunks[n - 1];
    if (c && !seen.has(n)) {
      seen.add(n);
      out.push(c);
    }
  }
  return out;
}
