import type { KnowledgeData } from '../schema';
import { buildGraph, validateGraph } from './graph';
import { buildTrace } from './spans';

/** Cross-collection validation: dangling references, duplicate ids, journey steps, profile photos. */
export function validateKnowledge(data: KnowledgeData): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const collect = (label: string, list: { id: string }[]) => {
    for (const item of list) {
      if (ids.has(item.id)) problems.push(`${label}: duplicate id across collections "${item.id}"`);
      ids.add(item.id);
    }
  };
  collect('experience', data.experience);
  collect('projects', data.projects);
  collect('skills', data.skills);
  collect('certifications', data.certifications);
  collect('education', data.education);
  collect('decisions', data.decisions);
  collect('evidence', data.evidence);
  // technologies may legitimately share an id with a skill (python, typescript); check others
  const skillIds = new Set(data.skills.map((s) => s.id));
  for (const t of data.technologies) {
    if (!skillIds.has(t.skill)) problems.push(`technology ${t.id}: unknown skill "${t.skill}"`);
    if (ids.has(t.id) && !skillIds.has(t.id))
      problems.push(`technology ${t.id}: id collides with a non-skill node`);
  }
  try {
    const g = buildGraph(data);
    problems.push(...validateGraph(g));
    for (const j of data.journeys) {
      j.steps.forEach((s, i) => {
        if (!g.nodes.has(s.node)) problems.push(`journey ${j.id} step ${i + 1}: unknown node "${s.node}"`);
      });
    }
    buildTrace(data);
  } catch (err) {
    problems.push(err instanceof Error ? err.message : String(err));
  }
  for (const x of data.experience) {
    for (const p of x.projects)
      if (!data.projects.some((pr) => pr.id === p))
        problems.push(`experience ${x.id}: unknown project "${p}"`);
    if (x.photo && !data.profile.photos.some((ph) => ph.id === x.photo))
      problems.push(`experience ${x.id}: unknown photo "${x.photo}"`);
  }
  for (const p of data.projects) {
    for (const d of p.decisions)
      if (!data.decisions.some((dd) => dd.id === d))
        problems.push(`project ${p.id}: unknown decision "${d}"`);
  }
  for (const d of data.decisions) {
    const proj = data.projects.find((p) => p.id === d.project);
    if (!proj) problems.push(`decision ${d.id}: unknown project "${d.project}"`);
    else if (!proj.decisions.includes(d.id))
      problems.push(`decision ${d.id}: not listed in project ${proj.id}`);
  }
  return problems;
}
