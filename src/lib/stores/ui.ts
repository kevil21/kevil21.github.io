import { atom, map } from 'nanostores';

/** Cross-island UI state. Islands subscribe; the tool executor mutates these, never the DOM. */
export const selectedSpan = atom<string | null>(null);
export const highlightedAttribute = atom<string | null>(null);
export const projectFilter = map<{ skills: string[]; kinds: string[]; query: string }>({
  skills: [],
  kinds: [],
  query: '',
});
export const sheetOpen = atom<boolean>(false);
export const paletteOpen = atom<boolean>(false);
export const compareIds = atom<string[]>([]);

export interface Toast {
  id: number;
  text: string;
  tone?: 'info' | 'ok' | 'warn' | 'danger';
  tool?: string;
}
export const toasts = atom<Toast[]>([]);
let toastSeq = 0;
export function pushToast(t: Omit<Toast, 'id'>, ttl = 3600) {
  const id = ++toastSeq;
  toasts.set([...toasts.get(), { id, ...t }]);
  setTimeout(() => toasts.set(toasts.get().filter((x) => x.id !== id)), ttl);
  return id;
}

export function resetWorkspace() {
  selectedSpan.set(null);
  highlightedAttribute.set(null);
  projectFilter.set({ skills: [], kinds: [], query: '' });
  compareIds.set([]);
  sheetOpen.set(false);
}
