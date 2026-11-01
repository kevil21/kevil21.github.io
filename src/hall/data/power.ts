/**
 * The hall-power series: dated milestones per month, built from src/content/events.json (fact ledger §G).
 * Month-precision events count 1 in their month; year-only events are spread as 1/12 across their year and shown as a
 * lighter band, never as a fake monthly spike. Importable by Astro (SVG twin) and the hall bundle (3D meter).
 */
import events from '@/content/events.json';
import type { PowerPoint } from '@/sim/foundations';

export interface PowerEvent {
  id: string;
  month: string;
  label: string;
  kind: string;
  source: string;
}

export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number) as [number, number];
  const [ty, tm] = to.split('-').map(Number) as [number, number];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function buildPowerSeries(
  evts: PowerEvent[] = events as PowerEvent[],
  from = '2017-01',
  to = '2026-12',
): PowerPoint[] {
  const months = monthRange(from, to);
  const byMonth = new Map<string, number>();
  const byYear = new Map<string, number>();
  for (const e of evts) {
    if (/^\d{4}-\d{2}$/.test(e.month)) byMonth.set(e.month, (byMonth.get(e.month) ?? 0) + 1);
    else if (/^\d{4}$/.test(e.month)) byYear.set(e.month, (byYear.get(e.month) ?? 0) + 1);
  }
  return months.map((month) => ({
    month,
    count: byMonth.get(month) ?? 0,
    yearShare: (byYear.get(month.slice(0, 4)) ?? 0) / 12,
  }));
}

export const POWER_SERIES: PowerPoint[] = buildPowerSeries();
export const POWER_EVENTS: PowerEvent[] = events as PowerEvent[];
