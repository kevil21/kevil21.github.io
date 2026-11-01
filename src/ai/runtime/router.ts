/**
 * The Operator's plan: understand → retrieve → verify → act → explain.
 * Deterministic path (always): parse → search → scripted answer if an intent matches, else an extractive answer built
 * from the top chunks → tool proposals. Full path (opt-in): the model writes prose with [n] citations and an optional
 * tool line; the router drops uncited sentences and falls back to the deterministic answer when no prose survives.
 */
import type { Chunk, NlpParse, SearchHit } from '../protocol';
import type { PocketClient } from './pocket-client';
import type { FullClient } from './full-client';
import { ground, hasEvidence, REFUSAL } from '../grounding';
import { parseToolLine, validateCall, type ToolCall } from '../tools';
import type { ScriptedAnswer } from '../answers';

export type PlanStep = 'understand' | 'retrieve' | 'verify' | 'act' | 'explain';
export type StepState = 'pending' | 'running' | 'done' | 'skipped';

export interface Citation {
  n: number;
  chunk: Chunk;
}

export interface OperatorAnswer {
  query: string;
  parse: NlpParse;
  hits: SearchHit[];
  mode: 'lexical' | 'hybrid';
  path: 'scripted' | 'extractive' | 'model' | 'refusal' | 'declined';
  sentences: Array<{ text: string; cites: number[] }>;
  citations: Citation[];
  tools: ToolCall[];
  groundedness: number;
  coverage: number;
  refused: boolean;
  nearest: Chunk | null;
  modelNote?: string;
}

const PERSONAL =
  /\b(salary|compensation|pay|weakness|weaknesses|hobby|hobbies|phone|age|married|religion|politic|address)\b/i;

export function declinedTopic(query: string): boolean {
  return PERSONAL.test(query);
}

function pickScripted(answers: ScriptedAnswer[], query: string, intent: string): ScriptedAnswer | null {
  const q = query.toLowerCase();
  const byPattern = answers.find((a) => a.patterns.some((p) => q.includes(p)));
  if (byPattern) return byPattern;
  const byIntent = answers.find((a) => a.intent === intent);
  return byIntent ?? null;
}

function extractive(
  hits: SearchHit[],
  pocket: PocketClient,
): { sentences: OperatorAnswer['sentences']; citations: Citation[] } {
  const citations: Citation[] = [];
  const sentences: OperatorAnswer['sentences'] = [];
  hits.slice(0, 3).forEach((h) => {
    const c = pocket.chunk(h.id);
    if (!c) return;
    const n = citations.length + 1;
    citations.push({ n, chunk: c });
    sentences.push({ text: `${c.text} [${n}]`, cites: [n] });
  });
  return { sentences, citations };
}

function toolsForParse(parse: NlpParse, hits: SearchHit[], pocket: PocketClient): ToolCall[] {
  const tools: ToolCall[] = [];
  const machine = parse.entities.find((e) => e.kind === 'machine');
  const top = hits[0] ? pocket.chunk(hits[0].id) : undefined;
  const slug = machine ? machine.text.toLowerCase().replace(/ /g, '-') : top?.machine;
  if (slug) {
    const t = validateCall({ tool: 'walkTo', args: { machine: slug } });
    if (t) tools.push(t);
  }
  const project = parse.entities.find((e) => e.kind === 'project');
  if (project) {
    const id = top?.id.startsWith('project:') ? top.id.split(':')[1] : undefined;
    const t = id ? validateCall({ tool: 'openCaseStudy', args: { id } }) : null;
    if (t) tools.push(t);
  }
  if (parse.skills[0]) {
    const t = validateCall({ tool: 'highlightSkill', args: { skill: parse.skills[0] } });
    if (t) tools.push(t);
  }
  return tools.slice(0, 3);
}

export const SYSTEM_PROMPT = `You are the Operator of Kevil Patel's laboratory website. Answer ONLY from the numbered evidence below. Every sentence must end with a citation like [1] or [2]. If the evidence does not cover the question, reply exactly: "${REFUSAL}" Never mention salary, weaknesses, hobbies or phone numbers. Keep it under 90 words. Write prose first; optionally add ONE final line of JSON for a tool: {"tool":"walkTo","args":{"machine":"telemetry-refinery"}} using only these tools: walkTo, setControl, runMachine, openCaseStudy, highlightSkill, showEvidence, openResume, startTour, switchLens, resetFloor.`;

