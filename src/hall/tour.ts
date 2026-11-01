/**
 * The guided tour: ~90 seconds, every stop once (control room → six bays → hall power → back). Pure schedule logic
 * here (testable); the runner in mount.ts/HallHud drives `walkTo` and the caption. Captions are the machines' own
 * subtitles and "embodies" lines from the content collection; nothing is invented.
 */
import { atom } from 'nanostores';
import machines from '@/content/machines.json';

export interface TourStop {
  bay: number;
  title: string;
  caption: string;
  seconds: number;
}

const byBay = (machines as Array<{ bay: number; name: string; subtitle: string; embodies: string }>)
  .slice()
  .sort((a, b) => a.bay - b.bay);

export const TOUR_STOPS: TourStop[] = [
  {
    bay: 0,
    title: 'Control room',
    caption:
      'A laboratory of Kevil Patel’s work. Six machines, one per system he built, running on labelled sample data.',
    seconds: 8,
  },
  ...byBay.map((m) => ({ bay: m.bay, title: m.name, caption: `${m.subtitle}. ${m.embodies}`, seconds: 11 })),
  {
    bay: 7,
    title: 'Hall power',
    caption: 'The meter on the back wall counts dated milestones per month, straight from the fact ledger.',
    seconds: 8,
  },
  {
    bay: 0,
    title: 'Back at the control room',
    caption: 'Ask the Operator anything about the floor; it cites its sources or declines.',
    seconds: 8,
  },
];

export const TOUR_TOTAL_SECONDS = TOUR_STOPS.reduce((a, s) => a + s.seconds, 0);

export interface TourState {
  running: boolean;
  index: number; // current stop
  progress: number; // 0..1 within the stop
}

export const tour = atom<TourState>({ running: false, index: -1, progress: 0 });

/** Advance the schedule by dt seconds. Returns the stop index if it changed, else null. */
export function advanceTour(
  state: TourState,
  dt: number,
): { state: TourState; changed: number | null; finished: boolean } {
  if (!state.running) return { state, changed: null, finished: false };
  const stop = TOUR_STOPS[state.index];
  if (!stop) return { state: { running: false, index: -1, progress: 0 }, changed: null, finished: true };
  const p = state.progress + dt / stop.seconds;
  if (p < 1) return { state: { ...state, progress: p }, changed: null, finished: false };
  const next = state.index + 1;
  if (next >= TOUR_STOPS.length)
    return { state: { running: false, index: -1, progress: 0 }, changed: null, finished: true };
  return { state: { running: true, index: next, progress: 0 }, changed: next, finished: false };
}

export function startTour(): void {
  tour.set({ running: true, index: 0, progress: 0 });
}
export function stopTour(): void {
  tour.set({ running: false, index: -1, progress: 0 });
}
export function skipTourStop(): void {
  const s = tour.get();
  if (!s.running) return;
  const next = s.index + 1;
  if (next >= TOUR_STOPS.length) stopTour();
  else tour.set({ running: true, index: next, progress: 0 });
}
