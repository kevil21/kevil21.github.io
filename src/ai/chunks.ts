/**
 * Builds the retrieval chunks from the content collections. Used by the Build Brain (Node, via scripts) and tests.
 * Every chunk is a sourced claim; ids are stable so citations survive rebuilds.
 */
import type { Chunk } from './protocol';

type Claim = { text: string; source: string; ledger?: string; label: Chunk['label'] };
type Any = Record<string, unknown>;

export interface ContentBundle {
  profile: Any[];
  experience: Any[];
  education: Any[];
  certifications: Any[];
  projects: Any[];
  decisions: Any[];
  skills: Any[];
  machines: Any[];
}

const MACHINE_URL: Record<string, string> = {
  'telemetry-refinery': '/machines/telemetry-refinery/',
  'policy-sorter': '/machines/policy-sorter/',
  'forecast-engine': '/machines/forecast-engine/',
  'data-workbench': '/machines/data-workbench/',
  'calibration-bench': '/machines/calibration-bench/',
  'foundations-generator': '/machines/foundations-generator/',
};

export function buildChunks(c: ContentBundle): Chunk[] {
  const out: Chunk[] = [];
  const push = (id: string, claim: Claim, extra: Partial<Chunk> = {}) =>
    out.push({
      id,
      text: claim.text,
      source: claim.source,
      label: claim.label ?? 'public',
      ...(claim.ledger ? {} : {}),
      ...extra,
    });

  const p = c.profile[0] as Any;
  if (p) {
    push(
      'profile:title',
      {
        ...(p['title'] as Claim),
        text: `${(p['name'] as Claim).text} is an ${(p['title'] as Claim).text} at ${(p['employer'] as Claim).text}, ${(p['headline'] as Claim).text}.`,
      },
      { url: '/resume/' },
    );
    push('profile:location', p['location'] as Claim, { url: '/contact/' });
    push(
      'profile:email',
      {
        ...(p['email'] as Claim),
        text: `Contact: ${(p['email'] as Claim).text}. LinkedIn linkedin.com/in/kevil21, GitHub github.com/kevil21.`,
      },
      { url: '/contact/' },
    );
    (p['lead'] as Claim[]).forEach((l, i) => push(`profile:lead-${i}`, l, { url: '/resume/' }));
    push('profile:open-to', p['openTo'] as Claim, { url: '/contact/' });
    push('profile:languages', p['languages'] as Claim, { url: '/resume/' });
  }
  for (const e of c.experience) {
    const org = String(e['org']);
    const title = (e['title'] as Claim).text;
    const d = e['dates'] as { start: string; end?: string; source: string };
    const machineExtra = typeof e['machine'] === 'string' ? { machine: e['machine'] as string } : {};
    push(
      `exp:${e['id']}:role`,
      {
        text: `${title} at ${org}, ${d.start} to ${d.end ?? 'present'}.`,
        source: d.source ?? (e['title'] as Claim).source,
        label: 'public',
      },
      { ...machineExtra, url: '/resume/#r-experience' },
    );
    (e['bullets'] as Claim[]).forEach((b, i) =>
      push(`exp:${e['id']}:bullet-${i}`, b, { ...machineExtra, url: '/resume/#r-experience' }),
    );
  }
  for (const e of c.education) {
    const d = e['dates'] as { start: string; end?: string; source: string };
    push(
      `edu:${e['id']}`,
      {
        text: `${(e['degree'] as Claim).text}, ${e['institution']}, ${d.start}–${d.end ?? ''}. ${(e['details'] as Claim[]).map((x) => x.text).join(' · ')}`,
        source: (e['degree'] as Claim).source,
        label: 'resume',
      },
      { machine: 'foundations-generator', url: '/resume/#r-education' },
    );
  }
  for (const cert of c.certifications) {
    const issued = cert['issued'] ? ` Issued ${cert['issued']} [source: info.md].` : '';
    const exp = cert['lifetime'] ? ' No expiry.' : cert['expires'] ? ` Expires ${cert['expires']}.` : '';
    push(
      `cert:${cert['id']}`,
      {
        text: `${cert['name']} — ${cert['issuer']}.${issued}${exp}${cert['credentialId'] ? ` Credential ID ${cert['credentialId']}.` : ''}`,
        source: String(cert['source']),
        label: 'public',
      },
      { machine: 'calibration-bench', url: `/certifications/#${cert['id']}` },
    );
  }
  for (const pr of c.projects) {
    const slug = String(pr['id']);
    const machine = String(pr['machine']);
    const name = String(pr['name']);
    push(
      `project:${slug}:summary`,
      { ...(pr['summary'] as Claim), text: `${name}: ${(pr['summary'] as Claim).text}` },
      { machine, url: `/work/${slug}/` },
    );
    if (pr['problem'])
      push(
        `project:${slug}:problem`,
        { ...(pr['problem'] as Claim), text: `${name} — problem: ${(pr['problem'] as Claim).text}` },
        { machine, url: `/work/${slug}/` },
      );
    ((pr['approach'] as Claim[]) ?? []).forEach((a, i) =>
      push(
        `project:${slug}:approach-${i}`,
        { ...a, text: `${name} — approach: ${a.text}` },
        { machine, url: `/work/${slug}/` },
      ),
    );
    ((pr['outcomes'] as Claim[]) ?? []).forEach((o, i) =>
      push(
        `project:${slug}:outcome-${i}`,
        { ...o, text: `${name} — outcome: ${o.text}` },
        { machine, url: `/work/${slug}/` },
      ),
    );
    const stack = (pr['stack'] as string[]) ?? [];
    if (stack.length && pr['stackSource'])
      push(
        `project:${slug}:stack`,
        { text: `${name} — stack: ${stack.join(', ')}.`, source: String(pr['stackSource']), label: 'public' },
        { machine, url: `/work/${slug}/` },
      );
  }
  for (const d of c.decisions) {
    push(
      `decision:${d['id']}`,
      {
        ...(d['statement'] as Claim),
        text: `${d['title']}: ${(d['statement'] as Claim).text} — ${d['narration']}`,
      },
      { machine: String(d['machine']), url: `${MACHINE_URL[String(d['machine'])] ?? '/'}#${d['id']}` },
    );
  }
  const byGroup = new Map<string, string[]>();
  for (const s of c.skills) {
    const g = String(s['group']);
    byGroup.set(g, [...(byGroup.get(g) ?? []), String(s['name'])]);
  }
  const anySkill = c.skills[0];
  for (const [g, names] of byGroup) {
    push(
      `skills:${g}`,
      {
        text: `Skills (${g}): ${names.join(', ')}.`,
        source: String(anySkill?.['source'] ?? 'KPOS/site/Kevil_Resume_2026.md#L46'),
        label: 'public',
      },
      { url: '/resume/#r-skills' },
    );
  }
  for (const m of c.machines) {
    const slug = String(m['slug']);
    push(
      `machine:${slug}`,
      {
        text: `${m['name']} (bay ${m['bay']}): ${m['subtitle']}. ${m['embodies']}`,
        source: (m['plaque'] as Claim[])[0]?.source ?? 'KPOS/site/index.html#L1',
        label: 'public',
      },
      { machine: slug, url: MACHINE_URL[slug] ?? '/' },
    );
  }
  return out;
}
