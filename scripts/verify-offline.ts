import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MAX_ASSET_BYTES, MAX_ENTRIES, MAX_TOTAL_BYTES, publicPath } from '../src/pwa/policy.ts';
import type { StaticManifest } from '../src/pwa/policy.ts';
export async function verifyOffline(root: URL) {
  const manifest = JSON.parse(await readFile(new URL('offline-manifest.json', root), 'utf8')) as StaticManifest;
  assert(/^[a-f0-9]{64}$/.test(manifest.version));
  assert(manifest.entries.length <= MAX_ENTRIES);
  assert.equal(new Set(manifest.entries.map((entry) => entry.url)).size, manifest.entries.length);
  const sw = await readFile(new URL('sw.js', root), 'utf8'); assert(sw.includes(manifest.version));
  let bytes = 0;
  for (const entry of manifest.entries) {
    assert.equal(publicPath(entry.url, 'https://static.invalid'), entry.url);
    assert(!/full\.worker|transformers|\.wasm|\.onnx|\/models\//.test(entry.url), `Model precache: ${entry.url}`);
    const path = entry.url === '/' ? 'index.html' : entry.url.endsWith('/') ? `${entry.url.slice(1)}index.html` : entry.url.slice(1);
    const body = await readFile(new URL(path, root)); bytes += body.length;
    assert.equal(body.length, entry.bytes); assert.equal(createHash('sha256').update(body).digest('hex'), entry.sha256, `Offline hash: ${path}`);
    assert(sw.includes(entry.sha256) && sw.includes(entry.url), `Worker/manifest mismatch: ${path}`);
    if (entry.kind === 'asset') assert(entry.bytes <= MAX_ASSET_BYTES);
    if (entry.kind === 'route') assert(body.toString().includes(`name="atlas-build" content="${manifest.version}"`));
  }
  assert(bytes <= MAX_TOTAL_BYTES);
  async function checkHTML(directory = '') {
    for (const item of await readdir(new URL(directory, root), { withFileTypes: true })) {
      if (item.isDirectory()) await checkHTML(`${directory}${item.name}/`);
      else if (item.name.endsWith('.html')) {
        const path = `${directory}${item.name}`;
        const route = path === 'index.html' ? '/' : path.endsWith('/index.html') ? `/${path.slice(0, -10)}` : `/${path}`;
        assert(manifest.entries.some((entry) => entry.kind === 'route' && entry.url === route), `Route missing from snapshot: ${path}`);
      }
    }
  }
  await checkHTML();
  for (const item of await readdir(new URL('generated/', root))) assert(manifest.entries.some((entry) => entry.url === `/generated/${item}`));
  console.info(`Offline manifest audit: ${manifest.entries.length} exact hashes, ${bytes} bytes, all HTML and knowledge covered.`);
}