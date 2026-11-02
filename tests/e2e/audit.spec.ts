import { expect, test } from '@playwright/test';

/** Regressions found by the 2026-11-02 audit. Each test names the defect it guards. */

test('shortcuts can be switched off (WCAG 2.1.4) and stay off', async ({ page }) => {
  await page.goto('/contact/');
  const toggle = page.locator('footer [data-action="shortcuts"]');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toContainText('off');
  await page.locator('body').press('r');
  await page.waitForTimeout(400);
  expect(new URL(page.url()).pathname).toBe('/contact/');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.locator('body').press('r');
  await expect.poll(() => new URL(page.url()).pathname).toBe('/resume/');
});

test('hall re-mounts after a soft navigation away and back, without a full reload', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
  await page.evaluate(() => {
    (window as unknown as { __softnav: number }).__softnav = 1;
  });
  await page.locator('a[href="/resume/"]:visible').first().click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/resume/');
  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  expect(await page.evaluate(() => (window as unknown as { __softnav?: number }).__softnav)).toBe(1);
  await expect
    .poll(async () => page.locator('#hall-stage').getAttribute('data-hall'), { timeout: 20_000 })
    .toMatch(/ready|static/);
});

test('static tier: hall panels still run their simulations (Save-Data)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } });
  });
  await page.goto('/');
  await expect(page.locator('#hall-stage')).toHaveAttribute('data-hall', 'static', { timeout: 20_000 });
  const toggle = page.locator('[data-toggle-panel][aria-controls="panel-telemetry-refinery"]');
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  const spans = page.locator(
    '[data-panel="telemetry-refinery"] [data-readout="spans-per-second"] .panel__value',
  );
  await expect
    .poll(async () => Number((await spans.textContent())?.trim()), { timeout: 15_000 })
    .toBeGreaterThan(0);
});

test('the Operator tabs follow the WAI-ARIA pattern', async ({ page }) => {
  await page.goto('/operator/');
  await expect(page.locator('.op')).toHaveAttribute('data-operator-ready', 'ready', { timeout: 20_000 });
  const ask = page.locator('#op-tab-ask');
  const jd = page.locator('#op-tab-jd');
  await expect(ask).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#op-panel-ask')).toHaveAttribute('aria-labelledby', 'op-tab-ask');
  await ask.focus();
  await page.keyboard.press('ArrowRight');
  await expect(jd).toHaveAttribute('aria-selected', 'true');
  await expect(jd).toBeFocused();
  await expect(page.locator('#op-panel-jd')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(ask).toBeFocused();
});

test('"agentic" is not mistaken for a personal topic', async ({ page }) => {
  await page.goto('/operator/');
  await expect(page.locator('.op')).toHaveAttribute('data-operator-ready', 'ready', { timeout: 20_000 });
  await page.fill('#op-q', 'What agentic AI work has Kevil built?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const answer = page.locator('.op__answer');
  await expect(answer).toBeVisible({ timeout: 15_000 });
  await expect(answer).not.toHaveAttribute('data-path', 'declined');
});

test('the approval lever is a button that does nothing until a plan waits at the gate', async ({ page }) => {
  await page.goto('/machines/policy-sorter/');
  const panel = page.locator('[data-panel="policy-sorter"]');
  const lever = panel.locator('button[id$="approve"]');
  // Wait for the island to hydrate and the headless sim to publish, or the first clicks land on the static twin.
  await expect
    .poll(async () => (await panel.locator('[data-readout="stage"] .panel__value').textContent())?.trim(), {
      timeout: 15_000,
    })
    .not.toBe('—');
  await expect(lever).toBeVisible();
  await expect(lever).not.toHaveAttribute('role', 'switch');
  await lever.click(); // nothing is waiting: must not pre-approve the next plan
  await panel.locator('select[id$="policy"]').selectOption('public-ip-ban');
  await expect(panel.locator('[data-readout="stage"] .panel__value')).toContainText('gate', {
    timeout: 25_000,
  });
});
