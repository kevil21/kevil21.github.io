import { expect, test, type Locator } from '@playwright/test';

/** v5.1.0: the floor-plan card folds into a chip after a selection and opens on hover; panels show live instruments. */

const SLUGS = [
  'telemetry-refinery',
  'policy-sorter',
  'forecast-engine',
  'data-workbench',
  'calibration-bench',
  'foundations-generator',
];

/** The island is hydrated and the sim is running once its instruments are on screen: interact only after that. */
async function hydrated(panel: Locator) {
  await expect.poll(() => panel.locator('figure.viz').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(3);
}

for (const slug of SLUGS) {
  test(`${slug}: the panel shows live instruments with a text twin`, async ({ page }) => {
    await page.goto(`/machines/${slug}/`);
    const panel = page.locator(`[data-panel="${slug}"]`);
    const figures = panel.locator('figure.viz');
    await expect.poll(() => figures.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
    const first = figures.first();
    await first.scrollIntoViewIfNeeded();
    await expect(first.locator('svg, ul, ol').first()).toBeVisible();
    // the chart is never the only way to read it
    const twin = first.locator('details.viz__twin');
    await twin.locator('summary').click();
    await expect(twin.locator('tbody tr').first()).toBeVisible();
  });
}

test('refinery: late-arrivals scenario catches late documents; the readout and the ledger agree', async ({
  page,
}) => {
  await page.goto('/machines/telemetry-refinery/');
  const panel = page.locator('[data-panel="telemetry-refinery"]');
  await hydrated(panel);
  await panel.locator('select[id$="scenario"]').selectOption('late-arrivals');
  const late = panel.locator('[data-readout="late-docs-caught"] .panel__value');
  await expect
    .poll(async () => Number((await late.textContent())?.trim()), { timeout: 30_000 })
    .toBeGreaterThan(0);
  const ledger = panel.locator('figure[data-viz="overlap-ledger"]');
  await expect(ledger).toContainText('Late documents caught');
});

test('sorter: rotate walks the sample policies; the pipeline instrument shows the gate waiting', async ({
  page,
}) => {
  await page.goto('/machines/policy-sorter/');
  const panel = page.locator('[data-panel="policy-sorter"]');
  await hydrated(panel);
  await panel.locator('select[id$="policy"]').selectOption('sql-backups');
  const stages = panel.locator('figure[data-viz="pipeline"]');
  await expect(stages.locator('.viz__stage--waiting')).toContainText('Human gate', { timeout: 20_000 });
  await panel.locator('button[id$="approve"]').click();
  await expect(stages.locator('.viz__stage--waiting')).toHaveCount(0, { timeout: 10_000 });
});

test('forecast: backtest adds the rolling-fold instruments', async ({ page }) => {
  await page.goto('/machines/forecast-engine/');
  const panel = page.locator('[data-panel="forecast-engine"]');
  await hydrated(panel);
  await expect(panel.locator('figure[data-viz="folds"]')).toHaveCount(0);
  await panel.locator('select[id$="scenario"]').selectOption('backtest');
  await expect(panel.locator('figure[data-viz="folds"]')).toBeVisible({ timeout: 10_000 });
  await expect(panel.locator('[data-readout="backtest"]')).toContainText('folds beat the naive baseline');
});

test.describe('floor-plan card (desktop)', () => {
  test.beforeEach(({ viewport }) => {
    test.skip(!viewport || viewport.width < 960, 'the fold-to-chip card is the desktop layout');
  });

  test('folds into a chip after a selection, opens on hover, folds again when the pointer leaves', async ({
    page,
  }) => {
    await page.goto('/');
    const hud = page.locator('#minimap-sheet');
    await expect(hud).toHaveAttribute('data-hud-state', 'open');
    await expect(hud.locator('#hud-body')).toBeVisible();

    await page.locator('#minimap-sheet [data-action="coffee"]').click();
    await expect(hud).toHaveAttribute('data-hud-state', 'chip');
    await expect(hud.locator('#hud-body')).toBeHidden();
    await expect(hud.locator('.hud__chip')).toHaveAttribute('aria-expanded', 'false');

    await hud.locator('.hud__chip').hover();
    await expect(hud).toHaveAttribute('data-hud-state', 'open');
    await expect(hud.locator('#hud-body')).toBeVisible();

    await page.mouse.move(5, 300);
    await expect(hud).toHaveAttribute('data-hud-state', 'chip', { timeout: 3_000 });
  });

  test('keyboard: the chip is a disclosure button and Escape folds it back', async ({ page }) => {
    await page.goto('/');
    const hud = page.locator('#minimap-sheet');
    const chip = hud.locator('.hud__chip');
    await chip.click(); // first click on an open card folds it
    await expect(hud).toHaveAttribute('data-hud-state', 'chip');
    await page.mouse.move(5, 300);
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(hud).toHaveAttribute('data-hud-state', 'open');
    await expect(chip).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(hud).toHaveAttribute('data-hud-state', 'chip');
    await expect(chip).toBeFocused();
  });

  test('walking to another bay by key folds the card too, and the chip keeps saying where you are', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    const stage = page.locator('#hall-stage');
    await expect
      .poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 })
      .toMatch(/ready|static/);
    if ((await stage.getAttribute('data-hall')) !== 'ready') {
      testInfo.skip(true, 'no WebGL in this browser');
      return;
    }
    await expect(stage).toHaveAttribute('data-rail', 'bound');
    const hud = page.locator('#minimap-sheet');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('End');
    await expect(hud.locator('.hud__where')).toHaveText('Hall power meter', { timeout: 10_000 });
    await expect(hud).toHaveAttribute('data-hud-state', 'chip');
  });
});

test.describe('floor-plan sheet (phone)', () => {
  test.beforeEach(({ viewport }) => {
    test.skip(!viewport || viewport.width >= 960, 'the sheet is the phone layout');
  });

  test('picking a stop walks there and closes the sheet', async ({ page }, testInfo) => {
    await page.goto('/');
    const stage = page.locator('#hall-stage');
    await expect
      .poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 })
      .toMatch(/ready|static/);
    await page.locator('#bottom-bar [data-action="map"]').click();
    const hud = page.locator('#minimap-sheet');
    await expect(hud).toHaveClass(/hud--open/);
    await hud.locator('.hud__stop', { hasText: 'Forecast Engine' }).click();
    await expect(hud).not.toHaveClass(/hud--open/);
    await expect(hud.locator('.hud__where')).toHaveText('Forecast Engine');
    void testInfo;
  });
});
