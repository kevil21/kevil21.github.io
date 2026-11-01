/** Content helpers shared by pages: labels, source links, date formatting, sorted collection loaders. */
import { getCollection, type CollectionEntry } from 'astro:content';

export { LABEL_CAPTION, sourceHref, sourceLabel, fmtMonth, fmtRange } from './sources';

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function loadExperience() {
  return (await getCollection('experience')).sort(byOrder);
}
export async function loadEducation() {
  return (await getCollection('education')).sort(byOrder);
}
export async function loadCertifications() {
  return (await getCollection('certifications')).sort(byOrder);
}
export async function loadProjects() {
  return (await getCollection('projects')).sort(byOrder);
}
export async function loadMachines() {
  return (await getCollection('machines')).sort((a, b) => a.data.bay - b.data.bay);
}
export async function loadDecisions() {
  return await getCollection('decisions');
}
export async function loadSkills() {
  return await getCollection('skills');
}
export async function loadCaseStudies() {
  return (await getCollection('caseStudies')).sort(byOrder);
}

export type ProjectEntry = CollectionEntry<'projects'>;
export type MachineEntry = CollectionEntry<'machines'>;
export type DecisionEntry = CollectionEntry<'decisions'>;

export const SKILL_GROUP_LABEL: Record<CollectionEntry<'skills'>['data']['group'], string> = {
  languages: 'Languages',
  'ai-ml': 'AI / ML',
  cloud: 'Cloud',
  'dev-tools': 'Dev / Tools',
  'data-observability': 'Data / Observability',
};
