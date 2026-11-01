/**
 * The Operator's tool registry (fixed, Zod-validated) and the parser for a model's tool line. Executors live in
 * runtime/executors.ts and mutate application state only. Calls render as buttons; nothing runs without a click.
 */
import { z } from 'zod';
import { MAX_TOOL_CALLS } from './config';

export const machineSlug = z.enum([
  'telemetry-refinery',
  'policy-sorter',
  'forecast-engine',
  'data-workbench',
  'calibration-bench',
  'foundations-generator',
]);

export const TOOL_SCHEMAS = {
  walkTo: z.object({ machine: z.union([machineSlug, z.literal('control-room'), z.literal('hall-power')]) }),
  setControl: z.object({
    machine: machineSlug,
    control: z.string().min(1).max(40),
    value: z.union([z.number(), z.boolean(), z.string().max(40)]),
  }),
  runMachine: z.object({ machine: machineSlug }),
  openCaseStudy: z.object({ id: z.string().regex(/^[a-z0-9-]{2,40}$/) }),
  highlightSkill: z.object({ skill: z.string().min(1).max(40) }),
  showEvidence: z.object({ nodeId: z.string().min(1).max(80) }),
  openResume: z.object({}),
  startTour: z.object({}),
  switchLens: z.object({ lens: z.enum(['recruiter', 'engineer']) }),
  resetFloor: z.object({}),
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;
export type ToolArgs<T extends ToolName> = z.infer<(typeof TOOL_SCHEMAS)[T]>;

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
  preview: string;
}

export const PREVIEWS: Record<ToolName, (args: Record<string, unknown>) => string> = {
  walkTo: (a) => `Walk to ${String(a['machine']).replace(/-/g, ' ')}`,
  setControl: (a) =>
    `Set ${String(a['control'])} to ${String(a['value'])} on the ${String(a['machine']).replace(/-/g, ' ')}`,
  runMachine: (a) => `Run the ${String(a['machine']).replace(/-/g, ' ')}`,
  openCaseStudy: (a) => `Open the ${String(a['id'])} case study`,
  highlightSkill: (a) => `Light the ${String(a['skill'])} cable on the ceiling`,
  showEvidence: (a) => `Show evidence ${String(a['nodeId'])}`,
  openResume: () => 'Open the résumé',
  startTour: () => 'Start the 90-second tour',
  switchLens: (a) => `Switch to the ${String(a['lens'])} lens`,
  resetFloor: () => 'Reset every machine to its defaults',
};

/** Validate one call. Returns null when the name is unknown or the args fail the schema. */
export function validateCall(input: unknown): ToolCall | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const name = (o['tool'] ?? o['name']) as string | undefined;
  if (!name || !(name in TOOL_SCHEMAS)) return null;
  const schema = TOOL_SCHEMAS[name as ToolName];
  const args = (o['args'] ?? o['arguments'] ?? {}) as Record<string, unknown>;
  const parsed = schema.safeParse(args);
  if (!parsed.success) return null;
  const n = name as ToolName;
  return {
    name: n,
    args: parsed.data as Record<string, unknown>,
    preview: PREVIEWS[n](parsed.data as Record<string, unknown>),
  };
}

/** Parse a model's trailing JSON line: one object or an array; at most MAX_TOOL_CALLS valid calls survive. */
export function parseToolLine(line: string | null): ToolCall[] {
  if (!line) return [];
  try {
    const v = JSON.parse(line) as unknown;
    const list = Array.isArray(v) ? v : ((v as { tools?: unknown[] }).tools ?? [v]);
    return list
      .map(validateCall)
      .filter((c): c is ToolCall => c !== null)
      .slice(0, MAX_TOOL_CALLS);
  } catch {
    return [];
  }
}
