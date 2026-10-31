import { atom } from 'nanostores';

/** True when the visitor prefers reduced motion. Features never change; only animation does. */
export const reducedMotion = atom<boolean>(
  typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false,
);
if (typeof matchMedia !== 'undefined') {
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) =>
    reducedMotion.set(e.matches),
  );
}

export function ms(token: '--dur-fast' | '--dur-normal' | '--dur-emphasis' | '--dur-cinematic'): number {
  if (typeof getComputedStyle === 'undefined') return 0;
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return v.endsWith('ms') ? parseFloat(v) : v.endsWith('s') ? parseFloat(v) * 1000 : 0;
}
