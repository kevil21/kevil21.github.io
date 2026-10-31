import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../../scripts/lib/load-content';
import { validateKnowledge } from '@/lib/knowledge/validate';
import { buildGraph, carriersOf, neighbours } from '@/lib/knowledge/graph';
import { buildTrace, fraction } from '@/lib/knowledge/spans';
import { buildSignalSeries } from '@/lib/knowledge/signal';
import { buildChunks } from '@/lib/knowledge/chunks';
import { formatDuration, formatRange, formatYM, parseYM, ymToIndex } from '@/lib/knowledge/dates';
import { routes } from '@/lib/knowledge/routes';

const data = loadContentFromDisk();

describe('content model', () => {
  it('validates with no dangling references', () => {
    expect(validateKnowledge(data)).toEqual([]);
  });
  it('every claim carries a source pointing into KPOS or the recorded deviation', () => {
    const sources = [
      ...data.profile.about.map((a) => a.source),
      ...data.experience.flatMap((x) => x.highlights.map((h) => h.source)),
      ...data.projects.flatMap((p) => p.outcomes.map((o) => o.source)),
      ...data.decisions.map((d) => d.source),
    ];
    expect(sources.length).toBeGreaterThan(20);
    for (const s of sources) expect(s).toMatch(/^(KPOS|Resume)\//);
  });
  it('never publishes the excluded phone number or internal repo names', () => {
    const blob = JSON.stringify(data);
    expect(blob).not.toMatch(/9998967939|999 896 7939/);
    expect(blob).not.toMatch(/agentic-a360-app-project|acct-\{tenant\}/);
  });
  it('shows no active/valid badges: certifications only carry dates', () => {
    for (const c of data.certifications) expect(c).not.toHaveProperty('active');
  });
});

describe('graph', () => {
  const g = buildGraph(data);
  it('links projects to their parent span and skills', () => {
    const a360 = neighbours(g, 'a360', ['parent']);
    expect(a360.map((n) => n.id)).toEqual(['kyndryl-associate-sde']);
    expect(neighbours(g, 'a360', ['uses-skill']).map((n) => n.id)).toContain('observability');
  });
  it('rolls technologies up to their skill when finding carriers', () => {
    const carriers = carriersOf(g, 'observability');
    expect(carriers).toContain('a360');
    expect(carriers).toContain('kyndryl-associate-sde');
  });
  it('has a node for every certification with a credentials route', () => {
    for (const c of data.certifications) expect(g.nodes.get(c.id)?.url).toBe(routes.credential(c.id));
  });
});

describe('trace', () => {
  const trace = buildTrace(data, { y: 2026, m: 11 });
  it('orders roots newest first and nests projects under their parent', () => {
    expect(trace.roots[0]?.id).toBe('kyndryl-associate-sde');
    const kyndryl = trace.roots.find((r) => r.id === 'kyndryl-associate-sde')!;
    expect(kyndryl.children.map((c) => c.id)).toEqual(['a360', 'policy-to-pipelines']);
  });
  it('marks undated projects as inheriting their parent extent', () => {
    const climate = trace.rows.find((r) => r.id === 'climate-mitigation-tool')!;
    expect(climate.inherited).toBe(true);
    expect(climate.start).toBe(trace.rows.find((r) => r.id === 'vit-vellore-btech')!.start);
  });
  it('places credentials with issue dates as events and keeps the axis monotonic', () => {
    expect(trace.credentials.filter((c) => c.at !== undefined).length).toBe(10);
    expect(trace.axis.startIndex).toBeLessThan(trace.axis.endIndex);
    expect(fraction(trace.axis, trace.axis.startIndex)).toBe(0);
    expect(fraction(trace.axis, trace.axis.endIndex + 1)).toBe(1);
  });
  it('derives a non-random signal series from the same content', () => {
    const s = buildSignalSeries(trace);
    expect(s.activity.length).toBe(trace.axis.endIndex - trace.axis.startIndex + 1);
    const again = buildSignalSeries(buildTrace(data, { y: 2026, m: 11 }));
    expect(again.activity).toEqual(s.activity);
    expect(Math.max(...s.activity)).toBeGreaterThan(0);
  });
});

describe('chunks', () => {
  const chunks = buildChunks(data);
  it('creates unique ids and keeps sources', () => {
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length);
    for (const c of chunks) expect(c.source).toMatch(/^(KPOS|Resume)\//);
  });
  it('marks résumé metrics as self-reported', () => {
    const outcome = chunks.find((c) => c.nodeId === 'charly-computers-cloud-intern' && /40%/.test(c.text));
    expect(outcome?.selfReported).toBe(true);
  });
});

describe('dates', () => {
  it('parses and formats year-months', () => {
    expect(parseYM('2025-07')).toEqual({ y: 2025, m: 7 });
    expect(formatYM('2025-07')).toBe('Jul 2025');
    expect(formatYM('2024')).toBe('2024');
    expect(formatYM('present')).toBe('now');
    expect(formatRange('2024-07', '2024-08')).toBe('Jul 2024 → Aug 2024');
    expect(formatDuration({ y: 2025, m: 7 }, { y: 2026, m: 10 })).toBe('1y 4m');
    expect(ymToIndex({ y: 2025, m: 1 }) - ymToIndex({ y: 2024, m: 1 })).toBe(12);
  });
});
