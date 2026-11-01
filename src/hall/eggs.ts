/**
 * Easter eggs (prompt §3.8): discoverable, never required, never fake. Each is reachable by keyboard and touch, is
 * announced to assistive tech, carries no invented facts, and is listed on /lab-notebook/. Pure logic lives here
 * (testable); the hall and islands wire it up.
 */
import { BAY_COUNT } from './layout';

export const EGG_EVENT = 'sr:egg';
export type EggId =
  | 'night-shift'
  | 'maintenance-hatch'
  | 'coffee-mug'
  | 'reverse-walk'
  | 'lab-weather'
  | 'ask-the-machines'
  | 'dev-console'
  | 'lights-out-404';

export interface EggDetail {
  egg: EggId;
  message: string;
  href?: string;
  label?: string;
}

export function fireEgg(detail: EggDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<EggDetail>(EGG_EVENT, { detail }));
}

/** Reverse walk: visiting bays 6 → 5 → 4 → 3 → 2 → 1 in strict order prints the résumé. */
export class ReverseWalkDetector {
  private expected = BAY_COUNT;
  private fired = false;

  /** Feed the bay the visitor arrived at. Returns true once when the sequence completes. */
  arrive(bay: number): boolean {
    if (bay === BAY_COUNT) {
      this.expected = BAY_COUNT - 1;
      return false;
    }
    if (bay === this.expected) {
      this.expected--;
      if (this.expected === 0 && !this.fired) {
        this.fired = true;
        this.expected = BAY_COUNT;
        return true;
      }
      return false;
    }
    // any other stop resets (control room and hall-power included)
    this.expected = BAY_COUNT;
    return false;
  }

  reset(): void {
    this.fired = false;
    this.expected = BAY_COUNT;
  }
}

/** Playful lab weather from the visitor's local time: clearly not a forecast, labelled as such in the UI. */
export function labWeather(date: Date): { headline: string; detail: string } {
  const h = date.getHours();
  const dow = date.getDay();
  const phase =
    h < 6
      ? 'night shift'
      : h < 12
        ? 'morning calibration'
        : h < 17
          ? 'peak telemetry'
          : h < 22
            ? 'evening sync window'
            : 'late shift';
  const weekend = dow === 0 || dow === 6;
  const headline =
    h < 6
      ? 'Low fog over the hall, practicals dimmed.'
      : h < 12
        ? 'Clear skylights, instruments warming up.'
        : h < 17
          ? 'Dense particle showers expected in bay 1.'
          : h < 22
            ? 'A 70-minute overlap drifting in from the manifold.'
            : 'Quiet hum, one lamp per bay.';
  const detail = `Tomorrow in the lab: ${phase}${weekend ? ', weekend load' : ''}. Playful — derived only from your clock (${String(h).padStart(2, '0')}:00), not a forecast.`;
  return { headline, detail };
}

/** Per-machine voice for "ask the machines": a preamble that frames the same sourced facts. No invented claims. */
export const MACHINE_VOICE: Record<string, string> = {
  'telemetry-refinery': 'The Refinery speaks from its sync logs:',
  'policy-sorter': 'The Sorter answers from its evidence packs:',
  'forecast-engine': 'The Engine reads from its ribbons:',
  'data-workbench': 'The Workbench answers from its notebooks:',
  'calibration-bench': 'The Bench reads its calibration records:',
  'foundations-generator': 'The Generator answers from the plaque:',
};

export function devConsoleGreeting(tier: string, quality: string, version: string): string[] {
  return [
    `%cTHE SIMULATION ROOM%c · kevilpatel.in · ${version}`,
    'font-weight:700;letter-spacing:.08em',
    '',
    `Render tier: ${tier} · quality: ${quality}. The Operator runs on-device; nothing you type leaves your browser.`,
    `Secrets are listed in the lab notebook: /lab-notebook/ (every egg is keyboard-reachable; none invents a fact).`,
  ];
}

export const EGG_LIST: Array<{ id: EggId; name: string; howTo: string; where: string }> = [
  {
    id: 'night-shift',
    name: 'Night shift',
    howTo:
      'Throw the breaker in the control room (the “Breaker” switch in the floor-plan panel, or click the lever in 3D). A third, deeper dark variant of the same tokens.',
    where: 'Control room',
  },
  {
    id: 'maintenance-hatch',
    name: 'Maintenance hatch',
    howTo:
      'Open “Maintenance hatch” on any machine page or bay card. It reveals the real source pointers (file and line) behind every plaque fact.',
    where: 'Every machine',
  },
  {
    id: 'coffee-mug',
    name: 'Coffee mug',
    howTo:
      'Pick up the mug in the control room (button in the intro card, or click it in 3D). The steam traces the hall-power series: dated milestones per month.',
    where: 'Control room',
  },
  {
    id: 'reverse-walk',
    name: 'Reverse walk',
    howTo:
      'Walk the floor backwards, bay 6 to bay 1 in order (← key, scroll, or the minimap). The hall printer prints the full résumé.',
    where: 'The rail',
  },
  {
    id: 'lab-weather',
    name: 'Lab weather',
    howTo:
      'On the Forecast Engine’s panel, press “Predict the lab weather”. It is derived only from your clock and says so.',
    where: 'Bay 3',
  },
  {
    id: 'ask-the-machines',
    name: 'Ask the machines',
    howTo:
      'On any machine page, use “Ask this machine”. It answers in its own voice from its own facts only.',
    where: 'Every machine',
  },
  {
    id: 'dev-console',
    name: 'Dev-console greeting',
    howTo:
      'Open the browser console on the hall page. It tells you which render tier and quality profile you are on.',
    where: 'Your browser',
  },
  {
    id: 'lights-out-404',
    name: 'Lights out',
    howTo: 'Visit a corridor that does not exist. The alarm lamp flashes and the Operator guides you back.',
    where: '404',
  },
];
