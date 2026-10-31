import { absolute } from './knowledge/routes';

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article' | 'profile';
  image?: string;
  noindex?: boolean;
}

export const SITE_NAME = 'Kevil Patel';
export const DEFAULT_OG = '/og/default.png';

export function fullTitle(title: string) {
  return title === SITE_NAME ? `${SITE_NAME} — TRACE` : `${title} · ${SITE_NAME}`;
}

export function canonical(path: string) {
  return absolute(path);
}
