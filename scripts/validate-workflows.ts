import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseDocument } from 'yaml';

interface Step { uses?: string; run?: string; with?: Record<string, unknown>; env?: Record<string, string>; 'continue-on-error'?: boolean }
interface Job { steps: Step[]; needs?: string; if?: string; permissions?: Record<string, string>; environment?: { name: string }; 'runs-on': string; 'timeout-minutes': number }
export interface Workflow { on: Record<string, unknown>; permissions: Record<string, string>; concurrency: { group: string; 'cancel-in-progress': boolean }; jobs: Record<string, Job> }
export function parseWorkflow(text: string): Workflow {
  const doc = parseDocument(text, { uniqueKeys: true });
  assert.equal(doc.errors.length, 0, doc.errors.map((error) => error.message).join('\n'));
  return doc.toJS({ maxAliasCount: 0 }) as Workflow;
}
export async function validateWorkflows(root = new URL('../', import.meta.url)) {
  const allowed = ['actions/checkout@v7', 'actions/setup-node@v7', 'actions/cache@v6', 'actions/cache/restore@v6', 'actions/configure-pages@v6', 'actions/upload-pages-artifact@v5', 'actions/deploy-pages@v5'];
  const workflows: Workflow[] = [];
  for (const name of ['validate', 'deploy']) {
    const text = await readFile(new URL(`.github/workflows/${name}.yml`, root), 'utf8');
    assert(!/pull_request_target|workflow_run|secrets\.|working-directory|pnpm|ATLAS_REAL_FULL|continue-on-error|\|\| true|\.\.\//.test(text), 'Unsafe event, bypass, credentials, sibling path or repeat Full download');
    const workflow = parseWorkflow(text); workflows.push(workflow);
    assert.deepEqual(workflow.permissions, { contents: 'read' });
    assert(workflow.concurrency.group);
    for (const job of Object.values(workflow.jobs)) {
      assert.equal(job['runs-on'], 'ubuntu-24.04'); assert(job['timeout-minutes'] > 0);
      for (const step of job.steps) { if (step.uses) assert(allowed.includes(step.uses), `Unreviewed action ${step.uses}`); assert(!step['continue-on-error']); }
    }
    const job = workflow.jobs[name === 'validate' ? 'validate' : 'build']!;
    assert.equal(job.steps.find((step) => step.uses === 'actions/checkout@v7')?.with?.['persist-credentials'], false);
    const setup = job.steps.find((step) => step.uses === 'actions/setup-node@v7')!;
    assert.equal(setup.with?.['node-version'], '24.9.0'); assert.equal(setup.with?.['cache-dependency-path'], 'package-lock.json');
    const cache = job.steps.find((step) => step.uses?.startsWith('actions/cache'))!;
    assert.equal(cache.with?.path, '.cache/atlas-models');
    for (const input of ['package-lock.json', 'src/ai/models.ts', 'scripts/build-semantic.ts']) { assert(String(cache.with?.key).includes(input)); await readFile(new URL(input, root)); }
    assert(!cache.with?.['restore-keys']);
    const commands = job.steps.flatMap((step) => step.run ? [step.run] : []);
    assert.deepEqual(commands.slice(0, 5), ['npm ci', 'npm run validate', 'npm exec playwright install --with-deps chromium', 'npm run test:e2e -- --workers=2', 'npm run audit:public']);
    assert.equal(job.steps.find((step) => step.run?.startsWith('npm run test:e2e'))?.env?.ATLAS_TEST_SKIP_BUILD, '1');
  }
  const [validation, deployment] = workflows as [Workflow, Workflow];
  assert.deepEqual(Object.keys(validation.on).sort(), ['pull_request', 'workflow_dispatch']);
  assert(!JSON.stringify(validation).includes('pages:'));
  assert(Object.values(validation.jobs).every((job) => !job.permissions || Object.values(job.permissions).every((permission) => permission === 'read')));
  assert.deepEqual(Object.keys(deployment.on).sort(), ['push', 'workflow_dispatch']);
  assert.deepEqual(deployment.on.push, { branches: ['main'] });
  const build = deployment.jobs.build!, deploy = deployment.jobs.deploy!;
  assert.equal(build.if, "github.ref == 'refs/heads/main'"); assert.equal(deploy.if, build.if);
  assert.equal(deploy.needs, 'build'); assert.equal(deploy.environment?.name, 'github-pages');
  assert.deepEqual(deploy.permissions, { pages: 'write', 'id-token': 'write' });
  assert.equal(build.steps.find((step) => step.uses === 'actions/configure-pages@v6')?.with?.enablement, false);
  assert(build.steps.some((step) => step.run === 'test -z "$PAGES_BASE_PATH"'));
  assert.equal(build.steps.at(-1)?.uses, 'actions/upload-pages-artifact@v5'); assert.equal(build.steps.at(-1)?.with?.path, 'dist');
  assert.equal(deployment.concurrency['cancel-in-progress'], false);
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8')) as { scripts: Record<string, string> };
  for (const stage of ['brain', 'check', 'lint', 'test', 'build', 'audit:public', 'validate:workflows']) assert(pkg.scripts.validate!.includes(stage), `Validation omits ${stage}`);
  assert(pkg.scripts.brain?.includes('build-knowledge.ts')); assert.equal(pkg.scripts.postbuild, 'npm run build:sw');
  const brain = await readFile(new URL('scripts/build-knowledge.ts', root), 'utf8');
  assert(brain.includes('buildSemantic'));
  const semantic = await readFile(new URL('scripts/build-semantic.ts', root), 'utf8');
  assert(semantic.includes('SEMANTIC.revision') && semantic.includes("device: 'cpu'") && semantic.includes('.cache/atlas-models/'));
  return workflows;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await validateWorkflows(); console.info('Workflow YAML and static pipeline contracts passed (not a GitHub-hosted execution).');
}