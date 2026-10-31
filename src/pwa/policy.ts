/** Public static storage only. Model SDK caches have different ownership. */
export const STATIC_PREFIX = 'atlas-static-';
export const RECENT_LIMIT = 8;
export const NETWORK_TIMEOUT = 2500;
export const MAX_ASSET_BYTES = 150_000;
export const MAX_TOTAL_BYTES = 8_000_000;
export const MAX_ENTRIES = 128;
export interface StaticEntry { url: string; sha256: string; bytes: number; kind: 'route' | 'asset' | 'knowledge' }
export interface StaticManifest { version: string; entries: StaticEntry[] }
export function publicPath(url: string, origin: string, method = 'GET'): string | null {
  const parsed = new URL(url, origin);
  if (method !== 'GET' || parsed.origin !== origin || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
  // Exact matching below is mandatory; this is an additional fail-closed boundary.
  if (/%|\/\.|\/\/|(?:^|\/)(?:api|private|admin|models)(?:\/|$)/i.test(parsed.pathname)) return null;
  return parsed.pathname;
}
export function eligible(url: string, origin: string, method: string, entries: readonly StaticEntry[]): StaticEntry | undefined {
  const path = publicPath(url, origin, method);
  return path === null ? undefined : entries.find((entry) => entry.url === path);
}
export function recentRoutes(previous: string[], path: string, entries: readonly StaticEntry[]): string[] {
  if (!entries.some((entry) => entry.kind === 'route' && entry.url === path) || ['/404.html', '/offline/'].includes(path)) return previous;
  return [path, ...previous.filter((item) => item !== path)].slice(0, RECENT_LIMIT);
}