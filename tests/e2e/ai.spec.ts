import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { portfolio } from '../../src/lib/content';
import { FULL, SEMANTIC } from '../../src/ai/models';

async function command(page: Page, query: string) {
  await page.locator('[data-command-input]').fill(query);
  await page.locator('[data-command-form]').evaluate((form) => (form as HTMLFormElement).requestSubmit());
}
async function controls(page: Page) { await page.locator('[data-ai-controls] > summary').click(); }
async function snapshot(page: Page) { return JSON.parse(await page.locator('[data-observatory]').innerText()) as Record<string, unknown>; }
async function canonicalResults(page: Page) {
  const nodes = page.locator('[data-search-results] [data-evidence-id]');
  expect(await nodes.count()).toBeGreaterThan(0);
  for (const node of await nodes.all()) {
    const id = await node.getAttribute('data-evidence-id'); const evidence = portfolio.evidence.find((e) => e.id === id);
    expect(evidence).toBeDefined(); await expect(node.locator('blockquote')).toHaveText(evidence!.text);
    await expect(node.locator('a')).toHaveAttribute('href', `/evidence/#${id}`);
  }
}
test('Pocket search and JD run in a real worker with no model download or query exfiltration', async ({ page, context }) => {
  const traffic: { url: string; method: string; body: string | null }[] = [];
  context.on('request', (r) => traffic.push({ url: r.url(), method: r.method(), body: r.postData() }));
  await page.goto('/architecture/');
  const origin = new URL(page.url()).origin;
  await command(page, 'What does A360 do? private-query-canary');
  await expect(page.locator('[data-search-status]')).toContainText('Pocket: lexical');
  await canonicalResults(page);
  await page.locator('[data-jd-input]').fill('Python; Java; Rust; No AWS; 5 years of LangGraph; private-jd-canary');
  await page.locator('[data-jd-submit]').click();
  await expect(page.locator('[data-jd-status]')).toContainText('6 requirements reviewed locally');
  const rows = page.locator('[data-jd-level]');
  expect(await rows.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-jd-level')))).toEqual(['Strong Evidence', 'Related', 'Not Demonstrated', 'Not Demonstrated', 'Not Demonstrated', 'Not Demonstrated']);
  expect((await snapshot(page)).pocketWorker).toBe('ready');
  expect((await snapshot(page)).loadedModels).toEqual([]);
  expect(traffic.every((r) => new URL(r.url).origin === origin && r.method === 'GET' && r.body === null)).toBe(true);
  expect(JSON.stringify(traffic)).not.toMatch(/private-query-canary|private-jd-canary|transformers\.web|onnx|models\/|full\.worker/);
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage, location.href]))).not.toMatch(/private-.*-canary/);
  await page.locator('[data-jd-clear]').click(); await expect(page.locator('[data-jd-input]')).toHaveValue(''); await expect(rows).toHaveCount(0);
});
test('all example intents work without a model, preserving evidence and canonical persona facts', async ({ page }) => {
  await page.goto('/'); await command(page, 'Show Azure work');
  await expect(page.locator('[data-project]:visible')).toHaveCount(1); await expect(page.locator('[data-project]:visible')).toHaveAttribute('data-project', 'a360');
  await command(page, 'Find AI-related projects'); await expect(page.locator('[data-project]:visible')).toHaveCount(5);
  await command(page, 'Explain this project for a recruiter'); await expect(page.locator('[data-search-status]')).toContainText('Pocket:'); await canonicalResults(page);
  await command(page, 'Show evidence for this skill'); await expect(page).toHaveURL(/\/evidence\/#skills$/);
  await command(page, 'Open the resume'); await expect(page).toHaveURL(/\/resume\/$/);
  await command(page, 'Compare projects'); await expect(page).toHaveURL(/\/compare\/\?left=a360&right=policy-to-pipelines/);
  await command(page, 'Match this job description'); await expect(page).toHaveURL(/\/architecture\/#job-description$/);
  await command(page, "Explain this site's architecture"); await expect(page).toHaveURL(/\/architecture\/$/);
});
test('both model downloads require explicit consent; capability failure keeps Pocket', async ({ page, context }) => {
  const urls: string[] = []; context.on('request', (r) => urls.push(r.url()));
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
  await page.goto('/architecture/'); await controls(page);
  await page.locator('[data-full-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('consent first');
  await page.locator('[data-semantic-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('consent first');
  await page.locator('[data-full-consent]').check(); await page.locator('[data-full-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('webgpu-api-unavailable');
  expect((await snapshot(page)).selectedModel).toBe(FULL.id); expect((await snapshot(page)).loadedModel).toBe('none');
  await command(page, 'What does A360 do?'); await expect(page.locator('[data-search-status]')).toContainText('Pocket:');
  expect(urls.some((url) => /huggingface|raw.githubusercontent|transformers.web|models\/|full.worker/.test(url))).toBe(false);
});
test('missing workers degrade to deterministic excerpts, then corrupt corpus to static search', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'Worker', { value: undefined, configurable: true }));
  await page.goto('/architecture/'); await command(page, 'What does A360 do?');
  await expect(page.locator('[data-search-status]')).toContainText('Deterministic main-thread'); await canonicalResults(page);
  expect((await snapshot(page)).tier).toBe('deterministic');
  await page.route('**/architecture/', async (route) => { const response = await route.fetch(); const body = (await response.text()).replace(/data-corpus-hash="[a-f0-9]+"/, `data-corpus-hash="${'0'.repeat(64)}"`); await route.fulfill({ response, body }); });
  await page.reload(); await command(page, 'What does A360 do?');
  await expect(page.locator('[data-search-status]')).toContainText('No source records');
  expect((await snapshot(page)).tier).toBe('static'); await expect(page.getByRole('link', { name: 'Browse the complete source index →' })).toBeVisible();
});
test('denied storage, missing GPU and touch do not disable Pocket or local JD', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, baseURL: testInfo.project.use.baseURL! });
  await context.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage', 'caches']) Object.defineProperty(globalThis, name, { get() { throw new Error('Storage denied'); } });
    Object.defineProperty(navigator, 'gpu', { value: undefined });
  });
  const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/architecture/'); await command(page, 'What does OptiCrop do?'); await expect(page.locator('[data-search-status]')).toContainText('Pocket:');
  await page.locator('[data-jd-input]').fill('Python; Rust'); await page.locator('[data-jd-submit]').tap(); await expect(page.locator('[data-jd-status]')).toContainText('2 requirements');
  await controls(page); await page.locator('[data-ai-clear-cache]').tap();
  expect((await snapshot(page)).cacheStatus).toContain('denied'); expect(errors).toEqual([]); await context.close();
});
test('model failure, cancellation, retry and rapid queries never render stale responses', async ({ page }) => {
  await page.route('**/generated/semantic-index.json', (route) => route.abort());
  await page.goto('/architecture/'); await controls(page);
  await page.locator('[data-semantic-consent]').check(); await page.locator('[data-semantic-enable]').click();
  await expect(page.locator('[data-ai-status]')).toContainText('Semantic unavailable');
  await command(page, 'What does A360 do?'); await expect(page.locator('[data-search-status]')).toContainText('Pocket:');
  await page.locator('[data-ai-cancel]').click(); await expect(page.locator('[data-search-results] li')).toHaveCount(0);
  expect((await snapshot(page)).pocketWorker).toBe('idle');
  await page.evaluate(() => {
    for (const query of ['What does A360 do?', 'What is Python?', 'What is unknown-zebra?']) document.dispatchEvent(new CustomEvent('atlas:command', { detail: { version: 1, query }, cancelable: true }));
  });
  await expect(page.locator('[data-search-status]')).toContainText('No evidence demonstrated'); await expect(page.locator('[data-search-results] li')).toHaveCount(0);
  await command(page, 'What does A360 do?'); await expect(page.locator('[data-search-status]')).toContainText('Pocket:'); await canonicalResults(page);
});
test('a stalled semantic download keeps lexical search and JD usable; cancel prevents late activation', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/generated/semantic-index.json', async (route) => { await gate; await route.abort().catch(() => {}); });
  await page.goto('/architecture/'); await controls(page); await page.locator('[data-semantic-consent]').check();
  const requested = page.waitForRequest('**/generated/semantic-index.json'); await page.locator('[data-semantic-enable]').click(); await requested;
  await page.locator('[data-semantic-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('already loading');
  await command(page, 'What does A360 do?'); await expect(page.locator('[data-search-status]')).toContainText('Deterministic main-thread'); await canonicalResults(page);
  await page.locator('[data-jd-input]').fill('Python; Rust'); await page.locator('[data-jd-submit]').click(); await expect(page.locator('[data-jd-status]')).toContainText('2 requirements');
  expect((await snapshot(page)).pocketWorker).toBe('loading-model');
  expect((await snapshot(page)).tier).toBe('deterministic');
  await page.locator('[data-ai-cancel]').click(); release();
  await command(page, 'What does OptiCrop do?'); await expect(page.locator('[data-search-status]')).toContainText('Pocket: lexical');
  expect((await snapshot(page)).loadedModels).toEqual([]);
});
test('JD has a non-JS source fallback and script-injected oversized text is rejected', async ({ browser, page }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: testInfo.project.use.baseURL! });
  const staticPage = await context.newPage(); await staticPage.goto('/architecture/');
  await expect(staticPage.locator('[data-jd-input]')).toBeDisabled(); await expect(staticPage.locator('[data-jd-submit]')).toBeDisabled();
  await expect(staticPage.getByRole('link', { name: 'Browse source-linked skills →' })).toBeVisible(); await expect(staticPage.locator('[data-ai-controls]')).toBeHidden();
  await context.close(); await page.goto('/architecture/');
  await page.locator('[data-jd-input]').evaluate((input) => { (input as HTMLTextAreaElement).value = 'x'.repeat(12001); });
  await page.locator('[data-jd-form]').evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(page.locator('[data-jd-status]')).toContainText('Enter 1–12000'); expect((await snapshot(page)).pocketWorker).toBe('idle');
});
// Only Full is mocked in the following lifecycle tests; Pocket remains a real browser worker.
async function mockFull(page: Page, behavior: 'load-error' | 'hallucination' | 'suggestion' | 'hang') {
  await page.addInitScript((behavior) => {
    Object.defineProperty(navigator, 'gpu', { value: { requestAdapter: async () => ({ features: new Set(['shader-f16']) }) }, configurable: true });
    Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (options?.name !== 'atlas-full') { super(url, options); return; }
        const script = `self.onmessage = ({data:m}) => {
          if (${JSON.stringify(behavior)} === 'hang') { postMessage({id:m.id,type:'progress',progress:20}); return; }
          if (m.type === 'load') postMessage({id:m.id,type:${JSON.stringify(behavior === 'load-error' ? 'error' : 'loaded')}});
          else if (m.type === 'select') postMessage({id:m.id,type:'selection',selection:${behavior === 'hallucination' ? "{evidenceIds:['invented'],text:'made up'}" : "{evidenceIds:[m.evidenceIds[0]],tools:[{name:'openResume'}]}"}});
        }`;
        const blob = URL.createObjectURL(new Blob([script], { type: 'text/javascript' })); super(blob, options); URL.revokeObjectURL(blob);
      }
    };
  }, behavior);
}
for (const behavior of ['load-error', 'hallucination'] as const) test(`mocked Full ${behavior} returns to canonical Pocket`, async ({ page }) => {
  await mockFull(page, behavior); await page.goto('/architecture/'); await controls(page);
  await page.locator('[data-full-consent]').check(); await page.locator('[data-full-enable]').click();
  await expect(page.locator('[data-ai-status]')).toContainText(behavior === 'load-error' ? 'Full unavailable' : 'Full ready');
  await command(page, 'What does A360 do?'); await expect(page.locator('[data-search-status]')).toContainText('Pocket:'); await canonicalResults(page);
  expect((await snapshot(page)).loadedModels).not.toContain(FULL.id); await expect(page.locator('[data-search-results]')).not.toContainText('made up');
});
test('unsolicited model navigation requires confirmation', async ({ page }) => {
  await mockFull(page, 'suggestion'); await page.goto('/architecture/'); await controls(page);
  await page.locator('[data-full-consent]').check(); await page.locator('[data-full-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('Full ready');
  await command(page, 'What does A360 do?'); await expect(page.locator('[data-search-status]')).toContainText('Full:');
  await expect(page).toHaveURL(/\/architecture\/$/); await canonicalResults(page);
  await page.getByRole('button', { name: 'Confirm suggested action: openResume' }).click(); await expect(page).toHaveURL(/\/resume\/$/);
});
test('cancel terminates an in-progress Full model load and permits retry', async ({ page }) => {
  await mockFull(page, 'hang'); await page.goto('/architecture/'); await controls(page);
  await page.locator('[data-full-consent]').check(); await page.locator('[data-full-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('Full loading: 20%');
  await page.locator('[data-ai-cancel]').click(); expect((await snapshot(page)).fullWorker).toBe('idle'); expect((await snapshot(page)).loadedModels).toEqual([]);
  await page.locator('[data-full-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('Full loading: 20%'); await page.locator('[data-ai-unload]').click();
});
for (const theme of ['light', 'dark'] as const) test(`AI controls, JD results and observatory accessible in ${theme}`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' }); await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/architecture/'); await controls(page); await page.locator('[data-jd-input]').fill('Python; Java; Rust'); await page.locator('[data-jd-submit]').click(); await expect(page.locator('[data-jd-status]')).toContainText('3 requirements');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`ai-${theme}.png`), fullPage: true, animations: 'disabled' });
});
test('real MiniLM q8 WASM loads after consent and performs browser search + JD inference', async ({ page, context }, testInfo) => {
  test.setTimeout(120000);
  const modelPrefix = `https://huggingface.co/${SEMANTIC.id}/resolve/${SEMANTIC.revision}/`;
  const files = ['config.json', 'tokenizer_config.json', 'tokenizer.json', 'onnx/model_quantized.onnx'];
  const fetched: string[] = []; const traffic: string[] = []; const errors: string[] = [];
  context.on('request', (r) => traffic.push(`${r.method()} ${r.url()} ${r.postData() ?? ''}`));
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // Only asset transport is redirected to the exact pinned files downloaded by Build Brain.
  // The model, tokenizer, WASM backend, worker and inference results are NOT mocked.
  await context.route('https://huggingface.co/**', async (route) => {
    const url = route.request().url(); const name = url.slice(modelPrefix.length);
    if (!url.startsWith(modelPrefix) || !files.includes(name)) { await route.abort(); return; }
    fetched.push(name);
    const body = await readFile(new URL(`../../.cache/atlas-models/${SEMANTIC.id}/${SEMANTIC.revision}/${name}`, import.meta.url));
    await route.fulfill({ status: 200, body, contentType: name.endsWith('.json') ? 'application/json' : 'application/octet-stream', headers: { 'access-control-allow-origin': '*', 'content-length': String(body.length) } });
  });
  await page.goto('/architecture/'); await controls(page); expect(fetched).toEqual([]);
  await page.locator('[data-semantic-consent]').check(); await page.locator('[data-semantic-enable]').click();
  await expect(page.locator('[data-ai-status]')).toContainText(/Semantic embeddings ready|Semantic unavailable/, { timeout: 90000 });
  expect(await page.locator('[data-ai-status]').innerText(), `browser errors: ${errors.join(';')}; requests: ${traffic.join('\n')}`).toContain('Semantic embeddings ready');
  expect(fetched).toContain('onnx/model_quantized.onnx');
  await command(page, 'How does A360 handle telemetry?'); await expect(page.locator('[data-search-status]')).toContainText('learned semantic'); await canonicalResults(page);
  expect((await snapshot(page)).inferenceCount).toBeGreaterThan(0);
  await page.locator('[data-jd-input]').fill('distributed service health; Python; Rust; No Python'); await page.locator('[data-jd-submit]').click();
  await expect(page.locator('[data-jd-status]')).toContainText('4 requirements reviewed locally');
  expect((await snapshot(page)).inferenceCount).toBeGreaterThan(1);
  await expect(page.locator('[data-jd-level]').nth(1)).toHaveAttribute('data-jd-level', 'Strong Evidence');
  await expect(page.locator('[data-jd-level]').nth(2)).toHaveAttribute('data-jd-level', 'Not Demonstrated');
  await expect(page.locator('[data-jd-level]').nth(3)).toHaveAttribute('data-jd-level', 'Not Demonstrated');
  expect(traffic.join('\n')).not.toMatch(/handle%20telemetry|distributed.service.health|POST /);
  await page.locator('[data-observatory-refresh]').click(); await expect(page.locator('[data-observatory]')).toContainText('Measured Cache API');
  expect((await snapshot(page)).caches).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'atlas-semantic-v1', entries: expect.any(Number) })]));
  expect(await page.evaluate(async () => (await (await caches.open('atlas-semantic-v1')).keys()).length)).toBeGreaterThan(0);
  const report = testInfo.outputPath('real-wasm-runtime.json');
  await writeFile(report, JSON.stringify({ state: await snapshot(page), assets: fetched, errors }, null, 2));
  await testInfo.attach('real-wasm-runtime.json', { path: report, contentType: 'application/json' });
  await page.locator('[data-ai-clear-cache]').click(); await expect(page.locator('[data-observatory]')).toContainText('Selected model entries cleared');
  expect((await snapshot(page)).loadedModels).toEqual([]);
});
test('real Qwen once when WebGPU is available; blocked capability is recorded, never a fake pass', async ({ page }, testInfo) => {
  test.setTimeout(115000);
  await page.goto('/architecture/'); await controls(page);
  await page.locator('[data-observatory-refresh]').click(); await expect(page.locator('[data-observatory]')).toContainText('Measured Cache API');
  const probe = await snapshot(page); const reasons = (probe.capabilities as { reasons: string[] }).reasons;
  const probePath = testInfo.outputPath('real-qwen-capabilities.json'); await writeFile(probePath, JSON.stringify(probe, null, 2));
  await testInfo.attach('real-qwen-capabilities.json', { path: probePath, contentType: 'application/json' });
  test.skip(reasons.length > 0, `Real Full blocked before download: ${reasons.join(', ')}. No GPU inference claimed.`);
  test.skip(process.env.ATLAS_REAL_FULL !== '1', 'Large-model attempt is manual: ATLAS_REAL_FULL=1. Capability probe and mocked lifecycle checks are separate.');
  await page.locator('[data-full-consent]').check(); await page.locator('[data-full-enable]').click();
  try { await expect(page.locator('[data-ai-status]')).toContainText(/Full ready|Full unavailable/, { timeout: 85000 }); }
  catch { await page.locator('[data-ai-cancel]').click(); }
  const before = await snapshot(page);
  const report = testInfo.outputPath('real-qwen-attempt.json'); await writeFile(report, JSON.stringify(before, null, 2));
  await testInfo.attach('real-qwen-attempt.json', { path: report, contentType: 'application/json' });
  test.skip(!(before.loadedModels as string[]).includes(FULL.id), `Real Full blocked: ${String(before.fallbackReason)}; path ${String(before.path)}. No successful GPU inference claimed.`);
  await command(page, 'What does A360 do?');
  await expect(page.locator('[data-search-status]')).toContainText('Full:', { timeout: 20000 }); await canonicalResults(page);
  await page.locator('[data-ai-unload]').click();
});