export function buildPrompt(
  query: string,
  citations: Citation[],
): Array<{ role: 'system' | 'user'; content: string }> {
  const evidence = citations.map((c) => `[${c.n}] ${c.chunk.text} (source ${c.chunk.source})`).join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Evidence:\n${evidence}\n\nQuestion: ${query}` },
  ];
}

export interface RouteOptions {
  full?: FullClient | null;
  onStep?: (step: PlanStep, state: StepState) => void;
  onDelta?: (text: string) => void;
  /** "Ask the machines": restrict evidence to one machine's chunks and answer in its voice (no scripted answers). */
  voice?: string;
}

export async function route(
  query: string,
  pocket: PocketClient,
  opts: RouteOptions = {},
): Promise<OperatorAnswer> {
  const step = (s: PlanStep, st: StepState) => opts.onStep?.(s, st);
  step('understand', 'running');
  const parse = await pocket.parse(query);
  step('understand', 'done');

  if (declinedTopic(query) || parse.intent === 'refuse-personal') {
    step('retrieve', 'skipped');
    step('verify', 'skipped');
    step('act', 'skipped');
    step('explain', 'done');
    return {
      query,
      parse,
      hits: [],
      mode: 'lexical',
      path: 'declined',
      sentences: [
        {
          text: 'The lab does not discuss salary, weaknesses, hobbies or personal details. It can tell you about the work, the decisions and the credentials.',
          cites: [],
        },
      ],
      citations: [],
      tools: [],
      groundedness: 0,
      coverage: 0,
      refused: true,
      nearest: null,
    };
  }

  step('retrieve', 'running');
  const searched = await pocket.search(query, opts.voice ? 16 : 8);
  const mode = searched.mode;
  const hits = opts.voice
    ? searched.hits.filter((h) => pocket.chunk(h.id)?.machine === opts.voice).slice(0, 8)
    : searched.hits;
  step('retrieve', 'done');

  step('verify', 'running');
  const scripted = opts.voice ? null : pickScripted(pocket.answers, query, parse.intent);
  const evidence = hasEvidence(hits) || scripted !== null;
  if (!evidence) {
    step('verify', 'done');
    step('act', 'skipped');
    step('explain', 'done');
    const nearest = hits[0] ? (pocket.chunk(hits[0].id) ?? null) : null;
    return {
      query,
      parse,
      hits,
      mode,
      path: 'refusal',
      sentences: [{ text: REFUSAL, cites: [] }],
      citations: nearest ? [{ n: 1, chunk: nearest }] : [],
      tools: [],
      groundedness: 0,
      coverage: 0,
      refused: true,
      nearest,
    };
  }

  // Deterministic answer (scripted beats extractive)
  let citations: Citation[];
  let sentences: OperatorAnswer['sentences'];
  let path: OperatorAnswer['path'];
  if (scripted && scripted.cites.every((id) => pocket.chunk(id))) {
    citations = scripted.cites.map((id, i) => ({ n: i + 1, chunk: pocket.chunk(id)! }));
    const g = ground(scripted.text, citations.length);
    sentences = g.sentences.length ? g.sentences : [{ text: scripted.text, cites: [] }];
    path = 'scripted';
  } else {
    const ex = extractive(hits, pocket);
    citations = ex.citations;
    sentences = ex.sentences;
    path = 'extractive';
  }
  step('verify', 'done');

  step('act', 'running');
  let tools: ToolCall[] =
    scripted?.tools
      ?.map((t) => validateCall({ tool: t.name, args: t.args }))
      .filter((t): t is ToolCall => t !== null) ?? [];
  if (!tools.length) tools = toolsForParse(parse, hits, pocket);
  step('act', 'done');

  step('explain', 'running');
  let modelNote: string | undefined;
  const full = opts.full;
  if (full && full.state.status === 'ready') {
    // Model path: retrieval evidence (top 5) → prose with citations → grounding filter → fallback
    const evidenceCites = hits
      .slice(0, 5)
      .map((h, i) => ({ n: i + 1, chunk: pocket.chunk(h.id)! }))
      .filter((c) => c.chunk);
    const use = evidenceCites.length ? evidenceCites : citations;
    try {
      let streamed = '';
      const gen = full.generate(buildPrompt(query, use), (d) => {
        streamed += d;
        opts.onDelta?.(streamed);
      });
      const text = await gen.promise;
      const g = ground(text, use.length);
      const modelTools = parseToolLine(g.toolLine);
      if (g.sentences.length && !text.includes(REFUSAL)) {
        step('explain', 'done');
        return {
          query,
          parse,
          hits,
          mode,
          path: 'model',
          sentences: g.sentences,
          citations: use,
          tools: modelTools.length ? modelTools : tools,
          groundedness: g.groundedness,
          coverage: g.coverage,
          refused: false,
          nearest: null,
          ...(g.dropped.length ? { modelNote: `${g.dropped.length} uncited sentence(s) dropped` } : {}),
        };
      }
      if (text.includes(REFUSAL) && path === 'extractive') {
        // The model read the same evidence and declined: trust the decline over a loosely matched extractive answer.
        step('explain', 'done');
        const nearest = use[0]?.chunk ?? null;
        return {
          query,
          parse,
          hits,
          mode,
          path: 'refusal',
          sentences: [{ text: REFUSAL, cites: [] }],
          citations: nearest ? [{ n: 1, chunk: nearest }] : [],
          tools: [],
          groundedness: 0,
          coverage: 0,
          refused: true,
          nearest,
          modelNote: 'the model declined; the nearest real evidence is shown',
        };
      }
      modelNote = text.includes(REFUSAL)
        ? 'model declined; showing the deterministic answer'
        : 'model returned no cited prose; showing the deterministic answer';
    } catch (e) {
      modelNote = `model error (${(e as Error).message}); deterministic answer`;
    }
  }
  step('explain', 'done');
  const cited = new Set(sentences.flatMap((s) => s.cites));
  return {
    query,
    parse,
    hits,
    mode,
    path,
    sentences,
    citations,
    tools,
    groundedness: sentences.length ? sentences.filter((s) => s.cites.length).length / sentences.length : 0,
    coverage: citations.length ? cited.size / citations.length : 0,
    refused: false,
    nearest: null,
    ...(modelNote ? { modelNote } : {}),
  };
}
