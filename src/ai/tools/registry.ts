/**
 * The agentic tool boundary (plan.md §8, ADR-013). The model may only emit these names with these
 * argument shapes; everything else is rejected before it reaches the executor.
 */
import { z } from 'zod';
import type { ToolCall, ToolName } from '../protocol';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const section = z.enum([
  'trace',
  'work',
  'skills',
  'credentials',
  'education',
  'resume',
  'match',
  'journeys',
  'observatory',
  'ask',
  'compare',
]);

export const toolSchemas = {
  navigateTo: z.object({ section }),
  filterProjects: z.object({
    skills: z.array(id).max(6).default([]),
    kinds: z
      .array(z.enum(['flagship', 'open-source', 'academic', 'pilot', 'learning']))
      .max(5)
      .default([]),
    query: z.string().max(80).default(''),
  }),
  openProject: z.object({ projectId: id }),
  highlightSkill: z.object({ skillId: id }),
  openResume: z.object({}),
  switchPersona: z.object({ persona: z.enum(['recruiter', 'engineer', 'architect']) }),
  showRelevantExperience: z.object({ skills: z.array(id).min(1).max(6) }),
  showEvidence: z.object({ nodeId: id }),
  compareProjects: z.object({ projectIds: z.array(id).min(2).max(3) }),
  resetWorkspace: z.object({}),
} satisfies Record<ToolName, z.ZodTypeAny>;

export const TOOL_NAMES = Object.keys(toolSchemas) as ToolName[];

export interface ToolDescription {
  name: ToolName;
  description: string;
  args: string;
}

/** Compact descriptions used in the Full Brain system prompt. */
export const TOOL_DESCRIPTIONS: ToolDescription[] = [
  {
    name: 'navigateTo',
    description: 'Go to a section of the site.',
    args: '{"section":"trace|work|skills|credentials|education|resume|match|journeys|observatory"}',
  },
  {
    name: 'filterProjects',
    description: 'Filter the project list by skill ids and/or kinds.',
    args: '{"skills":["skill-id"],"kinds":["flagship"]}',
  },
  { name: 'openProject', description: 'Open a project page.', args: '{"projectId":"a360"}' },
  {
    name: 'highlightSkill',
    description: 'Highlight every span that carries a skill.',
    args: '{"skillId":"observability"}',
  },
  { name: 'openResume', description: 'Open the résumé.', args: '{}' },
  {
    name: 'switchPersona',
    description: 'Change the viewing persona.',
    args: '{"persona":"recruiter|engineer|architect"}',
  },
  {
    name: 'showRelevantExperience',
    description: 'Show roles and projects relevant to skills.',
    args: '{"skills":["aws"]}',
  },
  { name: 'showEvidence', description: 'Open the evidence panel for a node.', args: '{"nodeId":"a360"}' },
  {
    name: 'compareProjects',
    description: 'Compare two or three projects side by side.',
    args: '{"projectIds":["a360","policy-to-pipelines"]}',
  },
  { name: 'resetWorkspace', description: 'Clear filters, highlights and selection.', args: '{}' },
];

export interface ValidatedToolCall {
  tool: ToolName;
  args: Record<string, unknown>;
}

/** Validate an untrusted tool call. Returns null when the call is not allowed. */
export function validateToolCall(raw: unknown): ValidatedToolCall | null {
  if (!raw || typeof raw !== 'object') return null;
  const { tool, args } = raw as Partial<ToolCall>;
  if (typeof tool !== 'string' || !(tool in toolSchemas)) return null;
  const schema = toolSchemas[tool as ToolName];
  const parsed = schema.safeParse(args ?? {});
  if (!parsed.success) return null;
  return { tool: tool as ToolName, args: parsed.data as Record<string, unknown> };
}

/** Extract tool calls from model text: accepts a ```tool fenced JSON block or inline {"tool":...} objects. */
export function extractToolCalls(text: string): ValidatedToolCall[] {
  const calls: ValidatedToolCall[] = [];
  const fenced = [...text.matchAll(/```(?:tool|json)?\s*([\s\S]*?)```/g)].map((m) => m[1] ?? '');
  const inline = [...text.matchAll(/\{\s*"tool"\s*:\s*"[a-zA-Z]+"[\s\S]*?\}\s*\}/g)].map((m) => m[0]);
  for (const candidate of [...fenced, ...inline]) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        const v = validateToolCall(item);
        if (v && !calls.some((c) => JSON.stringify(c) === JSON.stringify(v))) calls.push(v);
      }
    } catch {
      /* not JSON — ignore */
    }
  }
  return calls.slice(0, 3);
}

/** Remove tool JSON from the visible answer. */
export function stripToolCalls(text: string): string {
  return text
    .replace(/```(?:tool|json)?\s*[\s\S]*?```/g, '')
    .replace(/\{\s*"tool"\s*:\s*"[a-zA-Z]+"[\s\S]*?\}\s*\}/g, '')
    .trim();
}
