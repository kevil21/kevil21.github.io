/**
 * Scripted, sourced answers for common intents (the deterministic path the router falls back to when no model is
 * loaded or the model returns no prose). An answer is a list of PARTS: each part names exactly one chunk and renders as
 * exactly one sentence ending in its own [n] citation, so a citation can never attach to someone else's text.
 */
import type { Chunk } from './protocol';
import type { ContentBundle } from './chunks';

export interface AnswerPart {
  /** Chunk id this sentence is built from (and cites). */
  cite: string;
  /** Optional lead-in written by the lab (never a fact), e.g. "The sync service re-runs safely:". */
  lead?: string;
  /** Decision chunks read "title: statement — narration"; `statement` keeps only the part before the narration. */
  clip?: 'statement';
}

export interface ScriptedAnswer {
  intent: string;
  patterns: string[]; // lowercase substrings / keywords
  parts: AnswerPart[];
  /** Derived: the chunk ids in citation order. */
  cites: string[];
  tools?: Array<{ name: string; args: Record<string, unknown>; preview: string }>;
  /** Parts with no evidence behind them (tour, notebook): a plain sentence without citations. */
  plain?: string;
}

const NARRATION_SEP = ' — ';

function clipText(chunk: Chunk, clip?: AnswerPart['clip']): string {
  if (clip === 'statement') return chunk.text.split(NARRATION_SEP)[0] ?? chunk.text;
  return chunk.text;
}

/** Render a scripted answer as grounded sentences: one per part, each with its own citation number. */
export function renderScripted(
  answer: ScriptedAnswer,
  chunks: Chunk[],
): Array<{ text: string; cites: number[] }> {
  if (answer.plain !== undefined && answer.parts.length === 0) return [{ text: answer.plain, cites: [] }];
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const out: Array<{ text: string; cites: number[] }> = [];
  answer.parts.forEach((p, i) => {
    const chunk = byId.get(p.cite);
    if (!chunk) return;
    const body = clipText(chunk, p.clip).replace(/\s+/g, ' ').trim();
    const sentence = `${p.lead ? `${p.lead} ` : ''}${body}`.replace(/[.!?]*$/, '');
    out.push({ text: `${sentence}. [${i + 1}]`, cites: [i + 1] });
  });
  return out;
}

type ToolSpec = NonNullable<ScriptedAnswer['tools']>[number];
const walk = (machine: string, label: string): ToolSpec => ({
  name: 'walkTo',
  args: { machine },
  preview: `Walk to the ${label}`,
});

function make(
  intent: string,
  patterns: string[],
  parts: AnswerPart[],
  tools?: ScriptedAnswer['tools'],
  plain?: string,
): ScriptedAnswer {
  return {
    intent,
    patterns,
    parts,
    cites: parts.map((p) => p.cite),
    ...(tools ? { tools } : {}),
    ...(plain !== undefined ? { plain } : {}),
  };
}

