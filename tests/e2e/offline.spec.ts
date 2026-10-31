import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import type { StaticManifest } from '../../src/pwa/policy';

test.use({ serviceWorkers: 'allow' });
const root = new URL('../../dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('offline-manifest.json', root), 'utf8')) as StaticManifest;
async function status(page: Page) {
  return page.evaluate(async () => {
    const channel = new MessageChannel();
    return await new Promise<{ version: string; entries: number; complete: boolean; recent: string[] }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No SW response')), 5000);
      channel.port1.onmessage = (event) => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      navigator.serviceWorker.controller!.postMessage({ type: 'ATLAS_STATUS', version: document.querySelector<HTMLMetaElement>('meta[name="atlas-build"]')!.content }, [channel.port2]);
    });
  });
}
async function ready(page: Page, path = '/') {
  await page.goto(path);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30000 }).toBe(true);
  await expect.poll(async () => (await status(page)).complete).toBe(true);
}
async function command(page: Page, query: string) {
  await page.locator('[data-command-input]').fill(query);
  await page.locator('[data-command-form]').evaluate((form) => (form as HTMLFormElement).requestSubmit());
}
async function keys(page: Page) {
  return page.evaluate(async () => {
    const output: Record<string, string[]> = {};
    for (const key of await caches.keys()) output[key] = (await (await caches.open(key)).keys()).map((request) => request.url);
    return output;
  });
}
test('actual offline unvisited routes, reload, knowledge and Pocket worker; no automatic model assets', async ({ page, context }, info) => {
  const traffic: string[] = []; context.on('request', (request) => traffic.push(request.url()));
  await ready(page);
  expect((await status(page)).entries).toBe(manifest.entries.length);
  expect(traffic.join('\n')).not.toMatch(/transformers|full\.worker|\.wasm|\.onnx|huggingface|models\//);
  await context.setOffline(true);
  for (const entry of manifest.entries.filter((item) => item.kind === 'route' && item.url !== '/404.html')) {
    const response = await page.goto(entry.url);
    expect(response?.status(), entry.url).toBe(200);
    await expect(page.locator('meta[name="atlas-build"]')).toHaveAttribute('content', manifest.version);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.goto('/architecture/'); await page.reload();
  await command(page, 'What does A360 do? offline-question-canary');
  await expect(page.locator('[data-search-status]')).toContainText('Pocket: lexical');
  await expect(page.locator('[data-search-results] [data-evidence-id]').first()).toBeVisible();
  await page.locator('[data-jd-input]').fill('Python; Rust; offline-jd-canary');
  await page.locator('[data-jd-submit]').click();
  await expect(page.locator('[data-jd-status]')).toContainText('3 requirements reviewed locally');
  expect(JSON.parse(await page.locator('[data-observatory]').innerText()).pocketWorker).toBe('ready');
  await command(page, 'Python'); await expect(page.locator('[data-search-results] a').first()).toBeVisible();
  expect(await page.evaluate(async () => (await (await fetch('/generated/search-index.json')).json()).schemaVersion)).toBe(1);
  const observed = await status(page); expect(observed.recent.length).toBeLessThanOrEqual(8); expect(observed.recent[0]).toBe('/architecture/');
  expect(JSON.stringify(await keys(page))).not.toMatch(/canary|\?|models\/|full\.worker|transformers/);
  await page.locator('[data-offline-controls] summary').click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath('offline-observatory.png'), fullPage: true });
});
test('unknown paths stay 404; queries/private paths/methods are excluded; missing routes return 503', async ({ page, context }) => {
  await ready(page);
  await context.setOffline(true);
  const response = await page.goto('/not-a-published-route/'); expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('No record');
  const query = await page.goto('/search/?q=sensitive-canary'); expect(query?.status()).toBe(503);
  await expect(page.locator('h1')).toContainText('A useful atlas');
  await page.goto('/');
  const excluded = await page.evaluate(async () => {
    const results: boolean[] = [];
    for (const headers of [{ Authorization: 'Bearer test-only' }, { Range: 'bytes=0-10' }, { 'Cache-Control': 'no-store' }]) {
      results.push(await fetch('/generated/search-index.json', { headers }).then(() => false, () => true));
    }
    return results;
  });
  expect(excluded).toEqual([true, true, true]);
  await page.evaluate(async () => {
    for (const path of ['/private/canary', '/api/canary', '/generated/search-index.json?q=canary']) await fetch(path).catch(() => {});
    for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) await fetch('/resume/', { method }).catch(() => {});
    for (const key of await caches.keys()) if (key.startsWith('atlas-static-v1-')) await (await caches.open(key)).delete('/resume/');
  });
  const missing = await page.goto('/resume/'); expect(missing?.status()).toBe(503);
  const all = JSON.stringify(await keys(page)); expect(all).not.toMatch(/sensitive-canary|private\/|api\/|\?/);
  expect((await status(page)).recent).not.toContain('/search/?q=sensitive-canary');
});
test('corrupt cached bytes are rejected, not rendered; clear affects only static caches across tabs', async ({ page, context }) => {
  await ready(page, '/architecture/');
  const other = await context.newPage(); await ready(other);
  await page.evaluate(async () => {
    for (const name of ['atlas-semantic-v1', 'webllm/model', 'unrelated-cache']) await (await caches.open(name)).put('/sentinel', new Response('keep'));
    for (const key of await caches.keys()) if (key.startsWith('atlas-static-v1-')) await (await caches.open(key)).put('/resume/', new Response('<h1>CORRUPT PAYLOAD</h1>'));
  });
  await context.setOffline(true);
  expect((await page.goto('/resume/'))?.status()).toBe(503); await expect(page.locator('body')).not.toContainText('CORRUPT PAYLOAD');
  await page.locator('[data-offline-controls] summary').click(); await page.locator('[data-offline-clear]').click();
  await expect(page.locator('[data-offline-status]')).toContainText('Offline copies cleared');
  await other.locator('[data-offline-controls] summary').click(); await expect(other.locator('[data-offline-status]')).toContainText('Offline copies cleared');
  await expect.poll(async () => Object.keys(await keys(page)).filter((key) => key.startsWith('atlas-static-'))).toEqual([]);
  expect(Object.keys(await keys(page)).sort()).toEqual(['atlas-semantic-v1', 'unrelated-cache', 'webllm/model']);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});
