import { z } from 'zod';

export const SCHEMA_VERSION = 1;
export const idSchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/).max(80);
const text = z.string().trim().min(1).max(4000);
const shortText = text.max(240);
const strings = z.array(shortText).max(200).refine((items) => new Set(items).size === items.length, 'Duplicate values');
const refs = z.array(idSchema).max(200).refine((items) => new Set(items).size === items.length, 'Duplicate references');
const evidenceRefs = refs.refine((items) => items.length > 0, 'Evidence is required');

export const httpsUrlSchema = z.url().max(2048).refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.port
    && !/[\s\\]/.test(value) && url.hostname.includes('.')
    && !/^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname)
    && !/\.(?:local|internal|localhost)$/.test(url.hostname);
}, 'Only public HTTPS links without credentials are permitted');

export const domainSchema = z.enum(['observability', 'governance', 'intelligence', 'craft']);
export const personaSchema = z.enum(['recruiter', 'engineer', 'architect']);
export const profileSchema = z.strictObject({
  id: idSchema, name: shortText, role: shortText, location: shortText, summary: text,
  email: z.email(),
  links: z.array(z.strictObject({ id: idSchema, label: shortText, url: httpsUrlSchema })).min(1).max(30),
  languages: strings.refine((items) => items.length > 0, 'Languages are required'),
});
export const projectSchema = z.strictObject({
  id: idSchema, title: shortText, subtitle: shortText, domain: domainSchema, summary: text,
  technologies: strings.refine((items) => items.length > 0, 'Technologies are required'),
  evidenceIds: evidenceRefs,
  perspectives: z.strictObject({ recruiter: text, engineer: text, architect: text }),
  url: httpsUrlSchema.optional(),
});
export const experienceSchema = z.strictObject({
  id: idSchema, title: shortText, organization: shortText, period: shortText, summary: text, evidenceIds: evidenceRefs,
});
export const skillSchema = z.strictObject({
  id: idSchema, name: shortText, category: shortText, evidenceIds: evidenceRefs,
});
export const certificationSchema = z.strictObject({
  id: idSchema, title: shortText, issuer: shortText, credentialId: shortText.optional(),
  url: httpsUrlSchema, verificationNote: text, evidenceIds: evidenceRefs,
});
export const educationSchema = z.strictObject({
  id: idSchema, title: shortText, institution: shortText, period: shortText, detail: text, evidenceIds: evidenceRefs,
});
export const achievementSchema = z.strictObject({
  id: idSchema, title: shortText, summary: text, evidenceIds: evidenceRefs,
});
export const evidenceSchema = z.strictObject({
  id: idSchema, title: shortText, text,
  source: z.enum(['Public résumé (2026)', 'Public portfolio (source snapshot)']),
  sourceSection: shortText, projectIds: refs, skillIds: refs,
});
export const journeySchema = z.strictObject({
  id: idSchema, title: shortText, description: text,
  projectIds: refs.refine((items) => items.length > 0, 'Journey must contain projects'), persona: personaSchema,
});
export const decisionSchema = z.strictObject({
  id: idSchema, title: shortText, summary: text, evidenceIds: evidenceRefs,
});

const list = <T extends z.ZodType>(schema: T) => z.array(schema).min(1).max(500);
const shape = z.strictObject({
  profile: profileSchema, projects: list(projectSchema), experience: list(experienceSchema),
  skills: list(skillSchema), certifications: list(certificationSchema), education: list(educationSchema),
  achievements: z.array(achievementSchema).max(100), evidence: list(evidenceSchema),
  journeys: list(journeySchema), decisions: z.array(decisionSchema).max(100),
  resume: z.strictObject({ title: shortText, summary: text }),
});

/** Structural/cross-link validation is not independent verification of a personal claim. */
export const portfolioSchema = shape.superRefine((data, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  const groups = ['projects', 'experience', 'skills', 'certifications', 'education', 'achievements', 'evidence', 'journeys', 'decisions'] as const;
  const ids = new Set(['resume']); // Reserved generated document ID.
  const register = (id: string, path: (string | number)[]) => {
    if (ids.has(id)) issue(path, `Duplicate global ID: ${id}`);
    ids.add(id);
  };
  register(data.profile.id, ['profile', 'id']);
  data.profile.links.forEach((link, index) => register(link.id, ['profile', 'links', index, 'id']));
  for (const group of groups) data[group].forEach((item, index) => register(item.id, [group, index, 'id']));

  const evidence = new Map(data.evidence.map((item) => [item.id, item]));
  const projects = new Map(data.projects.map((item) => [item.id, item]));
  const skills = new Map(data.skills.map((item) => [item.id, item]));
  for (const group of groups) {
    data[group].forEach((item, index) => {
      if ('evidenceIds' in item) item.evidenceIds.forEach((id, refIndex) => {
        const record = evidence.get(id);
        const path = [group, index, 'evidenceIds', refIndex];
        if (!record) issue(path, `Unknown evidence: ${id}`);
        else if (group === 'projects' && !record.projectIds.includes(item.id)) issue(path, 'Project/evidence links must be reciprocal');
        else if (group === 'skills' && !record.skillIds.includes(item.id)) issue(path, 'Skill/evidence links must be reciprocal');
      });
    });
  }
  data.evidence.forEach((item, index) => {
    for (const [field, records] of [['projectIds', projects], ['skillIds', skills]] as const) {
      item[field].forEach((id, refIndex) => {
        const record = records.get(id);
        if (!record) issue(['evidence', index, field, refIndex], `Unknown reference: ${id}`);
        else if (!record.evidenceIds.includes(item.id)) issue(['evidence', index, field, refIndex], 'Evidence links must be reciprocal');
      });
    }
  });
  data.journeys.forEach((item, index) => item.projectIds.forEach((id, refIndex) => {
    if (!projects.has(id)) issue(['journeys', index, 'projectIds', refIndex], `Unknown project: ${id}`);
  }));

  // Defence in depth, not a substitute for reviewing approved public source excerpts.
  const audit = (value: unknown, path: (string | number)[]) => {
    if (typeof value === 'string') {
      if (/(?:^|\s)(?:\/Users\/|\/home\/)/.test(value)
        || /(?:tel:|(?:\+\d[\d ()-]{8,}\d)|file:\/\/|Memory\/|Projects\/|\.docx\b|authorized_users|\/subscriptions\/)/i.test(value)) {
        issue(path, 'Prohibited phone, filesystem path, private source, or internal identifier');
      }
      if (/\b\d+(?:\.\d+)?\s*(?:%|percent\b|households\b|students\b|materialized views\b|tenants\b|repositories\b|agents\b)/i.test(value)) {
        issue(path, 'Unvalidated quantitative claims are not publishable');
      }
    } else if (Array.isArray(value)) value.forEach((item: unknown, index) => audit(item, [...path, index]));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => audit(item, [...path, key]));
  };
  audit(data, []);
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Achievement = z.infer<typeof achievementSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Journey = z.infer<typeof journeySchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type Domain = z.infer<typeof domainSchema>;
export type Persona = z.infer<typeof personaSchema>;