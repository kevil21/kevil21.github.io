/**
 * The Operator's visible NLP: intent detection and entity extraction over a dictionary built from the content
 * (machines, projects, skills + aliases, orgs, credentials). Pure and deterministic so it is unit-tested and runs in
 * the worker or inline. The semantic step (MiniLM) refines retrieval; it never invents entities.
 */
import type { NlpParse } from './protocol';

export interface Dictionary {
  machines: Array<{ slug: string; names: string[] }>;
  projects: Array<{ id: string; names: string[] }>;
  skills: Array<{ id: string; names: string[] }>;
  orgs: string[];
  credentials: string[];
}

const INTENTS: Array<{ intent: string; patterns: RegExp }> = [
  {
    intent: 'refuse-personal',
    patterns: /\b(salary|compensation|pay|weakness|hobby|hobbies|phone number|age|married|religion|politic)/i,
  },
  { intent: 'contact', patterns: /\b(contact|email|reach|hire|hiring|available|linkedin|github)\b/i },
  { intent: 'tour', patterns: /\b(tour|show me around|walk me|guide me)\b/i },
  { intent: 'secrets', patterns: /\b(secret|easter egg|hidden|night shift|notebook)\b/i },
  { intent: 'match-jd', patterns: /\b(job description|jd|requirements?|match|fit for|qualified)\b/i },
  {
    intent: 'certifications',
    patterns: /\b(certif\w*|credential\w*|aws certified|azure certified|founderz|calibration)\b/i,
  },
  {
    intent: 'education',
    patterns: /\b(education|university|college|vit|vellore|degree|cgpa|school|gdsc)\b/i,
  },
  { intent: 'skills', patterns: /\b(skills?|stack|technolog\w*|tools?|languages?|proficien\w*)\b/i },
  { intent: 'decision', patterns: /\b(why|decision|decided|chose|trade-?off|reason)\b/i },
  { intent: 'how', patterns: /\b(how|architecture|pipeline|works?|built|design)\b/i },
  { intent: 'experience', patterns: /\b(experience|kyndryl|work history|job|role|intern|charly)\b/i },
  {
    intent: 'project',
    patterns:
      /\b(project|a360|p2p|policy|forecast|lstm|elk|overlay|incident|asset|opticrop|energy|climate)\b/i,
  },
  { intent: 'who', patterns: /\b(who|about|introduce|yourself|summary|overview)\b/i },
];

export function detectIntent(query: string): string {
  for (const { intent, patterns } of INTENTS) if (patterns.test(query)) return intent;
  return 'general';
}

function findAll(query: string, names: string[]): string | null {
  const q = query.toLowerCase();
  for (const n of names) {
    const needle = n.toLowerCase();
    if (needle.length < 2) continue;
    const re = new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    if (re.test(q)) return n;
  }
  return null;
}

export function parseQuery(query: string, dict: Dictionary): NlpParse {
  const entities: NlpParse['entities'] = [];
  const skills: string[] = [];
  for (const m of dict.machines) {
    const hit = findAll(query, m.names);
    if (hit) entities.push({ text: hit, kind: 'machine' });
  }
  for (const p of dict.projects) {
    const hit = findAll(query, p.names);
    if (hit) entities.push({ text: hit, kind: 'project' });
  }
  for (const s of dict.skills) {
    const hit = findAll(query, s.names);
    if (hit) {
      entities.push({ text: hit, kind: 'skill' });
      skills.push(s.id);
    }
  }
  const org = findAll(query, dict.orgs);
  if (org) entities.push({ text: org, kind: 'org' });
  const cred = findAll(query, dict.credentials);
  if (cred) entities.push({ text: cred, kind: 'credential' });
  return { intent: detectIntent(query), entities, skills };
}

/** Build the dictionary from the generated knowledge (skill graph + machine/project names). */
export function buildDictionary(input: {
  machines: Array<{ slug: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  skills: Array<{ id: string; name: string; aliases?: string[] }>;
}): Dictionary {
  return {
    machines: input.machines.map((m) => ({ slug: m.slug, names: [m.name, m.slug.replace('-', ' ')] })),
    projects: input.projects.map((p) => ({
      id: p.id,
      names: [
        p.name.split(' — ')[0]!,
        p.id.replace('-', ' '),
        ...(p.id === 'p2p' ? ['Policy → Pipelines', 'policy to pipelines'] : []),
      ],
    })),
    skills: input.skills.map((s) => ({
      id: s.id,
      names: [s.name.replace(/\s*\(.*\)$/, ''), ...(s.aliases ?? [])],
    })),
    orgs: ['Kyndryl', 'Charly Computers', 'GDSC VIT', 'GDSC', 'Vellore Institute of Technology', 'VIT'],
    credentials: [
      'SAA-C03',
      'CLF-C02',
      'AI-102',
      'AZ-104',
      'AZ-900',
      'GH-300',
      'Excellerate',
      'Agent Master',
      'Agent Commander',
      'Agent Explorer',
    ],
  };
}
