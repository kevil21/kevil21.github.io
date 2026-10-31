import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { createServer as createSocket } from 'node:net';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { cpus, platform, release, arch } from 'node:os';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { once } from 'node:events';
import { performanceFailures } from './performance-budgets.mjs';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const output = new URL(`../performance-results/${new Date().toISOString().replaceAll(':', '-')}/`, import.meta.url);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
// Fixed gzip production-file server. This is not a measurement of CDN/Pages compression.
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
    if (!filename.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
    const bytes = await readFile(filename); const ext = path.extname(filename);
    const compressed = /\.(html|js|css|json|svg|xml|webmanifest)$/.test(filename) && /gzip/.test(req.headers['accept-encoding'] ?? '');
    const body = compressed ? gzipSync(bytes) : bytes;
    res.writeHead(200, { 'content-type': mime[ext] ?? 'application/octet-stream', 'content-length': body.length, 'cache-control': 'no-store', ...(compressed ? { 'content-encoding': 'gzip', vary: 'Accept-Encoding' } : {}) }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
await mkdir(output, { recursive: true });
const records = [];
const routes = [['home', '/'], ['project', '/projects/a360/'], ['architecture', '/architecture/']];
const modes = ['mobile', 'desktop'];
const forbidden = /\.onnx|\.wasm|transformers\.web|full\.worker|pocket\.worker|\/models\/|huggingface|webllm/i;
const manifest = JSON.parse(await readFile(path.join(root, 'offline-manifest.json'), 'utf8'));
try {
  for (const mode of modes) for (const [name, route] of routes) for (let run = 1; run <= 3; run++) {
    const socket = createSocket(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
    const port = socket.address().port; await new Promise((resolve) => socket.close(resolve));
    const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
    try {
      const result = await lighthouse(`${origin}${route}`, {
        port, logLevel: 'error', output: ['json', 'html'],
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      }, {
        extends: 'lighthouse:default',
        settings: {
          ...(mode === 'desktop' ? { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 }, emulatedUserAgent: false } : {}),
          throttlingMethod: 'simulate', disableStorageReset: false,
          // Cold core audit: block SW installation, not ordinary resources or AI requests.
          blockedUrlPatterns: ['*/sw.js'],
        },
      });
      if (!result || result.lhr.runtimeError) throw new Error(JSON.stringify(result?.lhr.runtimeError ?? 'No Lighthouse result'));
      const { lhr } = result;
      const requests = lhr.audits['network-requests'].details.items;
      const metric = (id) => lhr.audits[id].numericValue;
      const record = {
        name, route, mode, run, browser: browser.version(), lighthouseVersion: lhr.lighthouseVersion,
        fetchTime: lhr.fetchTime, scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, value]) => [key, value.score])),
        fcp: metric('first-contentful-paint'), lcp: metric('largest-contentful-paint'), tbt: metric('total-blocking-time'), cls: metric('cumulative-layout-shift'), si: metric('speed-index'),
        transferBytes: metric('total-byte-weight'), requests: requests.map(({ url, transferSize, resourceSize, resourceType }) => ({ url, transferSize, resourceSize, resourceType })),
        unexpectedModelRequests: requests.filter((r) => forbidden.test(r.url)).map((r) => r.url),
        configSettings: lhr.configSettings, environment: lhr.environment, warnings: lhr.runWarnings,
      };
      records.push(record);
      const stem = `${mode}-${name}-${run}`;
      await writeFile(new URL(`${stem}.json`, output), result.report[0]);
      await writeFile(new URL(`${stem}.html`, output), result.report[1]);
      console.info(`${stem}: ${Math.round(record.scores.performance * 100)} FCP=${record.fcp.toFixed(0)} LCP=${record.lcp.toFixed(0)} TBT=${record.tbt.toFixed(0)} CLS=${record.cls.toFixed(4)} SI=${record.si.toFixed(0)} transfer=${record.transferBytes}`);
    } finally { await browser.close(); }
  }
} finally {
  server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
  const failures = performanceFailures(records);
  await writeFile(new URL('summary.json', output), JSON.stringify({ date: new Date().toISOString(), node: process.version, os: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0]?.model, build: manifest.version, conditions: 'Local gzip static dist, fresh Chromium per run, cold storage, simulated Lighthouse throttling, SW URL blocked. No other requests blocked. Not field CWV.', records, failures }, null, 2));
  console.info(`Reports: ${fileURLToPath(output)} (${records.length}/18 completed)`);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
}