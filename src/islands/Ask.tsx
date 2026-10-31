import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { aiState } from '@/lib/stores/ai';
import type { AskResult } from '@/ai/runtime/router';
import type { ValidatedToolCall } from '@/ai/tools/registry';
import { FULL_MODELS, DEFAULT_FULL_MODEL, COMPACT_FULL_MODEL, modelById } from '@/ai/full/models';
import type { Capabilities } from '@/ai/runtime/capability';

interface Turn {
  id: number;
  q: string;
  status: string;
  text: string;
  result?: AskResult;
  streaming: boolean;
}

const SUGGESTIONS = [
  "Show me Kevil's strongest cloud and AI projects",
  'Is Kevil certified on Azure?',
  'What decisions shaped A360?',
  'Which projects use Elasticsearch?',
  'Does Kevil have Kubernetes experience?',
  'Compare A360 and Policy → Pipelines',
];

export default function Ask({ knownIds }: { knownIds: string[] }) {
  const ai = useStore(aiState);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState('');
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [offer, setOffer] = useState<'hidden' | 'shown' | 'dismissed'>('hidden');
  const [chosenModel, setChosenModel] = useState<string>(DEFAULT_FULL_MODEL);
  const cancelRef = useRef<(() => void) | null>(null);
  const seq = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('@/ai/tools/executor').then((m) => m.setKnownIds(knownIds));
    import('@/ai/runtime/pocket-client').then(({ getPocketClient }) => getPocketClient());
    import('@/ai/runtime/capability').then(({ detectCapabilities }) =>
      detectCapabilities().then(async (c) => {
        setCaps(c);
        if (!c.fullBrainEligible) return;
        aiState.setKey('full', 'available');
        const { savedModel, getFullClient } = await import('@/ai/runtime/full-client');
        const saved = savedModel();
        const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
        setChosenModel(saved ?? (dm !== undefined && dm < 8 ? COMPACT_FULL_MODEL : DEFAULT_FULL_MODEL));
        if (saved) {
          // Previously consented on this device: load from cache (no new download unless evicted).
          getFullClient()
            .load(saved)
            .catch(() => {});
        } else if (c.autoOfferFullBrain) setOffer('shown');
      }),
    );
    const initial = new URLSearchParams(location.search).get('q');
    if (initial) {
      setQ(initial);
      void submit(initial);
    }
  }, []);

  const effectiveModel = (id: string) => {
    const m = modelById(id);
    if (m?.requiresF16 && caps && !caps.shaderF16 && m.f32Fallback) return m.f32Fallback;
    return id;
  };

  const enableFull = async () => {
    const { getFullClient } = await import('@/ai/runtime/full-client');
    setOffer('dismissed');
    try {
      await getFullClient().load(effectiveModel(chosenModel));
    } catch {
      /* state store carries the error; router falls back */
    }
  };
  const cancelLoad = async () => {
    const { getFullClient } = await import('@/ai/runtime/full-client');
    getFullClient().cancelLoad();
  };

  const submit = async (text: string) => {
    const query = text.trim();
    if (!query) return;
    cancelRef.current?.();
    const id = ++seq.current;
    setTurns((t) => [...t, { id, q: query, status: 'thinking', text: '', streaming: true }]);
    setQ('');
    const { ask } = await import('@/ai/runtime/router');
    const { result, cancel } = await ask(query, {
      onStatus: (s) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, status: s } : x))),
      onToken: (d) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, text: x.text + d } : x))),
    });
    cancelRef.current = cancel;
    const r = await result;
    if (r.raw && localStorage.getItem('trace:debug')) console.info('[trace] raw model output:', r.raw);
    setTurns((t) =>
      t.map((x) =>
        x.id === id ? { ...x, result: r, text: r.text || x.text, streaming: false, status: r.path } : x,
      ),
    );
    cancelRef.current = null;
    requestAnimationFrame(() =>
      listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    );
  };

  const runTool = async (call: ValidatedToolCall) => {
    const { executeTool } = await import('@/ai/tools/executor');
    executeTool(call);
  };

  const model = modelById(effectiveModel(chosenModel)) ?? FULL_MODELS[0]!;

  return (
    <div class="ask">
      <div class="ask__status" aria-live="polite">
        <span class={`status-pill`} data-tone={ai.pocket === 'semantic' ? 'ok' : 'info'}>
          pocket · {ai.pocket.replace('-', ' ')}
        </span>
        <span
          class="status-pill"
          data-tone={
            ai.full === 'ready' || ai.full === 'generating' ? 'ok' : ai.full === 'error' ? 'danger' : 'info'
          }
        >
          full · {ai.full}
          {ai.fullModel ? ` · ${ai.fullModel.split('-MLC')[0]}` : ''}
        </span>
        {(ai.full === 'downloading' || ai.full === 'loading') && (
          <span class="ask__progress">
            <progress value={ai.fullProgress} max={1} aria-label="Model download progress" />
            <span class="small faint mono">
              {Math.round(ai.fullProgress * 100)}% · {ai.fullProgressText.slice(0, 60)}
            </span>
            <button type="button" class="btn btn--ghost small" onClick={cancelLoad}>
              Cancel
            </button>
          </span>
        )}
      </div>

      {caps && caps.fullBrainEligible && ai.full === 'available' && offer !== 'dismissed' && (
        <section class="card ask__offer flow" aria-labelledby="offer-title">
          <span class="eyebrow" style="color: var(--ink-signal)">
            optional · full brain
          </span>
          <h2 id="offer-title" style="font-size:var(--fs-1)">
            Run a language model on this device?
          </h2>
          <p class="small muted">
            Your browser supports WebGPU{caps.shaderF16 ? ' with shader-f16' : ''}. The Full Brain generates
            grounded answers and can drive the UI with validated tool calls. It downloads once, runs in a Web
            Worker, and is cached by your browser. Nothing leaves your device.
          </p>
          <div class="ask__models" role="radiogroup" aria-label="Model">
            {FULL_MODELS.filter(
              (m) => m.requiresF16 === Boolean(caps.shaderF16) || (!caps.shaderF16 && !m.requiresF16),
            ).map((m) => (
              <label
                key={m.id}
                class={`ask__model ${chosenModel === m.id || effectiveModel(chosenModel) === m.id ? 'is-active' : ''}`}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={effectiveModel(chosenModel) === m.id}
                  onChange={() => setChosenModel(m.id)}
                />
                <span>
                  <strong>{m.label}</strong>
                  <span class="small faint mono">
                    ~{m.approxDownloadMB} MB download · ~{(m.vramMB / 1000).toFixed(1)} GB GPU memory ·{' '}
                    {m.license}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div class="cluster">
            <button type="button" class="btn btn--primary" onClick={enableFull}>
              Download {model.approxDownloadMB} MB and enable
            </button>
            <button type="button" class="btn btn--ghost" onClick={() => setOffer('dismissed')}>
              Not now — keep Pocket Brain
            </button>
          </div>
        </section>
      )}
      {caps && !caps.fullBrainEligible && (
        <p class="small faint">
          Full Brain not offered here: {caps.fullBrainBlockers.join('; ')}. Pocket Brain answers from
          pre-generated answers and ranked evidence.
        </p>
      )}
      {caps &&
        caps.fullBrainEligible &&
        !caps.autoOfferFullBrain &&
        ai.full === 'available' &&
        offer === 'hidden' && (
          <p class="small faint">
            This looks like a touch device, so the model download is not offered automatically.{' '}
            <button type="button" class="btn btn--ghost small" onClick={() => setOffer('shown')}>
              Show the Full Brain option anyway
            </button>
          </p>
        )}

      <div class="ask__turns" ref={listRef}>
        {turns.length === 0 && (
          <div class="ask__empty">
            <p class="muted">
              Ask anything about the work. Answers are grounded in the portfolio's evidence and always link to
              it. If something isn't demonstrated, the assistant says so.
            </p>
            <ul class="cluster" role="list">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button type="button" class="chip" onClick={() => void submit(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {turns.map((t) => (
          <article key={t.id} class={`turn ${t.streaming ? 'is-streaming' : ''}`} aria-busy={t.streaming}>
            <p class="turn__q">{t.q}</p>
            <div class="turn__a">
              <span
                class={`turn__path mono small ai-state--${t.streaming ? 'loading' : t.result?.path === 'full' ? 'semantic' : 'lexical'}`}
              >
                {t.streaming ? `${t.status}…` : `${t.result?.path ?? ''} path`}
              </span>
              <p class="turn__text">
                {t.text}
                {t.streaming && <span class="caret" aria-hidden="true" />}
              </p>
              {t.result && t.result.evidence.length > 0 && (
                <ol class="turn__evidence" role="list">
                  {t.result.evidence.map((e, i) => (
                    <li key={e.id} style={`--i:${i}`}>
                      <a href={e.url}>
                        <span class="mono small">[{i + 1}]</span>{' '}
                        {e.text.length > 160 ? e.text.slice(0, 157) + '…' : e.text}
                      </a>
                      <span class="small faint mono">
                        {' '}
                        · {e.kind}
                        {e.selfReported ? ' · self-reported' : ''} · {e.source.split('#')[0]}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {t.result && t.result.tools.length > 0 && (
                <div class="cluster turn__tools">
                  {t.result.tools.map((c) => (
                    <button key={c.tool} type="button" class="btn small" onClick={() => void runTool(c)}>
                      ▶ {c.tool}
                      <span class="mono faint small">{JSON.stringify(c.args).slice(0, 48)}</span>
                    </button>
                  ))}
                </div>
              )}
              {t.result?.fallbackReason && t.result.fallbackReason !== 'cancelled' && (
                <p class="small faint">fell back: {t.result.fallbackReason}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      <form
        class="ask__form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(q);
        }}
      >
        <label class="visually-hidden" for="ask-input">
          Your question
        </label>
        <input
          id="ask-input"
          type="text"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          placeholder="Ask about Kevil's work…"
          autocomplete="off"
          maxLength={400}
        />
        {turns.some((t) => t.streaming) ? (
          <button type="button" class="btn" onClick={() => cancelRef.current?.()}>
            Stop
          </button>
        ) : (
          <button type="submit" class="btn btn--primary" disabled={!q.trim()}>
            Ask
          </button>
        )}
      </form>
      <p class="small faint">
        Runs entirely in your browser. Tool calls are shown as buttons — nothing acts on the page without your
        click. Models can be removed in the <a href="/observatory/">observatory</a>.
      </p>
      <style>{`
        .ask{display:grid;gap:var(--sp-4)}
        .ask__status{display:flex;flex-wrap:wrap;gap:var(--sp-2);align-items:center}
        .ask__progress{display:inline-flex;gap:var(--sp-2);align-items:center;flex-wrap:wrap}
        .ask__progress progress{inline-size:10rem;accent-color: var(--ink-signal)}
        .ask__offer{border-color: var(--ink-signal)}
        .ask__models{display:grid;gap:var(--sp-2)}
        .ask__model{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--sp-3);align-items:start;padding:var(--sp-3);border-radius:var(--r-2);border:var(--hairline) solid var(--border);cursor:pointer}
        .ask__model.is-active{border-color: var(--ink-signal);background:var(--signal-soft)}
        .ask__model span{display:grid}
        .ask__turns{display:grid;gap:var(--sp-4)}
        .ask__empty{display:grid;gap:var(--sp-3)}
        .turn{display:grid;gap:var(--sp-2)}
        .turn__q{justify-self:end;max-inline-size:60ch;padding:var(--sp-2) var(--sp-4);border-radius:var(--r-3);background:var(--surface-2);font-weight:520}
        .turn__a{display:grid;gap:var(--sp-2);padding:var(--sp-4);border-radius:var(--r-2);background:var(--surface-1);border:var(--hairline) solid var(--border);border-inline-start:3px solid var(--ai-thinking)}
        .turn:not(.is-streaming) .turn__a{border-inline-start-color:var(--ai-streaming)}
        .turn__path{color:var(--text-3)}
        .turn__text{white-space:pre-wrap}
        .caret{display:inline-block;inline-size:.55em;block-size:1em;margin-inline-start:2px;background:var(--ai-streaming);vertical-align:-0.15em;animation:caret 1s steps(2) infinite}
        @keyframes caret{50%{opacity:0}}
        .turn__evidence{display:grid;gap:var(--sp-1);padding-inline-start:0;font-size:var(--fs--1)}
        .turn__evidence li{padding:var(--sp-2);border-radius:var(--r-1);background:var(--surface-2);animation:reveal var(--dur-normal) var(--ease-enter) both;animation-delay:calc(var(--i)*var(--stagger-short))}
        .turn__tools .btn{gap:var(--sp-2)}
        .ask__form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--sp-2);position:sticky;inset-block-end:calc(var(--cmdbar-h) + var(--safe-b) + var(--sp-2));background:var(--bg);padding-block:var(--sp-2)}
        @media (min-width:64rem){.ask__form{inset-block-end:var(--sp-2)}}
        .ask__form input{min-block-size:var(--target);padding-inline:var(--sp-4);border-radius:var(--r-2);border:var(--hairline) solid var(--border-strong);background:var(--surface-1);color:var(--text-1)}
        .ask__form input:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
      `}</style>
    </div>
  );
}
