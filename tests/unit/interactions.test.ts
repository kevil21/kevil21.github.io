import { describe, expect, it } from 'vitest';
import { portfolio } from '../../src/lib/content';
import { createArtifacts, createKnowledgeDocuments } from '../../src/lib/knowledge';
import { documentHref } from '../../src/lib/routes';
import { skillsFor, jsonForHtml } from '../../src/lib/presentation';
import { parseRequest } from '../../src/scripts/contracts';
import { searchDocuments, validateIndex, verifySearchIndex } from '../../src/scripts/search';
import { digest } from '../../src/ai/corpus';
const ids = portfolio.projects.map((project) => project.id);
const envelope = JSON.parse(createArtifacts(portfolio)['search-index.json']!) as { contentHash: string };
const documents = validateIndex(envelope, envelope.contentHash);

describe('deterministic browser search', () => {
  it('rejects partial or injected documents despite an unchanged content hash', async () => {
    const hash = await digest(envelope);
    expect(await verifySearchIndex(envelope, envelope.contentHash, hash)).toEqual(documents);
    for (const changed of [[], documents.slice(1), [{ ...documents[0], title: 'Injected claim' }, ...documents.slice(1)]]) {
      await expect(verifySearchIndex({ ...envelope, data: { documents: changed } }, envelope.contentHash, hash)).rejects.toThrow('integrity');
    }
    await expect(verifySearchIndex(envelope, envelope.contentHash, '')).rejects.toThrow();
  });
  it('finds Azure and AI from the canonical corpus without substring false positives', () => {
    expect(searchDocuments(documents, 'AZURE')).toEqual(searchDocuments(documents, 'azure'));
    expect(searchDocuments(documents, 'azure').some((doc) => doc.id === 'a360')).toBe(true);
    expect(searchDocuments(documents, 'AI').some((doc) => doc.id === 'skill-agentic-ai')).toBe(true);
    expect(searchDocuments(documents, 'AI').some((doc) => doc.id === 'skill-git')).toBe(false);
  });
  it('requires all words and has deterministic tie ordering', () => {
    const matches = searchDocuments(documents, 'azure telemetry');
    expect(matches.some((doc) => doc.id === 'a360')).toBe(true);
    expect(matches.every((doc) => doc.terms.includes('azure') && doc.terms.includes('telemetry'))).toBe(true);
    expect(matches).toEqual(searchDocuments([...documents].reverse(), 'azure telemetry'));
  });
  it('returns no invented answer for empty or unknown input', () => {
    for (const query of ['', '    ', '!!!', '<script>alert("not-evidenced")</script>', 'zzzzzzzz']) expect(searchDocuments(documents, query)).toEqual([]);
  });
  it('rejects mismatched versions, malformed entries and unsafe IDs', () => {
    expect(() => validateIndex(envelope, 'stale')).toThrow();
    for (const input of [null, { ...envelope, schemaVersion: 2 }, { ...envelope, data: { documents: [null] } }, { ...envelope, data: { documents: [{ ...documents[0], id: '../../evil' }] } }]) expect(() => validateIndex(input, envelope.contentHash)).toThrow();
  });
});
describe('public routes and evidence', () => {
  it('maps every content kind to a static destination, not an arbitrary URL', () => {
    for (const doc of createKnowledgeDocuments(portfolio)) expect(documentHref(doc.kind, doc.id)).toMatch(/^\/(?:projects|evidence|experience|credentials|architecture|resume|#)/);
    expect(documentHref('unknown', 'javascript:alert(1)')).toBe('/search/');
  });
  it('includes only explicitly evidenced skill-project pairs', () => {
    for (const project of portfolio.projects) for (const skill of skillsFor(project)) expect(portfolio.evidence.some((evidence) => evidence.projectIds.includes(project.id) && evidence.skillIds.includes(skill.id))).toBe(true);
  });
  it('escapes inline JSON without mutating canonical text', () => {
    const object = { value: '</script><script>test</script>\u2028' };
    expect(jsonForHtml(object)).not.toContain('<');
    expect(JSON.parse(jsonForHtml(object))).toEqual(object);
  });
});
describe('state-only integration boundary', () => {
  it('accepts known typed actions', () => {
    for (const action of [{ type: 'set-persona', persona: 'architect' }, { type: 'filter-domain', domain: 'craft' }, { type: 'set-view', view: 'list' }, { type: 'select-project', projectId: 'a360' }, { type: 'compare-projects', left: 'a360', right: 'opticrop' }]) expect(parseRequest(action, ids)).toEqual(action);
  });
  it('rejects unknown, excessive or executable arguments and duplicate comparison IDs', () => {
    for (const action of [null, [], 'code', { type: 'eval', code: 'alert(1)' }, { type: 'set-persona', persona: 'admin' }, { type: 'filter-domain', domain: 'private' }, { type: 'set-view', view: '3d' }, { type: 'select-project', projectId: 'unknown' }, { type: 'select-project', projectId: 'a360', url: 'https://example.com' }, { type: 'compare-projects', left: 'a360', right: 'a360' }]) expect(parseRequest(action, ids)).toBeNull();
  });
});