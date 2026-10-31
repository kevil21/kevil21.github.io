// Cold core-route budgets, not optional model size/inference budgets or field CWV.
export function performanceFailures(records) {
  const failures = [];
  if (records.length !== 18) failures.push(`Expected 18 successful audits, received ${records.length}`);
  for (const r of records) {
    if (!Number.isFinite(r.scores?.performance) || r.scores.performance < 0 || r.scores.performance > 1) failures.push(`${r.mode}/${r.name}: missing/invalid performance score`);
    for (const key of ['fcp', 'lcp', 'tbt', 'cls', 'si', 'transferBytes']) if (!Number.isFinite(r[key])) failures.push(`${r.mode}/${r.name}/${r.run}: missing ${key}`);
    if (r.unexpectedModelRequests.length) failures.push(`${r.mode}/${r.name}: eager model/worker request`);
    if (r.transferBytes > 600 * 1024) failures.push(`${r.mode}/${r.name}: transfer exceeds 600 KiB`);
    if (r.cls > 0.1) failures.push(`${r.mode}/${r.name}: CLS exceeds 0.1`);
  }
  // Timing/score gates are assessed over three-run medians, not fastest samples.
  for (const mode of ['mobile', 'desktop']) for (const name of ['home', 'project', 'architecture']) {
    const group = records.filter((r) => r.mode === mode && r.name === name);
    if (group.length !== 3 || group.map((r) => r.run).sort().join(',') !== '1,2,3') { failures.push(`${mode}/${name}: missing/duplicate three-run group`); continue; }
    const median = (key) => group.map((r) => r[key]).sort((a, b) => a - b)[1];
    if (median('lcp') > 4000) failures.push(`${mode}/${name}: median LCP exceeds 4s`);
    if (median('tbt') > 350) failures.push(`${mode}/${name}: median TBT exceeds 350ms`);
    if (group.map((r) => r.scores.performance).sort((a, b) => a - b)[1] < 0.85) failures.push(`${mode}/${name}: median performance below 85`);
  }
  return failures;
}