/**
 * JD matcher: paste a job description, get its requirements classified as Strong / Related / Not demonstrated with
 * proof links. "No evidence = no claim": no percentages, no scores. Pure logic; the worker adds semantic hits.
 */
import type { Chunk, JdRequirement } from './protocol';
import { tokenize } from './knowledge';

export interface SkillRef {
  id: string;
  name: string;
  group: string;
  aliases: string[];
  usedIn: string[];
}

/** Split a JD into requirement lines: bullets, numbered items, or sentences. */
export function splitRequirements(jd: string): string[] {
  const lines = jd
    .split(/\r?\n|•|▪|‣|(?<=[.;])\s+(?=[A-Z])/)
    .map((l) => l.replace(/^[\s\-–—*\d.)]+/, '').trim())
    .filter((l) => l.length >= 12 && /[a-z]/i.test(l));
  // drop obvious boilerplate
  return lines
    .filter((l) => !/^(about us|we are|our team|benefits|salary|equal opportunity)/i.test(l))
    .slice(0, 25);
}

const RELATED_GROUPS: Record<string, string[]> = {
  'ai-ml': [
    'machine learning',
    'ml',
    'ai',
    'llm',
    'genai',
    'generative',
    'nlp',
    'deep learning',
    'pytorch',
    'tensorflow',
    'model',
  ],
  cloud: ['cloud', 'kubernetes', 'k8s', 'devops', 'infrastructure', 'iac', 'serverless', 'containers'],
  'data-observability': [
    'data',
    'observability',
    'monitoring',
    'logging',
    'metrics',
    'analytics',
    'sql',
    'warehouse',
    'etl',
  ],
  'dev-tools': [
    'ci/cd',
    'ci',
    'git',
    'frontend',
    'backend',
    'api',
    'rest',
    'microservices',
    'typescript',
    'javascript',
  ],
  languages: ['programming', 'coding', 'software engineering', 'python', 'java', 'c++'],
};

export function classifyRequirement(req: string, skills: SkillRef[], chunks: Chunk[]): JdRequirement {
  const text = req.toLowerCase();
  const terms = tokenize(req);
  const proof: JdRequirement['proof'] = [];
  const seen = new Set<string>();
  const addProof = (c: Chunk) => {
    if (seen.has(c.id)) return;
    seen.add(c.id);
    proof.push({
      id: c.id,
      ...(c.url ? { url: c.url } : {}),
      label: c.text.length > 90 ? c.text.slice(0, 87) + '…' : c.text,
    });
  };

  // Strong: a named skill (or alias) appears and a chunk evidences it
  let strong = false;
  for (const s of skills) {
    const names = [s.name.replace(/\s*\(.*\)$/, ''), ...s.aliases].map((n) => n.toLowerCase());
    if (
      names.some(
        (n) =>
          n.length > 1 &&
          new RegExp(`(^|[^a-z0-9+#])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9+#]|$)`).test(text),
      )
    ) {
      strong = true;
      const evidence = chunks.filter((c) => names.some((n) => c.text.toLowerCase().includes(n))).slice(0, 2);
      for (const c of evidence) addProof(c);
      if (!evidence.length) {
        const skillChunk = chunks.find((c) => c.id === `skills:${s.group}`);
        if (skillChunk) addProof(skillChunk);
      }
    }
  }
  if (strong && proof.length) return { text: req, terms, verdict: 'strong', proof: proof.slice(0, 3) };

  // Related: a group keyword appears → point at that skill group and the nearest project
  for (const [group, words] of Object.entries(RELATED_GROUPS)) {
    if (
      words.some((w) =>
        new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text),
      )
    ) {
      const skillChunk = chunks.find((c) => c.id === `skills:${group}`);
      if (skillChunk) addProof(skillChunk);
      const project = chunks.find(
        (c) =>
          c.id.startsWith('project:') &&
          c.id.endsWith(':summary') &&
          words.some((w) => c.text.toLowerCase().includes(w)),
      );
      if (project) addProof(project);
      if (proof.length) return { text: req, terms, verdict: 'related', proof: proof.slice(0, 3) };
    }
  }
  return { text: req, terms, verdict: 'not-demonstrated', proof: [] };
}

export function matchJd(jd: string, skills: SkillRef[], chunks: Chunk[]): JdRequirement[] {
  return splitRequirements(jd).map((r) => classifyRequirement(r, skills, chunks));
}
