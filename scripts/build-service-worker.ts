import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { build } from 'esbuild';
import { MAX_ASSET_BYTES, MAX_ENTRIES, MAX_TOTAL_BYTES } from '../src/pwa/policy.ts';
import type { StaticEntry } from '../src/pwa/policy.ts';

const root = new URL('../dist/', import.meta.url);
const sha = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex');
const entries = new Map<string, { file: string; kind: StaticEntry['kind'] }>();
const html: string[] = [];
async function walk(directory: string) {
  for (const item of await readdir(new URL(directory, root), { withFileTypes: true })) {
    assert(!item.isSymbolicLink(), 'No symlinks in static output');
    const path = `${directory}${item.name}`;
    if (item.isDirectory()) await walk(`${path}/`);
    else if (item.name.endsWith('.html')) html.push(path);
  }
}
function local(value: string, parent = '/') {
  const url = new URL(value, `https://static.invalid${parent}`);
  assert(url.origin === 'https://static.invalid' && !url.search && !url.hash && !/%|\.\./.test(url.pathname), `Nonstatic dependency: ${value}`);
  return url.pathname;
}
async function add(url: string, kind: StaticEntry['kind'] = 'asset', file = url.slice(1)) {
  if (entries.has(url)) return;
  assert(!/models\/|transformers|full\.worker|\.wasm|\.onnx/.test(url), `Model asset cannot be precached: ${url}`);
  entries.set(url, { file, kind });
  const bytes = await readFile(new URL(file, root));
  assert(bytes.length <= (kind === 'route' ? 350_000 : kind === 'knowledge' ? 1_000_000 : MAX_ASSET_BYTES), `Precache item too large: ${url} (${bytes.length})`);
  if (url.endsWith('.js')) {
    const text = bytes.toString('utf8');
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const node of ast.statements) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        await add(local(node.moduleSpecifier.text, url));
      }
    }
    // Explicitly reviewed lazy *model-free* worker. Never follow dynamic imports.
    const workers: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) && /^\/_astro\/pocket\.worker-[\w-]+\.js$/.test(node.text)) workers.push(node.text);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    for (const worker of workers) await add(worker);
  }
  if (url.endsWith('.css')) {
    for (const match of bytes.toString('utf8').matchAll(/url\(\s*["']?([^\s)'";]+)["']?\s*\)/g)) {
      if (!match[1]!.startsWith('data:')) await add(local(match[1]!, url));
    }
  }
}
await walk('');
for (const file of html.sort()) {
  const route = file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -10)}` : `/${file}`;
  await add(route, 'route', file);
  const text = await readFile(new URL(file, root), 'utf8');
  for (const tag of text.matchAll(/<(?:script|link|img|source)\b[^>]*>/g)) {
    const value = tag[0];
    if (value.startsWith('<link') && !/rel="(?:stylesheet|modulepreload|icon|apple-touch-icon|manifest)"/.test(value)) continue;
    for (const src of value.matchAll(/(?:src|href)="([^"]+)"/g)) await add(local(src[1]!));
    const srcset = value.match(/srcset="([^"]+)"/);
    if (srcset) for (const src of srcset[1]!.split(',')) await add(local(src.trim().split(/\s/)[0]!));
  }
}
for (const file of await readdir(new URL('generated/', root))) { assert(/^[\w-]+\.json$/.test(file)); await add(`/generated/${file}`, 'knowledge'); }
for (const url of ['/assets/icon-192.png', '/assets/icon-512.png', '/assets/kevil-patel-resume.md']) await add(url);
assert(entries.has('/offline/') && entries.has('/404.html') && [...entries.keys()].some((url) => /pocket\.worker/.test(url)), 'Missing offline shell or Pocket worker');
assert(entries.size <= MAX_ENTRIES, 'Too many offline entries');
const compile = async (manifest: unknown) => (await build({ entryPoints: [fileURLToPath(new URL('../src/pwa/service-worker.ts', import.meta.url))], bundle: true, write: false, minify: true, target: 'es2022', format: 'iife', define: { __ATLAS_MANIFEST__: JSON.stringify(manifest) }, logLevel: 'silent' })).outputFiles[0]!.text;
// Normalize the marker so running this postbuild twice is byte-idempotent.
const normalize = (text: string) => text.replace(/name="atlas-build" content="[^"]*"/g, 'name="atlas-build" content="__ATLAS_BUILD__"');
const originals = [];
for (const [url, entry] of [...entries].sort()) {
  const bytes = await readFile(new URL(entry.file, root));
  originals.push([url, sha(entry.kind === 'route' ? normalize(bytes.toString('utf8')) : bytes)]);
}
const version = sha(JSON.stringify(originals) + await compile({ version: '', entries: [] }));
for (const file of html) {
  const text = normalize(await readFile(new URL(file, root), 'utf8'));
  assert(text.includes('__ATLAS_BUILD__'), `Missing build marker in ${file}`);
  await writeFile(new URL(file, root), text.replace('__ATLAS_BUILD__', version));
}
const records: StaticEntry[] = [];
for (const [url, entry] of [...entries].sort()) {
  const bytes = await readFile(new URL(entry.file, root)); records.push({ url, kind: entry.kind, bytes: bytes.length, sha256: sha(bytes) });
}
const total = records.reduce((sum, entry) => sum + entry.bytes, 0);
assert(total <= MAX_TOTAL_BYTES, 'Offline snapshot exceeds total budget');
const manifest = { version, entries: records };
await writeFile(new URL('offline-manifest.json', root), JSON.stringify(manifest, null, 2));
await writeFile(new URL('sw.js', root), await compile(manifest));
console.info(`Offline snapshot ${version.slice(0, 12)}: ${html.length} HTML pages, ${records.length} entries, ${total} bytes; no model SDK/weights/WASM.`);