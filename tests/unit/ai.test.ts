import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tokenize, buildBm25, bm25Search, rrf, encodeVectors, decodeVectors, cosine } from '@/ai/knowledge';
import { buildChunks, type ContentBundle } from '@/ai/chunks';
import { buildAnswers } from '@/ai/answers';
import { detectIntent, parseQuery, buildDictionary } from '@/ai/nlp';
import { splitRequirements, matchJd, type SkillRef } from '@/ai/jd';
import { ground, hasEvidence, REFUSAL } from '@/ai/grounding';
import { validateCall, parseToolLine } from '@/ai/tools';
import { declinedTopic } from '@/ai/runtime/router';

const ROOT = new URL('../..', import.meta.url).pathname;
const load = (f: string) =>
  JSON.parse(readFileSync(join(ROOT, 'src', 'content', f), 'utf8')) as Record<string, unknown>[];
const bundle: ContentBundle = {
  profile: load('profile.json'),
  experience: load('experience.json'),
  education: load('education.json'),
  certifications: load('certifications.json'),
  projects: load('projects.json'),
  decisions: load('decisions.json'),
  skills: load('skills.json'),
  machines: load('machines.json'),
};
const chunks = buildChunks(bundle);
const skills: SkillRef[] = bundle.skills.map((s) => ({
  id: String(s['id']),
  name: String(s['name']),
  group: String(s['group']),
  aliases: (s['aliases'] as string[]) ?? [],
  usedIn: (s['usedIn'] as string[]) ?? [],
}));

