/**
 * AI request router (plan.md §5, §11). One entry point: ask(query). Retrieval always runs first
 * (Pocket). If the Full Brain is loaded it generates a grounded answer; otherwise the Pocket Brain
 * returns a pre-generated answer or ranked evidence. Every path yields clickable evidence.
 */
import type { AnswerEntry, RetrievedChunk, ToolCall } from '../protocol';
import { aiState } from '@/lib/stores/ai';
import { persona as personaStore } from '@/lib/stores/persona';
import { buildSystemPrompt, buildUserPrompt, citationsIn } from '../full/grounding';
import {
  extractToolCalls,
  stripToolCalls,
  validateToolCall,
  type ValidatedToolCall,
} from '../tools/registry';
import { getPocketClient } from './pocket-client';

export interface AskResult {
  path: 'full' | 'pocket' | 'lexical' | 'static';
  text: string;
  /** raw model output (full path only) for the observatory/debugging; never rendered as HTML */
  raw?: string;
  evidence: RetrievedChunk[];
  tools: ValidatedToolCall[];
  answer?: AnswerEntry | null;
  fallbackReason?: string;
}

export interface AskHandlers {
  onToken?: (delta: string) => void;
  onStatus?: (s: string) => void;
}

const NOT_DEMONSTRATED =
  'The portfolio does not demonstrate that. Only skills, projects and credentials recorded in the source material are shown; nothing is inferred.';

export async function ask(
  query: string,
  handlers: AskHandlers = {},
): Promise<{ result: Promise<AskResult>; cancel: () => void }> {
  const pocket = getPocketClient();
  let cancelGen: (() => void) | null = null;
  let cancelled = false;
  const run = async (): Promise<AskResult> => {
    handlers.onStatus?.('retrieving evidence');
    let retrieved: { chunks: RetrievedChunk[]; answer: AnswerEntry | null; mode: 'lexical' | 'semantic' };
    try {
      retrieved = await pocket.search(query, 8);
    } catch (err) {
      aiState.setKey('lastPath', 'static');
      return {
        path: 'static',
        text: 'Search is unavailable right now. Browse the trace, projects and skills directly.',
        evidence: [],
        tools: [],
        fallbackReason: err instanceof Error ? err.message : String(err),
      };
    }
    const persona = personaStore.get();
    const state = aiState.get();
    if (state.full === 'ready' && !cancelled) {
      try {
        const { getFullClient } = await import('./full-client');
        const full = getFullClient();
        handlers.onStatus?.('generating on device');
        const system = buildSystemPrompt(persona, retrieved.chunks);
        const { promise, cancel } = full.generate(
          system,
          [{ role: 'user', content: buildUserPrompt(query, persona) }],
          (d) => handlers.onToken?.(d),
        );
        cancelGen = cancel;
        const raw = await promise;
        const tools = extractToolCalls(raw);
        const text = stripToolCalls(raw);
        const cited = citationsIn(text, retrieved.chunks);
        const evidence = cited.length ? cited : retrieved.chunks.slice(0, 3);
        aiState.setKey('lastPath', 'full');
        aiState.setKey(
          'lastEvidence',
          evidence.map((e) => e.id),
        );
        // Small models sometimes return only an action (or malformed JSON) with no prose. Keep the action,
        // but take the visible answer from the deterministic tier so nothing is claimed or denied without evidence.
        const looksLikeJsonOnly =
          /^[\s`]*[[{][\s\S]*[\]}][\s`]*$/.test(text.trim()) || !/[a-z]{3,}\s+[a-z]{2,}/i.test(text);
        if (text.trim().length >= 12 && !looksLikeJsonOnly)
          return { path: 'full', text, evidence, tools, raw };
        const fallbackText =
          retrieved.answer?.answer ??
          (retrieved.chunks.length
            ? `Closest evidence in the portfolio for “${query.trim()}”:`
            : NOT_DEMONSTRATED);
        return {
          path: 'full',
          text: fallbackText,
          evidence,
          tools,
          raw,
          fallbackReason: 'model returned an action without prose',
        };
      } catch (err) {
        if (cancelled)
          return {
            path: 'full',
            text: '',
            evidence: retrieved.chunks.slice(0, 3),
            tools: [],
            fallbackReason: 'cancelled',
          };
        handlers.onStatus?.('full brain failed · falling back');
        aiState.setKey('lastError', `full: ${err instanceof Error ? err.message : String(err)}`);
        // fall through to pocket
      }
    }
    const path = retrieved.mode === 'semantic' ? 'pocket' : 'lexical';
    aiState.setKey('lastPath', path);
    if (retrieved.answer) {
      const evidence = retrieved.answer.evidence.length
        ? retrieved.chunks
            .filter((c) => retrieved.answer!.evidence.includes(c.id))
            .concat(retrieved.chunks.filter((c) => !retrieved.answer!.evidence.includes(c.id)))
            .slice(0, 5)
        : retrieved.chunks.slice(0, 3);
      aiState.setKey(
        'lastEvidence',
        evidence.map((e) => e.id),
      );
      const tools = (retrieved.answer.tools ?? [])
        .map((t: ToolCall) => validateToolCall(t))
        .filter((t): t is ValidatedToolCall => Boolean(t));
      return { path, text: retrieved.answer.answer, evidence, tools, answer: retrieved.answer };
    }
    if (retrieved.chunks.length) {
      const top = retrieved.chunks.slice(0, 4);
      aiState.setKey(
        'lastEvidence',
        top.map((e) => e.id),
      );
      return {
        path,
        text: `Closest evidence in the portfolio for “${query.trim()}”:`,
        evidence: top,
        tools: [],
      };
    }
    aiState.setKey('lastEvidence', []);
    return { path, text: NOT_DEMONSTRATED, evidence: [], tools: [] };
  };
  return {
    result: run(),
    cancel: () => {
      cancelled = true;
      cancelGen?.();
    },
  };
}
