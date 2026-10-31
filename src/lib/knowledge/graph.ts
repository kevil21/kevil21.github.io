import type { KnowledgeData } from '../schema';
import { routes } from './routes';

export type NodeKind =
  | 'profile'
  | 'experience'
  | 'project'
  | 'skill'
  | 'technology'
  | 'certification'
  | 'education'
  | 'decision'
  | 'evidence';

export type EdgeType =
  | 'parent' // project → experience/education it happened within
  | 'uses-skill' // project/experience → skill
  | 'uses-tech' // project/experience → technology
  | 'tech-of' // technology → skill
  | 'validates' // certification → skill
  | 'decided-in' // decision → project
  | 'evidenced-by'; // node → evidence

export interface KNode {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle?: string;
  url: string;
  external?: boolean;
  /** semantic token name for the node's colour, e.g. 'kind-project' */
  tone: string;
  /** flattened text for lexical search and embedding */
  text: string;
}

export interface KEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface KnowledgeGraph {
  nodes: Map<string, KNode>;
  edges: KEdge[];
  out: Map<string, KEdge[]>;
  in: Map<string, KEdge[]>;
}

const toneFor: Record<NodeKind, string> = {
  profile: 'signal',
  experience: 'kind-role',
  project: 'kind-project',
  skill: 'trace',
  technology: 'trace',
  certification: 'kind-certification',
  education: 'kind-education',
  decision: 'kind-project',
  evidence: 'trace',
};

