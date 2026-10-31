import type { Trace } from './spans';
import { indexToYM } from './dates';

export interface SignalSeries {
  /** first month index on the axis */
  startIndex: number;
  /** one value per month: number of spans active + events that month (real content, nothing random) */
  activity: number[];
  /** per-kind lanes so the renderer can colour by span kind */
  lanes: Record<'role' | 'community' | 'education' | 'project' | 'certification', number[]>;
  labels: string[];
}

export function buildSignalSeries(trace: Trace): SignalSeries {
  const { startIndex, endIndex } = trace.axis;
  const len = endIndex - startIndex + 1;
  const zero = () => new Array<number>(len).fill(0);
  const lanes = {
    role: zero(),
    community: zero(),
    education: zero(),
    project: zero(),
    certification: zero(),
  };
  for (const row of trace.rows) {
    if (row.start === undefined || row.end === undefined) continue;
    for (let i = row.start; i <= row.end; i++) {
      const k = i - startIndex;
      if (k >= 0 && k < len) lanes[row.kind][k] = (lanes[row.kind][k] ?? 0) + (row.inherited ? 0.5 : 1);
    }
  }
  for (const c of trace.credentials) {
    if (c.at === undefined) continue;
    const k = c.at - startIndex;
    if (k >= 0 && k < len) {
      // a credential is an impulse that decays over three months
      lanes.certification[k] = (lanes.certification[k] ?? 0) + 1;
      if (k + 1 < len) lanes.certification[k + 1] = (lanes.certification[k + 1] ?? 0) + 0.6;
      if (k + 2 < len) lanes.certification[k + 2] = (lanes.certification[k + 2] ?? 0) + 0.3;
    }
  }
  const activity = zero().map((_, k) =>
    (Object.keys(lanes) as (keyof typeof lanes)[]).reduce((sum, key) => sum + (lanes[key][k] ?? 0), 0),
  );
  const labels = Array.from({ length: len }, (_, k) => {
    const ym = indexToYM(startIndex + k);
    return `${ym.y}-${String(ym.m).padStart(2, '0')}`;
  });
  return { startIndex, activity, lanes, labels };
}
