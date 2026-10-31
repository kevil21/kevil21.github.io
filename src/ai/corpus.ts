import { z } from 'zod';
import { domainSchema, evidenceSchema, idSchema, personaSchema } from '../lib/schema';
import { SEMANTIC } from './models';

export const MAX_JD = 12000;
export const MAX_QUERY = 200;
export const concepts = {
  observability: ['observability', 'monitoring', 'telemetry', 'tracing', 'otel', 'opentelemetry', 'dashboards', 'kibana'],
  governance: ['governance', 'policy', 'policies', 'compliance', 'approval', 'approvals', 'drift', 'remediation', 'audit'],
  intelligence: ['ai', 'ml', 'intelligence', 'agentic', 'agents', 'learning', 'forecasting', 'prediction', 'lstm', 'langgraph'],
  cloud: ['cloud', 'azure', 'aws', 'gcp', 'kubernetes', 'aks', 'deployment', 'infrastructure'],
  data: ['data', 'pipeline', 'pipelines', 'streaming', 'elasticsearch', 'postgres', 'analytics'],
  craft: ['python', 'teaching', 'workshops', 'education', 'guide', 'learning'],
} as const;
export const words = (text: string): string[] => text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+(?:\.[\p{L}\p{N}]+)*(?:[+#]+)?/gu) ?? [];
export const lexicalVector = (text: string): number[] => {
  const tokens = new Set(words(text));
  return Object.values(concepts).map((terms) => terms.filter((term) => tokens.has(term)).length);
};
const refs = z.array(idSchema).max(100);
export const corpusDataSchema = z.strictObject({
  algorithm: z.literal('lexical-synonym-concepts-v1-not-learned'),
  evidence: z.array(evidenceSchema).min(1).max(100),
  projects: z.array(z.strictObject({ id: idSchema, title: z.string().max(240), domain: domainSchema, technologies: z.array(z.string().max(100)).max(40), evidenceIds: refs })).max(40),
  skills: z.array(z.strictObject({ id: idSchema, name: z.string().max(240), evidenceIds: refs })).max(100),
  experience: z.array(z.strictObject({ id: idSchema, title: z.string().max(240), evidenceIds: refs })).max(30),
  decisions: z.array(z.strictObject({ id: idSchema, title: z.string().max(240), evidenceIds: refs })).max(30),
  journeys: z.array(z.strictObject({ persona: personaSchema, projectIds: refs })).max(3),
  vectors: z.array(z.strictObject({ id: idSchema, values: z.array(z.number().int().nonnegative()).length(6) })).max(100),
});
export type Corpus = z.infer<typeof corpusDataSchema>;
export const corpusSchema = z.strictObject({ schemaVersion: z.literal(1), contentHash: z.string().regex(/^[a-f0-9]{64}$/), corpusHash: z.string().regex(/^[a-f0-9]{64}$/), data: corpusDataSchema });
export function canonicalString(value: unknown): string {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, item]) => [k, sort(item)])) : v;
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}
export async function digest(value: unknown): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalString(value))))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function validateCorpus(input: unknown, contentHash: string, corpusHash: string): Promise<Corpus> {
  const envelope = corpusSchema.parse(input);
  if (envelope.contentHash !== contentHash || envelope.corpusHash !== corpusHash || await digest(envelope.data) !== corpusHash) throw new Error('Incompatible corpus');
  const data = envelope.data;
  for (const records of [data.evidence, data.projects, data.skills, data.experience, data.decisions, data.vectors]) if (new Set(records.map((r) => r.id)).size !== records.length) throw new Error('Duplicate corpus IDs');
  const evidenceIds = new Set(data.evidence.map((e) => e.id));
  if (data.vectors.length !== data.evidence.length) throw new Error('Missing vectors');
  for (const group of [data.projects, data.skills, data.experience, data.decisions]) for (const record of group) if (record.evidenceIds.some((id) => !evidenceIds.has(id))) throw new Error('Unknown evidence');
  for (const e of data.evidence) {
    if (e.projectIds.some((id) => !data.projects.some((p) => p.id === id && p.evidenceIds.includes(e.id))) || e.skillIds.some((id) => !data.skills.some((s) => s.id === id && s.evidenceIds.includes(e.id)))) throw new Error('Invalid joins');
    if (JSON.stringify(data.vectors.find((v) => v.id === e.id)?.values) !== JSON.stringify(lexicalVector(`${e.title} ${e.text}`))) throw new Error('Invalid lexical vector');
  }
  return data;
}
export const semanticDataSchema = z.strictObject({
  model: z.literal(SEMANTIC.id), revision: z.literal(SEMANTIC.revision), runtime: z.literal(SEMANTIC.runtime), dtype: z.literal('q8'),
  dimensions: z.literal(384), pooling: z.literal('mean'), normalize: z.literal(true),
  vectors: z.array(z.strictObject({ id: idSchema, values: z.array(z.number().finite()).length(384) })).max(100),
});
export const semanticSchema = z.strictObject({ schemaVersion: z.literal(1), contentHash: z.string(), corpusHash: z.string(), vectorHash: z.string(), data: semanticDataSchema });
export type SemanticIndex = z.infer<typeof semanticSchema>;
export async function validateSemantic(input: unknown, contentHash: string, corpusHash: string, corpus: Corpus): Promise<SemanticIndex> {
  const index = semanticSchema.parse(input);
  if (index.contentHash !== contentHash || index.corpusHash !== corpusHash || await digest(index.data) !== index.vectorHash || index.data.vectors.length !== corpus.evidence.length) throw new Error('Incompatible embeddings');
  if (new Set(index.data.vectors.map((v) => v.id)).size !== corpus.evidence.length) throw new Error('Duplicate embeddings');
  for (const v of index.data.vectors) if (!corpus.evidence.some((e) => e.id === v.id) || Math.abs(Math.hypot(...v.values) - 1) > 0.002) throw new Error('Invalid embedding');
  return index;
}