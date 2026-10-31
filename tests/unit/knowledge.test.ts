import { describe, expect, it } from 'vitest';
import { portfolio } from '../../src/lib/content.ts';
import { contentHash, createArtifacts, createKnowledgeDocuments, sha256, stableStringify } from '../../src/lib/knowledge.ts';
import { renderResume } from '../../src/lib/resume.ts';

describe('deterministic public derivatives', () => {
  it('generates nine base artifacts with one version and no timestamps', () => {
    const first = createArtifacts(portfolio);
    expect(first).toEqual(createArtifacts(structuredClone(portfolio)));
    expect(Object.keys(first).sort()).toEqual(['ai-manifest.json', 'answer-index.json', 'content-manifest.json', 'evidence-map.json', 'journeys.json', 'knowledge-index.json', 'pocket-corpus.json', 'search-index.json', 'skill-graph.json']);
    for (const file of Object.values(first)) {
      expect(JSON.parse(file)).toMatchObject({ schemaVersion: 1, contentHash: contentHash(portfolio) });
      expect(file).not.toMatch(/timestamp|generatedAt/);
    }
  });

  it('ignores JSON object-key order but changes version when content changes', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
    const changed = structuredClone(portfolio);
    changed.resume.summary += ' Updated.';
    expect(contentHash(changed)).not.toBe(contentHash(portfolio));
  });

  it('hashes every sibling artifact in the manifest', () => {
    const files = createArtifacts(portfolio);
    const manifest = JSON.parse(files['content-manifest.json']!) as { data: { files: { name: string; sha256: string; bytes: number }[] } };
    expect(manifest.data.files).toHaveLength(8);
    for (const item of manifest.data.files) {
      expect(item.sha256).toBe(sha256(files[item.name]!));
      expect(item.bytes).toBe(Buffer.byteLength(files[item.name]!));
    }
  });

  it('normalizes documents and covers every content category', () => {
    const documents = createKnowledgeDocuments(portfolio);
    expect(new Set(documents.map((doc) => doc.id)).size).toBe(documents.length);
    expect(new Set(documents.map((doc) => doc.kind)).size).toBe(11);
    for (const doc of documents) {
      expect(doc.text).not.toMatch(/\s{2,}/);
      for (const id of doc.evidenceIds) expect(portfolio.evidence.some((evidence) => evidence.id === id)).toBe(true);
    }
  });

  it('creates only evidence-supported graph edges, not blanket proficiency claims', () => {
    const files = createArtifacts(portfolio);
    const graph = JSON.parse(files['skill-graph.json']!) as { data: { edges: { projectId: string; skillId: string; evidenceIds: string[] }[] } };
    expect(graph.data.edges.length).toBeGreaterThan(0);
    expect(graph.data.edges.some((edge) => edge.skillId === 'skill-java')).toBe(false);
    for (const edge of graph.data.edges) for (const id of edge.evidenceIds) {
      const evidence = portfolio.evidence.find((item) => item.id === id)!;
      expect(evidence.projectIds).toContain(edge.projectId);
      expect(evidence.skillIds).toContain(edge.skillId);
    }
  });

  it('retains credential caveats in answers and the complete résumé', () => {
    const files = createArtifacts(portfolio);
    const resume = renderResume(portfolio);
    for (const title of ['Experience', 'Projects', 'Skills', 'Certifications', 'Education', 'Achievements', 'Languages']) expect(resume).toContain(`## ${title}`);
    expect(resume).toContain('October 2026');
    expect(resume).toContain('not credential-specific proof');
    expect(files['answer-index.json']).toContain('not credential-specific proof');
    for (const item of portfolio.skills) expect(resume).toContain(item.name);
    expect(resume).not.toMatch(/tel:|phone|Memory\/|\.docx|\d\s*%/i);
    expect(resume).not.toContain('/Users/');
    expect(Object.values(files).join('')).not.toMatch(/tel:|Memory\/|\.docx|authorized_users/i);
    expect(Object.values(files).join('')).not.toContain('/Users/');
  });
});