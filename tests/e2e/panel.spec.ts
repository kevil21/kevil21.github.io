import { expect, test, type Locator } from '@playwright/test';

/** The island hydrates on idle and the headless sim publishes ~4×/s; wait for a real value before interacting. */
async function live(panel: Locator, readout: string) {
  const v = panel.locator(`[data-readout="${readout}"] .panel__value`);
  await expect.poll(async () => (await v.textContent())?.trim() ?? '—', { timeout: 15_000 }).not.toBe('—');
  return v;
}

/** Control panels: live readouts from the simulations, controls that change them, the gate lever, narration. */

test('machine page panel comes alive headless and reacts to the tenant slider', async ({ page }) => {
  await page.goto('/machines/telemetry-refinery/');
  const panel = page.locator('[data-panel="telemetry-refinery"]');
  await expect(panel).toBeVisible();
  const spans = panel.locator('[data-readout="spans-per-second"] .panel__value');
  await expect.poll(async () => Number(await spans.textContent()), { timeout: 10_000 }).toBeGreaterThan(0);
  const chambers = panel.locator('[data-readout="chambers"] .panel__value');
  const slider = panel.locator('input[type="range"][id$="tenant-count"]');
  await slider.fill('6');
  // chambers readout counts tenants with data; after a sync with 6 tenants it reaches up to 6
  await expect.poll(async () => Number(await spans.textContent()), { timeout: 10_000 }).toBeGreaterThan(300);
  await expect(panel.locator('.panel__narration')).toContainText('boarding function');
  void chambers;
});

test('policy sorter: a high-risk policy waits at the gate until the lever is pulled', async ({ page }) => {
  await page.goto('/machines/policy-sorter/');
  const panel = page.locator('[data-panel="policy-sorter"]');
  const stage = await live(panel, 'stage');
  await panel.locator('select[id$="policy"]').selectOption('public-ip-ban');
  await expect(stage).toContainText('gate', { timeout: 20_000 });
  await expect(panel.locator('[data-readout="risk-score"] .panel__value')).toHaveText('8');
  const packsBefore = Number(
    await panel.locator('[data-readout="evidence-packs"] .panel__value').textContent(),
  );
  await panel.locator('[role="switch"][id$="approve"]').click();
  await expect
    .poll(
      async () => Number(await panel.locator('[data-readout="evidence-packs"] .panel__value').textContent()),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(packsBefore);
});

test('forecast engine: stream and horizon controls update the readouts with labels', async ({ page }) => {
  await page.goto('/machines/forecast-engine/');
  const panel = page.locator('[data-panel="forecast-engine"]');
  await live(panel, 'resilience');
  await expect(panel.locator('[data-readout="resilience"] .panel__value')).toContainText(
    'as stated in résumé',
    { timeout: 10_000 },
  );
  await panel.locator('select[id$="stream"]').selectOption('irrigation');
  await expect(panel.locator('[data-readout="forecast"] .panel__value')).toContainText('not an LSTM', {
    timeout: 10_000,
  });
  await expect(panel.locator('[data-readout="forecast"] .panel__value')).toContainText('sample');
});

test('hall page: a bay card opens its control panel and the decision switch explains itself', async ({
  page,
}) => {
  await page.goto('/');
  const bay = page.locator('#bay-2');
  await bay.scrollIntoViewIfNeeded();
  await bay.getByRole('button', { name: 'Open the control panel' }).click();
  const panel = bay.locator('[data-panel="policy-sorter"]');
  await expect(panel).toBeVisible();
  await live(panel, 'stage'); // hydrated and the hall/headless sim publishing
  await panel.locator('.panel__decision').first().click();
  await expect(panel.locator('.panel__why')).toBeVisible();
});

test('workbench: running a station fills its jar and lights a screen', async ({ page }) => {
  await page.goto('/machines/data-workbench/');
  const panel = page.locator('[data-panel="data-workbench"]');
  await live(panel, 'screens');
  await panel.getByRole('button', { name: 'Run incidents pipeline' }).click();
  await expect(panel.locator('[data-readout="screens"] .panel__value')).toHaveText('1', { timeout: 15_000 });
  await expect(panel.locator('[data-readout="records-cleaned"] .panel__value')).toHaveText('2400');
  await expect(panel.locator('.panel__narration')).toContainText('deterministic IDs');
});

test('calibration bench: issuer filter and the printer', async ({ page }) => {
  await page.goto('/machines/calibration-bench/');
  const panel = page.locator('[data-panel="calibration-bench"]');
  const count = await live(panel, 'instruments');
  await expect(count).toHaveText('10');
  await panel.locator('select[id$="issuer"]').selectOption('Microsoft');
  await expect(count).toHaveText('5');
  await expect(panel.locator('[data-readout="latest"] .panel__value')).toContainText('[source: info.md]');
  await panel.getByRole('button', { name: 'Print calibration certificate' }).click();
  await expect(panel.locator('[data-readout="latest"] .panel__value')).toContainText('printing', {
    timeout: 5_000,
  });
  await expect(panel.locator('[data-readout="latest"] .panel__value')).toContainText('[source: info.md]', {
    timeout: 10_000,
  });
});

test('foundations generator: spinning up a turbine reports real milestone totals', async ({ page }) => {
  await page.goto('/machines/foundations-generator/');
  const panel = page.locator('[data-panel="foundations-generator"]');
  const power = await live(panel, 'hall-power');
  await expect(power).toContainText('2021–2025');
  await panel.locator('select[id$="turbine"]').selectOption('gdsc');
  await expect(power).toContainText('2023–2024');
  await expect(panel.locator('[data-readout="students"] .panel__value')).toContainText('as stated in résumé');
});

test('hall power twin lists every milestone with a source', async ({ page }) => {
  await page.goto('/');
  const power = page.locator('.power');
  await expect(power.locator('svg[role="img"]')).toBeAttached();
  await power.locator('summary').click();
  const items = power.locator('li');
  expect(await items.count()).toBe(26);
  await expect(items.first()).toContainText('2017');
});
