/**
 * One-off verification of the Pocket Brain semantic path in a real browser (downloads the 23 MB
 * MiniLM once). Usage: node scripts/check-semantic.mjs  (needs `npm run preview` on :4331).
 */
import { chromium } from '@playwright/test';
const base = process.env.BASE ?? 'http://127.0.0.1:4331';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`${m.type()}: ${m.text().slice(0, 160)}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.addInitScript(() => localStorage.setItem('trace:pocket-semantic', 'yes'));
const t0 = Date.now();
await page.goto(base + '/observatory/', { waitUntil: 'load' });
const tile = page
  .locator('.tile')
  .filter({ has: page.locator('.tile__label', { hasText: /^pocket brain$/ }) });
try {
  await tile.locator('.tile__value', { hasText: /^semantic$/ }).waitFor({ timeout: 240_000 });
  console.log(
    `✓ semantic embedder ready in ${((Date.now() - t0) / 1000).toFixed(1)} s ·`,
    (await tile.locator('.tile__sub').textContent())?.trim(),
  );
} catch {
  console.log('✗ semantic did not become ready; tile:', (await tile.textContent())?.replace(/\s+/g, ' '));
}
await page.goto(base + '/ask/', { waitUntil: 'load' });
await page.locator('.tile, .ask__status').first().waitFor();
await page.getByRole('textbox', { name: 'Your question' }).fill('How does Kevil keep dashboards honest?');
await page.getByRole('button', { name: 'Ask', exact: true }).click();
const turn = page.locator('.turn').last();
await turn.waitFor();
await page.waitForFunction(() => !document.querySelector('.turn.is-streaming'), null, { timeout: 60_000 });
console.log('path:', (await turn.locator('.turn__path').textContent())?.trim());
console.log('answer:', (await turn.locator('.turn__text').textContent())?.slice(0, 220));
console.log('evidence:', await turn.locator('.turn__evidence li').count());
const via = await page.evaluate(async () => {
  const r = await fetch('/generated/semantic-index.json');
  const j = await r.json();
  return `${j.ids.length} vectors × ${j.dims}`;
});
console.log('semantic index:', via);
console.log(
  logs
    .filter((l) => /error|warn/.test(l))
    .slice(0, 8)
    .join('\n') || 'no console errors',
);
await b.close();
