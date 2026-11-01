/** Site-wide constants. The canonical origin is the only one allowed in public output (scripts/verify-public.ts). */
export const SITE = {
  origin: 'https://kevilpatel.in',
  name: 'Kevil Patel — The Simulation Room',
  shortName: 'Kevil Patel',
  description:
    'A laboratory floor of working machines: the systems Kevil Patel built, running on labelled sample data, operated by an on-device AI agent that cites its sources.',
  locale: 'en_IN',
  version: import.meta.env.PUBLIC_APP_VERSION ?? 'dev',
} as const;

export function canonical(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const withSlash = p.endsWith('/') || /\.[a-z0-9]+$/i.test(p) ? p : `${p}/`;
  return `${SITE.origin}${withSlash}`;
}
