import type { KnowledgeData } from '../schema';
import type { Chunk } from '@/ai/protocol';
import { routes } from './routes';
import { formatYM } from './dates';

/** Deterministically chunk the content model into retrievable evidence units. */
export function buildChunks(data: KnowledgeData): Chunk[] {
  const chunks: Chunk[] = [];
  const push = (c: Omit<Chunk, 'id'> & { id?: string }, seq: number) =>
    chunks.push({ id: c.id ?? `${c.nodeId}:${c.kind}:${seq}`, ...c });

  const p = data.profile;
  p.about.forEach((a, i) =>
    push(
      {
        nodeId: 'profile',
        kind: 'summary',
        text: a.text,
        source: a.source,
        url: routes.home(),
        selfReported: a.selfReported,
      },
      i,
    ),
  );
  push(
    {
      nodeId: 'profile',
      kind: 'fact',
      text: `${p.name} (${p.fullName}) is ${p.title} (${p.shortTitle}) at Kyndryl. Based in ${p.locations.map((l) => l.city).join(' and ')}, India. Email ${p.email}. Speaks ${p.languages.map((l) => `${l.name} (${l.level})`).join(', ')}.`,
      source: p.sources[0] ?? 'KPOS/site/index.html',
      url: routes.home(),
      selfReported: false,
    },
    0,
  );

  for (const x of data.experience) {
    push(
      {
        nodeId: x.id,
        kind: 'summary',
        text: `${x.role} at ${x.org} (${formatYM(x.start)} → ${formatYM(x.end)}${x.location ? `, ${x.location}` : ''}). ${x.summary}`,
        source: x.sources[0]!,
        url: routes.role(x.id),
        selfReported: false,
      },
      0,
    );
    x.highlights.forEach((h, i) =>
      push(
        {
          nodeId: x.id,
          kind: 'highlight',
          text: `${x.org}: ${h.text}`,
          source: h.source,
          url: routes.role(x.id),
          selfReported: h.selfReported,
        },
        i,
      ),
    );
  }
  for (const pr of data.projects) {
    push(
      {
        nodeId: pr.id,
        kind: 'summary',
        text: `${pr.name}${pr.org ? ` (${pr.org})` : ''} — ${pr.tagline} ${pr.summary}`,
        source: pr.sources[0]!,
        url: routes.project(pr.id),
        selfReported: false,
      },
      0,
    );
    if (pr.problem)
      push(
        {
          nodeId: pr.id,
          kind: 'fact',
          text: `${pr.name} problem: ${pr.problem}`,
          source: pr.sources[0]!,
          url: routes.project(pr.id),
        },
        1,
      );
    if (pr.approach.length)
      push(
        {
          nodeId: pr.id,
          kind: 'approach',
          text: `${pr.name} approach: ${pr.approach.join(' ')}`,
          source: pr.sources[0]!,
          url: routes.project(pr.id),
        },
        0,
      );
    pr.outcomes.forEach((o, i) =>
      push(
        {
          nodeId: pr.id,
          kind: 'outcome',
          text: `${pr.name} outcome: ${o.text}`,
          source: o.source,
          url: routes.project(pr.id),
          selfReported: o.selfReported,
        },
        i,
      ),
    );
    if (pr.stack.length) {
      const names = pr.stack.map((t) => data.technologies.find((x) => x.id === t)?.name ?? t);
      push(
        {
          nodeId: pr.id,
          kind: 'fact',
          text: `${pr.name} stack: ${names.join(', ')}.`,
          source: pr.sources[0]!,
          url: routes.project(pr.id),
          selfReported: false,
        },
        2,
      );
    }
  }
  for (const d of data.decisions) {
    const proj = data.projects.find((x) => x.id === d.project);
    push(
      {
        nodeId: d.id,
        kind: 'decision',
        text: `${proj?.name ?? d.project} decision — ${d.title}. Context: ${d.context} Decision: ${d.decision}${d.consequence ? ` Consequence: ${d.consequence}` : ''}`,
        source: d.source,
        url: routes.decision(d.project, d.id),
        selfReported: false,
      },
      0,
    );
  }
  for (const c of data.certifications) {
    push(
      {
        nodeId: c.id,
        kind: 'credential',
        text: `${c.name}${c.code ? ` (${c.code})` : ''} issued by ${c.issuer}${c.issued ? `, issued ${formatYM(c.issued)}` : ''}${c.expires ? `, ${c.expires === 'none' ? 'no expiry' : `expires ${formatYM(c.expires)}`}` : ''}${c.credentialId ? `, credential ID ${c.credentialId}` : ''}. Verify at ${c.verifyUrl}.`,
        source: c.sources[0]!,
        url: routes.credential(c.id),
        selfReported: false,
      },
      0,
    );
  }
  for (const e of data.education) {
    push(
      {
        nodeId: e.id,
        kind: 'fact',
        text: `${e.degree} at ${e.institution}, ${e.location} (${formatYM(e.start)} → ${formatYM(e.end)}), ${e.grade.label} ${e.grade.value}. ${e.highlights.map((h) => h.text).join(' ')}`.trim(),
        source: e.sources[0]!,
        url: routes.educationEntry(e.id),
        selfReported: false,
      },
      0,
    );
  }
  for (const s of data.skills) {
    const techs = data.technologies.filter((t) => t.skill === s.id && t.id !== s.id).map((t) => t.name);
    const used = data.projects
      .filter((p) => p.skills.includes(s.id) || p.stack.includes(s.id))
      .map((p) => p.name);
    const roles = data.experience
      .filter((x) => x.skills.includes(s.id) || x.technologies.includes(s.id))
      .map((x) => x.org);
    const certs = data.certifications.filter((c) => c.skills.includes(s.id)).map((c) => c.name);
    push(
      {
        nodeId: s.id,
        kind: 'fact',
        text: `${s.name} (${s.category})${s.yearsSelfReported ? `, about ${s.yearsSelfReported} years self-reported` : ''}.${s.summary ? ` ${s.summary}` : ''}${techs.length ? ` Technologies: ${techs.join(', ')}.` : ''}${used.length ? ` Used in: ${used.join(', ')}.` : ''}${roles.length ? ` Roles: ${roles.join(', ')}.` : ''}${certs.length ? ` Validated by: ${certs.join(', ')}.` : ''}`,
        source: s.source,
        url: routes.skill(s.id),
        selfReported: Boolean(s.yearsSelfReported),
      },
      0,
    );
  }
  return chunks;
}
