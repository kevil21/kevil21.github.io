import { describe, expect, it } from 'vitest';
import { performanceFailures } from '../../scripts/performance-budgets.mjs';
const fixture = () => ['mobile', 'desktop'].flatMap((mode) => ['home', 'project', 'architecture'].flatMap((name) => [1, 2, 3].map((run) => ({ mode, name, run, fcp: 500, lcp: 800, tbt: 0, cls: 0, si: 600, transferBytes: 100000, scores: { performance: 1 }, unexpectedModelRequests: [] }))));
describe('performance reporting fails closed', () => {
  it('accepts a complete within-budget matrix', () => expect(performanceFailures(fixture())).toEqual([]));
  it('rejects missing runs instead of publishing a partial success', () => expect(performanceFailures(fixture().slice(1))).not.toEqual([]));
  it('rejects duplicate runs and missing scores', () => {
    const records = fixture(); records[1].run = 1; expect(performanceFailures(records)).not.toEqual([]);
    const missing = fixture(); missing[0].scores = {}; expect(performanceFailures(missing)).not.toEqual([]);
  });
  it.each(['lcp', 'fcp', 'tbt', 'cls', 'si', 'transferBytes'])('rejects non-finite %s', (key) => {
    const records = fixture(); records[0][key] = NaN; expect(performanceFailures(records)).not.toEqual([]);
  });
  it('rejects eager models and byte/CLS overruns', () => {
    for (const patch of [{ unexpectedModelRequests: ['/models/test.onnx'] }, { transferBytes: 700000 }, { cls: 0.2 }]) {
      const records = fixture(); Object.assign(records[0], patch); expect(performanceFailures(records)).not.toEqual([]);
    }
  });
  it('uses medians, not the best timing or score', () => {
    const records = fixture(); Object.assign(records[0], { lcp: 5000, tbt: 600, scores: { performance: 0.5 } });
    expect(performanceFailures(records)).toEqual([]);
    Object.assign(records[1], records[0], { run: 2 }); expect(performanceFailures(records)).toHaveLength(3);
  });
});