/** The audience lens: recruiter (headline facts first) or engineer (decision logs and stacks expanded). Persisted. */
import { persistentAtom } from '@nanostores/persistent';

export type Lens = 'recruiter' | 'engineer';
export const lens = persistentAtom<Lens>('sr:lens', 'recruiter', {
  encode: (v) => v,
  decode: (v) => (v === 'engineer' ? 'engineer' : 'recruiter'),
});

export function applyLens(v: Lens): void {
  document.documentElement.setAttribute('data-lens', v);
}

export function setLens(v: Lens): void {
  lens.set(v);
  applyLens(v);
}

let started = false;
export function startLens(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  applyLens(lens.get());
  lens.subscribe(applyLens);
  document.addEventListener('astro:after-swap', () => applyLens(lens.get()));
}
