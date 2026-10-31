import { createHash } from 'node:crypto';
import { SCHEMA_VERSION, portfolioSchema } from './schema.ts';
import type { Portfolio } from './schema.ts';
import { corpusDataSchema, lexicalVector } from '../ai/corpus.ts';
import type { SemanticIndex } from '../ai/corpus.ts';
import { FULL, SEMANTIC } from '../ai/models.ts';

export interface KnowledgeDocument {
  id: string;
  kind: 'profile' | 'project' | 'experience' | 'skill' | 'certification' | 'education' | 'achievement' | 'evidence' | 'journey' | 'decision' | 'resume';
  title: string;
  text: string;
  evidenceIds: string[];
}

export interface Artifact<T> { schemaVersion: number; contentHash: string; data: T }
export const normalizeText = (value: string): string => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
const sortedUnique = (values: string[]): string[] => [...new Set(values)].sort();

/** Object order is irrelevant; array order remains intentional editorial order. */
export function stableStringify(value: unknown): string {
  const sortKeys = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sortKeys);
    if (input !== null && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, sortKeys(item)]));
    }
    return input;
  };
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

export const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
export const contentHash = (data: Portfolio): string => sha256(stableStringify(portfolioSchema.parse(data)));

/** Build-only module: keep node:crypto and the corpus out of browser entry points. */
export function createKnowledgeDocuments(data: Portfolio): KnowledgeDocument[] {
  const documents: KnowledgeDocument[] = [];
  const add = (id: string, kind: KnowledgeDocument['kind'], title: string, parts: string[], evidenceIds: string[] = []) => {
    documents.push({ id, kind, title, text: normalizeText(parts.join(' ')), evidenceIds: sortedUnique(evidenceIds) });
  };
  add(data.profile.id, 'profile', data.profile.name, [data.profile.role, data.profile.location, data.profile.summary, data.profile.email, ...data.profile.languages, ...data.profile.links.map((link) => `${link.label}: ${link.url}`)]);
  for (const item of data.projects) add(item.id, 'project', item.title, [item.subtitle, item.domain, item.summary, ...item.technologies, ...Object.values(item.perspectives), ...(item.url ? [item.url] : [])], item.evidenceIds);
  for (const item of data.experience) add(item.id, 'experience', item.title, [item.organization, item.period, item.summary], item.evidenceIds);
  for (const item of data.skills) add(item.id, 'skill', item.name, [item.category, item.name], item.evidenceIds);
  for (const item of data.certifications) add(item.id, 'certification', item.title, [item.issuer, item.credentialId ?? '', item.url, item.verificationNote], item.evidenceIds);
  for (const item of data.education) add(item.id, 'education', item.title, [item.institution, item.period, item.detail], item.evidenceIds);
  for (const item of data.achievements) add(item.id, 'achievement', item.title, [item.summary], item.evidenceIds);
  for (const item of data.evidence) add(item.id, 'evidence', item.title, [item.text, item.source, item.sourceSection], [item.id]);
  for (const item of data.journeys) add(item.id, 'journey', item.title, [item.description, item.persona], data.projects.filter((project) => item.projectIds.includes(project.id)).flatMap((project) => project.evidenceIds));
  for (const item of data.decisions) add(item.id, 'decision', item.title, [item.summary], item.evidenceIds);
  add('resume', 'resume', data.resume.title, [data.resume.summary]);
  return documents.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function createCorpus(input: Portfolio) {
  const data = portfolioSchema.parse(input);
  const corpus = corpusDataSchema.parse({
    algorithm: 'lexical-synonym-concepts-v1-not-learned', evidence: data.evidence,
    projects: data.projects.map(({ id, title, domain, technologies, evidenceIds }) => ({ id, title, domain, technologies, evidenceIds })),
    skills: data.skills.map(({ id, name, evidenceIds }) => ({ id, name, evidenceIds })),
    experience: data.experience.map(({ id, title, evidenceIds }) => ({ id, title, evidenceIds })),
    decisions: data.decisions.map(({ id, title, evidenceIds }) => ({ id, title, evidenceIds })),
    journeys: data.journeys.map(({ persona, projectIds }) => ({ persona, projectIds })),
    vectors: data.evidence.map((e) => ({ id: e.id, values: lexicalVector(`${e.title} ${e.text}`) })),
  });
  return { schemaVersion: 1 as const, contentHash: contentHash(data), corpusHash: sha256(stableStringify(corpus)), data: corpus };
}

export function createArtifacts(input: Portfolio, semantic?: SemanticIndex) {
  const data = portfolioSchema.parse(input);
  const hash = contentHash(data);
  const wrap = <T>(value: T): Artifact<T> => ({ schemaVersion: SCHEMA_VERSION, contentHash: hash, data: value });
  const documents = createKnowledgeDocuments(data);
  const evidenceMap = Object.fromEntries(data.evidence.map((evidence) => [evidence.id, {
    ...evidence,
    provenance: 'source-provided' as const,
    referencedBy: documents.filter((doc) => doc.kind !== 'evidence' && doc.evidenceIds.includes(evidence.id)).map((doc) => doc.id),
  }]));
  // Only an evidence object containing BOTH IDs creates an edge. Co-occurrence in a skills list does not.
  const edges = data.projects.flatMap((project) => data.skills.flatMap((skill) => {
    const evidenceIds = data.evidence.filter((item) => item.projectIds.includes(project.id) && item.skillIds.includes(skill.id)).map((item) => item.id);
    return evidenceIds.length ? [{ projectId: project.id, skillId: skill.id, evidenceIds: sortedUnique(evidenceIds) }] : [];
  }));
  const answers = documents.filter((doc) => !['evidence', 'profile', 'resume'].includes(doc.kind) && doc.evidenceIds.length > 0).map((doc) => ({
    id: `answer-${doc.id}`, documentId: doc.id, question: `What does the public source say about ${doc.title}?`,
    answer: doc.text, evidenceIds: doc.evidenceIds, mode: 'source-derived' as const,
  }));
  const artifacts = {
    'knowledge-index.json': wrap({ documents }),
    'answer-index.json': wrap({ answers, fallback: 'Not evidenced in the public portfolio sources.' }),
    'skill-graph.json': wrap({ projects: data.projects.map(({ id, title, domain }) => ({ id, title, domain })), skills: data.skills.map(({ id, name, category }) => ({ id, name, category })), edges }),
    'evidence-map.json': wrap({ evidence: evidenceMap }),
    'journeys.json': wrap({ journeys: data.journeys }),
    'search-index.json': wrap({ documents: documents.map((doc) => ({ ...doc, terms: sortedUnique(normalizeText(`${doc.title} ${doc.text}`).toLowerCase().match(/[\p{L}\p{N}+#.-]+/gu) ?? []) })) }),
    'pocket-corpus.json': createCorpus(data),
    ...(semantic ? { 'semantic-index.json': semantic } : {}),
    'ai-manifest.json': wrap({
      retrieval: 'worker-lexical-concepts-with-optional-learned-embeddings', runtimeSearchImplemented: true,
      generation: 'opt-in-local-evidence-id-selection-only', pocket: 'implemented', full: 'implemented-conditional-WebGPU',
      jobDescription: 'local-conservative-evidence-matching', serviceWorker: false,
      models: [SEMANTIC, FULL], requiresBackend: false, requiresCredentials: false,
      automaticModelDownload: false, queryPersistence: false,
      corpus: 'pocket-corpus.json', semantic: 'semantic-index.json',
      knowledge: 'knowledge-index.json', answers: 'answer-index.json', evidence: 'evidence-map.json',
      citationPolicy: 'Source-provided excerpts, not independent verification. Do not infer credential validity or personal tradeoff decisions.',
    }),
  };
  const files: Record<string, string> = Object.fromEntries(Object.entries(artifacts).map(([name, artifact]) => [name, stableStringify(artifact)]));
  // A manifest cannot hash itself. All seven sibling artifacts are covered; version covers canonical content.
  files['content-manifest.json'] = stableStringify(wrap({
    files: Object.entries(files).sort(([a], [b]) => a < b ? -1 : 1).map(([name, bytes]) => ({ name, sha256: sha256(bytes), bytes: Buffer.byteLength(bytes) })),
    documentCount: documents.length,
    sourceLabels: sortedUnique(data.evidence.map((item) => item.source)),
    selfHash: 'excluded-to-avoid-recursion',
  }));
  return files;
}