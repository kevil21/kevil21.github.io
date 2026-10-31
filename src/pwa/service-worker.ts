import { eligible, publicPath, recentRoutes, STATIC_PREFIX, NETWORK_TIMEOUT } from './policy';
import type { StaticEntry, StaticManifest } from './policy';

declare const self: ServiceWorkerGlobalScope;
declare const __ATLAS_MANIFEST__: StaticManifest;
const manifest = __ATLAS_MANIFEST__;
const name = `${STATIC_PREFIX}v1-${manifest.version}`;
const metaName = `${STATIC_PREFIX}meta-${manifest.version}`;
const stateURL = new URL('/__atlas/state', self.location.origin).href;
let disabled = false;
let writes = Promise.resolve();
const versions = new Map<string, string>();
type StoredState = { ready: boolean; activated: boolean; activatedAt: number; recent: string[] };

async function digest(response: Response): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer())), (n) => n.toString(16).padStart(2, '0')).join('');
}
async function valid(response: Response | undefined, entry: StaticEntry): Promise<boolean> {
  return !!response && (response.ok || (entry.url === '/404.html' && response.status === 404)) &&
    response.type !== 'opaque' && !response.redirected &&
    !/private|no-store/i.test(response.headers.get('cache-control') ?? '') && response.headers.get('vary') !== '*' &&
    await digest(response) === entry.sha256;
}
async function state(): Promise<StoredState> {
  const stored = await (await caches.open(metaName)).match(stateURL);
  return stored ? await stored.json() as StoredState : { ready: false, activated: false, activatedAt: 0, recent: [] };
}
async function writeState(value: StoredState) {
  if (!disabled) await (await caches.open(metaName)).put(stateURL, Response.json(value));
}
async function broadcast(type: string) {
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage({ type, version: manifest.version });
}
async function network(entry: StaticEntry): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
  try {
    const response = await fetch(entry.url, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
    if (!await valid(response, entry)) { void broadcast('ATLAS_VERSION_CHECK'); throw new Error('Static integrity mismatch'); }
    return response;
  } finally { clearTimeout(timer); }
}
async function cached(entry: StaticEntry): Promise<Response | undefined> {
  if (disabled) return;
  const cache = await caches.open(name);
  const response = await cache.match(entry.url);
  if (await valid(response, entry)) return response;
  if (response) await cache.delete(entry.url);
}
async function remember(path: string) {
  writes = writes.then(async () => {
    if (disabled) return;
    const current = await state();
    await writeState({ ...current, recent: recentRoutes(current.recent, path, manifest.entries) });
  }).catch(() => {});
  await writes;
}
async function fallback(status: number): Promise<Response> {
  const entry = manifest.entries.find((item) => item.url === (status === 404 ? '/404.html' : '/offline/'))!;
  const response = await cached(entry).catch(() => undefined);
  return new Response(response ? await response.text() : '<!doctype html><html lang="en"><title>Offline — Evidence Atlas</title><h1>Page unavailable offline</h1><p>Reconnect to restore the static portfolio.</p><a href="/">Try the atlas</a></html>', {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
async function serve(entry: StaticEntry): Promise<Response> {
  if (entry.kind === 'route') {
    try { return await network(entry); } catch { return await cached(entry) ?? fallback(entry.url === '/404.html' ? 404 : 503); }
  }
  // No runtime writes: the completed build is an immutable, finite snapshot.
  return await cached(entry) ?? network(entry);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // A discarded waiting worker has no clients. Reclaim only its unactivated generation.
    for (const key of await caches.keys()) {
      if (!key.startsWith(`${STATIC_PREFIX}meta-`) || key === metaName) continue;
      const stored = await (await caches.open(key)).match(stateURL);
      if (stored && !(await stored.json() as StoredState).activated) {
        await caches.delete(key.replace(`${STATIC_PREFIX}meta-`, `${STATIC_PREFIX}v1-`)); await caches.delete(key);
      }
    }
    const generations = (await caches.keys()).filter((key) => key.startsWith(`${STATIC_PREFIX}v1-`) && key !== name);
    if (generations.length >= 3) throw new Error('Close old Atlas tabs before installing another version');
    if ((await state()).ready) return;
    try {
      const cache = await caches.open(name);
      // Bounded concurrency; no success marker or activation until EVERY hash passes.
      for (let start = 0; start < manifest.entries.length; start += 4) {
        const results = await Promise.allSettled(manifest.entries.slice(start, start + 4).map(async (entry) => {
          const response = await network(entry); await cache.put(entry.url, response);
        }));
        if (results.some((result) => result.status === 'rejected')) throw new Error('Incomplete offline snapshot');
      }
      await writeState({ ready: true, activated: false, activatedAt: 0, recent: [] });
    } catch (error) { await caches.delete(name); await caches.delete(metaName); throw error; }
    // No skipWaiting here: existing tabs keep their complete prior version.
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const current = await state();
    if (!current.ready) throw new Error('Offline snapshot is not complete');
    await writeState({ ...current, activated: true, activatedAt: Date.now() });
    await self.clients.claim();
    await broadcast('ATLAS_ACTIVATED');
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (disabled || new URL(request.url).origin !== self.location.origin || request.method !== 'GET') return;
  const entry = request.headers.has('authorization') || request.headers.has('range') || /no-store/i.test(request.headers.get('cache-control') ?? '') ? undefined : eligible(request.url, self.location.origin, request.method, manifest.entries);
  if (entry) {
    event.respondWith(serve(entry).catch(() => entry.kind === 'route' ? fallback(503) : Response.error()));
    if (entry.kind === 'route') event.waitUntil(remember(entry.url));
  } else if (request.mode === 'navigate') {
    // Query/private/unknown URLs never become cache keys, history records, or home-200s.
    event.respondWith((async () => {
      const url = new URL(request.url);
      const canonical = manifest.entries.find((item) => item.kind === 'route' && item.url === url.pathname);
      if (canonical) {
        // Query navigation can use the network, but not a different version's HTML.
        try {
          const response = await fetch(request, { signal: AbortSignal.timeout(NETWORK_TIMEOUT) });
          if (await valid(response, canonical)) return response;
        } catch { /* Never read/write a query-string cache entry. */ }
        return fallback(503);
      }
      if (!url.search && manifest.entries.some((item) => item.kind === 'route' && item.url === `${url.pathname}/`)) return Response.redirect(new URL(`${url.pathname}/`, self.location.origin).href, 308);
      return fallback(publicPath(request.url, self.location.origin) === null ? 503 : 404);
    })());
  }
});
async function prune() {
  if (disabled) return;
  const clients = await self.clients.matchAll({ type: 'window' });
  // Unknown/frozen tabs conservatively retain old builds until they report or close.
  if (clients.some((client) => versions.get(client.id) !== manifest.version)) return;
  const current = await state();
  for (const key of await caches.keys()) {
    if (!key.startsWith(`${STATIC_PREFIX}meta-`) || key === metaName) continue;
    const stored = await (await caches.open(key)).match(stateURL);
    const other = stored ? await stored.json() as StoredState : null;
    // An old worker must NEVER reclaim a waiting or newer activated snapshot.
    if (other?.activatedAt && other.activatedAt < current.activatedAt) {
      await caches.delete(key.replace(`${STATIC_PREFIX}meta-`, `${STATIC_PREFIX}v1-`)); await caches.delete(key);
    }
  }
}
self.addEventListener('message', (event) => {
  const source = event.source;
  if (!source || !('url' in source) || new URL(source.url).origin !== self.location.origin) return;
  const message = event.data as { type?: string; version?: string } | null;
  event.waitUntil((async () => {
    if (message?.type === 'ATLAS_SKIP_WAITING') { await self.skipWaiting(); return; }
    if (message?.type === 'ATLAS_CLEAR') {
      disabled = true; await writes; await self.registration.unregister();
      for (const key of await caches.keys()) if (key.startsWith(STATIC_PREFIX)) await caches.delete(key);
      event.ports[0]?.postMessage({ cleared: true }); await broadcast('ATLAS_CLEARED'); return;
    }
    if (message?.type !== 'ATLAS_STATUS') return;
    if (disabled) { event.ports[0]?.postMessage({ disabled: true, complete: false }); return; }
    if (message.version && 'id' in source) versions.set(source.id, message.version);
    const path = publicPath(source.url, self.location.origin);
    if (path && message.version === manifest.version) await remember(path);
    await prune();
    if (disabled) { event.ports[0]?.postMessage({ disabled: true, complete: false }); return; }
    const current = await state();
    const count = (await (await caches.open(name)).keys()).length;
    event.ports[0]?.postMessage({ version: manifest.version, cache: name, entries: count, expectedEntries: manifest.entries.length,
      complete: current.ready && count === manifest.entries.length, recent: current.recent, disabled });
  })().catch(() => event.ports[0]?.postMessage({ error: 'Offline storage unavailable' })));
});