export function buildAnswers(_bundle: ContentBundle, chunks: Chunk[]): ScriptedAnswer[] {
  const out: ScriptedAnswer[] = [];
  const ids = new Set(chunks.map((c) => c.id));
  /** Keep only parts whose chunk exists, so a content change can never leave a dangling citation. */
  const keep = (parts: AnswerPart[]) => parts.filter((p) => ids.has(p.cite));
  const add = (
    intent: string,
    patterns: string[],
    parts: AnswerPart[],
    tools?: ScriptedAnswer['tools'],
    plain?: string,
  ) => {
    const kept = keep(parts);
    if (kept.length || plain !== undefined) out.push(make(intent, patterns, kept, tools, plain));
  };

  add(
    'who',
    [
      'who is kevil',
      'who are you',
      'about kevil',
      'introduce',
      'what do you do',
      'tell me about yourself',
      'summary',
    ],
    [{ cite: 'profile:title' }, { cite: 'profile:lead-0' }],
    [{ name: 'openResume', args: {}, preview: 'Open the résumé' }],
  );
  add(
    'a360',
    ['a360', 'observability platform', 'agent observability', 'telemetry refinery', 'refinery'],
    [
      { cite: 'project:a360:summary' },
      { cite: 'exp:kyndryl:bullet-1' },
      { cite: 'decision:D-A360-SYNC-OVERLAP', lead: 'The sync service re-runs safely:', clip: 'statement' },
    ],
    [
      walk('telemetry-refinery', 'Telemetry Refinery'),
      { name: 'openCaseStudy', args: { id: 'a360' }, preview: 'Open the A360 case study' },
    ],
  );
  add(
    'p2p',
    [
      'p2p',
      'policy to pipelines',
      'policy → pipelines',
      'policy sorter',
      'langgraph',
      'governance',
      'guardrail',
      'drift',
    ],
    [
      { cite: 'project:p2p:summary' },
      { cite: 'decision:D-P2P-GUARDRAILS-FIRST', clip: 'statement' },
      { cite: 'project:p2p:outcome-0' },
    ],
    [
      walk('policy-sorter', 'Policy Sorter'),
      { name: 'openCaseStudy', args: { id: 'p2p' }, preview: 'Open the P2P case study' },
    ],
  );
  add(
    'forecasting',
    [
      'lstm',
      'forecast',
      'time series',
      'time-series',
      'climate',
      'smart energy',
      'energy',
      'opticrop',
      'irrigation',
      'migration',
    ],
    [
      { cite: 'project:climate-mitigation:summary' },
      { cite: 'project:smart-energy:summary' },
      { cite: 'project:opticrop:summary' },
    ],
    [walk('forecast-engine', 'Forecast Engine')],
  );
  add(
    'elk',
    [
      'elk',
      'elasticsearch project',
      'kibana',
      'overlay',
      'incident ticket',
      'it asset',
      'data workbench',
      'workbench',
    ],
    [
      { cite: 'project:overlay-insights:summary' },
      { cite: 'project:incident-tickets:summary' },
      { cite: 'project:it-assets:summary' },
    ],
    [walk('data-workbench', 'Data Workbench')],
  );
  const certIds = chunks.filter((c) => c.id.startsWith('cert:')).map((c) => c.id);
  add(
    'certifications',
    ['certif', 'credential', 'aws certified', 'azure certified', 'founderz', 'calibration'],
    certIds.map((cite) => ({ cite })),
    [walk('calibration-bench', 'Calibration Bench')],
  );
  add(
    'education',
    [
      'education',
      'university',
      'college',
      'vit',
      'vellore',
      'degree',
      'cgpa',
      'school',
      'gdsc',
      'foundations',
    ],
    [{ cite: 'edu:vit' }, { cite: 'exp:gdsc:bullet-0' }],
    [walk('foundations-generator', 'Foundations Generator')],
  );
  add(
    'contact',
    ['contact', 'email', 'reach', 'hire', 'hiring', 'available', 'linkedin', 'github'],
    [{ cite: 'profile:email' }, { cite: 'profile:open-to' }],
  );
  add(
    'skills',
    ['skills', 'stack', 'technologies', 'languages', 'tools', 'what can you', 'proficien'],
    chunks.filter((c) => c.id.startsWith('skills:')).map((c) => ({ cite: c.id })),
  );
  add(
    'experience',
    ['experience', 'kyndryl', 'work history', 'job', 'role', 'intern', 'charly'],
    [{ cite: 'exp:kyndryl:role' }, { cite: 'exp:kyndryl:bullet-0' }, { cite: 'exp:charly:role' }],
    [{ name: 'openResume', args: {}, preview: 'Open the résumé' }],
  );
  add(
    'tour',
    ['tour', 'show me around', 'walk me', 'guide'],
    [],
    [{ name: 'startTour', args: {}, preview: 'Start the 90-second tour' }],
    'The guided tour visits every machine once in about ninety seconds. Press the button to start it.',
  );
  add(
    'secrets',
    ['secret', 'easter egg', 'hidden', 'night shift', 'lab notebook'],
    [],
    [{ name: 'showEvidence', args: { nodeId: 'lab-notebook' }, preview: 'Open the lab notebook' }],
    'The lab notebook lists every hidden switch on the floor. Nothing in it is invented; every egg is reachable by keyboard and touch.',
  );
  return out;
}
