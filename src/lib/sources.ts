/** Source-pointer and label helpers with no Astro imports, safe for islands and workers. */
import type { Claim } from './schema';

export const LABEL_CAPTION: Record<Claim['label'], string | null> = {
  public: null,
  resume: 'as stated in résumé',
  'site-case-study': "as stated in the previous site's case study",
  'info-md': 'source: info.md',
  sample: 'sample data',
};

/** KPOS is the live `main` branch of kevil21/kevilpatel (v3.2.1); its files are public. info.md is private. */
export function sourceHref(source: string): string | null {
  const m = /^KPOS\/(.+?)#L(\d+)(?:-L?(\d+))?$/.exec(source);
  if (!m) return null;
  const [, path, from, to] = m;
  const anchor = to ? `L${from}-L${to}` : `L${from}`;
  return `https://github.com/kevil21/kevilpatel/blob/main/${path}#${anchor}`;
}

export function sourceLabel(source: string): string {
  if (source.startsWith('info.md')) return 'info.md (private certification notes)';
  return source.replace(/^KPOS\//, '');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-07" → "Jul 2025"; "2021" → "2021"; "present" → "present". One format sitewide (ledger C-18). */
export function fmtMonth(v: string | undefined): string {
  if (!v) return '';
  if (v === 'present') return 'present';
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  if (!m) return v;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function fmtRange(r: { start: string; end?: string | undefined }): string {
  const end = r.end ? fmtMonth(r.end) : '';
  return end ? `${fmtMonth(r.start)} – ${end}` : fmtMonth(r.start);
}
