import { describe, expect, it } from 'vitest';
import { eligible, publicPath, recentRoutes, RECENT_LIMIT, STATIC_PREFIX } from '../../src/pwa/policy';
import type { StaticEntry } from '../../src/pwa/policy';
const origin = 'https://portfolio.example';
const entries: StaticEntry[] = Array.from({ length: 19 }, (_, i) => ({ url: `/route-${i}/`, sha256: '0'.repeat(64), bytes: 10, kind: 'route' }));
describe('static-only policy', () => {
  it('requires an exact public same-origin GET entry', () => {
    expect(eligible(`${origin}/route-0/`, origin, 'GET', entries)).toEqual(entries[0]);
    for (const path of ['/unknown/', '/route-0/?q=private', '/route-0/?JD=secret', '/private/x', '/api/x', '/admin/', '/models/a.onnx', '/%72oute-0/', '/route-0/#secret', 'https://third.example/route-0/']) expect(eligible(path, origin, 'GET', entries)).toBeUndefined();
    for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) expect(eligible('/route-0/', origin, method, entries)).toBeUndefined();
    expect(publicPath('/route-0/?q=x', origin)).toBeNull();
  });
  it('bounds, deduplicates and filters recent route history', () => {
    let history: string[] = [];
    for (const entry of entries) history = recentRoutes(history, entry.url, entries);
    expect(history).toHaveLength(RECENT_LIMIT);
    expect(recentRoutes(history, '/route-18/', entries)).toEqual(history);
    expect(recentRoutes(history, '/route-0/?q=private', entries)).toEqual(history);
    expect(recentRoutes(history, '/unknown/', entries)).toEqual(history);
  });
  it('does not own model or unrelated caches', () => {
    for (const name of ['atlas-semantic-v1', 'webllm/model', 'webllm/config', 'webllm/wasm', 'another-app']) expect(name.startsWith(STATIC_PREFIX)).toBe(false);
  });
});