describe('chunks', () => {
  it('builds sourced chunks with unique ids and no excluded content', () => {
    expect(chunks.length).toBeGreaterThan(100);
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length);
    for (const c of chunks) {
      expect(c.source).toMatch(/^(KPOS\/|info\.md#)/);
      expect(c.text).not.toMatch(/9998967939|kevil_36|acct-|contoso|acme-/i);
    }
    expect(chunks.find((c) => c.id === 'decision:D-A360-SYNC-OVERLAP')?.text).toContain('70-min overlap');
  });
});

describe('lexical retrieval', () => {
  const index = buildBm25(chunks);
  it('tokenizes with stop words removed', () => {
    expect(tokenize('What is the A360 platform?')).toEqual(['a360', 'platform']);
  });
  it('finds A360 for an observability question and P2P for guardrails', () => {
    const a = bm25Search(index, 'multi-tenant agent observability platform');
    expect(chunks.find((c) => c.id === a[0]!.id)!.text).toContain('A360');
    const p = bm25Search(index, 'guardrails risk score auto-approve');
    expect(
      p
        .slice(0, 3)
        .map((h) => h.id)
        .join(' '),
    ).toMatch(/p2p|P2P/);
  });
  it('fuses rankings and round-trips vectors', () => {
    const fused = rrf([
      [
        { id: 'a', score: 9 },
        { id: 'b', score: 5 },
      ],
      [
        { id: 'b', score: 0.9 },
        { id: 'c', score: 0.5 },
      ],
    ]);
    expect(fused[0]!.id).toBe('b');
    const v = [new Float32Array([1, 0, 0]), new Float32Array([0, 1, 0])];
    const back = decodeVectors(encodeVectors(v), 3);
    expect(Array.from(back[1]!)).toEqual([0, 1, 0]);
    expect(cosine(v[0]!, v[0]!)).toBe(1);
  });
});

describe('scripted answers', () => {
  const answers = buildAnswers(bundle, chunks);
  it('cover the main intents and only cite chunks that exist', () => {
    const ids = new Set(chunks.map((c) => c.id));
    expect(answers.map((a) => a.intent)).toEqual(
      expect.arrayContaining([
        'who',
        'a360',
        'p2p',
        'certifications',
        'contact',
        'skills',
        'tour',
        'secrets',
      ]),
    );
    for (const a of answers)
      for (const id of a.cites) expect(ids.has(id), `${a.intent} cites ${id}`).toBe(true);
    const certs = answers.find((a) => a.intent === 'certifications')!;
    expect(certs.cites).toHaveLength(10);
  });
});

describe('NLP parse', () => {
  const dict = buildDictionary({
    machines: [
      { slug: 'telemetry-refinery', name: 'Telemetry Refinery' },
      { slug: 'policy-sorter', name: 'Policy Sorter' },
    ],
    projects: [
      { id: 'a360', name: 'A360 — multi-tenant AI agent observability' },
      { id: 'p2p', name: 'Policy → Pipelines (P2P)' },
    ],
    skills: bundle.skills.map((s) => ({
      id: String(s['id']),
      name: String(s['name']),
      aliases: (s['aliases'] as string[]) ?? [],
    })),
  });
  it('detects intents and entities', () => {
    expect(detectIntent('What is your salary?')).toBe('refuse-personal');
    expect(detectIntent('Which certifications do you hold?')).toBe('certifications');
    expect(detectIntent('Why did you choose overlapping sync windows?')).toBe('decision');
    const p = parseQuery('How does A360 use Elasticsearch and KQL in the Telemetry Refinery?', dict);
    expect(p.entities.map((e) => e.kind)).toEqual(expect.arrayContaining(['project', 'machine', 'skill']));
    expect(p.skills).toEqual(expect.arrayContaining(['elasticsearch', 'adx-kql']));
    expect(p.intent).toBe('how');
  });
});

describe('JD matcher', () => {
  it('splits requirements and classifies without percentages', () => {
    const jd = `About us: we are great.\n- 3+ years with Python and FastAPI\n- Experience with Azure Data Explorer or Elasticsearch\n- Kubernetes and CI/CD pipelines\n- Fluency in Rust and embedded firmware\n- Strong machine learning background`;
    const reqs = splitRequirements(jd);
    expect(reqs.length).toBe(5);
    const r = matchJd(jd, skills, chunks);
    const byText = (s: string) => r.find((x) => x.text.includes(s))!;
    expect(byText('Python').verdict).toBe('strong');
    expect(byText('Python').proof.length).toBeGreaterThan(0);
    expect(byText('Elasticsearch').verdict).toBe('strong');
    expect(byText('Rust').verdict).toBe('not-demonstrated');
    expect(byText('Rust').proof).toEqual([]);
    expect(['strong', 'related']).toContain(byText('machine learning').verdict);
    expect(JSON.stringify(r)).not.toMatch(/\d+%/);
  });
});

describe('grounding and tools', () => {
  it('keeps only cited sentences and reads a trailing tool line', () => {
    const g = ground(
      'A360 is Kyndryl\'s observability platform [1]. It syncs 31 views [2]. This sentence has no citation. Another [9].\n{"tool":"walkTo","args":{"machine":"telemetry-refinery"}}',
      3,
    );
    expect(g.sentences).toHaveLength(2);
    expect(g.dropped).toHaveLength(2);
    expect(g.groundedness).toBeCloseTo(0.5, 5);
    expect(g.coverage).toBeCloseTo(2 / 3, 5);
    expect(parseToolLine(g.toolLine)).toEqual([
      { name: 'walkTo', args: { machine: 'telemetry-refinery' }, preview: 'Walk to telemetry refinery' },
    ]);
  });
  it('validates tool calls strictly', () => {
    expect(validateCall({ tool: 'walkTo', args: { machine: 'nope' } })).toBeNull();
    expect(validateCall({ tool: 'deleteEverything', args: {} })).toBeNull();
    expect(
      validateCall({
        tool: 'setControl',
        args: { machine: 'policy-sorter', control: 'approve', value: true },
      })?.preview,
    ).toContain('approve');
    expect(validateCall({ tool: 'switchLens', args: { lens: 'ceo' } })).toBeNull();
    expect(
      parseToolLine(
        '[{"tool":"openResume"},{"tool":"startTour"},{"tool":"resetFloor"},{"tool":"openResume"}]',
      ),
    ).toHaveLength(3);
    expect(parseToolLine('not json')).toEqual([]);
  });
  it('refuses when there is no evidence and declines personal topics', () => {
    expect(hasEvidence([])).toBe(false);
    expect(hasEvidence([{ score: 0.1 }])).toBe(false);
    expect(hasEvidence([{ score: 1.2 }, { score: 1 }, { score: 0.9 }])).toBe(false);
    expect(hasEvidence([{ score: 2.5 }])).toBe(true);
    expect(REFUSAL).toBe('The lab has no evidence for that.');
    expect(declinedTopic('what is his salary')).toBe(true);
    expect(declinedTopic('what is A360')).toBe(false);
  });
});
