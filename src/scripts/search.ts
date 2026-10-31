import { documentHref } from '../lib/routes';
import { digest } from '../ai/corpus';
import { boundedJSON } from '../ai/protocol';
// Installed by initializeSearch; bypasses command interception when the AI corpus fails.
let runFallback: (() => Promise<void>) | undefined;
export function fallbackSearch(): void { void runFallback?.(); }
export interface SearchDocument { id: string; kind: string; title: string; text: string; terms: string[]; evidenceIds: string[] }
export const tokenize = (text: string): string[] => [...new Set(text.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}+#.-]+/gu) ?? [])];
/** All query tokens must match whole terms; title hits precede source-text hits, ties use stable IDs. */
export function searchDocuments(documents: SearchDocument[], query: string): SearchDocument[] {
  const tokens = tokenize(query.slice(0, 200));
  if (!tokens.length) return [];
  return documents.filter((doc) => tokens.every((token) => doc.terms.includes(token)))
    .map((doc) => ({ doc, score: tokens.filter((token) => tokenize(doc.title).includes(token)).length }))
    .sort((a, b) => b.score - a.score || (a.doc.id < b.doc.id ? -1 : a.doc.id > b.doc.id ? 1 : 0)).map(({ doc }) => doc);
}
export function validateIndex(input: unknown, hash: string): SearchDocument[] {
  if (!input || typeof input !== 'object') throw new Error('Invalid index');
  const envelope = input as { schemaVersion?: unknown; contentHash?: unknown; data?: { documents?: unknown } };
  if (envelope.schemaVersion !== 1 || envelope.contentHash !== hash || !Array.isArray(envelope.data?.documents) || envelope.data.documents.length > 512) throw new Error('Incompatible index');
  const kinds = ['profile', 'project', 'experience', 'skill', 'certification', 'education', 'achievement', 'evidence', 'journey', 'decision', 'resume'];
  const documents: SearchDocument[] = [];
  for (const record of envelope.data.documents) {
    const doc = record as Partial<SearchDocument>;
    if (!doc || typeof doc.id !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(doc.id) || typeof doc.kind !== 'string' || !kinds.includes(doc.kind) || typeof doc.title !== 'string' || typeof doc.text !== 'string' || !Array.isArray(doc.terms) || !doc.terms.every((term) => typeof term === 'string') || !Array.isArray(doc.evidenceIds) || !doc.evidenceIds.every((id) => typeof id === 'string' && /^e-[a-z0-9-]+$/.test(id))) throw new Error('Invalid document');
    documents.push(doc as SearchDocument);
  }
  if (new Set(documents.map((doc) => doc.id)).size !== documents.length) throw new Error('Duplicate document');
  return documents;
}
export async function verifySearchIndex(input: unknown, hash: string, indexHash: string): Promise<SearchDocument[]> {
  if (!/^[a-f0-9]{64}$/.test(indexHash) || await digest(input) !== indexHash) throw new Error('Search integrity mismatch');
  return validateIndex(input, hash);
}
export function initializeSearch(): void {
  const form = document.querySelector<HTMLFormElement>('[data-command-form]');
  const input = document.querySelector<HTMLInputElement>('[data-command-input]');
  const panel = document.querySelector<HTMLElement>('[data-search-panel]');
  const results = document.querySelector<HTMLUListElement>('[data-search-results]');
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  if (!form || !input || !panel || !results || !status) return;
  let pending: Promise<SearchDocument[]> | undefined;
  let requestNumber = 0;
  const load = () => pending ??= boundedJSON('/generated/search-index.json')
    .then((json) => verifySearchIndex(json, document.body.dataset.contentHash ?? '', document.body.dataset.searchHash ?? ''))
    .catch((error: unknown) => { pending = undefined; throw error; });
  const close = () => { requestNumber++; panel.hidden = true; input.focus(); };
  const run = async (intercept = true) => {
    const query = input.value.trim().slice(0, 200);
    const request = ++requestNumber;
    const command = new CustomEvent('atlas:command', { detail: { version: 1, query }, cancelable: true });
    if (intercept && !document.dispatchEvent(command)) return;
    panel.hidden = false;
    results.replaceChildren();
    if (!tokenize(query).length) { status.textContent = 'Enter a word or browse the complete index below.'; return; }
    status.textContent = 'Loading the local source index…';
    try {
      const documents = await load();
      if (request !== requestNumber) return;
      const matches = searchDocuments(documents, query);
      status.textContent = matches.length ? `${matches.length} matching records for “${query}”. Deterministic word search, not an AI answer.` : `No source records match “${query}”. Try a named skill or project. No claim has been inferred.`;
      for (const doc of matches) {
        const item = document.createElement('li');
        const link = document.createElement('a'); link.href = documentHref(doc.kind, doc.id); link.textContent = `${doc.title} / ${doc.kind}`;
        const excerpt = document.createElement('p'); excerpt.textContent = doc.text.length > 240 ? `${doc.text.slice(0, 240)}…` : doc.text;
        item.append(link, excerpt);
        if (doc.evidenceIds.length) { const source = document.createElement('a'); source.href = `/evidence/#${doc.evidenceIds[0]}`; source.textContent = 'Supporting source →'; item.append(source); }
        results.append(item);
      }
    } catch {
      if (request === requestNumber) status.textContent = 'Search could not load a compatible index. Browse the complete static index below; all portfolio content remains available.';
    }
  };
  runFallback = () => run(false);
  form.addEventListener('submit', (event) => { event.preventDefault(); void run(); });
  document.querySelectorAll<HTMLAnchorElement>('[data-query]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault(); input.value = link.dataset.query ?? ''; input.focus(); void run();
  }));
  document.querySelector('[data-search-close]')?.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey) { event.preventDefault(); input.focus(); }
    if (event.key === 'Escape' && !panel.hidden && (panel.contains(document.activeElement) || form.contains(document.activeElement))) close();
  });
  // No query is persisted or written to history by the enhanced form.
}