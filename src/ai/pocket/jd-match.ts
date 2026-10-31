/**
 * Job-description matcher (plan.md §7). Deterministic and explainable: requirements are extracted
 * from the pasted text, each is retrieved against the evidence chunks, and the result is sorted into
 * Strong evidence / Related / Not demonstrated. No percentages are ever produced. Runs in the worker,
 * so the JD text never leaves the device.
 */
import type { JDBucket, JDMatchResult, JDMatchRow, JDRequirement, RetrievedChunk } from '../protocol';
import { overlap, stem, tokenize } from './lexical';

const MAX_CHARS = 12_000;
const MAX_REQS = 60;

/** JD boilerplate that must never count as evidence of a match ("experience", "strong", "fluent"…). */
const BOILERPLATE_WORDS =
  'operations operation operate operating authoring author chart charts maintain maintaining support supporting manage managing management improve improving ensure ensuring drive driving participate contribute contributing define defining implement implementing write writing code coding experience experiences year years strong solid proven knowledge familiar familiarity fluent fluency ability able skill skills working work hands-on hands proficient proficiency understanding understand excellent good great communication communicate team teams collaborate collaboration stakeholder stakeholders develop development developer developing engineer engineering engineers build building design designing deliver delivery delivering own ownership lead leading leadership mentor mentoring senior junior plus bonus preferred required requirement requirements responsibilities responsibility role candidate ideal must nice have degree bachelor master related field environment fast-paced production production-grade scale large enterprise modern best practices practice tools tooling technologies technology software system systems service services solution solutions';
const BOILERPLATE = new Set(BOILERPLATE_WORDS.split(' ').flatMap((w) => [w, stem(w)]));

export function contentTerms(terms: string[]): string[] {
  return terms.filter((t) => !BOILERPLATE.has(t) && !BOILERPLATE.has(t.replace(/s$/, '')));
}

export function extractRequirements(text: string): JDRequirement[] {
  const clean = text.slice(0, MAX_CHARS).replace(/\r/g, '');
  const lines = clean
    .split(/\n+|(?<=[.;])\s+(?=[A-Z])/)
    .map((l) => l.replace(/^[\s•\-–*▪●◦\d.)(]+/, '').trim())
    .filter((l) => l.length >= 12 && l.length <= 240);
  const seen = new Set<string>();
  const reqs: JDRequirement[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    // drop section headings ("Requirements:", "ABOUT THE ROLE") but keep every other line: an unknown
    // requirement must still appear, as "Not demonstrated"
    const words = line.split(/\s+/).length;
    if ((words <= 4 && /[:]$/.test(line)) || (words <= 5 && line === line.toUpperCase())) continue;
    seen.add(key);
    reqs.push({ id: `r${reqs.length + 1}`, text: line, terms: contentTerms(tokenize(line)) });
    if (reqs.length >= MAX_REQS) break;
  }
  return reqs;
}

export function bucketFor(
  req: JDRequirement,
  evidence: RetrievedChunk[],
  matchedTerms: string[],
  mode: 'lexical' | 'semantic',
): JDBucket {
  // No shared content term with any evidence → not demonstrated, whatever the retrieval score says.
  if (!evidence.length || matchedTerms.length === 0) return 'none';
  const top = evidence[0]!;
  if (mode === 'lexical' && top.score < 1) return 'none';
  const coverage = matchedTerms.length / Math.max(1, req.terms.length);
  // strong needs two shared content terms, or the single content term of a one-term requirement
  const strongTerms = matchedTerms.length >= 2 || (matchedTerms.length === 1 && req.terms.length === 1);
  if (mode === 'semantic') {
    if (top.score >= 0.6 && strongTerms) return 'strong';
    return 'related';
  }
  if (strongTerms && (coverage >= 0.4 || top.score >= 4)) return 'strong';
  return 'related';
}

export function assemble(
  reqs: JDRequirement[],
  retrieve: (q: string) => RetrievedChunk[],
  mode: 'lexical' | 'semantic',
): JDMatchResult {
  const rows: JDMatchRow[] = reqs.map((req) => {
    const evidence = retrieve(req.text).slice(0, 3);
    const matched = Array.from(new Set(evidence.flatMap((e) => overlap(req.text, e.text)))).filter((t) =>
      req.terms.includes(t),
    );
    const bucket = bucketFor(req, evidence, matched, mode);
    return { requirement: req, bucket, evidence: bucket === 'none' ? [] : evidence, matchedTerms: matched };
  });
  const counts: Record<JDBucket, number> = { strong: 0, related: 0, none: 0 };
  for (const r of rows) counts[r.bucket]++;
  return { rows, counts, mode };
}
