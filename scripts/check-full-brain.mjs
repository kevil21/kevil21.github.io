/**
 * Real Full Brain verification on WebGPU (Chrome headless=new exposes an adapter in a secure context).
 * Downloads the compact model once (~290 MB, cached by the browser profile for the run only).
 * Usage: BASE=http://127.0.0.1:4331 node scripts/check-full-brain.mjs
 */
import { chromium } from '@playwright/test';
const base = process.env.BASE ?? 'http://127.0.0.1:4331';
const t0 = Date.now();
const since = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
const b = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--headless=new', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=metal'],
});
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`${m.type()}: ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.addInitScript(() => {
  localStorage.setItem('trace:pocket-semantic', 'no');
  localStorage.setItem('trace:debug', '1');
});
const MODEL = process.env.MODEL ?? 'compact';
await page.goto(base + '/ask/', { waitUntil: 'load' });
console.log(
  since(),
  'webgpu:',
  await page.evaluate(async () => {
    const a = await navigator.gpu?.requestAdapter();
    return a ? `adapter · f16=${a.features.has('shader-f16')}` : 'none';
  }),
);
await page
  .getByRole('heading', { name: 'Run a language model on this device?' })
  .waitFor({ timeout: 20_000 });
console.log(
  since(),
  'offer shown with sizes:',
  (await page.locator('.ask__model').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '),
);
await page.locator('.ask__model', { hasText: MODEL }).first().click();
const btn = page.getByRole('button', { name: /Download \d+ MB and enable/ });
console.log(since(), 'clicking:', await btn.textContent());
await btn.click();
await page.locator('.ask__progress').waitFor({ timeout: 30_000 });
console.log(
  since(),
  'progress UI visible; cancel button present:',
  await page.getByRole('button', { name: 'Cancel' }).isVisible(),
);
let last = '';
const deadline = Date.now() + 15 * 60_000;
while (Date.now() < deadline) {
  const status = (await page.locator('.ask__status').textContent())?.replace(/\s+/g, ' ') ?? '';
  if (status !== last) {
    console.log(since(), status.slice(0, 160));
    last = status;
  }
  if (/full · ready/.test(status)) break;
  if (/full · error/.test(status)) break;
  await page.waitForTimeout(4000);
}
const ready = /full · ready/.test(last);
console.log(since(), ready ? '✓ FULL BRAIN READY' : '✗ full brain not ready');
if (ready) {
  for (const q of [
    "What are Kevil's strongest cloud and AI projects? Open the best one.",
    'Does Kevil have experience with COBOL mainframes?',
  ]) {
    await page.getByRole('textbox', { name: 'Your question' }).fill(q);
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    const turn = page.locator('.turn').last();
    await page.waitForFunction(() => !document.querySelector('.turn.is-streaming'), null, {
      timeout: 180_000,
    });
    console.log('\nQ:', q);
    console.log('path:', (await turn.locator('.turn__path').textContent())?.trim());
    console.log('A:', (await turn.locator('.turn__text').textContent())?.trim().slice(0, 600));
    console.log(
      'evidence:',
      await turn.locator('.turn__evidence li').count(),
      '| tool buttons:',
      (await turn.locator('.turn__tools button').allTextContents()).map((t) => t.trim().slice(0, 60)),
    );
  }
  const tool = page.locator('.turn__tools button').first();
  if (await tool.count()) {
    console.log('clicking tool:', (await tool.textContent())?.trim().slice(0, 60));
    await tool.click();
    await page.waitForTimeout(1500);
    console.log('url after tool:', page.url());
  }
  // cache + clear control
  await page.goto(base + '/observatory/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  console.log(
    'observatory model cache tile:',
    (
      await page
        .locator('.tile')
        .filter({ has: page.locator('.tile__label', { hasText: /^model cache$/ }) })
        .textContent()
    )?.replace(/\s+/g, ' '),
  );
}
console.log(
  '\nconsole errors:',
  logs
    .filter((l) => /^error|pageerror/.test(l))
    .slice(0, 6)
    .join('\n') || 'none',
);
await b.close();
