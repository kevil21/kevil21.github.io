#!/usr/bin/env node
/* global document, navigator, performance */
/**
 * REAL Full-Brain check (prompt §9): Google Chrome `--headless=new` on 127.0.0.1 (a secure context) exposes a WebGPU
 * adapter where Playwright's Chromium does not (inherited). Opens /operator/, enables the local model, logs download
 * time, asks for a grounded answer, a refusal and a tool, and writes a JSON log. Runs for both model sizes.
 * Usage: node scripts/check-full-brain.mjs [--models 0.5B,1.5B] [--out .cache/full-brain-check.json]
 * Needs: a built dist/, Google Chrome installed, network for the first download.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const PORT = 4451;
const MODELS = flag('models', '0.5B,1.5B').split(',');
const OUT = flag('out', '.cache/full-brain-check.json');
const IDS = { '0.5B': 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', '1.5B': 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' };

const server = spawn(process.execPath, ['scripts/serve-dist.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--headless=new',
    '--enable-unsafe-webgpu',
    '--ignore-gpu-blocklist',
    '--use-angle=metal',
    '--enable-features=Vulkan',
  ],
});
const log = { startedAt: new Date().toISOString(), chrome: browser.version(), runs: [] };

for (const size of MODELS) {
  const modelId = IDS[size];
  if (!modelId) continue;
  const run = { size, modelId, steps: [] };
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, colorScheme: 'dark' });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (/error/i.test(m.type())) run.steps.push({ console: m.text().slice(0, 200) });
  });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/operator/`);
    await page.waitForSelector('.op[data-operator-ready="ready"]', { timeout: 30000 });
    const gpu = await page.evaluate(async () => {
      const a = await navigator.gpu?.requestAdapter();
      return a
        ? {
            adapter: true,
            f16: a.features.has('shader-f16'),
            info: a.info ? { vendor: a.info.vendor, architecture: a.info.architecture } : null,
          }
        : { adapter: false };
    });
    run.gpu = gpu;
    if (!gpu.adapter) throw new Error('no WebGPU adapter in this Chrome');
    await page.locator('.op__full summary').click();
    await page.waitForSelector('#op-model', { timeout: 10000 });
    await page.selectOption('#op-model', modelId);
    const t0 = performance.now();
    await page.locator('.op__fullrow .op__ask').click();
    await page.waitForSelector('[data-full-ready]', { timeout: 45 * 60 * 1000 });
    run.downloadSeconds = Math.round(((performance.now() - t0) / 1000) * 10) / 10;
    run.tier = await page.locator('[data-tier]').textContent();

    const ask = async (q) => {
      await page.fill('#op-q', q);
      await page.locator('.op__form button[type="submit"]').click();
      await page.waitForSelector('.op__answer', { timeout: 120000 });
      await page.waitForFunction(
        () => document.querySelector('.op__step[data-step="explain"]')?.getAttribute('data-state') === 'done',
        null,
        { timeout: 120000 },
      );
      const a = await page.evaluate(() => {
        const el = document.querySelector('.op__answer');
        return {
          path: el?.getAttribute('data-path'),
          prose: Array.from(el?.querySelectorAll('.op__prose p') ?? []).map((p) => p.textContent?.trim()),
          cites: el?.querySelectorAll('.op__cites li').length ?? 0,
          tools: Array.from(el?.querySelectorAll('.op__tool') ?? []).map((b) => b.textContent?.trim()),
          gauges: el?.querySelector('.op__gauges')?.textContent?.replace(/\s+/g, ' ').trim(),
          note: el?.querySelector('.as-stated')?.textContent?.trim() ?? null,
        };
      });
      return a;
    };
    const t1 = performance.now();
    run.grounded = await ask('How does the A360 sync service stay safe to re-run?');
    run.grounded.seconds = Math.round(((performance.now() - t1) / 1000) * 10) / 10;
    run.refusal = await ask('Does Kevil write COBOL for mainframe banking?');
    run.toolAnswer = await ask('Walk me to the Policy Sorter');
    const toolBtn = page.locator('.op__tool', { hasText: /Walk to/ }).first();
    if (await toolBtn.count()) {
      await toolBtn.click();
      await page.waitForURL(/\/#bay-\d/, { timeout: 15000 }).catch(() => {});
      run.toolExecuted = page.url();
    }
    run.ok = true;
  } catch (e) {
    run.ok = false;
    run.error = String(e.message || e).slice(0, 400);
  }
  log.runs.push(run);
  await context.close();
}
await browser.close();
server.kill();
mkdirSync('.cache', { recursive: true });
writeFileSync(OUT, JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
process.exit(log.runs.every((r) => r.ok) ? 0 : 1);