test('registration failures, unsupported contexts and no-JS preserve the online portfolio', async ({ browser }, info) => {
  for (const behavior of ['reject', 'insecure', 'no-js']) {
    const context = await browser.newContext({ baseURL: info.project.use.baseURL!, javaScriptEnabled: behavior !== 'no-js', serviceWorkers: 'allow' });
    if (behavior === 'reject') await context.addInitScript(() => { navigator.serviceWorker.register = async () => { throw new Error('Registration denied'); }; });
    if (behavior === 'insecure') await context.addInitScript(() => Object.defineProperty(window, 'isSecureContext', { value: false }));
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/'); await expect(page.locator('h1')).toBeVisible();
    if (behavior === 'no-js') await expect(page.locator('[data-offline-controls]')).toBeHidden();
    else {
      await page.locator('[data-offline-controls] summary').click();
      await expect(page.locator('[data-offline-status]')).toContainText(behavior === 'reject' ? 'registration failed' : 'requires HTTPS');
      await command(page, 'What does A360 do?'); await expect(page.locator('[data-search-status]')).toContainText('Pocket:');
    }
    expect(errors).toEqual([]); await context.close();
  }
});

for (const theme of ['light', 'dark'] as const) test(`offline controls retain mobile contrast and keyboard access in ${theme}`, async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: theme }); await page.setViewportSize({ width: 320, height: 740 });
  await ready(page);
  const summary = page.locator('[data-offline-controls] summary');
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-offline-check]')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-offline-controls]').screenshot({ path: info.outputPath(`offline-controls-${theme}.png`) });
});

