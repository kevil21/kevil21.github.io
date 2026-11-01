import { expect, test } from '@playwright/test';

/** Easter eggs: keyboard/touch reachable, announced, nothing fake. Plus 404, offline, PWA and the notebook. */

test('lab notebook lists eight eggs and is unlisted', async ({ page }) => {
  await page.goto('/lab-notebook/');
  await expect(page.locator('.egg')).toHaveCount(8);
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
});

test('404: lights out, alarm lamp, Operator form', async ({ page }) => {
  const res = await page.goto('/no-such-corridor/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('[data-egg="lights-out-404"] h1')).toContainText('not on the floor plan');
  await expect(page.locator('.alarm__svg')).toBeVisible();
  await expect(page.locator('#nf-path')).toContainText('/no-such-corridor/');
  await page.fill('#nf-q', 'certifications');
  await page.locator('.notfound__ask button').click();
  await page.waitForURL(/\/operator\/\?q=certifications/);
});

test('offline page and PWA bits exist; service worker registers on a secure context', async ({
  page,
  browserName,
}) => {
  expect((await page.goto('/offline/'))?.status()).toBe(200);
  for (const f of [
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/apple-touch-icon.png',
    '/og/default.png',
    '/sw.js',
  ]) {
    const r = await page.request.get(f);
    expect(r.status(), f).toBe(200);
  }
  await page.goto('/');
  test.skip(browserName === 'webkit', 'WebKit headless does not expose service worker registration reliably');
  await expect
    .poll(async () => page.evaluate(async () => Boolean(await navigator.serviceWorker?.getRegistration())), {
      timeout: 15_000,
    })
    .toBe(true);
});

test('breaker throws the night shift (third token variant) and announces it', async ({ page }) => {
  await page.goto('/');
  const { width } = page.viewportSize()!;
  if (width < 960) await page.locator('#bottom-bar [data-action="map"]').click();
  await page.locator('[data-action="night"]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await expect(page.locator('.toast[data-egg="night-shift"]')).toBeVisible();
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg-hall').trim(),
  );
  expect(bg).toContain('13%');
  await page.locator('[data-action="night"]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('maintenance hatch reveals real source pointers on a machine page', async ({ page }) => {
  await page.goto('/machines/policy-sorter/');
  const hatch = page.locator('.hatch[data-machine="policy-sorter"]');
  await hatch.locator('summary').click();
  await expect(hatch.locator('.hatch__row').first()).toBeVisible();
  await expect(hatch.locator('.hatch__id').first()).toHaveText(/^F-/);
  await expect(hatch.locator('.hatch__src a').first()).toHaveAttribute(
    'href',
    /github\.com\/kevil21\/kevilpatel\/blob\/main\/site\//,
  );
});

test('lab weather is playful and labelled; ask-this-machine opens the Operator in a voice', async ({
  page,
}) => {
  await page.goto('/machines/forecast-engine/');
  // wait for the panel island to hydrate (a live readout) before using its buttons
  await expect
    .poll(
      async () =>
        (
          await page
            .locator('[data-panel="forecast-engine"] [data-readout="resilience"] .panel__value')
            .textContent()
        )?.trim(),
      { timeout: 15_000 },
    )
    .not.toBe('—');
  await page.locator('[data-egg="lab-weather"]').click();
  await expect(page.locator('[data-weather]')).toContainText('Playful');
  await page.fill('#ask-q', 'What does the grid stream forecast?');
  await page.locator('.ask-machine button').click();
  await page.waitForURL(/\/operator\/\?voice=forecast-engine&q=/);
  await expect(page.locator('.op__voice')).toContainText('The Engine reads from its ribbons');
  await expect(page.locator('.op__answer')).toBeVisible({ timeout: 20_000 });
  const cites = page.locator('.op__cites a[href^="/"]');
  const hrefs = await cites.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  for (const h of hrefs) expect(h).toMatch(/forecast-engine|climate|smart-energy|opticrop/);
});

test('reverse walk prints the résumé (keyboard)', async ({ page }, testInfo) => {
  await page.goto('/');
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
  if ((await stage.getAttribute('data-hall')) !== 'ready') {
    testInfo.skip(true, 'no WebGL in this browser');
    return;
  }
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('End');
  await expect(page.locator('#minimap-sheet .hud__where')).toHaveText('Hall power meter', {
    timeout: 10_000,
  });
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(350);
  }
  await expect(page.locator('.toast[data-egg="reverse-walk"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.toast[data-egg="reverse-walk"] a')).toHaveAttribute('href', '/resume/');
});