export function buildGraph(data: KnowledgeData): KnowledgeGraph {
  const nodes = new Map<string, KNode>();
  const edges: KEdge[] = [];
  const add = (n: KNode) => {
    if (nodes.has(n.id)) throw new Error(`Duplicate node id: ${n.id}`);
    nodes.set(n.id, n);
  };
  const link = (from: string, to: string, type: EdgeType) => edges.push({ from, to, type });

  add({
    id: 'profile',
    kind: 'profile',
    title: data.profile.name,
    subtitle: data.profile.title,
    url: routes.home(),
    tone: toneFor.profile,
    text: [data.profile.headline, ...data.profile.about.map((a) => a.text)].join(' '),
  });

  for (const e of data.experience) {
    add({
      id: e.id,
      kind: 'experience',
      title: `${e.role} · ${e.org}`,
      subtitle: e.summary,
      url: routes.role(e.id),
      tone: e.kind === 'community' ? 'kind-community' : toneFor.experience,
      text: [e.role, e.org, e.summary, ...e.highlights.map((h) => h.text)].join(' '),
    });
    e.skills.forEach((s) => link(e.id, s, 'uses-skill'));
    e.technologies.forEach((t) => link(e.id, t, 'uses-tech'));
    e.evidence.forEach((v) => link(e.id, v, 'evidenced-by'));
  }
  for (const ed of data.education) {
    add({
      id: ed.id,
      kind: 'education',
      title: `${ed.degree} · ${ed.institution}`,
      subtitle: `${ed.grade.label} ${ed.grade.value}`,
      url: routes.educationEntry(ed.id),
      tone: toneFor.education,
      text: [
        ed.degree,
        ed.institution,
        ed.location,
        ed.grade.label,
        ed.grade.value,
        ...ed.highlights.map((h) => h.text),
      ].join(' '),
    });
  }
  for (const p of data.projects) {
    add({
      id: p.id,
      kind: 'project',
      title: p.name,
      subtitle: p.tagline,
      url: routes.project(p.id),
      tone: toneFor.project,
      text: [
        p.name,
        p.tagline,
        p.summary,
        p.problem ?? '',
        ...p.approach,
        ...p.outcomes.map((o) => o.text),
      ].join(' '),
    });
    link(p.id, p.parent, 'parent');
    p.skills.forEach((s) => link(p.id, s, 'uses-skill'));
    p.stack.forEach((t) => link(p.id, t, 'uses-tech'));
    p.evidence.forEach((v) => link(p.id, v, 'evidenced-by'));
  }
  for (const s of data.skills) {
    add({
      id: s.id,
      kind: 'skill',
      title: s.name,
      subtitle: s.summary,
      url: routes.skill(s.id),
      tone: toneFor.skill,
      text: [s.name, s.category, s.summary ?? ''].join(' '),
    });
  }
  for (const t of data.technologies) {
    if (nodes.has(t.id)) {
      // A technology that shares its id with a skill (python, typescript) is the same concept; only link it.
      link(t.id, t.skill, 'tech-of');
      continue;
    }
    add({
      id: t.id,
      kind: 'technology',
      title: t.name,
      url: routes.technology(t.skill, t.id),
      tone: toneFor.technology,
      text: t.name,
    });
    link(t.id, t.skill, 'tech-of');
  }
  for (const c of data.certifications) {
    add({
      id: c.id,
      kind: 'certification',
      title: c.name,
      subtitle: [c.code, c.issuer].filter(Boolean).join(' · '),
      url: routes.credential(c.id),
      tone: toneFor.certification,
      text: [c.name, c.code ?? '', c.issuer, c.verifyNote ?? ''].join(' '),
    });
    c.skills.forEach((s) => link(c.id, s, 'validates'));
  }
  for (const d of data.decisions) {
    add({
      id: d.id,
      kind: 'decision',
      title: d.title,
      subtitle: d.decision,
      url: routes.decision(d.project, d.id),
      tone: toneFor.decision,
      text: [d.title, d.context, d.decision, d.consequence ?? ''].join(' '),
    });
    link(d.id, d.project, 'decided-in');
  }
  for (const v of data.evidence) {
    add({
      id: v.id,
      kind: 'evidence',
      title: v.title,
      subtitle: v.note,
      url: v.url,
      external: true,
      tone: toneFor.evidence,
      text: v.title,
    });
    v.supports.forEach((s) => link(s, v.id, 'evidenced-by'));
  }

  // Dedupe edges
  const seen = new Set<string>();
  const unique = edges.filter((e) => {
    const k = `${e.from}|${e.to}|${e.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const out = new Map<string, KEdge[]>();
  const inc = new Map<string, KEdge[]>();
  for (const e of unique) {
    if (!out.has(e.from)) out.set(e.from, []);
    if (!inc.has(e.to)) inc.set(e.to, []);
    out.get(e.from)!.push(e);
    inc.get(e.to)!.push(e);
  }
  return { nodes, edges: unique, out, in: inc };
}

/** Validate every edge endpoint exists. Returns a list of problems (empty when valid). */
export function validateGraph(g: KnowledgeGraph): string[] {
  const problems: string[] = [];
  for (const e of g.edges) {
    if (!g.nodes.has(e.from)) problems.push(`edge ${e.type}: unknown source "${e.from}" (→ ${e.to})`);
    if (!g.nodes.has(e.to)) problems.push(`edge ${e.type}: unknown target "${e.to}" (from ${e.from})`);
  }
  return problems;
}

/** Neighbours of a node, optionally filtered by edge type and direction. */
export function neighbours(g: KnowledgeGraph, id: string, types?: EdgeType[]): KNode[] {
  const res: KNode[] = [];
  const push = (nid: string) => {
    const n = g.nodes.get(nid);
    if (n && !res.includes(n)) res.push(n);
  };
  for (const e of g.out.get(id) ?? []) if (!types || types.includes(e.type)) push(e.to);
  for (const e of g.in.get(id) ?? []) if (!types || types.includes(e.type)) push(e.from);
  return res;
}

/** Ids of every span (experience/education/project/certification) that carries a skill or technology. */
export function carriersOf(g: KnowledgeGraph, attributeId: string): string[] {
  const direct = (g.in.get(attributeId) ?? [])
    .filter((e) => e.type === 'uses-skill' || e.type === 'uses-tech' || e.type === 'validates')
    .map((e) => e.from);
  // technologies roll up to their skill
  const techs = (g.in.get(attributeId) ?? []).filter((e) => e.type === 'tech-of').map((e) => e.from);
  const viaTech = techs.flatMap((t) =>
    (g.in.get(t) ?? []).filter((e) => e.type === 'uses-tech').map((e) => e.from),
  );
  return Array.from(new Set([...direct, ...viaTech]));
}
