#!/usr/bin/env node
/* global document, performance */
/**
 * 3G-throttled run (prompt §9): proves the HTML story is readable before any 3D bundle arrives.
 * Chromium via CDP: 1.6 Mbps down / 750 kbps up / 150 ms RTT, 4× CPU slowdown. Logs when the recruiter strip and the
 * H1 are visible, when the first Three.js chunk request starts, and when the hall reports ready.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 4452;
const server = spawn(process.execPath, ['scripts/serve-dist.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch();
const context = await browser.newContext({
  ...{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const t0 = performance.now();
let threeRequestAt = null;
page.on('request', (r) => {
  if (/\/_astro\/three\./.test(r.url()) && threeRequestAt === null) threeRequestAt = performance.now() - t0;
});
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit' });
await page.locator('#recruiter-strip').waitFor({ state: 'visible' });
const stripAt = performance.now() - t0;
await page.locator('#hall-title').waitFor({ state: 'visible' });
const h1At = performance.now() - t0;
const textAt = await page.evaluate(
  () =>
    performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? null,
);
let readyAt;
try {
  await page.waitForFunction(
    () => document.getElementById('hall-stage')?.getAttribute('data-hall') === 'ready',
    null,
    { timeout: 90000 },
  );
  readyAt = performance.now() - t0;
} catch {
  readyAt = null;
}
const bodyText = await page.evaluate(() => document.body.innerText.length);
const result = {
  network: '3G (1.6 Mbps / 750 kbps / 150 ms RTT), CPU ×4, 390×844 @3x',
  firstContentfulPaintMs: textAt === null ? null : Math.round(textAt),
  recruiterStripVisibleMs: Math.round(stripAt),
  h1VisibleMs: Math.round(h1At),
  firstThreeJsRequestMs: threeRequestAt === null ? null : Math.round(threeRequestAt),
  hallReadyMs: readyAt === null ? null : Math.round(readyAt),
  readableCharactersBefore3D: bodyText,
  verdict:
    threeRequestAt === null || h1At < threeRequestAt
      ? 'HTML readable before any 3D bundle was requested'
      : 'FAIL: 3D requested before the HTML was readable',
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
server.kill();
process.exit(result.verdict.startsWith('FAIL') ? 1 : 0);
