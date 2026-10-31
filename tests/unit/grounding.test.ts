import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, citationsIn } from '@/ai/full/grounding';
import type { RetrievedChunk } from '@/ai/protocol';

const chunks: RetrievedChunk[] = [
  {
    id: 'c1',
    nodeId: 'a360',
    kind: 'summary',
    text: 'A360 summary',
    source: 'KPOS/site/index.html',
    url: '/work/a360/',
    score: 1,
    via: 'lexical',
  },
  {
    id: 'c2',
    nodeId: 'p2p',
    kind: 'outcome',
    text: 'P2P outcome',
    source: 'KPOS/site/index.html',
    url: '/work/policy-to-pipelines/',
    score: 0.5,
    via: 'lexical',
    selfReported: true,
  },
];

describe('grounding', () => {
  it('puts only retrieved evidence and the rules into the system prompt', () => {
    const p = buildSystemPrompt('recruiter', chunks);
    expect(p).toContain('[1] (summary) A360 summary');
    expect(p).toContain('[2] (outcome, self-reported) P2P outcome');
    expect(p).toContain('The portfolio does not demonstrate that.');
    expect(p).toContain('navigateTo');
  });
  it('resolves citations in order of first mention and ignores unknown numbers', () => {
    expect(citationsIn('x [2] y [1] z [2] [9]', chunks).map((c) => c.id)).toEqual(['c2', 'c1']);
  });
});
