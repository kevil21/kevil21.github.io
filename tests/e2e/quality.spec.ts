import { expect, test } from '@playwright/test';

test('delayed shell modules do not move static reading content when controls become ready', async ({ page }) => {
  await page.setViewportSize({ width: 1350, height: 940 });
  for (const route of ['/', '/projects/a360/', '/architecture/']) {
    let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/_astro/*.js', async (request) => { await gate; await request.continue(); });
    await page.goto(route, { waitUntil: 'commit' });
    try {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const before = await page.locator('main').boundingBox();
      const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
      release(); await expect(page.locator('[data-ai-controls]')).toHaveAttribute('data-ready', 'true');
      const after = await page.locator('main').boundingBox();
      expect(after!.y).toBeCloseTo(before!.y, 0);
      expect((await page.getByRole('heading', { level: 1 }).boundingBox())!.y).toBeCloseTo(heading!.y, 0);
    } finally { release(); await page.unrouteAll({ behavior: 'wait' }); }
  }
});

test('partial search corpus cannot inject records by echoing the public content hash', async ({ page }) => {
  await page.route('**/generated/search-index.json', async (route) => {
    const response = await route.fetch(); const index = await response.json();
    index.data.documents = [{ ...index.data.documents[0], title: 'Injected claim', terms: ['azure'] }];
    await route.fulfill({ json: index });
  });
  await page.goto('/'); await page.locator('[data-command-input]').fill('azure');
  await page.locator('[data-command-form]').evaluate((f) => (f as HTMLFormElement).requestSubmit());
  await expect(page.locator('[data-search-status]')).toContainText('compatible index');
  await expect(page.locator('[data-search-results]')).not.toContainText('Injected claim');
});

test('mocked delayed Pocket reply cannot overwrite newer deterministic diagnostics', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (options?.name !== 'atlas-pocket') { super(url, options); return; }
        const script = `let pending; onmessage=({data:m})=>{
          if(m.type==='init') postMessage({id:m.id,type:'ready'});
          if(m.type==='query') { pending=m; postMessage({id:m.id,type:'progress',progress:10}); }
          if(m.type==='release') postMessage({id:pending.id,type:'answer',evidenceIds:['e-a360'],mode:'lexical-concepts-not-learned',inferences:1,elapsedMs:5});
        }`;
        const blob = URL.createObjectURL(new Blob([script], { type: 'text/javascript' })); super(blob, options); URL.revokeObjectURL(blob);
        Object.assign(window, { qualityWorker: this });
      }
    };
  });
  await page.goto('/architecture/');
  const submit = async (query: string) => { await page.locator('[data-command-input]').fill(query); await page.locator('[data-command-form]').evaluate((f) => (f as HTMLFormElement).requestSubmit()); };
  await submit('What does A360 do?');
  await expect(page.locator('[data-ai-status]')).toContainText('10%');
  await submit('azure'); await expect(page.locator('[data-search-status]')).toContainText('matching records');
  await page.evaluate(() => new Promise<void>((resolve) => {
    const worker = (window as unknown as { qualityWorker: Worker }).qualityWorker;
    worker.addEventListener('message', () => resolve(), { once: true }); worker.postMessage({ type: 'release' });
  }));
  // Publish after the queued reply: stale internal state must not leak on the next refresh.
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  const state = JSON.parse(await page.locator('[data-observatory]').innerText());
  expect(state.tier).toBe('deterministic'); expect(state.inferenceCount).toBe(0);
  await expect(page.locator('[data-search-status]')).toContainText('matching records');
});

test('cache clear blocks new model work until deletion completes; consent resets on reload', async ({ page }) => {
  await page.goto('/architecture/'); await page.locator('[data-ai-controls] > summary').click();
  await page.locator('[data-semantic-consent]').check(); await page.locator('[data-full-consent]').check();
  await page.evaluate(() => {
    const original = caches.keys.bind(caches);
    caches.keys = () => new Promise((resolve) => Object.assign(window, { releaseCache: async () => resolve(await original()) }));
  });
  await page.locator('[data-ai-clear-cache]').click();
  await page.locator('[data-semantic-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('clearing is in progress');
  await page.locator('[data-full-enable]').click(); await expect(page.locator('[data-ai-status]')).toContainText('clearing is in progress');
  await page.evaluate(() => (window as unknown as { releaseCache: () => Promise<void> }).releaseCache());
  await expect(page.locator('[data-observatory]')).toContainText('Selected model entries cleared');
  await page.reload(); await expect(page.locator('[data-semantic-consent]')).not.toBeChecked(); await expect(page.locator('[data-full-consent]')).not.toBeChecked();
});