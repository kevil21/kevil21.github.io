/** Astro-side loader: turns content collections into the plain KnowledgeData shape. Server only. */
import { getCollection } from 'astro:content';
import type { KnowledgeData } from '../schema';

let cache: Promise<KnowledgeData> | undefined;

export function loadKnowledge(): Promise<KnowledgeData> {
  if (cache) return cache;
  cache = (async () => {
    const [
      profile,
      experience,
      projects,
      skills,
      technologies,
      certifications,
      education,
      decisions,
      evidence,
      journeys,
    ] = await Promise.all([
      getCollection('profile'),
      getCollection('experience'),
      getCollection('projects'),
      getCollection('skills'),
      getCollection('technologies'),
      getCollection('certifications'),
      getCollection('education'),
      getCollection('decisions'),
      getCollection('evidence'),
      getCollection('journeys'),
    ]);
    const p = profile[0];
    if (!p) throw new Error('content/profile is empty');
    return {
      profile: p.data,
      experience: experience
        .map((e) => ({ id: e.id, ...e.data, body: e.body }))
        .sort((a, b) => a.order - b.order),
      projects: projects
        .map((e) => ({ id: e.id, ...e.data, body: e.body }))
        .sort((a, b) => a.order - b.order),
      skills: skills.map((e) => e.data),
      technologies: technologies.map((e) => e.data),
      certifications: certifications.map((e) => e.data),
      education: education.map((e) => e.data),
      decisions: decisions.map((e) => ({ id: e.id, ...e.data })).sort((a, b) => a.order - b.order),
      evidence: evidence.map((e) => e.data),
      journeys: journeys.map((e) => e.data),
    } satisfies KnowledgeData;
  })();
  return cache;
}
