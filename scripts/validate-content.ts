/**
 * Cross-reference validation of the content collections (schemas check shape; this checks the graph):
 * projects → machines, decisions; machines → projects, decisions, case studies; skills → machines; counts that the
 * fact ledger fixes (ten certifications, six machines, nine projects). Used by the unit tests and the Build Brain.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  certificationSchema,
  decisionSchema,
  educationSchema,
  eventSchema,
  experienceSchema,
  machineSchema,
  profileSchema,
  projectSchema,
  skillSchema,
} from '../src/lib/schema';

const ROOT = new URL('..', import.meta.url).pathname;
const C = join(ROOT, 'src', 'content');

function load<T>(file: string, schema: { parse: (v: unknown) => T }): Array<T & { id: string }> {
  const raw = JSON.parse(readFileSync(join(C, file), 'utf8')) as Array<Record<string, unknown>>;
  return raw.map((r) => {
    const id = r['id'];
    if (typeof id !== 'string') throw new Error(`${file}: entry without string id`);
    // Schemas ignore unknown keys, so `id` passes through harmlessly where the schema does not declare it.
    return { ...(schema.parse(r) as object), id } as T & { id: string };
  });
}

export interface ContentReport {
  errors: string[];
  counts: Record<string, number>;
}

export function validateContent(): ContentReport {
  const errors: string[] = [];
  const profile = load('profile.json', profileSchema);
  const experience = load('experience.json', experienceSchema);
  const education = load('education.json', educationSchema);
  const certifications = load('certifications.json', certificationSchema);
  const projects = load('projects.json', projectSchema);
  const decisions = load('decisions.json', decisionSchema);
  const skills = load('skills.json', skillSchema);
  const machines = load('machines.json', machineSchema);
  const events = load('events.json', eventSchema);

  const machineIds = new Set(machines.map((m) => m.id));
  const projectIds = new Set(projects.map((p) => p.id));
  const decisionIds = new Set(decisions.map((d) => d.id));

  // uniqueness
  for (const [name, list] of Object.entries({
    experience,
    education,
    certifications,
    projects,
    decisions,
    skills,
    machines,
    events,
  })) {
    const seen = new Set<string>();
    for (const e of list as Array<{ id: string }>) {
      if (seen.has(e.id)) errors.push(`${name}: duplicate id ${e.id}`);
      seen.add(e.id);
    }
  }

  // ledger-fixed counts
  if (profile.length !== 1) errors.push(`profile: expected 1 entry, got ${profile.length}`);
  if (certifications.length !== 10)
    errors.push(`certifications: expected 10 (fact ledger C-11), got ${certifications.length}`);
  if (machines.length !== 6) errors.push(`machines: expected 6, got ${machines.length}`);
  if (projects.length !== 9) errors.push(`projects: expected 9 (KPOS archive), got ${projects.length}`);
  if (experience.length !== 3) errors.push(`experience: expected 3, got ${experience.length}`);
  if (education.length !== 3) errors.push(`education: expected 3, got ${education.length}`);
  const bays = machines
    .map((m) => m.bay)
    .sort((a, b) => a - b)
    .join(',');
  if (bays !== '1,2,3,4,5,6') errors.push(`machines: bays must be 1..6, got ${bays}`);
  for (const m of machines) if (m.slug !== m.id) errors.push(`machine ${m.id}: slug must equal id`);

  // references
  for (const p of projects) {
    if (!machineIds.has(p.machine)) errors.push(`project ${p.id}: unknown machine ${p.machine}`);
    for (const d of p.decisions)
      if (!decisionIds.has(d)) errors.push(`project ${p.id}: unknown decision ${d}`);
    if (p.year && !p.yearSource) errors.push(`project ${p.id}: year without yearSource`);
  }
  for (const m of machines) {
    for (const p of m.projects) if (!projectIds.has(p)) errors.push(`machine ${m.id}: unknown project ${p}`);
    for (const d of m.decisions)
      if (!decisionIds.has(d)) errors.push(`machine ${m.id}: unknown decision ${d}`);
    for (const d of decisions.filter((x) => x.machine === m.id)) {
      if (!m.decisions.includes(d.id))
        errors.push(`machine ${m.id}: decision ${d.id} belongs to it but is not listed`);
      if (d.control && !m.controls.some((c) => c.id === d.control))
        errors.push(`decision ${d.id}: control ${d.control} not on ${m.id}`);
    }
    const ids = new Set<string>();
    for (const c of m.controls) {
      if (ids.has(c.id)) errors.push(`machine ${m.id}: duplicate control ${c.id}`);
      ids.add(c.id);
      if (c.kind === 'range' && (c.min === undefined || c.max === undefined))
        errors.push(`machine ${m.id}: range ${c.id} needs min/max`);
      if (c.kind === 'select' && !(c.options ?? []).includes(String(c.default)))
        errors.push(`machine ${m.id}: select ${c.id} default not in options`);
    }
  }
  for (const d of decisions)
    if (!machineIds.has(d.machine)) errors.push(`decision ${d.id}: unknown machine ${d.machine}`);
  for (const s of skills)
    for (const m of s.usedIn) if (!machineIds.has(m)) errors.push(`skill ${s.id}: unknown machine ${m}`);
  for (const e of experience)
    if (e.machine && !machineIds.has(e.machine))
      errors.push(`experience ${e.id}: unknown machine ${e.machine}`);
  for (const c of certifications)
    if (c.issued && !c.issuedSource) errors.push(`certification ${c.id}: issued month without issuedSource`);
  for (const c of certifications)
    if (c.issuedSource && !c.issuedSource.startsWith('info.md#'))
      errors.push(`certification ${c.id}: issue month must come from info.md`);

  // info.md may only be used for certification issue months
  const nonCertSources = [
    ...experience.flatMap((e) => [e.title.source, e.dates.source, ...e.bullets.map((b) => b.source)]),
    ...education.flatMap((e) => [e.degree.source, e.dates.source, ...e.details.map((b) => b.source)]),
    ...projects.flatMap((p) => [
      p.summary.source,
      p.problem?.source,
      ...p.approach.map((a) => a.source),
      ...p.outcomes.map((o) => o.source),
    ]),
    ...machines.flatMap((m) => m.plaque.map((c) => c.source)),
    ...decisions.map((d) => d.statement.source),
    ...skills.map((s) => s.source),
    ...profile.flatMap((p) => [
      p.name.source,
      p.title.source,
      p.headline.source,
      ...p.lead.map((l) => l.source),
    ]),
  ].filter((s): s is string => typeof s === 'string');
  for (const s of nonCertSources)
    if (s.startsWith('info.md')) errors.push(`info.md used outside certification months: ${s}`);

  return {
    errors,
    counts: {
      profile: profile.length,
      experience: experience.length,
      education: education.length,
      certifications: certifications.length,
      projects: projects.length,
      decisions: decisions.length,
      skills: skills.length,
      machines: machines.length,
      events: events.length,
    },
  };
}

if (process.argv[1] && /validate-content\.ts$/.test(process.argv[1])) {
  const { errors, counts } = validateContent();
  console.log('counts', counts);
  if (errors.length) {
    console.error(`✖ content: ${errors.length} problem(s)`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log('✔ content: all cross-references valid');
}
