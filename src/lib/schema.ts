/**
 * Canonical content schemas. Used by Astro content collections (src/content.config.ts) AND by the
 * Build Brain scripts (scripts/lib/load-content.ts) so UI and AI share one model.
 */
import { z } from 'zod';

export const sourceRef = z
  .string()
  .regex(
    /^(KPOS|Resume)\/[^\s]+$/,
    'source must point into KPOS/ (or the recorded Resume/info.md deviation)',
  );

export const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'expected YYYY or YYYY-MM');

export const claimSchema = z.object({
  text: z.string().min(3),
  source: sourceRef,
  selfReported: z.boolean().default(true),
});

export const skillCategories = ['languages', 'ai', 'cloud', 'dev', 'data', 'practice'] as const;
export type SkillCategory = (typeof skillCategories)[number];

export const profileSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  title: z.string(),
  shortTitle: z.string(),
  headline: z.string(),
  taglines: z.array(z.string()).min(1),
  locations: z.array(z.object({ city: z.string(), region: z.string().optional(), country: z.string() })),
  email: z.email(),
  links: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      url: z.url(),
      kind: z.enum(['code', 'social', 'learning', 'credentials', 'models']),
    }),
  ),
  about: z.array(claimSchema),
  quote: z.object({ text: z.string(), source: sourceRef }).optional(),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  availability: z.object({ text: z.string(), source: sourceRef }).optional(),
  photos: z.array(
    z.object({ id: z.string(), alt: z.string(), role: z.enum(['avatar', 'portrait', 'context']) }),
  ),
  sources: z.array(sourceRef),
});

export const experienceSchema = z.object({
  org: z.string(),
  orgUrl: z.url().optional(),
  role: z.string(),
  kind: z.enum(['role', 'community']),
  employmentType: z.enum(['full-time', 'internship', 'volunteer']),
  start: yearMonth,
  end: yearMonth.or(z.literal('present')),
  location: z.string().optional(),
  summary: z.string(),
  highlights: z.array(claimSchema).min(1),
  skills: z.array(z.string()),
  technologies: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  photo: z.string().optional(),
  order: z.number().int(),
  sources: z.array(sourceRef).min(1),
});

export const architectureSchema = z.object({
  nodes: z.array(
    z.object({ id: z.string(), label: z.string(), sub: z.string().optional(), col: z.number().int() }),
  ),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })),
  source: sourceRef,
});

export const projectSchema = z.object({
  name: z.string(),
  shortName: z.string().optional(),
  tagline: z.string(),
  kind: z.enum(['flagship', 'open-source', 'academic', 'pilot', 'learning']),
  org: z.string().optional(),
  parent: z.string(),
  period: z.object({
    start: yearMonth.optional(),
    end: yearMonth.or(z.literal('present')).optional(),
    label: z.string(),
    note: z.string().optional(),
  }),
  summary: z.string(),
  problem: z.string().optional(),
  approach: z.array(z.string()).default([]),
  outcomes: z.array(claimSchema).default([]),
  stack: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  architecture: architectureSchema.optional(),
  featured: z.boolean().default(false),
  order: z.number().int(),
  sources: z.array(sourceRef).min(1),
});

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(skillCategories),
  yearsSelfReported: z.number().positive().optional(),
  summary: z.string().optional(),
  source: sourceRef,
});

export const technologySchema = z.object({
  id: z.string(),
  name: z.string(),
  skill: z.string(),
  url: z.url().optional(),
  source: sourceRef,
});

export const certificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  issuer: z.string(),
  issuerId: z.enum(['aws', 'microsoft', 'github', 'founderz']),
  issued: yearMonth.optional(),
  issuedSource: sourceRef.optional(),
  expires: yearMonth.or(z.literal('none')).optional(),
  credentialId: z.string().optional(),
  verifyUrl: z.url(),
  verifyNote: z.string().optional(),
  skills: z.array(z.string()).default([]),
  sources: z.array(sourceRef).min(1),
});

export const educationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  url: z.url().optional(),
  degree: z.string(),
  field: z.string().optional(),
  location: z.string(),
  start: yearMonth,
  end: yearMonth,
  grade: z.object({ label: z.string(), value: z.string() }),
  highlights: z.array(claimSchema).default([]),
  photo: z.string().optional(),
  sources: z.array(sourceRef).min(1),
});

export const decisionSchema = z.object({
  title: z.string(),
  project: z.string(),
  context: z.string(),
  decision: z.string(),
  consequence: z.string().optional(),
  order: z.number().int(),
  source: sourceRef,
});

export const evidenceSchema = z.object({
  id: z.string(),
  kind: z.enum(['repository', 'credential', 'profile', 'organisation', 'document', 'live']),
  title: z.string(),
  url: z.url(),
  supports: z.array(z.string()).min(1),
  note: z.string().optional(),
  source: sourceRef,
});

export const personaIds = ['recruiter', 'engineer', 'architect'] as const;
export type PersonaId = (typeof personaIds)[number];

export const journeySchema = z.object({
  id: z.enum(personaIds),
  title: z.string(),
  duration: z.string(),
  intro: z.string(),
  steps: z.array(z.object({ node: z.string(), why: z.string() })).min(3),
});

export type Claim = z.infer<typeof claimSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Experience = z.infer<typeof experienceSchema> & { id: string; body?: string };
export type Project = z.infer<typeof projectSchema> & { id: string; body?: string };
export type Skill = z.infer<typeof skillSchema>;
export type Technology = z.infer<typeof technologySchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Decision = z.infer<typeof decisionSchema> & { id: string };
export type Evidence = z.infer<typeof evidenceSchema>;
export type Journey = z.infer<typeof journeySchema>;

/** Everything the UI and the Build Brain need, as plain data. */
export interface KnowledgeData {
  profile: Profile;
  experience: Experience[];
  projects: Project[];
  skills: Skill[];
  technologies: Technology[];
  certifications: Certification[];
  education: Education[];
  decisions: Decision[];
  evidence: Evidence[];
  journeys: Journey[];
}
