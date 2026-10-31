/** Date helpers for YYYY / YYYY-MM strings. Month index is 0-based for JS Date, 1-based in strings. */
export interface YM {
  y: number;
  m: number; // 1-12
}

export function parseYM(value: string, fallbackMonth = 1): YM {
  const [y, m] = value.split('-');
  return { y: Number(y), m: m ? Number(m) : fallbackMonth };
}

export function ymToIndex(ym: YM): number {
  return ym.y * 12 + (ym.m - 1);
}

export function indexToYM(i: number): YM {
  return { y: Math.floor(i / 12), m: (i % 12) + 1 };
}

export function nowYM(now = new Date()): YM {
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1 };
}

export function resolveEnd(end: string | undefined, now: YM): YM | undefined {
  if (!end) return undefined;
  if (end === 'present') return now;
  return parseYM(end, 12);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatYM(value: string | undefined, opts: { short?: boolean } = {}): string {
  if (!value) return '';
  if (value === 'present') return 'now';
  if (value === 'none') return 'no expiry';
  const { y, m } = parseYM(value, 0);
  if (!m) return String(y);
  return opts.short ? `${MONTHS[m - 1]} ${String(y).slice(2)}` : `${MONTHS[m - 1]} ${y}`;
}

export function formatRange(start: string | undefined, end: string | undefined): string {
  if (!start && !end) return '';
  if (!end) return formatYM(start);
  return `${formatYM(start)} → ${formatYM(end)}`;
}

/** Human duration between two YM values, e.g. "1y 4m", "3m". */
export function formatDuration(start: YM, end: YM): string {
  const months = Math.max(1, ymToIndex(end) - ymToIndex(start) + 1);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y && m) return `${y}y ${m}m`;
  if (y) return `${y}y`;
  return `${m}m`;
}
