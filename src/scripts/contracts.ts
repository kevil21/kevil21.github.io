import { domains, personas } from '../lib/routes';
import type { Domain, Persona } from '../lib/content';
export type AtlasRequest =
  | { type: 'set-persona'; persona: Persona }
  | { type: 'filter-domain'; domain: Domain | 'all' }
  | { type: 'filter-projects'; projectIds: string[] }
  | { type: 'set-view'; view: 'map' | 'list' }
  | { type: 'select-project'; projectId: string }
  | { type: 'compare-projects'; left: string; right: string };

/** State-only boundary, not an AI agent. No URLs, selectors, code, or arbitrary properties. */
export function parseRequest(value: unknown, projectIds: readonly string[]): AtlasRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const request = value as Record<string, unknown>;
  const keys = (...expected: string[]) => Object.keys(request).sort().join(',') === ['type', ...expected].sort().join(',');
  const known = (id: unknown) => typeof id === 'string' && projectIds.includes(id);
  switch (request.type) {
    case 'set-persona': if (keys('persona') && personas.some((persona) => persona === request.persona)) return request as AtlasRequest; break;
    case 'filter-domain': if (keys('domain') && ['all', ...domains].some((domain) => domain === request.domain)) return request as AtlasRequest; break;
    case 'filter-projects': if (keys('projectIds') && Array.isArray(request.projectIds) && request.projectIds.length <= projectIds.length && request.projectIds.every(known) && new Set(request.projectIds).size === request.projectIds.length) return request as AtlasRequest; break;
    case 'set-view': if (keys('view') && (request.view === 'map' || request.view === 'list')) return request as AtlasRequest; break;
    case 'select-project': if (keys('projectId') && known(request.projectId)) return request as AtlasRequest; break;
    case 'compare-projects': if (keys('left', 'right') && known(request.left) && known(request.right) && request.left !== request.right) return request as AtlasRequest; break;
  }
  return null;
}