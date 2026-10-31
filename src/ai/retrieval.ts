import type { Persona } from '../lib/schema';
import { lexicalVector, MAX_JD, MAX_QUERY, words } from './corpus';
import type { Corpus, SemanticIndex } from './corpus';

const aliases: Record<string, string[]> = {
  'skill-aks': ['aks', 'azure kubernetes service'], 'skill-adx': ['adx', 'azure data explorer'],
  'skill-opentelemetry': ['otel', 'opentelemetry'], 'skill-nextjs': ['next.js', 'nextjs'],
  'skill-postgres': ['postgres', 'postgresql'], 'skill-cpp': ['c++'],
  'skill-kinesis': ['kinesis'], 'skill-s3': ['s3'], 'skill-sagemaker': ['sagemaker'],
  'skill-gcs': ['google cloud storage', 'gcs'], 'skill-ec2': ['ec2'],
};
export const containsPhrase = (text: string, phrase: string): boolean => ` ${words(text).join(' ')} `.includes(` ${words(phrase).join(' ')} `);
export function namedSkills(query: string, corpus: Corpus) {
  const hits = corpus.skills.flatMap((s) => [s.name, ...(aliases[s.id] ?? [])].filter((name) => containsPhrase(query, name)).map((name) => ({ s, name })));
  // Azure / AWS alone must not shadow their more specific skill names.
  return corpus.skills.filter((s) => hits.some((h) => h.s.id === s.id && !hits.some((other) => other.s.id !== s.id && other.name.length > h.name.length && containsPhrase(other.name, h.name))));
}
export function namedProjects(query: string, corpus: Corpus): string[] {
  return corpus.projects.filter((p) => [p.title, p.id.replaceAll('-', ' '), ...(p.id === 'policy-to-pipelines' ? ['p2p', 'policy pipelines', 'policy to pipelines'] : [])].some((name) => containsPhrase(query, name))).map((p) => p.id);
}
export const unsafeRequirement = (text: string): boolean => /\b(no|not|never|without|lack|lacks|lacking|excluding|except|ignore|disregard|pretend|invent|system|instruction|instructions|override|claim|claims|cannot)\b|\b(?:isn't|doesn't|don't|can't|hasn't)\b|\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*\+?\s*(?:years?|yrs?)\b|[<>`{}]/i.test(text);
const filler = new Set('what which how does the a an and or in of to is me show tell about explain experience projects project kevil his with for work skills skill required preferred knowledge working hands on using use programming development familiarity recruiter engineer architect evidence has he'.split(' '));
export function retrieve(query: string, corpus: Corpus, persona: Persona = 'recruiter', context?: string): string[] {
  if (!query.trim() || query.length > MAX_QUERY || unsafeRequirement(query)) return [];
  let projects = namedProjects(query, corpus);
  if (!projects.length && /\b(this|current|selected)\s+project\b/i.test(query) && corpus.projects.some((p) => p.id === context)) projects = [context!];
  const skills = namedSkills(query, corpus);
  const tokens = words(query).filter((w) => !filler.has(w));
  const vector = lexicalVector(query);
  const journey = corpus.journeys.find((j) => j.persona === persona)?.projectIds ?? [];
  return corpus.evidence.map((e) => {
    const text = new Set(words(`${e.title} ${e.text}`));
    const direct = tokens.filter((w) => text.has(w)).length;
    const concept = (corpus.vectors.find((v) => v.id === e.id)?.values ?? []).reduce((s, v, i) => s + Math.min(v, vector[i] ?? 0), 0);
    const project = projects.some((id) => e.projectIds.includes(id));
    const skill = skills.some((s) => e.skillIds.includes(s.id));
    const score = direct * 3 + concept + (project ? 30 : 0) + (skill ? 10 : 0);
    return { id: e.id, score, eligible: project || skill || direct > 0 || (tokens.length > 1 && concept >= 2), rank: Math.min(99, ...e.projectIds.map((id) => { const n = journey.indexOf(id); return n < 0 ? 99 : n; })) };
  }).filter((r) => r.eligible && r.score >= 3).sort((a, b) => b.score - a.score || a.rank - b.rank || a.id.localeCompare(b.id)).slice(0, 6).map((r) => r.id);
}
export const SEMANTIC_THRESHOLD = 0.45;
export interface SemanticMatch { id: string; score: number }
export function acceptedSemantic(matches: SemanticMatch[], corpus: Corpus): string[] {
  return [...new Set(matches.filter((m) => Number.isFinite(m.score) && m.score >= SEMANTIC_THRESHOLD && m.score <= 1.001 && corpus.evidence.some((e) => e.id === m.id)).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3).map((m) => m.id))];
}
export function rankSemantic(vector: number[], index: SemanticIndex): SemanticMatch[] {
  if (vector.length !== 384 || vector.some((v) => !Number.isFinite(v)) || Math.abs(Math.hypot(...vector) - 1) > 0.002) throw new Error('Invalid query embedding');
  return index.data.vectors.map((e) => ({ id: e.id, score: e.values.reduce((sum, x, i) => sum + x * vector[i]!, 0) })).filter((m) => m.score >= SEMANTIC_THRESHOLD).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3);
}
export interface RequirementResult { requirement: string; level: 'Strong Evidence' | 'Related' | 'Not Demonstrated'; evidenceIds: string[]; reason: string }
/** Conservative clause-level matching. Learned proximity can ONLY add Related evidence. */
export function matchJD(text: string, corpus: Corpus, persona: Persona = 'recruiter'): RequirementResult[] {
  if (text.length > MAX_JD) throw new Error('Job description exceeds 12000 characters');
  return text.split(/\n|;|•|(?<=[.!?])\s+/).flatMap((line) => unsafeRequirement(line) ? [line] : line.split(/\s+and\s+|,\s*/i)).map((s) => s.trim().replace(/^[-*]\s*/, '')).filter(Boolean).slice(0, 60).map((requirement) => {
    if (unsafeRequirement(requirement)) return { requirement, level: 'Not Demonstrated', evidenceIds: [], reason: 'Negated, instruction-like, or duration requirement; no claim inferred.' };
    const skills = namedSkills(requirement, corpus);
    if (skills.length) {
      let remaining = ` ${words(requirement).join(' ')} `;
      const phrases = skills.flatMap((s) => [s.name, ...(aliases[s.id] ?? [])]).map((name) => words(name).join(' ')).sort((a, b) => b.length - a.length);
      for (const phrase of phrases) remaining = remaining.replaceAll(` ${phrase} `, ' ');
      if (words(remaining).some((w) => !filler.has(w))) return { requirement, level: 'Not Demonstrated', evidenceIds: [], reason: 'The complete requirement includes unsupported qualifiers or technologies; no claim inferred.' };
      const supported = skills.map((s) => corpus.evidence.filter((e) => e.skillIds.includes(s.id) && e.projectIds.length > 0));
      const strong = supported.every((records) => records.length > 0);
      const evidenceIds = [...new Set((strong ? supported.flat().map((e) => e.id) : skills.flatMap((s) => s.evidenceIds)))].slice(0, 8);
      return { requirement, level: strong ? 'Strong Evidence' : 'Related', evidenceIds, reason: strong ? 'Explicit named skill with canonical project evidence; not a proficiency or duration claim.' : 'Source-listed skill only; project use is not established.' };
    }
    if (/\b(rust|kubernetes)\b/i.test(requirement)) return { requirement, level: 'Not Demonstrated', evidenceIds: [], reason: 'No explicit named skill evidence for this requirement.' };
    const ids = retrieve(requirement, corpus, persona);
    return { requirement, level: ids.length ? 'Related' : 'Not Demonstrated', evidenceIds: ids.slice(0, 3), reason: ids.length ? 'Lexical concept relation only; no skill claim.' : 'No evidence in the public corpus.' };
  });
}
/** Even with learned similarity, an unknown atomic skill and any negation remain unclaimed. */
export function semanticJDAllowed(row: RequirementResult, corpus: Corpus): boolean {
  return row.level !== 'Strong Evidence' && !unsafeRequirement(row.requirement) && namedSkills(row.requirement, corpus).length === 0 && words(row.requirement).filter((w) => !filler.has(w)).length >= 3;
}
export function enhanceJD(rows: RequirementResult[], matches: SemanticMatch[][], corpus: Corpus): RequirementResult[] {
  return rows.map((row, i) => {
    const ids = semanticJDAllowed(row, corpus) ? acceptedSemantic(matches[i] ?? [], corpus) : [];
    return ids.length ? { ...row, level: 'Related', evidenceIds: ids, reason: 'Learned semantic similarity only; the requirement is not demonstrated.' } : row;
  });
}