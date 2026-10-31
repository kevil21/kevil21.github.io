import { z } from 'zod';
import { domainSchema, personaSchema } from '../../lib/schema';
import type { Corpus } from '../corpus';
import { containsPhrase, namedProjects, namedSkills, unsafeRequirement } from '../retrieval';

export const criteriaSchema = z.enum(['all', 'observability', 'governance', 'intelligence', 'craft', 'azure', 'ai', 'python', 'cloud', 'data']);
export const sections = { atlas: '/', projects: '/#projects-heading', experience: '/experience/', skills: '/evidence/#skills', evidence: '/evidence/', credentials: '/credentials/', architecture: '/architecture/', 'job-description': '/architecture/#job-description', observatory: '/architecture/#observatory', contact: '/experience/#contact' } as const;
export function toolSchema(corpus: Corpus) {
  const allowed = (ids: string[]) => z.string().max(80).refine((id) => ids.includes(id), 'Unknown canonical ID');
  const project = allowed(corpus.projects.map((p) => p.id));
  return z.discriminatedUnion('name', [
    z.strictObject({ name: z.literal('navigateTo'), section: z.enum(Object.keys(sections) as [keyof typeof sections, ...(keyof typeof sections)[]]) }),
    z.strictObject({ name: z.literal('openProject'), projectId: project }),
    z.strictObject({ name: z.literal('filterProjects'), criteria: criteriaSchema }),
    z.strictObject({ name: z.literal('highlightSkill'), skillId: allowed(corpus.skills.map((s) => s.id)) }),
    z.strictObject({ name: z.literal('openResume') }),
    z.strictObject({ name: z.literal('switchPersona'), persona: personaSchema }),
    z.strictObject({ name: z.literal('showEvidence'), evidenceId: allowed(corpus.evidence.map((e) => e.id)) }),
    z.strictObject({ name: z.literal('showRelevantExperience'), criteria: criteriaSchema }),
    z.strictObject({ name: z.literal('compareProjects'), projectIds: z.array(project).length(2).refine((ids) => ids[0] !== ids[1]) }),
    z.strictObject({ name: z.literal('openArchitectureNode'), nodeId: allowed([...corpus.decisions.map((d) => d.id), 'build-brain', 'distribution', 'dns-resolution', 'pocket-runtime', 'full-runtime']) }),
    z.strictObject({ name: z.literal('resetWorkspace') }),
  ]);
}
export type Tool = z.infer<ReturnType<typeof toolSchema>>;
export function parseTool(value: unknown, corpus: Corpus): Tool | null { const result = toolSchema(corpus).safeParse(value); return result.success ? result.data : null; }
export function parseCommand(query: string, corpus: Corpus): Tool | null {
  if (query.length > 200 || unsafeRequirement(query)) return null;
  const q = query.trim().toLowerCase().replace(/^please\s+/, '').replace(/[?.!]$/, '');
  const projects = namedProjects(q, corpus);
  if (/^(?:please\s+)?compare\b/.test(q)) return parseTool({ name: 'compareProjects', projectIds: projects.length === 2 ? projects : projects.length === 0 ? ['a360', 'policy-to-pipelines'] : [] }, corpus);
  if (/^(reset|clear)(?: the)? workspace$/.test(q)) return { name: 'resetWorkspace' };
  if (/^(?:match|review|analyze|analyse)(?: this| the| my)? (?:job description|jd)$/.test(q)) return { name: 'navigateTo', section: 'job-description' };
  if (/^(?:explain|show)(?: this| the)? (?:site's|website's|site|website) architecture$/.test(q)) return { name: 'navigateTo', section: 'architecture' };
  if (/^show evidence for (?:this|the) skill$/.test(q)) return { name: 'navigateTo', section: 'skills' };
  if (/\b(resume|résumé|cv)\b/.test(q) && /^(open|show|download|view|go)/.test(q)) return { name: 'openResume' };
  if (/^(switch|use|change|set|view as|i am)/.test(q)) for (const persona of personaSchema.options) if (containsPhrase(q, persona)) return { name: 'switchPersona', persona };
  if (/^(show|find|filter|focus)/.test(q) && /\bexperience\b/.test(q)) for (const criteria of criteriaSchema.options) if (containsPhrase(q, criteria)) return { name: 'showRelevantExperience', criteria };
  if (/^(open|go to|navigate to|take me to|show|view)/.test(q)) {
    const explicit = q.split(/\s+/);
    const node = corpus.decisions.find((d) => explicit.includes(d.id));
    if (node) return { name: 'openArchitectureNode', nodeId: node.id };
    const evidence = corpus.evidence.find((e) => explicit.includes(e.id));
    if (evidence) return { name: 'showEvidence', evidenceId: evidence.id };
    if (projects.length === 1) return { name: 'openProject', projectId: projects[0]! };
    if (/\b(jd|job description)\b/.test(q)) return { name: 'navigateTo', section: 'job-description' };
    const skills = namedSkills(q, corpus);
    if (/\b(skill|evidence)\b/.test(q) && skills.length === 1) return { name: 'highlightSkill', skillId: skills[0]!.id };
    for (const section of Object.keys(sections) as (keyof typeof sections)[]) if (containsPhrase(q, section.replaceAll('-', ' ')) && !/\bprojects\b/.test(q)) return { name: 'navigateTo', section };
  }
  if (/^(show|find|filter|focus)/.test(q)) for (const criteria of criteriaSchema.options) if (containsPhrase(q, criteria)) return { name: /\bexperience\b/.test(q) ? 'showRelevantExperience' : 'filterProjects', criteria };
  return null;
}
export function projectFilter(criteria: z.infer<typeof criteriaSchema>, corpus: Corpus): string[] {
  return corpus.projects.filter((p) => criteria === 'all' || (domainSchema.safeParse(criteria).success ? p.domain === criteria : criteria === 'ai' ? ['intelligence', 'governance'].includes(p.domain) || p.id === 'a360' : criteria === 'data' ? p.domain === 'observability' : containsPhrase(p.technologies.join(' '), criteria) || (criteria === 'cloud' && /azure|aws|gcp|vertex/i.test(p.technologies.join(' '))))).map((p) => p.id);
}