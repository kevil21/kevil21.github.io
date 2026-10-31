import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../../scripts/lib/load-content';
import { buildChunks } from '@/lib/knowledge/chunks';
import { bm25, buildLexicalIndex, overlap, stem, tokenize } from '@/ai/pocket/lexical';
import { assemble, bucketFor, extractRequirements } from '@/ai/pocket/jd-match';
import { matchAnswer } from '@/ai/pocket/answers';
import { buildAnswers } from '../../scripts/lib/answers';
import { fuse } from '@/ai/pocket/semantic';

const data = loadContentFromDisk();
const chunks = buildChunks(data);
const index = buildLexicalIndex(chunks);
const answers = buildAnswers(data, chunks);

describe('lexical search', () => {
  it('tokenises and stems', () => {
    expect(stem('dashboards')).toBe('dashboard');
    expect(stem('forecasting')).toBe('forecast');
    expect(tokenize('Azure Data Explorer → Elasticsearch')).toEqual([
      'azure',
      'data',
      'explor',
      'elasticsearch',
    ]);
  });
  it('ranks the A360 chunks first for an observability pipeline query', () => {
    const hits = bm25(index, 'multi-tenant observability pipeline Elasticsearch', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.nodeId).toBe('a360');
  });
  it('finds certifications by code', () => {
    const hits = bm25(index, 'AZ-104 administrator', 3);
    expect(hits[0]!.nodeId).toBe('ms-az-104');
  });
  it('returns nothing for an unrelated query', () => {
    expect(bm25(index, 'quantum violin orchestra', 5)).toEqual([]);
  });
  it('fuses lists with reciprocal rank', () => {
    const a = bm25(index, 'LangGraph', 3);
    const b = bm25(index, 'policy governance', 3);
    const fused = fuse([a, b], 4);
    expect(fused.length).toBeLessThanOrEqual(4);
    expect([
      'policy-to-pipelines',
      'p2p-langgraph-state-machine',
      'p2p-risk-guardrails',
      'p2p-mock-mode',
      'p2p-human-in-the-loop',
    ]).toContain(fused[0]!.nodeId);
  });
});

describe('pre-generated answers', () => {
  it('matches common recruiter questions', () => {
    expect(matchAnswer(answers, "Show me Kevil's strongest cloud and AI projects")?.id).toBe(
      'strongest-projects',
    );
    expect(matchAnswer(answers, 'Is Kevil certified on Azure?')?.id).toBe('cloud-certs');
    expect(matchAnswer(answers, 'where did he study')?.id).toBe('education');
  });
  it('does not force an answer for unknown topics', () => {
    expect(matchAnswer(answers, 'favourite pizza topping')).toBeNull();
  });
  it('never invents: every answer cites existing chunks and templated text only', () => {
    const ids = new Set(chunks.map((c) => c.id));
    for (const a of answers) for (const e of a.evidence) expect(ids.has(e)).toBe(true);
  });
});

describe('JD matcher', () => {
  const jd = `Senior Platform Engineer
• 3+ years building backend services in Python or TypeScript
• Experience with OpenTelemetry, Elasticsearch and Kibana dashboards
• Kubernetes operations and Helm chart authoring
• Fluent in Rust and embedded firmware development
• Strong communication skills`;
  it('extracts requirement lines and caps input', () => {
    const reqs = extractRequirements(jd);
    expect(reqs.length).toBeGreaterThanOrEqual(4);
    expect(extractRequirements('x'.repeat(20000)).length).toBe(0);
  });
  it('sorts into strong / related / none with evidence and no percentages', () => {
    const result = assemble(extractRequirements(jd), (q) => bm25(index, q, 3), 'lexical');
    const byText = (frag: string) => result.rows.find((r) => r.requirement.text.includes(frag))!;
    expect(byText('OpenTelemetry').bucket).toBe('strong');
    expect(byText('OpenTelemetry').evidence.length).toBeGreaterThan(0);
    expect(byText('Rust').bucket).toBe('none');
    expect(byText('Rust').evidence).toEqual([]);
    expect(result.counts.strong + result.counts.related + result.counts.none).toBe(result.rows.length);
    expect(JSON.stringify(result)).not.toMatch(/\d+%\s*match/);
  });
  it('bucket thresholds are conservative', () => {
    const req = { id: 'r', text: 'Kubernetes Helm', terms: tokenize('Kubernetes Helm') };
    expect(bucketFor(req, [], [], 'lexical')).toBe('none');
    expect(overlap('Elasticsearch dashboards', 'Kibana dashboards in Elasticsearch')).toEqual([
      'elasticsearch',
      'dashboard',
    ]);
  });
});
