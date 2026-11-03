import { expect, test } from '@playwright/test';

/**
 * The 3D hall: mounts behind readable content, never blocks it, walks the rail by keyboard and minimap, and falls
 * back to the static floor plan. Playwright's Chromium has no WebGPU (inherited), so these runs exercise WebGL 2;
 * WebKit may have no WebGL in headless mode, in which case the static path is asserted instead.
 */

test('content is readable before the hall mounts, and the stage reaches a terminal state', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#hall-title')).toBeVisible();
  await expect(page.locator('#recruiter-strip')).toBeVisible();
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
});

test('rail: arrow keys walk between bays and the HUD follows', async ({ page }, testInfo) => {
  await page.goto('/');
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
  const state = await stage.getAttribute('data-hall');
  if (state !== 'ready') {
    testInfo.annotations.push({
      type: 'note',
      description: `hall static in this browser: ${await stage.getAttribute('data-hall-reasons')}`,
    });
    await expect(page.locator('.hall-still svg')).toBeVisible();
    return;
  }
  await expect(stage).toHaveAttribute('data-rail', 'bound');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __srHall?: { fps: number } }).__srHall?.fps ?? 0),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);
  const hud = page.locator('#minimap-sheet');
  await expect(hud.locator('.hud__where')).toHaveText(/Telemetry Refinery|Control room/);
  await page.keyboard.press('End');
  await expect(hud.locator('.hud__where')).toHaveText('Hall power meter', { timeout: 10_000 });
  await page.keyboard.press('Home');
  await expect(hud.locator('.hud__where')).toHaveText('Control room', { timeout: 10_000 });
});

test('quality probe: injected slow frames engage a lower profile', async ({ page }, testInfo) => {
  await page.goto('/');
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
  if ((await stage.getAttribute('data-hall')) !== 'ready') {
    testInfo.skip(true, 'no WebGL in this browser');
    return;
  }
  const before = await page.evaluate(
    () => (window as unknown as { __srHall: { quality: string } }).__srHall.quality,
  );
  await page.evaluate(() => {
    (window as unknown as { __srHall: { forceSlowFrames: number } }).__srHall.forceSlowFrames = 400;
  });
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __srHall: { quality: string } }).__srHall.quality),
      { timeout: 30_000 },
    )
    .not.toBe(before === 'phone' ? '__never__' : before);
  const after = await page.evaluate(
    () => (window as unknown as { __srHall: { quality: string } }).__srHall.quality,
  );
  const order = ['high', 'medium', 'phone'];
  expect(order.indexOf(after)).toBeGreaterThanOrEqual(order.indexOf(before));
});

test('free walk toggle and return to rail', async ({ page }, testInfo) => {
  await page.goto('/');
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
  if ((await stage.getAttribute('data-hall')) !== 'ready') {
    testInfo.skip(true, 'no WebGL in this browser');
    return;
  }
  const { width } = page.viewportSize()!;
  if (width < 960) {
    await page.locator('#bottom-bar [data-action="map"]').click();
    await expect(page.locator('#minimap-sheet')).toHaveClass(/hud--open/);
  }
  const mode = page.locator('[data-hud="mode"]');
  await expect(mode).toHaveText('Free walk');
  await mode.click();
  await expect(mode).toHaveText('Return to rail');
  await page.keyboard.press('Escape');
  await expect(mode).toHaveText('Free walk');
});

test('no horizontal overflow with the hall mounted', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(async () => page.locator('#hall-stage').getAttribute('data-hall'), { timeout: 20_000 })
    .toMatch(/ready|static/);
  const widths = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(widths.doc).toBeLessThanOrEqual(widths.inner);
});

test('tour: the bar button starts a guided tour that walks the bays; Escape stops it', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
  if ((await stage.getAttribute('data-hall')) !== 'ready') {
    testInfo.skip(true, 'no WebGL in this browser');
    return;
  }
  const { width } = page.viewportSize()!;
  if (width < 960) await page.locator('#bottom-bar [data-action="tour"]').click();
  else {
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('t');
  }
  const bar = page.locator('.tourbar');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Control room');
  await bar.getByRole('button', { name: 'Skip' }).click();
  await expect(bar).toContainText('Telemetry Refinery');
  await expect(page.locator('#minimap-sheet .hud__where')).toHaveText('Telemetry Refinery', {
    timeout: 10_000,
  });
  await page.keyboard.press('Escape');
  await expect(bar).toBeHidden();
});

test('sound toggle is off by default, persists, and never autoplays', async ({ page }, testInfo) => {
  await page.goto('/');
  const stage = page.locator('#hall-stage');
  await expect.poll(async () => stage.getAttribute('data-hall'), { timeout: 20_000 }).toMatch(/ready|static/);
  if ((await stage.getAttribute('data-hall')) !== 'ready') {
    testInfo.skip(true, 'no WebGL in this browser');
    return;
  }
  const { width } = page.viewportSize()!;
  if (width < 960) await page.locator('#bottom-bar [data-action="map"]').click();
  const sw = page.locator('.hud__sound');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => localStorage.getItem('sr:sound'))).toBeNull();
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('sr:sound'))).toBe('on');
  // On desktop the card folded into its chip after the first selection; hover reopens it.
  if (width >= 960) await page.locator('#minimap-sheet .hud__chip').hover();
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
});
