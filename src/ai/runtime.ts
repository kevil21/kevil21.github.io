import { z } from 'zod';
import { corpusSchema, validateCorpus, MAX_JD } from './corpus';
import type { Corpus } from './corpus';
import { retrieve, matchJD, enhanceJD } from './retrieval';
import { parseCommand, parseTool } from './tools';
import { executeTool } from './tools/executor';
import { parseSelection } from './grounding';
import { WorkerBridge } from './bridge';
import { detectCapabilities } from './capabilities';
import type { Capabilities } from './capabilities';
import { FULL, FULL_CACHES, SEMANTIC, SEMANTIC_CACHE } from './models';
import { getPersona } from '../scripts/state';
import { fallbackSearch } from '../scripts/search';

const metrics = { inferences: z.number().int().min(0).max(60), elapsedMs: z.number().nonnegative().max(240000) };
const answerSchema = z.strictObject({ id: z.number().int().positive(), type: z.literal('answer'), evidenceIds: z.array(z.string().max(80)).max(6).refine((ids) => new Set(ids).size === ids.length), mode: z.enum(['learned-semantic-plus-lexical', 'lexical-concepts-not-learned']), ...metrics });
const jdSchema = z.strictObject({ id: z.number().int().positive(), type: z.literal('jd'), matches: z.array(z.array(z.strictObject({ id: z.string().max(80), score: z.number().min(-1.001).max(1.001) })).max(3)).max(60), ...metrics });
export function initializeIntelligence(): void {
  const source = document.querySelector('#pocket-fallback');
  const ui = document.querySelector<HTMLElement>('[data-ai-controls]');
  if (!source || !ui || ui.dataset.ready) return;
  let envelope: z.infer<typeof corpusSchema>;
  try { envelope = corpusSchema.parse(JSON.parse(source.textContent ?? '')); } catch { return; }
  ui.dataset.ready = 'true'; ui.hidden = false;
  const clearConsent = () => ui.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => { input.checked = false; });
  clearConsent(); // Browsers may restore form state; consent remains page-local.
  const hashes = { contentHash: document.body.dataset.contentHash ?? '', corpusHash: document.body.dataset.corpusHash ?? '' };
  let verified: Promise<Corpus> | undefined;
  const corpus = () => verified ??= validateCorpus(envelope, hashes.contentHash, hashes.corpusHash);
  const panel = document.querySelector<HTMLElement>('[data-search-panel]')!;
  const results = document.querySelector<HTMLElement>('[data-search-results]')!;
  const status = document.querySelector<HTMLElement>('[data-search-status]')!;
  const aiStatus = ui.querySelector<HTMLElement>('[data-ai-status]')!;
  const input = document.querySelector<HTMLInputElement>('[data-command-input]')!;
  const observatory = document.querySelector<HTMLElement>('[data-observatory]');
  const jdInput = document.querySelector<HTMLTextAreaElement>('[data-jd-input]');
  const jdResults = document.querySelector<HTMLElement>('[data-jd-results]');
  const jdStatus = document.querySelector<HTMLElement>('[data-jd-status]');
  let pocket: WorkerBridge | undefined; let pocketReady: Promise<void> | undefined;
  let full: WorkerBridge | undefined;
  let fullLoaded = false; let fullBusy = false; let semanticLoaded = false;
  let semanticLoading = false;
  let sequence = 0; let loadSequence = 0; let semanticSequence = 0;
  let pocketEpoch = 0;
  let cacheClearing = false; let inspectionSequence = 0;
  let context = document.querySelector<HTMLElement>('[data-reading-project]')?.dataset.readingProject ?? 'a360';
  let capabilities: Capabilities | undefined;
  const state = { tier: 'deterministic', path: 'static + deterministic search', pocketWorker: 'idle', fullWorker: 'idle', selectedModel: 'none', loadedModel: 'none', retrievedIds: [] as string[], fallbackReason: 'none', inferenceCount: 0, lastWorkerMs: null as number | null, lastOperationMs: null as number | null, caches: [] as { name: string; entries: number }[], cacheStatus: 'not measured', theme: document.documentElement.dataset.resolvedTheme ?? 'system', persona: getPersona(), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  const publish = () => {
    const snapshot = { ...state, loadedModels: [...(semanticLoaded ? [SEMANTIC.id] : []), ...(fullLoaded ? [FULL.id] : [])], detectedGPU: capabilities?.gpu ?? null, adapterAvailable: capabilities?.adapter ?? null, capabilities: capabilities ?? 'not probed', indexHash: hashes.corpusHash, contentHash: hashes.contentHash };
    if (observatory) observatory.textContent = JSON.stringify(snapshot, null, 2);
    document.dispatchEvent(new CustomEvent('atlas:runtime', { detail: { version: 1, ...snapshot } }));
    ui.dataset.tier = state.tier;
  };
  const report = (text: string) => { aiStatus.textContent = text; publish(); };
  const resetPocket = (reason: string) => { pocketEpoch++; pocket?.terminate(reason); pocket = undefined; pocketReady = undefined; semanticLoaded = false; semanticLoading = false; state.pocketWorker = 'idle'; if (state.loadedModel === SEMANTIC.id) state.loadedModel = fullLoaded ? FULL.id : 'none'; if (state.tier === 'Pocket') state.tier = fullLoaded ? 'Full' : 'deterministic'; };
  const resetFull = (reason: string) => { full?.terminate(reason); full = undefined; fullLoaded = false; fullBusy = false; state.fullWorker = 'idle'; state.loadedModel = semanticLoaded ? SEMANTIC.id : 'none'; if (state.tier === 'Full') state.tier = pocket && !semanticLoading ? 'Pocket' : 'deterministic'; };
  const degradeFull = () => { resetFull('full-failed'); state.tier = pocket ? 'Pocket' : 'deterministic'; state.path = 'Full → Pocket → deterministic'; state.fallbackReason = 'Full failed: allocation, device loss, timeout, or invalid selection'; report('Full unavailable. Continuing with canonical Pocket evidence.'); };
  const readyPocket = async () => {
    if (!pocketReady) {
      state.pocketWorker = 'loading'; publish();
      const epoch = pocketEpoch;
      pocketReady = (async () => {
        const worker = new WorkerBridge(new Worker(new URL('./workers/pocket.worker.ts', import.meta.url), { type: 'module', name: 'atlas-pocket' }), (m) => { if (epoch === pocketEpoch) report(`Semantic asset progress: ${Math.max(0, Math.min(100, Number(m.progress) || 0)).toFixed(0)}% (per file, not overall). Questions stay local.`); }, () => { if (epoch === pocketEpoch) { state.pocketWorker = 'failed'; publish(); } });
        pocket = worker;
        const reply = await worker.request({ type: 'init', ...hashes });
        if (epoch !== pocketEpoch) throw new Error('Superseded initialization');
        if (reply.type !== 'ready') throw new Error('Invalid ready');
        state.pocketWorker = 'ready'; publish();
      })();
    }
    await pocketReady;
    if (!pocket) throw new Error('Worker unavailable');
    return pocket;
  };
  const renderEvidence = (ids: string[], data: Corpus, host: HTMLElement) => {
    for (const id of ids) {
      const evidence = data.evidence.find((e) => e.id === id);
      if (!evidence) throw new Error('Unknown evidence ID');
      const li = document.createElement('li'); li.dataset.evidenceId = id;
      const a = document.createElement('a'); a.href = `/evidence/#${id}`; a.textContent = evidence.title;
      const quote = document.createElement('blockquote'); quote.textContent = evidence.text;
      const note = document.createElement('p'); note.className = 'note'; note.textContent = `${evidence.source} · source-provided, not independently verified.`;
      li.append(a, quote, note); host.append(li);
    }
  };
  const ask = async (query: string, token: number) => {
    const started = performance.now(); state.retrievedIds = []; state.fallbackReason = 'none';
    panel.hidden = false; results.replaceChildren(); status.textContent = 'Finding canonical evidence locally…';
    try {
      const data = await corpus(); if (token !== sequence) return;
      const requestedLens = /\b(?:for|as) (?:a |an )?(recruiter|engineer|architect)\b/i.exec(query)?.[1]?.toLowerCase();
      if (/^explain\b/i.test(query) && requestedLens) executeTool({ name: 'switchPersona', persona: requestedLens }, data);
      const command = parseCommand(query, data);
      if (command) { executeTool(command, data); status.textContent = `Applied ${command.name}. Facts are unchanged.`; state.tier = 'deterministic'; state.path = 'validated deterministic tool'; publish(); return; }
      let ids: string[]; let mode = 'Deterministic main-thread lexical fallback';
      try {
        if (semanticLoading) throw new Error('Semantic loading; use independent lexical fallback');
        const worker = await readyPocket(); if (token !== sequence) return;
        const answer = answerSchema.parse(await worker.request({ type: 'query', query, persona: getPersona(), context }));
        if (token !== sequence) return;
        ids = answer.evidenceIds;
        if (ids.some((id) => !data.evidence.some((e) => e.id === id))) throw new Error('Invalid IDs');
        state.inferenceCount += answer.inferences; state.lastWorkerMs = answer.elapsedMs;
        mode = answer.mode === 'learned-semantic-plus-lexical' ? 'Pocket: learned semantic enhancement + lexical evidence' : 'Pocket: lexical synonym/concept retrieval, not learned embeddings';
        state.tier = 'Pocket'; state.path = answer.mode;
      } catch {
        if (token !== sequence) return;
        if (!semanticLoading) resetPocket('pocket-failed'); ids = retrieve(query, data, getPersona(), context);
        state.tier = 'deterministic'; state.path = 'Pocket → bounded main-thread lexical retrieval'; state.fallbackReason = semanticLoading ? 'Semantic loading; lexical retrieval remains available' : 'Pocket worker unavailable';
      }
      if (token !== sequence) return;
      let tools: unknown[] = [];
      if (fullLoaded && full && ids.length) {
        fullBusy = true;
        try {
          const reply = await full.request({ type: 'select', query, evidenceIds: ids }, 90000);
          if (token !== sequence) return;
          if (reply.type !== 'selection') throw new Error('Invalid selection reply');
          const selection = parseSelection(JSON.stringify(reply.selection), data, ids);
          ids = selection.evidenceIds; tools = selection.tools ?? [];
          mode = 'Full: generative evidence selection. Only canonical excerpts are displayed.';
          state.tier = 'Full'; state.path = 'Pocket retrieval → Full constrained ID selection';
        } catch { if (token !== sequence) return; degradeFull(); }
        finally { if (token === sequence) fullBusy = false; }
      }
      if (token !== sequence) return;
      results.replaceChildren(); renderEvidence(ids, data, results);
      for (const value of tools) {
        const tool = parseTool(value, data); if (!tool) continue;
        const li = document.createElement('li'); const button = document.createElement('button'); button.type = 'button'; button.textContent = `Confirm suggested action: ${tool.name}`;
        button.addEventListener('click', () => executeTool(tool, data)); li.append(button); results.append(li);
      }
      status.textContent = ids.length ? mode : 'No evidence demonstrated in the public corpus. No claim inferred.';
      state.retrievedIds = ids; state.lastOperationMs = performance.now() - started; publish();
    } catch {
      if (token !== sequence) return;
      state.tier = 'static'; state.path = 'intelligence → deterministic search → static catalog'; state.fallbackReason = 'Corpus validation failed'; publish();
      fallbackSearch(); // Original deterministic listener remains installed, not replaced.
    }
  };
  const commandListener = (event: Event) => {
    const e = event as CustomEvent<unknown>;
    const parsed = z.strictObject({ version: z.literal(1), query: z.string().max(200) }).safeParse(e.detail);
    if (e.defaultPrevented || !e.cancelable || !parsed.success) return;
    const query = parsed.data.query;
    const token = ++sequence; // Even a plain search supersedes a pending AI response.
    if (fullBusy) { ++loadSequence; resetFull('superseded-query'); }
    if (!/^(?:please\s+)?(?:what|which|how|why|tell|explain|show|find|open|view|compare|switch|use|change|set|go|navigate|take|reset|clear|filter|focus|download|match|review|analyze|analyse|i am)\b|\?$/i.test(query)) { state.path = 'deterministic whole-token search'; state.tier = 'deterministic'; state.retrievedIds = []; publish(); return; }
    e.preventDefault(); // Must be synchronous. Never await before taking ownership.
    void ask(query, token);
  };
  document.addEventListener('atlas:command', commandListener);
  const cancel = () => {
    sequence++; loadSequence++; semanticSequence++; inspectionSequence++;
    resetFull('canceled'); resetPocket('canceled');
    state.tier = 'deterministic'; state.selectedModel = 'none'; state.path = 'canceled → deterministic'; state.retrievedIds = [];
    results.replaceChildren(); if (jdResults) jdResults.replaceChildren();
    status.textContent = 'Canceled. No pending response will be displayed.';
    if (jdStatus) jdStatus.textContent = 'Canceled. Paste or query again when ready.';
    report('Workers stopped and unloaded. Model cache is unchanged.');
  };
  ui.querySelector('[data-ai-cancel]')?.addEventListener('click', cancel);
  ui.querySelector('[data-ai-unload]')?.addEventListener('click', cancel);
  document.querySelector('[data-search-close]')?.addEventListener('click', () => { sequence++; if (fullBusy) resetFull('closed'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden && (panel.contains(document.activeElement) || document.activeElement === input)) { sequence++; if (fullBusy) resetFull('escape'); } });
  ui.querySelector('[data-semantic-enable]')?.addEventListener('click', () => { void (async () => {
    if (cacheClearing) { report('Model cache clearing is in progress. Retry when complete.'); return; }
    if (!ui.querySelector<HTMLInputElement>('[data-semantic-consent]')?.checked) { report('Confirm the semantic download consent first.'); return; }
    if (semanticLoaded) { report('Semantic model is already loaded. Unload before retrying.'); return; }
    if (semanticLoading) { report('Semantic model is already loading. Cancel before retrying.'); return; }
    const token = ++semanticSequence;
    semanticLoading = true;
    state.selectedModel = SEMANTIC.id; report('Loading optional semantic model and single-thread WASM…');
    try { await corpus(); if (token !== semanticSequence) return; const worker = await readyPocket(); if (token !== semanticSequence) return;
      state.pocketWorker = 'loading-model'; publish();
      const reply = await worker.request({ type: 'semantic' }, 180000);
      if (token !== semanticSequence) return;
      if (reply.type !== 'semantic-ready') throw new Error('Invalid model reply');
      semanticLoaded = true; semanticLoading = false; state.pocketWorker = 'ready'; state.loadedModel = fullLoaded ? FULL.id : SEMANTIC.id; state.tier = fullLoaded ? 'Full' : 'Pocket'; state.fallbackReason = 'none'; state.path = 'semantic ready; awaiting local query'; report('Semantic embeddings ready. JD strength still requires explicit project evidence.');
    } catch { if (token !== semanticSequence) return; resetPocket('semantic-failed'); state.fallbackReason = 'Semantic load failed'; report('Semantic unavailable; lexical Pocket and deterministic search remain available.'); }
  })(); });
  ui.querySelector('[data-full-enable]')?.addEventListener('click', () => { void (async () => {
    if (cacheClearing) { report('Model cache clearing is in progress. Retry when complete.'); return; }
    if (!ui.querySelector<HTMLInputElement>('[data-full-consent]')?.checked) { report('Confirm the Full model download consent first.'); return; }
    const token = ++loadSequence; resetFull('new-load');
    state.selectedModel = FULL.id;
    report('Checking Full capability without downloading weights…');
    const detected = await detectCapabilities(); if (token !== loadSequence) return; capabilities = detected;
    if (capabilities.reasons.length) { state.fallbackReason = capabilities.reasons.join(', '); report(`Full unavailable: ${state.fallbackReason}. Pocket remains available.`); return; }
    try {
      await corpus(); if (token !== loadSequence) return;
      state.selectedModel = FULL.id; state.fullWorker = 'loading'; report('Downloading opt-in Full assets. Cancel terminates the worker.');
      full = new WorkerBridge(new Worker(new URL('./workers/full.worker.ts', import.meta.url), { type: 'module', name: 'atlas-full' }), (m) => {
        if (token !== loadSequence) return;
        report(m.type === 'tokens' ? `Generating evidence selection: ${Number(m.chunks)} streamed chunks. Unvalidated text is hidden.` : `Full loading: ${Math.max(0, Math.min(100, Number(m.progress) || 0)).toFixed(0)}%.`);
      }, () => { if (token === loadSequence) degradeFull(); });
      const reply = await full.request({ type: 'load', ...hashes }, 240000);
      if (token !== loadSequence) return;
      if (reply.type !== 'loaded') throw new Error('Invalid load response');
      fullLoaded = true; state.fullWorker = 'ready'; state.loadedModel = FULL.id; state.tier = 'Full'; state.fallbackReason = 'none'; state.path = 'Full ready; awaiting local query'; report('Full ready. Questions select canonical evidence; no free-form factual output.');
    } catch { if (token === loadSequence) degradeFull(); }
  })(); });
  const measureCaches = async (clear = false) => {
    state.caches = [];
    try {
      const names = await caches.keys();
      for (const name of names.filter((n) => n === SEMANTIC_CACHE || (FULL_CACHES as readonly string[]).includes(n))) {
        const cache = await caches.open(name); const entries = await cache.keys();
        const scoped = entries.filter((r) => name === SEMANTIC_CACHE || r.url.startsWith(FULL.model) || r.url === FULL.modelLib);
        if (clear) { for (const request of scoped) await cache.delete(request); if (!(await cache.keys()).length) await caches.delete(name); }
        else state.caches.push({ name, entries: scoped.length });
      }
      state.cacheStatus = clear ? 'Selected model entries cleared; browser HTTP cache is not controlled here' : 'Measured Cache API entries; byte usage is origin-wide only';
    } catch { state.cacheStatus = 'Cache API unavailable or denied'; }
    publish();
  };
  ui.querySelector('[data-ai-clear-cache]')?.addEventListener('click', () => {
    if (cacheClearing) return;
    cacheClearing = true; cancel();
    void measureCaches(true).finally(() => { cacheClearing = false; });
  });
  document.querySelector('[data-observatory-refresh]')?.addEventListener('click', () => { void (async () => {
    if (cacheClearing) return;
    const token = ++inspectionSequence; const detected = await detectCapabilities();
    if (token !== inspectionSequence || cacheClearing) return;
    capabilities = detected; await measureCaches(); publish();
  })(); });
  document.querySelector('[data-jd-form]')?.addEventListener('submit', (e) => { e.preventDefault(); void (async () => {
    if (!jdInput || !jdResults || !jdStatus) return;
    const text = jdInput.value; const token = ++sequence; const started = performance.now(); jdResults.replaceChildren();
    if (fullBusy) { ++loadSequence; resetFull('jd-started'); }
    if (!text.trim() || text.length > MAX_JD) { jdStatus.textContent = `Enter 1–${MAX_JD} characters. Nothing is submitted to a host.`; return; }
    jdStatus.textContent = 'Analyzing requirements locally…';
    try {
      const data = await corpus(); if (token !== sequence) return;
      let rows = matchJD(text, data, getPersona());
      try {
        if (semanticLoading) throw new Error('Semantic loading; use independent JD matching');
        const worker = await readyPocket(); if (token !== sequence) return;
        const reply = jdSchema.parse(await worker.request({ type: 'jd', text, persona: getPersona() }, 60000));
        if (token !== sequence) return;
        // Recompute strength at the trust boundary. Similarity can ONLY add Related.
        if (reply.matches.length !== rows.length) throw new Error('Mismatched JD rows');
        rows = enhanceJD(rows, reply.matches, data);
        state.inferenceCount += reply.inferences; state.lastWorkerMs = reply.elapsedMs; state.fallbackReason = 'none';
      }
      catch { if (token !== sequence) return; state.fallbackReason = semanticLoading ? 'Semantic loading; local JD matching remains available' : 'JD worker failed → bounded main-thread matching'; if (!semanticLoading) resetPocket('jd-worker-failed'); }
      if (token !== sequence) return;
      state.retrievedIds = [...new Set(rows.flatMap((r) => r.evidenceIds))];
      state.tier = pocket && !semanticLoading ? 'Pocket' : 'deterministic'; state.path = semanticLoaded ? 'local JD → explicit joins + semantic Related only' : 'local JD → explicit skill/project joins';
      for (const row of rows) {
        const article = document.createElement('article'); article.className = 'record'; article.dataset.jdLevel = row.level;
        const h = document.createElement('h3'); h.textContent = row.requirement;
        const label = document.createElement('p'); label.className = 'status-tag'; label.textContent = row.level;
        const reason = document.createElement('p'); reason.textContent = row.reason;
        const ul = document.createElement('ul'); renderEvidence(row.evidenceIds, data, ul); article.append(h, label, reason, ul); jdResults.append(article);
      }
      state.lastOperationMs = performance.now() - started;
      jdStatus.textContent = `${rows.length} requirements reviewed locally (maximum 60). No fit score, inferred proficiency, or years claimed.`; publish();
    } catch { if (token !== sequence) return; jdStatus.textContent = 'Local corpus unavailable. Browse the source-linked skills instead.'; state.tier = 'static'; state.path = 'JD → static evidence'; state.fallbackReason = 'Corpus validation failed'; publish(); }
  })(); });
  document.querySelector('[data-jd-clear]')?.addEventListener('click', () => { sequence++; if (jdInput) jdInput.value = ''; jdResults?.replaceChildren(); if (jdStatus) jdStatus.textContent = 'Job description cleared from this workspace.'; state.retrievedIds = []; publish(); });
  if (jdInput) { jdInput.disabled = false; const submit = document.querySelector<HTMLButtonElement>('[data-jd-submit]'); if (submit) submit.disabled = false; }
  document.addEventListener('atlas:statechange', (e) => { const d = (e as CustomEvent<Record<string, unknown>>).detail; if (d.type === 'selection' && typeof d.projectId === 'string' && envelope.data.projects.some((p) => p.id === d.projectId)) context = d.projectId; state.theme = document.documentElement.dataset.resolvedTheme ?? 'system'; state.persona = getPersona(); publish(); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => { state.reducedMotion = e.matches; publish(); });
  addEventListener('pagehide', () => { cancel(); clearConsent(); input.value = ''; if (jdInput) jdInput.value = ''; });
  publish();
}