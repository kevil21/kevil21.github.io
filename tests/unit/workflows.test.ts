import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { parseWorkflow, validateWorkflows } from '../../scripts/validate-workflows';
it('validates standalone root workflows, gates, permissions and real semantic pipeline paths', async () => {
  expect(await validateWorkflows()).toHaveLength(2);
});
it('rejects duplicate YAML keys and invalid syntax', () => {
  expect(() => parseWorkflow('on: {}\non: {}')).toThrow();
  expect(() => parseWorkflow('jobs: [')).toThrow();
});
it('keeps the optional Lighthouse workflow manual, read-only, serial and failure-gated', async () => {
  const text = await readFile(new URL('../../.github/workflows/quality.yml', import.meta.url), 'utf8');
  const workflow = parseWorkflow(text);
  expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
  expect(workflow.permissions).toEqual({ contents: 'read' });
  expect(text).not.toMatch(/pull_request_target|secrets\.|continue-on-error|ATLAS_REAL_FULL|deploy-pages/);
  const job = workflow.jobs.quality!;
  expect(job['runs-on']).toBe('ubuntu-24.04'); expect(job['timeout-minutes']).toBe(30);
  const commands = job.steps.flatMap((step) => step.run ? [step.run] : []);
  expect(commands).toEqual(['npm ci', 'npm run validate', 'node scripts/validate-html.mjs', 'npm exec playwright install --with-deps chromium firefox webkit', 'npm exec playwright test -- --config playwright.smoke.config.ts --workers=2', 'node scripts/performance.mjs']);
  expect(job.steps[0]?.with?.['persist-credentials']).toBe(false);
  expect(job.steps.at(-1)?.with?.path).toBe('performance-results/\ntest-results/smoke/\n');
  expect(job.steps.at(-1)?.with?.['include-hidden-files']).toBe(false);
  for (const file of ['scripts/performance.mjs', 'scripts/validate-html.mjs', 'playwright.smoke.config.ts']) await expect(readFile(new URL(`../../${file}`, import.meta.url))).resolves.toBeDefined();
});