// Real HTTP origin + real SW lifecycle. Two byte-consistent build variants are
// served from memory; neither dist nor the current preview is mutated.
test('atomic failed update retains old build; explicit refresh moves two tabs together', async ({ browser }) => {
  test.setTimeout(90000);
  const original = new Map<string, Buffer>();
  for (const entry of manifest.entries) original.set(entry.url, await readFile(new URL(entry.url === '/' ? 'index.html' : entry.url.endsWith('/') ? `${entry.url.slice(1)}index.html` : entry.url.slice(1), root)));
  const sw = await readFile(new URL('sw.js', root), 'utf8'); original.set('/sw.js', Buffer.from(sw));
  const next = new Map(original);
  const version = createHash('sha256').update(`${manifest.version}:fixture-next`).digest('hex');
  const layout = manifest.entries.find((entry) => entry.url.includes('/Layout.') && entry.url.endsWith('.js'))!;
  const layoutBytes = Buffer.concat([original.get(layout.url)!, Buffer.from('\n/* next build */')]);
  const layoutURL = layout.url.replace(/\.js$/, `-${createHash('sha256').update(layoutBytes).digest('hex').slice(0, 8)}.js`);
  next.delete(layout.url); next.set(layoutURL, layoutBytes);
  for (const entry of manifest.entries.filter((item) => item.kind === 'route')) {
    const body = Buffer.from(original.get(entry.url)!.toString().replaceAll(manifest.version, version).replaceAll(layout.url, layoutURL).replace('</body>', '<!-- second build fixture --></body>'));
    next.set(entry.url, body);
  }
  const nextManifest = { version, entries: manifest.entries.map((entry) => {
    const url = entry.url === layout.url ? layoutURL : entry.url;
    const body = next.get(url)!;
    return { ...entry, url, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') };
  }) };
  const compiled = await build({ entryPoints: [fileURLToPath(new URL('../../src/pwa/service-worker.ts', import.meta.url))], bundle: true, write: false, minify: true, target: 'es2022', format: 'iife', define: { __ATLAS_MANIFEST__: JSON.stringify(nextManifest) } });
  next.set('/sw.js', Buffer.from(compiled.outputFiles[0]!.text));
  let current = original; let corrupt = false; let slow = false;
  const server = createServer((req, res) => {
    const path = new URL(req.url!, 'http://localhost').pathname;
    const send = () => {
      const data = corrupt && path === '/assets/icon-192.png' ? Buffer.from('broken') : current.get(path);
      res.writeHead(data ? (path === '/404.html' ? 404 : 200) : 404, { 'Cache-Control': path === '/sw.js' ? 'no-store' : 'public, max-age=0', 'Content-Type': path === '/sw.js' || path.endsWith('.js') ? 'text/javascript' : path.endsWith('.json') ? 'application/json' : path.endsWith('.css') ? 'text/css' : path.endsWith('.webmanifest') ? 'application/manifest+json' : path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : path.endsWith('.jpg') ? 'image/jpeg' : 'text/html' });
      res.end(data ?? 'Not found');
    };
    if (slow && path === '/resume/') setTimeout(send, 4500); else send();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const context = await browser.newContext({ baseURL: origin, serviceWorkers: 'allow' });
  try {
    const page = await context.newPage(); await ready(page);
    const other = await context.newPage(); await ready(other, '/architecture/');
    await page.evaluate(async () => (await caches.open('unrelated-cache')).put('/sentinel', new Response('keep')));
    slow = true; const start = Date.now(); expect((await page.goto('/resume/'))?.status()).toBe(200);
    expect(Date.now() - start).toBeLessThan(4300); slow = false;
    current = next; corrupt = true;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(async () => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !r?.installing && !r?.waiting; }), { timeout: 30000 }).toBe(true);
    expect((await status(page)).version).toBe(manifest.version);
    expect(Object.keys(await keys(page)).filter((key) => key.startsWith('atlas-static-v1-'))).toEqual([`atlas-static-v1-${manifest.version}`]);
    corrupt = false;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect(page.locator('[data-offline-update]')).toBeVisible({ timeout: 30000 });
    // Host has version 2, but version 1 still serves its own matching HTML/indices.
    await page.goto('/architecture/'); await expect(page.locator('meta[name="atlas-build"]')).toHaveAttribute('content', manifest.version);
    await expect(page.locator(`script[src="${layout.url}"]`)).toHaveCount(1);
    // A query URL never pulls the newer document into the older snapshot.
    expect((await other.goto('/search/?q=update-canary'))?.status()).toBe(503);
    await expect(other.locator('meta[name="atlas-build"]')).toHaveAttribute('content', manifest.version);
    await other.goto('/architecture/');
    await expect(page.locator('[data-offline-update]')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.locator('[data-offline-refresh]').click();
    for (const tab of [page, other]) {
      await expect(tab.locator('meta[name="atlas-build"]')).toHaveAttribute('content', version, { timeout: 30000 });
      await expect(tab.locator(`script[src="${layoutURL}"]`)).toHaveCount(1);
      await expect.poll(async () => (await status(tab)).version).toBe(version);
    }
    await expect.poll(async () => Object.keys(await keys(page)).filter((key) => key.startsWith('atlas-static-v1-'))).toEqual([`atlas-static-v1-${version}`]);
    expect(Object.keys(await keys(page))).toContain('unrelated-cache');
    await context.setOffline(true); expect((await page.goto('/resume/'))?.status()).toBe(200);
    expect((await page.goto('/resume'))?.status()).toBe(200); await expect(page).toHaveURL(`${origin}/resume/`);
  } finally { await context.close(); server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});