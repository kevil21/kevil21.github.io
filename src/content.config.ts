import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import {
  profileSchema,
  experienceSchema,
  projectSchema,
  skillSchema,
  technologySchema,
  certificationSchema,
  educationSchema,
  decisionSchema,
  evidenceSchema,
  journeySchema,
} from './lib/schema';

export const collections = {
  profile: defineCollection({
    loader: glob({ pattern: '*.json', base: './content/profile' }),
    schema: profileSchema,
  }),
  experience: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/experience' }),
    schema: experienceSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/projects' }),
    schema: projectSchema,
  }),
  skills: defineCollection({ loader: file('./content/skills/skills.json'), schema: skillSchema }),
  technologies: defineCollection({
    loader: file('./content/technologies/technologies.json'),
    schema: technologySchema,
  }),
  certifications: defineCollection({
    loader: file('./content/certifications/certifications.json'),
    schema: certificationSchema,
  }),
  education: defineCollection({
    loader: file('./content/education/education.json'),
    schema: educationSchema,
  }),
  decisions: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/decisions' }),
    schema: decisionSchema,
  }),
  evidence: defineCollection({ loader: file('./content/evidence/evidence.json'), schema: evidenceSchema }),
  journeys: defineCollection({ loader: file('./content/journeys/journeys.json'), schema: journeySchema }),
};
