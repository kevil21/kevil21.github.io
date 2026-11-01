#!/usr/bin/env node
/* global document, window */
/**
 * Screenshot pass (prompt §9: four configurations reviewed before hand-over) plus a hall-state dump.
 * Serves dist/ itself. Usage: node scripts/screenshots.mjs [--pages /,/resume/] [--out screenshots]
 * Configurations: desktop-dark, desktop-light, pixel7-dark (portrait), iphone14-webkit-light.
 */
import { chromium, webkit, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const PORT = 4449;
const OUT = flag('out', 'screenshots');
const PAGES = flag('pages', '/').split(',');
const BAY = Number(flag('bay', '0')); // on '/', walk this many bays with ArrowRight before shooting
const ONLY = flag('only', ''); // comma-separated config names
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/serve-dist.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 700));

const CONFIGS = [
  {
    name: 'desktop-dark',
    browser: chromium,
    ctx: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  },
  {
    name: 'desktop-light',
    browser: chromium,
    ctx: { viewport: { width: 1440, height: 900 }, colorScheme: 'light' },
  },
  { name: 'pixel7-dark', browser: chromium, ctx: { ...devices['Pixel 7'], colorScheme: 'dark' } },
  { name: 'iphone14-light', browser: webkit, ctx: { ...devices['iPhone 14'], colorScheme: 'light' } },
];

const report = [];
for (const c of CONFIGS.filter((c) => !ONLY || ONLY.split(',').includes(c.name))) {
  const browser = await c.browser.launch();
  const context = await browser.newContext(c.ctx);
  const page = await context.newPage();
  for (const path of PAGES) {
    await page.goto(`http://127.0.0.1:${PORT}${path}`);
    let hall = null;
    if (path === '/') {
      await page
        .waitForFunction(
          () => /ready|static/.test(document.getElementById('hall-stage')?.getAttribute('data-hall') ?? ''),
          null,
          { timeout: 20000 },
        )
        .catch(() => {});
      await page.waitForTimeout(3500); // let the opening sweep finish
      if (BAY > 0) {
        await page.locator('body').click({ position: { x: 5, y: 5 } });
        for (let i = 0; i < BAY; i++) {
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(2500);
      }
      hall = await page.evaluate(() => ({
        state: document.getElementById('hall-stage')?.getAttribute('data-hall'),
        reasons: document.getElementById('hall-stage')?.getAttribute('data-hall-reasons'),
        error: document.getElementById('hall-stage')?.getAttribute('data-hall-error'),
        probe: window.__srHall ?? null,
      }));
    } else {
      // not networkidle: the Operator page may be downloading the 23 MB embedder on fine-pointer configs
      await page.waitForLoadState('load');
      await page.waitForTimeout(2500);
    }
    const file = join(OUT, `${c.name}${path.replace(/\//g, '_') || '_'}${BAY ? `-bay${BAY}` : ''}.png`);
    await page.screenshot({ path: file, fullPage: false });
    report.push({ config: c.name, path, file, hall });
  }
  await browser.close();
}
server.kill();
for (const r of report) console.log(JSON.stringify(r));
