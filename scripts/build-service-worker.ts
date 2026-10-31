/**
 * Generates dist/sw.js after `astro build`. Versioned by a hash of the precache list so every deploy
 * installs a fresh cache and deletes the old one. Models are NEVER precached: the AI runtime caches
 * them through the Cache API under its own names (ADR-017).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST)
  .map((p) => '/' + relative(DIST, p).split('\\').join('/'))
  .filter(
    (p) => !p.endsWith('.map') && !p.startsWith('/models/') && !p.startsWith('/og/') && !p.endsWith('/sw.js'),
  );

// Precache: the app shell (home, offline, 404), the assets those three pages reference, fonts, icons and the
// small generated indexes. Nothing else: heavy, opt-in chunks (Three.js, GSAP, Transformers.js, WebLLM) and the
// semantic index are fetched on demand and cached on use.
const SHELL_HTML = ['/index.html', '/offline/index.html', '/404.html'];
const referenced = new Set<string>();
for (const h of SHELL_HTML) {
  const html = readFileSync(join(DIST, h), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="(\/_astro\/[^"]+)"/g)) referenced.add(m[1]!);
}
const precache = files.filter(
  (p) =>
    SHELL_HTML.includes(p) ||
    referenced.has(p) ||
    (p.startsWith('/_astro/') && (p.endsWith('.woff2') || p.endsWith('.css'))) ||
    p === '/manifest.webmanifest' ||
    p === '/favicon.svg' ||
    p === '/icon-192.png' ||
    (p.startsWith('/generated/') && !p.includes('semantic-index')),
);
const hash = createHash('sha256');
for (const p of precache) hash.update(p).update(readFileSync(join(DIST, p)));
const version = hash.digest('hex').slice(0, 12);

const sw = `/* TRACE service worker · build ${version} · generated, do not edit */
const VERSION = '${version}';
const SHELL = 'trace-shell-' + VERSION;
const RUNTIME = 'trace-runtime-' + VERSION;
const PRECACHE = ${JSON.stringify(precache)};
const OFFLINE_URL = '/offline/';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((p) => (p.endsWith('/index.html') ? p.replace(/index\\.html$/, '') : p)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => (k.startsWith('trace-shell-') || k.startsWith('trace-runtime-')) && k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'GET_VERSION' && event.source) event.source.postMessage({ type: 'SW_VERSION', version: VERSION, precached: PRECACHE.length });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // models and CDNs are handled by their own code
  if (url.pathname.startsWith('/models/')) return; // never intercept AI runtime assets

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE_URL)) || Response.error()),
    );
    return;
  }
  // hashed assets + generated indexes: cache-first
  if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/generated/') || url.pathname.startsWith('/images/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  event.respondWith(fetch(req).catch(() => caches.match(req).then((hit) => hit || Response.error())));
});
`;
writeFileSync(join(DIST, 'sw.js'), sw);
console.info(`✓ service worker ${version}: ${precache.length} precached entries`);
