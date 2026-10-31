import type { KnowledgeData } from '../schema';
import { formatDuration, formatYM, indexToYM, nowYM, parseYM, resolveEnd, ymToIndex, type YM } from './dates';
import { routes } from './routes';

export type SpanKind = 'role' | 'community' | 'education' | 'project' | 'certification';

export interface SpanEvent {
  id: string;
  kind: 'certification' | 'outcome' | 'decision';
  label: string;
  /** month index; undefined when the event has no date */
  at?: number;
  url: string;
}

export interface Span {
  id: string;
  kind: SpanKind;
  title: string;
  subtitle: string;
  url: string;
  /** month indices on the shared axis; undefined when the span is undated */
  start?: number;
  end?: number;
  /** true when the span is placed by inheriting its parent's extent */
  inherited: boolean;
  dateLabel: string;
  duration?: string;
  parentId?: string;
  depth: number;
  children: Span[];
  attributes: string[]; // skill + technology ids
  events: SpanEvent[];
  evidenceCount: number;
}

export interface TraceAxis {
  startIndex: number;
  endIndex: number;
  years: { year: number; index: number }[];
  nowIndex: number;
}

export interface Trace {
  axis: TraceAxis;
  roots: Span[];
  /** flattened, depth-first */
  rows: Span[];
  /** certification point events as a separate lane */
  credentials: SpanEvent[];
}

function spanFromRange(start: string | undefined, end: string | undefined, now: YM) {
  const s = start ? parseYM(start, 1) : undefined;
  const e = resolveEnd(end, now) ?? (s ? { ...s } : undefined);
  const si = s ? ymToIndex(s) : undefined;
  const ei = e ? ymToIndex(e) : undefined;
  return { si, ei, s, e };
}

export function buildTrace(data: KnowledgeData, now: YM = nowYM()): Trace {
  const nowIndex = ymToIndex(now);
  const roots: Span[] = [];
  const byId = new Map<string, Span>();

  for (const ed of data.education) {
    const { si, ei, s, e } = spanFromRange(ed.start, ed.end, now);
    const span: Span = {
      id: ed.id,
      kind: 'education',
      title: ed.institution,
      subtitle: ed.degree,
      url: routes.educationEntry(ed.id),
      start: si,
      end: ei,
      inherited: false,
      dateLabel: `${formatYM(ed.start)} → ${formatYM(ed.end)}`,
      duration: s && e ? formatDuration(s, e) : undefined,
      depth: 0,
      children: [],
      attributes: [],
      events: ed.highlights.map((h, i) => ({
        id: `${ed.id}-h${i}`,
        kind: 'outcome',
        label: h.text,
        url: routes.educationEntry(ed.id),
      })),
      evidenceCount: 0,
    };
    roots.push(span);
    byId.set(span.id, span);
  }
  for (const x of data.experience) {
    const { si, ei, s, e } = spanFromRange(x.start, x.end, now);
    const span: Span = {
      id: x.id,
      kind: x.kind,
      title: x.org,
      subtitle: x.role,
      url: routes.role(x.id),
      start: si,
      end: ei,
      inherited: false,
      dateLabel: `${formatYM(x.start)} → ${formatYM(x.end)}`,
      duration: s && e ? formatDuration(s, e) : undefined,
      depth: 0,
      children: [],
      attributes: [...x.skills, ...x.technologies],
      events: x.highlights.map((h, i) => ({
        id: `${x.id}-h${i}`,
        kind: 'outcome',
        label: h.text,
        url: routes.role(x.id),
      })),
      evidenceCount: x.evidence.length,
    };
    roots.push(span);
    byId.set(span.id, span);
  }
  for (const p of [...data.projects].sort((a, b) => a.order - b.order)) {
    const parent = byId.get(p.parent);
    if (!parent) throw new Error(`Project ${p.id} has unknown parent ${p.parent}`);
    const { si, ei, s, e } = spanFromRange(p.period.start, p.period.end, now);
    const inherited = si === undefined;
    const span: Span = {
      id: p.id,
      kind: 'project',
      title: p.shortName ?? p.name,
      subtitle: p.tagline,
      url: routes.project(p.id),
      start: inherited ? parent.start : si,
      end: inherited ? parent.end : ei,
      inherited,
      dateLabel: p.period.label,
      duration: !inherited && s && e ? formatDuration(s, e) : undefined,
      parentId: parent.id,
      depth: parent.depth + 1,
      children: [],
      attributes: [...p.skills, ...p.stack],
      events: [
        ...p.outcomes.map((o, i) => ({
          id: `${p.id}-o${i}`,
          kind: 'outcome' as const,
          label: o.text,
          url: routes.project(p.id),
        })),
        ...p.decisions.map((d) => {
          const dec = data.decisions.find((x) => x.id === d);
          return { id: d, kind: 'decision' as const, label: dec?.title ?? d, url: routes.decision(p.id, d) };
        }),
      ],
      evidenceCount: p.evidence.length,
    };
    parent.children.push(span);
    byId.set(span.id, span);
  }

  const credentials: SpanEvent[] = data.certifications.map((c) => ({
    id: c.id,
    kind: 'certification',
    label: c.code ? `${c.code} · ${c.name}` : c.name,
    at: c.issued ? ymToIndex(parseYM(c.issued, 1)) : undefined,
    url: routes.credential(c.id),
  }));

  // Order roots chronologically (latest first reads like a trace waterfall of a career: newest on top)
  roots.sort((a, b) => (b.start ?? 0) - (a.start ?? 0));

  const all = [...roots.flatMap((r) => [r.start, r.end]), ...credentials.map((c) => c.at)].filter(
    (v): v is number => typeof v === 'number',
  );
  const startIndex = Math.min(...all);
  const endIndex = Math.max(nowIndex, ...all);
  const years: TraceAxis['years'] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const ym = indexToYM(i);
    if (ym.m === 1 || i === startIndex) years.push({ year: ym.y, index: i });
  }

  const rows: Span[] = [];
  const walk = (s: Span) => {
    rows.push(s);
    s.children.forEach(walk);
  };
  roots.forEach(walk);

  return { axis: { startIndex, endIndex, years, nowIndex }, roots, rows, credentials };
}

/** Position helpers (0..1) along the axis. */
export function fraction(axis: TraceAxis, index: number): number {
  const total = Math.max(1, axis.endIndex - axis.startIndex + 1);
  return Math.min(1, Math.max(0, (index - axis.startIndex) / total));
}
