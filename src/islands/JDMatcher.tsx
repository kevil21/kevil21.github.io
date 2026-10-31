import { useEffect, useRef, useState } from 'preact/hooks';
import type { JDMatchResult, JDBucket } from '@/ai/protocol';
import type { PocketClient } from '@/ai/runtime/pocket-client';
import { aiState } from '@/lib/stores/ai';
import { useStore } from '@nanostores/preact';

const BUCKETS: { id: JDBucket; label: string; tone: string; hint: string }[] = [
  {
    id: 'strong',
    label: 'Strong evidence',
    tone: 'evidence-strong',
    hint: 'A project, role or credential directly demonstrates this.',
  },
  {
    id: 'related',
    label: 'Related experience',
    tone: 'evidence-related',
    hint: 'Adjacent evidence exists; not a direct match.',
  },
  {
    id: 'none',
    label: 'Not demonstrated',
    tone: 'evidence-none',
    hint: 'Nothing in the portfolio evidences this. No claim is made.',
  },
];

const SAMPLE = `Senior Platform Engineer — Observability
• 3+ years building backend services in Python or TypeScript
• Experience with OpenTelemetry, Elasticsearch and Kibana dashboards
• Hands-on with Azure (AKS, Functions) or AWS; Terraform or Bicep
• Design multi-tenant data pipelines and own production services
• Familiarity with LLM agents, LangChain/LangGraph or RAG
• Kubernetes operations and Helm chart authoring
• Fluent in Rust and Haskell
• Strong communication; mentoring junior engineers`;

export default function JDMatcher() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<JDMatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'matching' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const ai = useStore(aiState);
  const client = useRef<PocketClient | null>(null);

  useEffect(() => {
    import('@/ai/runtime/pocket-client').then(({ getPocketClient }) => (client.current = getPocketClient()));
  }, []);

  const run = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setPhase('extracting');
    try {
      const c = client.current ?? (await import('@/ai/runtime/pocket-client')).getPocketClient();
      await c.ready;
      setPhase('matching');
      const r = await c.matchJD(text);
      setResult(r);
      setPhase('done');
      aiState.setKey('lastPath', r.mode === 'semantic' ? 'pocket' : 'lexical');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="jd">
      <form
        class="jd__form"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label class="jd__label" for="jd-text">
          Paste a job description{' '}
          <span class="faint small">(stays on this device · max 12,000 characters)</span>
        </label>
        <textarea
          id="jd-text"
          class="jd__textarea"
          rows={10}
          maxLength={12000}
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Requirements, responsibilities, must-haves…"
        />
        <div class="cluster">
          <button type="submit" class="btn btn--primary" disabled={busy || !text.trim()}>
            {busy
              ? phase === 'extracting'
                ? 'Extracting requirements…'
                : 'Matching evidence…'
              : 'Match against the portfolio'}
          </button>
          <button type="button" class="btn btn--ghost" onClick={() => setText(SAMPLE)} disabled={busy}>
            Use a sample JD
          </button>
          {result && (
            <button
              type="button"
              class="btn btn--ghost"
              onClick={() => {
                setResult(null);
                setText('');
                setPhase('idle');
              }}
            >
              Clear
            </button>
          )}
          <span class="small faint mono" aria-live="polite">
            {ai.pocket === 'semantic'
              ? 'semantic matching'
              : ai.pocket === 'semantic-loading'
                ? `loading embedder ${Math.round(ai.semanticProgress * 100)}%`
                : ai.pocket.startsWith('lexical')
                  ? 'lexical matching'
                  : ''}
          </span>
        </div>
      </form>
      {error && (
        <p class="note note--warn" role="alert">
          Matching failed: {error}. The static skills page lists everything the portfolio evidences.
        </p>
      )}

      {result && (
        <section class={`jd__result jd__result--${phase}`} aria-live="polite" aria-label="Match result">
          <p class="small muted">
            {result.rows.length} requirements extracted · {result.counts.strong} strong ·{' '}
            {result.counts.related} related · {result.counts.none} not demonstrated · no percentage is
            computed, by design.
          </p>
          <div class="jd__columns">
            {BUCKETS.map((b) => (
              <div class="jd__col" key={b.id} style={`--tone:var(--${b.tone})`}>
                <h2 class="jd__col-title">
                  <span class="kind-dot" style="--kind:var(--tone)"></span> {b.label}{' '}
                  <span class="mono faint">{result.counts[b.id]}</span>
                </h2>
                <p class="small faint">{b.hint}</p>
                <ul class="jd__list" role="list">
                  {result.rows
                    .filter((r) => r.bucket === b.id)
                    .map((r, i) => (
                      <li class="jd__row card" key={r.requirement.id} style={`--i:${i}`}>
                        <p class="jd__req">{r.requirement.text}</p>
                        {r.matchedTerms.length > 0 && (
                          <p class="small faint mono">matched: {r.matchedTerms.slice(0, 6).join(', ')}</p>
                        )}
                        {r.evidence.length > 0 && (
                          <ul class="jd__evidence" role="list">
                            {r.evidence.slice(0, 2).map((e) => (
                              <li key={e.id}>
                                <a href={e.url}>
                                  {e.text.length > 140 ? e.text.slice(0, 137) + '…' : e.text}
                                </a>
                                <span class="small faint mono">
                                  {' '}
                                  · {e.kind}
                                  {e.selfReported ? ' · self-reported' : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  {result.counts[b.id] === 0 && <li class="small faint">—</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      <style>{`
        .jd{display:grid;gap:var(--sp-5)}
        .jd__form{display:grid;gap:var(--sp-3)}
        .jd__label{font-weight:560}
        .jd__textarea{inline-size:100%;padding:var(--sp-3);border-radius:var(--r-2);border:var(--hairline) solid var(--border-strong);background:var(--surface-1);color:var(--text-1);resize:vertical;font-family:var(--font-mono);font-size:var(--fs--1);line-height:1.5}
        .jd__textarea:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
        .jd__columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:var(--sp-4);margin-block-start:var(--sp-3)}
        .jd__col{display:grid;gap:var(--sp-2);align-content:start;padding-block-start:var(--sp-2);border-block-start:3px solid var(--tone)}
        .jd__col-title{font-size:var(--fs-0);display:flex;align-items:center;gap:var(--sp-2)}
        .jd__list{display:grid;gap:var(--sp-2)}
        .jd__row{padding:var(--sp-3);display:grid;gap:var(--sp-2);animation:reveal var(--dur-normal) var(--ease-enter) both;animation-delay:calc(var(--i)*var(--stagger-short))}
        .jd__req{font-size:var(--fs--1)}
        .jd__evidence{display:grid;gap:4px;font-size:var(--fs--1);padding-inline-start:var(--sp-3);border-inline-start:2px solid var(--tone)}
        .jd__result--matching .jd__columns{opacity:.5}
      `}</style>
    </div>
  );
}
