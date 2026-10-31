/**
 * Visual verification harness: screenshots every page in desktop/mobile × light/dark and reports
 * console errors and horizontal overflow. Usage: npm run shots [-- outDir]  (needs `npm run preview` running).
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE ?? 'http://127.0.0.1:4331';
const out = process.argv[2] ?? 'test-results/shots';
mkdirSync(out, { recursive: true });
const pages = (
  process.env.PAGES ??
  '/,/work/,/work/a360/,/skills/,/skills/observability/,/credentials/,/education/,/resume/,/match/,/ask/,/observatory/,/journeys/,/compare/,/404.html'
).split(',');
const browser = await chromium.launch();
const configs = [
  { name: 'desktop-dark', ctx: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' } },
  { name: 'desktop-light', ctx: { viewport: { width: 1440, height: 900 }, colorScheme: 'light' } },
  { name: 'mobile-dark', ctx: { ...devices['Pixel 7'], colorScheme: 'dark' } },
  { name: 'mobile-light', ctx: { ...devices['Pixel 7'], colorScheme: 'light' } },
];
const errors = [];
for (const c of configs) {
  const context = await browser.newContext(c.ctx);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${c.name} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${c.name} console: ${m.text().slice(0, 200)}`);
  });
  for (const p of pages) {
    await page
      .goto(base + p, { waitUntil: 'load' })
      .catch((e) => errors.push(`${c.name} ${p}: ${e.message}`));
    await page.waitForTimeout(900);
    const sw = await page.evaluate(() => ({
      dw: document.documentElement.scrollWidth,
      bw: document.body.scrollWidth,
      vw: innerWidth,
    }));
    if (sw.bw > sw.vw + 1 || sw.dw > sw.vw + 1)
      errors.push(`${c.name} ${p}: horizontal overflow body=${sw.bw} doc=${sw.dw} vw=${sw.vw}`);
    const name = `${c.name}${p.replace(/[^a-z0-9]+/gi, '_') || '_home'}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: process.env.FULL === '1' });
  }
  await context.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console/page errors, no horizontal overflow');
process.exit(errors.length ? 1 : 0);
