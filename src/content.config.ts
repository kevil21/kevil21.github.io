import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { file, glob } from 'astro/loaders';
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
  machineSlug,
} from '@/lib/schema';

/**
 * Content collections — the content model behind the hall. JSON arrays under src/content/ (one file per family, each
 * entry with an `id`), validated by Zod so that no claim ships without a source pointer. Case-study prose is Markdown
 * with validated frontmatter; its facts come from the projects/decisions collections, the prose only narrates them.
 */
export const collections = {
  profile: defineCollection({ loader: file('src/content/profile.json'), schema: profileSchema }),
  experience: defineCollection({ loader: file('src/content/experience.json'), schema: experienceSchema }),
  education: defineCollection({ loader: file('src/content/education.json'), schema: educationSchema }),
  certifications: defineCollection({
    loader: file('src/content/certifications.json'),
    schema: certificationSchema,
  }),
  projects: defineCollection({ loader: file('src/content/projects.json'), schema: projectSchema }),
  decisions: defineCollection({ loader: file('src/content/decisions.json'), schema: decisionSchema }),
  skills: defineCollection({ loader: file('src/content/skills.json'), schema: skillSchema }),
  machines: defineCollection({ loader: file('src/content/machines.json'), schema: machineSchema }),
  events: defineCollection({ loader: file('src/content/events.json'), schema: eventSchema }),
  caseStudies: defineCollection({
    loader: glob({ pattern: '*.md', base: 'src/content/case-studies' }),
    schema: z.object({
      title: z.string(),
      project: z.string(), // id in projects.json
      machine: machineSlug,
      summary: z.string(),
      order: z.number().int(),
    }),
  }),
};
