/**
 * Build Brain — runs in CI and locally. Validates content, derives the graph/trace/signal/chunks,
 * writes versioned JSON into public/generated/. Embeddings and pre-generated answers are produced by
 * the sibling modules so a failure there never blocks the deterministic outputs.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContentFromDisk } from './lib/load-content';
import { validateKnowledge } from '../src/lib/knowledge/validate';
import { buildGraph } from '../src/lib/knowledge/graph';
import { buildTrace } from '../src/lib/knowledge/spans';
import { buildSignalSeries } from '../src/lib/knowledge/signal';
import { buildChunks } from '../src/lib/knowledge/chunks';
import { buildAnswers } from './lib/answers';
import { buildSemanticIndex, EMBEDDER } from './lib/embed';
import { FULL_MODELS } from '../src/ai/full/models';
import { TOOL_NAMES } from '../src/ai/tools/registry';
import type { AIManifest, KnowledgeIndex } from '../src/ai/protocol';

const OUT = new URL('../public/generated/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const started = Date.now();
const data = loadContentFromDisk();
const problems = validateKnowledge(data);
if (problems.length) {
  console.error('✗ content validation failed:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

const graph = buildGraph(data);
const trace = buildTrace(data);
const signal = buildSignalSeries(trace);
const chunks = buildChunks(data);

const attrsOf = (id: string) =>
  (graph.out.get(id) ?? [])
    .filter((e) => e.type === 'uses-skill' || e.type === 'uses-tech' || e.type === 'validates')
    .map((e) => e.to);

const nodes = [...graph.nodes.values()].map((n) => ({ ...n, attrs: attrsOf(n.id) }));
const contentHash = createHash('sha256')
  .update(JSON.stringify({ nodes, edges: graph.edges, chunks }))
  .digest('hex')
  .slice(0, 12);
const version = `${process.env.npm_package_version ?? '0.0.0'}+${contentHash}`;
const generatedAt = new Date().toISOString();

const knowledgeIndex: KnowledgeIndex = { version, generatedAt, nodes, edges: graph.edges, chunks };
write('knowledge-index.json', knowledgeIndex);
write('skill-graph.json', {
  version,
  skills: data.skills.map((s) => ({
    ...s,
    technologies: data.technologies.filter((t) => t.skill === s.id && t.id !== s.id).map((t) => t.id),
    projects: data.projects.filter((p) => p.skills.includes(s.id) || p.stack.includes(s.id)).map((p) => p.id),
    experience: data.experience
      .filter((x) => x.skills.includes(s.id) || x.technologies.includes(s.id))
      .map((x) => x.id),
    certifications: data.certifications.filter((c) => c.skills.includes(s.id)).map((c) => c.id),
  })),
});
write('evidence-map.json', {
  version,
  evidence: data.evidence,
  claims: chunks
    .filter((c) => c.kind === 'outcome' || c.kind === 'highlight')
    .map((c) => ({
      id: c.id,
      nodeId: c.nodeId,
      text: c.text,
      source: c.source,
      selfReported: c.selfReported ?? true,
    })),
});
write('trace.json', {
  version,
  axis: trace.axis,
  rows: trace.rows.map(({ children: _children, ...row }) => row),
  credentials: trace.credentials,
});
write('signal-series.json', { version, ...signal });
write('answer-index.json', { version, answers: buildAnswers(data, chunks) });
write('personas.json', { version, journeys: data.journeys });

let semantic: Awaited<ReturnType<typeof buildSemanticIndex>> | null = null;
if (process.env.SKIP_EMBED === '1') {
  console.info('· embeddings skipped (SKIP_EMBED=1)');
} else {
  try {
    semantic = await buildSemanticIndex(chunks, version);
    write('semantic-index.json', semantic);
  } catch (err) {
    console.warn('! semantic index not built:', err instanceof Error ? err.message : err);
    console.warn('  The site still works: lexical search is the deterministic fallback.');
  }
}

const manifest: AIManifest = {
  version,
  indexHash: contentHash,
  generatedAt,
  pocket: {
    embedder: EMBEDDER.id,
    revision: EMBEDDER.revision,
    dtype: EMBEDDER.dtype,
    dims: EMBEDDER.dims,
    approxDownloadMB: EMBEDDER.approxDownloadMB,
  },
  full: { models: FULL_MODELS },
  tools: [...TOOL_NAMES],
};
write('ai-manifest.json', { ...manifest, semanticAvailable: Boolean(semantic) });

console.info(
  `✓ Build Brain ${version}: ${nodes.length} nodes, ${graph.edges.length} edges, ${chunks.length} chunks, ${trace.rows.length} trace rows, ${signal.activity.length} signal months${semantic ? `, ${semantic.ids.length}×${semantic.dims} embeddings` : ''} in ${Date.now() - started} ms`,
);

function write(name: string, value: unknown) {
  writeFileSync(join(OUT, name), JSON.stringify(value));
}
