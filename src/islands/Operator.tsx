/**
 * The Operator console: ask → visible plan (understand → retrieve → verify → act → explain) → NLP strip → grounded
 * answer with numbered citations → tool buttons (one-line preview; nothing runs without a click) → trust gauges.
 * Pocket tier always; semantic retrieval loads on request (auto only on fine-pointer devices); Full tier opt-in with
 * size shown first, progress and cancel, never auto on mobile. JD matcher tab: Strong / Related / Not demonstrated.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { PocketClient, type SemanticState } from '@/ai/runtime/pocket-client';
import {
  FullClient,
  checkFullEligibility,
  resolveModel,
  type FullEligibility,
  type FullState,
} from '@/ai/runtime/full-client';
import { route, type OperatorAnswer, type PlanStep, type StepState } from '@/ai/runtime/router';
import { executeTool } from '@/ai/runtime/executors';
import { FULL_MODELS } from '@/ai/config';
import type { JdRequirement } from '@/ai/protocol';
import type { ToolCall } from '@/ai/tools';
import { sourceHref, sourceLabel } from '@/lib/sources';
import { startLens, lens as lensStore } from '@/ai/runtime/lens';
import { useStore } from '@nanostores/preact';
import { announce } from '@/scripts/shell';
import { MACHINE_VOICE } from '@/hall/eggs';

const STEPS: PlanStep[] = ['understand', 'retrieve', 'verify', 'act', 'explain'];
const SUGGESTIONS = [
  'What is A360?',
  'How does Policy → Pipelines score risk?',
  'Which certifications does Kevil hold?',
  'Tell me about the LSTM forecasting work',
  'How can I contact Kevil?',
  'Any secrets on the floor?',
];

interface Props {
  mode?: 'ask' | 'jd';
  initialQuery?: string;
}

export default function Operator({ mode: initialMode = 'ask', initialQuery = '' }: Props) {
  const pocket = useRef<PocketClient | null>(null);
  const full = useRef<FullClient | null>(null);
  const [ready, setReady] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retrieval, setRetrieval] = useState<'worker' | 'inline'>('worker');
  const [semantic, setSemantic] = useState<SemanticState>({ status: 'idle' });
  const [elig, setElig] = useState<FullEligibility | null>(null);
  const [fullState, setFullState] = useState<FullState>({ status: 'idle' });
  const [modelChoice, setModelChoice] = useState(FULL_MODELS[0]!.id);
  const [mode, setMode] = useState<'ask' | 'jd'>(initialMode);

  // WAI-ARIA tabs: arrows / Home / End move between the two tabs (the selected one is the only tab stop).
  const onTabKey = (e: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const next: 'ask' | 'jd' =
      e.key === 'Home' ? 'ask' : e.key === 'End' ? 'jd' : mode === 'ask' ? 'jd' : 'ask';
    setMode(next);
    requestAnimationFrame(() => document.getElementById(`op-tab-${next}`)?.focus());
  };
  const [query, setQuery] = useState(initialQuery);
  const [steps, setSteps] = useState<Record<PlanStep, StepState>>({
    understand: 'pending',
    retrieve: 'pending',
    verify: 'pending',
    act: 'pending',
    explain: 'pending',
  });
  const [answer, setAnswer] = useState<OperatorAnswer | null>(null);
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{
    answers: number;
    refusals: number;
    groundedSum: number;
    coverageSum: number;
  }>({ answers: 0, refusals: 0, groundedSum: 0, coverageSum: 0 });
  const [toolLog, setToolLog] = useState<string[]>([]);
  const [jd, setJd] = useState('');
  const [jdResult, setJdResult] = useState<JdRequirement[] | null>(null);
  const currentLens = useStore(lensStore);
  const [voice, setVoice] = useState<string | null>(null);

  useEffect(() => {
    startLens();
    const p = new PocketClient();
    pocket.current = p;
    p.onSemantic = (s) => setSemantic(s);
    void p
      .init()
      .then(async () => {
        setRetrieval(p.mode);
        setReady('ready');
        const e = await checkFullEligibility();
        setElig(e);
        // semantic retrieval: auto only on fine-pointer, non-Save-Data devices (inherited rule); otherwise a button
        const saveData = Boolean(
          (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
        );
        if (!e.coarsePointer && !saveData && p.mode === 'worker') p.loadSemantic();
        const params = new URLSearchParams(window.location.search);
        const q = initialQuery || params.get('q') || '';
        const v = params.get('voice');
        if (v && MACHINE_VOICE[v]) setVoice(v);
        if (q) {
          setQuery(q);
          void ask(q, v && MACHINE_VOICE[v] ? v : null);
        }
      })
      .catch(() => setReady('error'));
    return () => {
      p.dispose();
      full.current?.dispose();
    };
  }, []);

  async function ask(q: string, v: string | null = voice) {
    const p = pocket.current;
    if (!p || !q.trim() || busy) return;
    setBusy(true);
    setAnswer(null);
    setStreaming('');
    setSteps({
      understand: 'pending',
      retrieve: 'pending',
      verify: 'pending',
      act: 'pending',
      explain: 'pending',
    });
    const result = await route(q, p, {
      full: full.current,
      onStep: (s, st) => setSteps((prev) => ({ ...prev, [s]: st })),
      onDelta: (t) => setStreaming(t),
      ...(v ? { voice: v } : {}),
    });
    setAnswer(result);
    setHistory((h) => ({
      answers: h.answers + 1,
      refusals: h.refusals + (result.refused ? 1 : 0),
      groundedSum: h.groundedSum + result.groundedness,
      coverageSum: h.coverageSum + result.coverage,
    }));
    setBusy(false);
    announce(
      result.refused
        ? 'The lab has no evidence for that.'
        : `Answer ready with ${result.citations.length} citations and ${result.tools.length} proposed actions.`,
    );
  }

  function runTool(call: ToolCall) {
    const p = pocket.current;
    if (!p) return;
    const r = executeTool(call, p.chunks);
    setToolLog((l) => [`${call.preview} → ${r.narration}`, ...l].slice(0, 6));
    announce(r.narration);
  }

  function enableFull() {
    if (!elig?.eligible) return;
    const m = resolveModel(modelChoice, elig.shaderF16);
    const f = full.current ?? new FullClient();
    full.current = f;
    f.onState = (s) => setFullState(s);
    f.load(m.id);
  }

  async function matchJd() {
    const p = pocket.current;
    if (!p || !jd.trim()) return;
    setBusy(true);
    const r = await p.matchJd(jd);
    setJdResult(r);
    setBusy(false);
    announce(
      `${r.length} requirements matched: ${r.filter((x) => x.verdict === 'strong').length} strong, ${r.filter((x) => x.verdict === 'related').length} related, ${r.filter((x) => x.verdict === 'not-demonstrated').length} not demonstrated.`,
    );
  }

  const chosen = useMemo(
    () => FULL_MODELS.find((m) => m.id === modelChoice) ?? FULL_MODELS[0]!,
    [modelChoice],
  );
  const tierLabel =
    fullState.status === 'ready'
      ? `Full · ${fullState.modelId}`
      : semantic.status === 'ready'
        ? 'Pocket · lexical + semantic'
        : retrieval === 'inline'
          ? 'Pocket · lexical (inline)'
          : 'Pocket · lexical';

  return (
    <section class="op" aria-label="Operator console" data-operator-ready={ready}>
      <header class="op__head">
        <div>
          <span class="eyebrow">Operator · on-device agent</span>
          {voice && (
            <p class="op__voice" data-voice={voice}>
              <span class="eyebrow">Ask the machines</span> {MACHINE_VOICE[voice]}{' '}
              <button type="button" class="op__chip" onClick={() => setVoice(null)}>
                back to the Operator
              </button>
            </p>
          )}
          <p class="op__tier mono" data-tier>
            {ready === 'loading'
              ? 'loading the fact ledger…'
              : ready === 'error'
                ? 'index unavailable — the résumé and the floor are the sources'
                : tierLabel}
          </p>
        </div>
        <div class="op__tabs">
          <div role="tablist" aria-label="Operator modes" class="op__tablist" onKeyDown={onTabKey}>
            <button
              type="button"
              role="tab"
              id="op-tab-ask"
              aria-selected={mode === 'ask'}
              aria-controls="op-panel-ask"
              tabIndex={mode === 'ask' ? 0 : -1}
              class="op__tab"
              onClick={() => setMode('ask')}
            >
              Ask
            </button>
            <button
              type="button"
              role="tab"
              id="op-tab-jd"
              aria-selected={mode === 'jd'}
              aria-controls="op-panel-jd"
              tabIndex={mode === 'jd' ? 0 : -1}
              class="op__tab"
              onClick={() => setMode('jd')}
            >
              Match a job description
            </button>
          </div>
          <button
            type="button"
            class="op__tab op__lens"
            data-action="lens"
            aria-pressed={currentLens === 'engineer'}
          >
            Lens: {currentLens}
          </button>
        </div>
      </header>

      {mode === 'ask' && (
        <div class="op__pane" role="tabpanel" id="op-panel-ask" aria-labelledby="op-tab-ask">
          <form
            class="op__form"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(query);
            }}
          >
            <label for="op-q" class="visually-hidden">
              Ask the lab
            </label>
            <input
              id="op-q"
              class="op__input"
              type="text"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder="Ask about the machines, the decisions, the credentials…"
              autocomplete="off"
              disabled={ready !== 'ready'}
            />
            <button type="submit" class="op__ask" disabled={ready !== 'ready' || busy}>
              {busy ? 'Working…' : 'Ask'}
            </button>
          </form>
          <ul class="op__suggest" role="list">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  class="op__chip"
                  disabled={ready !== 'ready' || busy}
                  onClick={() => {
                    setQuery(s);
                    void ask(s);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>

          <ol class="op__plan" aria-label="Operator plan" role="list">
            {STEPS.map((s) => (
              <li key={s} class={`op__step op__step--${steps[s]}`} data-step={s} data-state={steps[s]}>
                <span class="op__dot" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ol>

          {answer && (
            <div class="op__answer" data-path={answer.path}>
              <div class="op__nlp" aria-label="How the question was parsed">
                <span class="op__nlp-k">intent</span>{' '}
                <span class="op__nlp-v mono">{answer.parse.intent}</span>
                {answer.parse.entities.map((e, i) => (
                  <span key={i} class={`op__ent op__ent--${e.kind}`}>
                    {e.text} <small>{e.kind}</small>
                  </span>
                ))}
                <span class="op__nlp-k">retrieval</span>{' '}
                <span class="op__nlp-v mono">
                  {answer.mode} · {answer.hits.length} hits
                </span>
              </div>
              <div class="op__prose" aria-live="polite">
                {answer.sentences.map((s, i) => (
                  <p key={i} class={s.cites.length ? '' : 'op__uncited'}>
                    {s.text}
                  </p>
                ))}
                {answer.refused && answer.nearest && (
                  <p class="op__nearest">Nearest real evidence: {answer.nearest.text} [1]</p>
                )}
                {answer.modelNote && <p class="as-stated">{answer.modelNote}</p>}
              </div>
              {answer.citations.length > 0 && (
                <ol class="op__cites" aria-label="Citations">
                  {answer.citations.map((c) => (
                    <li key={c.n} id={`cite-${c.n}`}>
                      <span class="mono">[{c.n}]</span>{' '}
                      {c.chunk.url ? (
                        <a href={c.chunk.url}>
                          {c.chunk.text.length > 110 ? c.chunk.text.slice(0, 107) + '…' : c.chunk.text}
                        </a>
                      ) : (
                        c.chunk.text
                      )}{' '}
                      <small class="op__src">
                        {sourceHref(c.chunk.source) ? (
                          <a href={sourceHref(c.chunk.source)!} rel="noopener noreferrer external">
                            {sourceLabel(c.chunk.source)}
                          </a>
                        ) : (
                          sourceLabel(c.chunk.source)
                        )}
                        {c.chunk.label === 'resume'
                          ? ' · as stated in résumé'
                          : c.chunk.label === 'site-case-study'
                            ? " · previous site's case study"
                            : ''}
                      </small>
                    </li>
                  ))}
                </ol>
              )}
              {answer.tools.length > 0 && (
                <div class="op__tools" aria-label="Proposed actions">
                  <span class="eyebrow">Proposed actions · nothing moves until you click</span>
                  <div class="op__toolrow">
                    {answer.tools.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        class="op__tool"
                        onClick={() => runTool(t)}
                        title={`${t.name}(${JSON.stringify(t.args)})`}
                      >
                        <span class="mono op__toolname">{t.name}</span> {t.preview}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <dl class="op__gauges" aria-label="Trust instruments">
                <div>
                  <dt>groundedness</dt>
                  <dd class="mono">{Math.round(answer.groundedness * 100)}%</dd>
                  <small>cited sentences ÷ sentences</small>
                </div>
                <div>
                  <dt>evidence coverage</dt>
                  <dd class="mono">{Math.round(answer.coverage * 100)}%</dd>
                  <small>cited chunks ÷ retrieved</small>
                </div>
                <div>
                  <dt>refusals</dt>
                  <dd class="mono">
                    {history.refusals}/{history.answers}
                  </dd>
                  <small>declined for lack of evidence</small>
                </div>
              </dl>
            </div>
          )}
          {streaming && !answer && <p class="op__prose op__streaming">{streaming}</p>}
          {toolLog.length > 0 && (
            <ul class="op__log" role="list" aria-label="Executed actions">
              {toolLog.map((l, i) => (
                <li key={i} class="mono">
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === 'jd' && (
        <div class="op__jd" role="tabpanel" id="op-panel-jd" aria-labelledby="op-tab-jd">
          <label for="op-jd" class="op__label">
            Paste a job description. Each requirement is classified as Strong, Related or Not demonstrated,
            with proof links. No percentages.
          </label>
          <textarea
            id="op-jd"
            class="op__textarea"
            rows={8}
            value={jd}
            onInput={(e) => setJd((e.target as HTMLTextAreaElement).value)}
            placeholder="Requirements…"
          />
          <button
            type="button"
            class="op__ask"
            disabled={ready !== 'ready' || busy || !jd.trim()}
            onClick={() => void matchJd()}
          >
            Match
          </button>
          {jdResult && (
            <table class="op__table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Verdict</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {jdResult.map((r, i) => (
                  <tr key={i} data-verdict={r.verdict}>
                    <td>
                      {r.text}
                      <br />
                      <small class="mono op__terms">{r.terms.slice(0, 6).join(' · ')}</small>
                    </td>
                    <td>
                      <span class={`op__verdict op__verdict--${r.verdict}`}>
                        {r.verdict === 'strong'
                          ? 'Strong'
                          : r.verdict === 'related'
                            ? 'Related'
                            : 'Not demonstrated'}
                      </span>
                    </td>
                    <td>
                      {r.proof.length ? (
                        <ul role="list">
                          {r.proof.map((p) => (
                            <li key={p.id}>{p.url ? <a href={p.url}>{p.label}</a> : p.label}</li>
                          ))}
                        </ul>
                      ) : (
                        <span class="as-stated">no evidence = no claim</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <details class="op__full">
        <summary>Local language model (optional)</summary>
        <div class="op__fullbody">
          <p>
            The Operator already answers from the fact ledger with citations. A local model can write grounded
            prose instead of assembling it. It runs in your browser on WebGPU and nothing leaves your device.
          </p>
          {semantic.status === 'idle' && retrieval === 'worker' && (
            <button type="button" class="op__tool" onClick={() => pocket.current?.loadSemantic()}>
              Load semantic retrieval (≈23 MB MiniLM + 14 MB runtime)
            </button>
          )}
          {semantic.status === 'loading' && (
            <p class="mono">
              semantic retrieval: downloading {semantic.file ?? ''}{' '}
              {semantic.total ? Math.round((semantic.loaded / semantic.total) * 100) : 0}%
            </p>
          )}
          {semantic.status === 'ready' && <p class="mono">semantic retrieval ready · {semantic.model}</p>}
          {semantic.status === 'error' && (
            <p class="mono">semantic retrieval unavailable: {semantic.message} (lexical search continues)</p>
          )}
          {elig && !elig.eligible && (
            <p class="mono">Full tier unavailable here: {elig.blockers.join('; ')}.</p>
          )}
          {elig?.eligible && fullState.status === 'idle' && (
            <div class="op__fullrow">
              <label for="op-model">Model</label>
              <select
                id="op-model"
                value={modelChoice}
                onChange={(e) => setModelChoice((e.target as HTMLSelectElement).value)}
              >
                {FULL_MODELS.filter((m) => m.requiresF16).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · {m.approxDownloadMB} MB
                  </option>
                ))}
              </select>
              <button type="button" class="op__ask" onClick={enableFull}>
                Download {resolveModel(chosen.id, elig.shaderF16).approxDownloadMB} MB and enable
              </button>
              {elig.coarsePointer && (
                <p class="as-stated">On a touch device this is never automatic; the download is large.</p>
              )}
              <p class="as-stated">
                {chosen.license} · {resolveModel(chosen.id, elig.shaderF16).id}
                {elig.shaderF16 ? '' : ' (f32 variant: no shader-f16)'} · cached by the browser
              </p>
            </div>
          )}
          {fullState.status === 'loading' && (
            <div class="op__fullrow">
              <progress max={1} value={fullState.progress} aria-label="Model download" />
              <p class="mono">{fullState.text}</p>
              <button type="button" class="op__tool" onClick={() => full.current?.cancel()}>
                Cancel
              </button>
            </div>
          )}
          {fullState.status === 'ready' && (
            <p class="mono" data-full-ready>
              Full tier ready · {fullState.modelId} · loaded in {full.current?.loadSeconds.toFixed(1)} s
            </p>
          )}
          {fullState.status === 'error' && (
            <p class="mono">
              Full tier failed: {fullState.message}
              {fullState.fatal ? ' — back on Pocket.' : ''}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
