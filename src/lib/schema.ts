/**
 * Content schemas. Every published claim carries a `source` pointer into KPOS (or info.md for certificate months)
 * and a `label` saying how it may be presented. This is the contract behind "everything is true".
 */
import { z } from 'zod';

/** `KPOS/site/index.html#L481` · `KPOS/site/app.js#L1602-L1611` · `KPOS/site/Kevil_Resume_2026.md#L27` · `info.md#L104` */
export const sourcePointer = z
  .string()
  .regex(
    /^(KPOS\/[A-Za-z0-9_./-]+#L\d+(-L?\d+)?|info\.md#L\d+(-L?\d+)?)$/,
    'source must be KPOS/<path>#L<n>[-L<m>] or info.md#L<n>',
  );

/** Fact-ledger id, e.g. F-C15. */
export const ledgerId = z.string().regex(/^F-[A-Z]\d{2}[a-z]?$/, 'ledger id like F-C15');

export const claimLabel = z.enum([
  'public', // publish as-is
  'resume', // verbatim, shown with "as stated in résumé"
  'site-case-study', // number only present in the old site's case-study modal
  'info-md', // certificate issue month from info.md
  'sample', // simulation parameter, not a fact
]);

export const claim = z.object({
  text: z.string().min(1),
  source: sourcePointer,
  ledger: ledgerId.optional(),
  label: claimLabel.default('public'),
});
export type Claim = z.infer<typeof claim>;

export const link = z.object({
  label: z.string().min(1),
  href: z.url(),
  kind: z.enum(['repo', 'verify', 'issuer', 'org', 'profile', 'other']).default('other'),
});

const monthRe = /^\d{4}-(0[1-9]|1[0-2])$/;
export const yearMonth = z.string().regex(monthRe, 'YYYY-MM');
export const yearOnly = z.string().regex(/^\d{4}$/, 'YYYY');

export const dateRange = z.object({
  start: z.union([yearMonth, yearOnly]),
  end: z.union([yearMonth, yearOnly, z.literal('present')]).optional(),
  precision: z.enum(['month', 'year']).default('month'),
  source: sourcePointer,
});

export const machineSlug = z.enum([
  'telemetry-refinery',
  'policy-sorter',
  'forecast-engine',
  'data-workbench',
  'calibration-bench',
  'foundations-generator',
]);
export type MachineSlug = z.infer<typeof machineSlug>;

export const experienceSchema = z.object({
  org: z.string(),
  orgUrl: z.url().optional(),
  title: claim,
  dates: dateRange,
  location: z.string().optional(),
  bullets: z.array(claim).min(1),
  tags: z.array(z.string()).default([]),
  machine: machineSlug.optional(),
  order: z.number().int(),
});

export const educationSchema = z.object({
  institution: z.string(),
  institutionUrl: z.url().optional(),
  degree: claim,
  dates: dateRange,
  details: z.array(claim).default([]),
  order: z.number().int(),
});

export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.enum(['AWS', 'Microsoft', 'Founderz']),
  credentialId: z.string().optional(),
  verify: link.optional(),
  verifyNote: z.string().optional(),
  issued: yearMonth.optional(),
  issuedSource: sourcePointer.optional(),
  expires: yearMonth.optional(),
  lifetime: z.boolean().default(false),
  source: sourcePointer,
  ledger: ledgerId,
  order: z.number().int(),
});

export const decisionSchema = z.object({
  id: z.string().regex(/^D-[A-Z0-9-]+$/),
  machine: machineSlug,
  title: z.string(),
  /** Decision text verbatim or near-verbatim from the source. */
  statement: claim,
  /** The one-line narration the Operator uses when it acts on this decision. */
  narration: z.string(),
  /** Optional machine control it maps to. */
  control: z.string().optional(),
});

export const projectSchema = z.object({
  name: z.string(),
  kind: z.enum(['flagship', 'project']),
  machine: machineSlug,
  station: z.string().optional(),
  summary: claim,
  year: yearOnly.optional(),
  yearSource: sourcePointer.optional(),
  problem: claim.optional(),
  approach: z.array(claim).default([]),
  outcomes: z.array(claim).default([]),
  stack: z.array(z.string()).default([]),
  stackSource: sourcePointer.optional(),
  links: z.array(link).default([]),
  decisions: z.array(z.string()).default([]),
  order: z.number().int(),
});

export const skillSchema = z.object({
  name: z.string(),
  group: z.enum(['languages', 'ai-ml', 'cloud', 'dev-tools', 'data-observability']),
  source: sourcePointer,
  /** Machines this skill cable runs between (from APP 982 SKILL_USED_IN). */
  usedIn: z.array(machineSlug).default([]),
  usedInSource: sourcePointer.optional(),
  aliases: z.array(z.string()).default([]),
});

export const machineSchema = z.object({
  slug: machineSlug,
  name: z.string(),
  subtitle: z.string(),
  /** What it embodies, in one sentence. */
  embodies: z.string(),
  bay: z.number().int().min(1).max(6),
  /** Plaque claims shown on the machine and in its HTML twin. */
  plaque: z.array(claim).min(1),
  controls: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      kind: z.enum(['range', 'toggle', 'select', 'lever', 'button']),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
      options: z.array(z.string()).optional(),
      default: z.union([z.number(), z.boolean(), z.string()]),
      sample: z.literal(true).default(true),
      note: z.string().optional(),
    }),
  ),
  readouts: z.array(z.object({ id: z.string(), label: z.string(), unit: z.string().optional() })),
  projects: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  caseStudy: z.string().optional(),
});

export const profileSchema = z.object({
  name: claim,
  title: claim,
  titleShort: z.string(),
  headline: claim,
  employer: claim,
  employerUrl: z.url(),
  location: claim,
  email: claim,
  lead: z.array(claim),
  openTo: claim,
  languages: claim,
  quote: claim.optional(),
  links: z.array(link),
});

export const eventSchema = z.object({
  month: z.union([yearMonth, yearOnly]),
  label: z.string(),
  kind: z.enum(['education', 'role', 'community', 'project', 'certification', 'expiry']),
  source: sourcePointer,
});
