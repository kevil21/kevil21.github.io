export * from './types';
export { RefinerySim, REFINERY_VIEWS, REFINERY_INSIGHT_TYPES, type RefineryReadouts } from './refinery';
export {
  SorterSim,
  SAMPLE_POLICIES,
  STAGES,
  riskScore,
  needsHumanGate,
  AUTO_APPROVE_BELOW,
  BLOCKED_SCORE,
  HIGH_RISK_BOOST,
  type Stage,
  type SorterReadouts,
} from './sorter';
export {
  ForecastSim,
  STREAMS,
  STREAM_META,
  HISTORY,
  modelForecast,
  baselineForecast,
  type Stream,
  type ForecastReadouts,
} from './forecast';

export { WorkbenchSim, STATIONS, STATION_META, type Station, type WorkbenchReadouts } from './workbench';
export { CalibrationSim, type Instrument, type CalibrationReadouts } from './calibration';
export {
  FoundationsSim,
  TURBINES,
  TURBINE_META,
  type Turbine,
  type PowerPoint,
  type FoundationsReadouts,
} from './foundations';

import type { Sim } from './types';
import { RefinerySim } from './refinery';
import { SorterSim } from './sorter';
import { ForecastSim } from './forecast';
import { WorkbenchSim } from './workbench';
import { CalibrationSim, type Instrument } from './calibration';
import { FoundationsSim, type PowerPoint } from './foundations';

export interface SimData {
  instruments?: Instrument[];
  power?: PowerPoint[];
}

/** Factory for every machine's simulation. Calibration and Foundations need content data passed in. */
export function createSim(slug: string, seed = 1, data: SimData = {}): Sim | null {
  switch (slug) {
    case 'telemetry-refinery':
      return new RefinerySim(seed);
    case 'policy-sorter':
      return new SorterSim();
    case 'forecast-engine':
      return new ForecastSim(seed);
    case 'data-workbench':
      return new WorkbenchSim();
    case 'calibration-bench':
      return new CalibrationSim(data.instruments ?? []);
    case 'foundations-generator':
      return new FoundationsSim(data.power ?? []);
    default:
      return null;
  }
}
