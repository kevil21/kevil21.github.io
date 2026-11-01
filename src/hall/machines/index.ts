/** Machine factory: one live assembly per bay (scenes 4–5). */
import type { MachineAssembly, MachineContext } from './types';
import { RefineryMachine } from './refinery';
import { SorterMachine } from './sorter';
import { ForecastMachine } from './forecast';
import { WorkbenchMachine } from './workbench';
import { CalibrationMachine } from './calibration';
import { FoundationsMachine } from './foundations';

export function buildMachine(slug: string, ctx: MachineContext): MachineAssembly {
  switch (slug) {
    case 'telemetry-refinery':
      return new RefineryMachine(ctx);
    case 'policy-sorter':
      return new SorterMachine(ctx);
    case 'forecast-engine':
      return new ForecastMachine(ctx);
    case 'data-workbench':
      return new WorkbenchMachine(ctx);
    case 'calibration-bench':
      return new CalibrationMachine(ctx);
    case 'foundations-generator':
      return new FoundationsMachine(ctx);
    default:
      throw new Error(`unknown machine ${slug}`);
  }
}
