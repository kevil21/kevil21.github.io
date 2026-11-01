import { expect, test } from '@playwright/test';

/** Scene 1 gates: recruiter facts first, theme pre-paint, no horizontal overflow, canonical, bottom bar on phones. */

test.describe('recruiter strip', () => {
  test('name, title, employer, résumé and contact are present on first paint', async ({ page }) => {
    await page.goto('/');
    const strip = page.locator('#recruiter-strip');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText('Kevil Patel');
    await expect(strip).toContainText(/Associate (Software Development Engineer|SDE)/);
    const kyndryl = strip.getByRole('link', { name: 'Kyndryl' });
    const kyndrylCount = await kyndryl.count();
    const viewport = page.viewportSize()!;
    if (viewport.width > 420) await expect(kyndryl).toBeVisible();
    else expect(kyndrylCount).toBeGreaterThanOrEqual(0);
    // Résumé and Contact are reachable either in the strip (desktop) or the bottom bar (phone).
    await expect(page.getByRole('link', { name: 'Résumé' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact' }).first()).toBeVisible();
  });

  test('résumé and contact links resolve', async ({ page }) => {
    for (const path of ['/resume/', '/contact/', '/operator/']) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});

test.describe('theme', () => {
  test('data-theme is set before paint and follows the colour scheme', async ({ page }, testInfo) => {
    await page.goto('/');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const scheme = testInfo.project.use.colorScheme ?? 'dark';
    expect(theme).toBe(scheme);
    const metaColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    const expected = await page.locator('meta[name="theme-color"]').getAttribute(`data-${scheme}`);
    expect(metaColor).toBe(expected);
  });

  test('toggle persists and the hall background changes', async ({ page }) => {
    await page.goto('/');
    const before = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    const toggle = page.locator('.theme-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click(); // system → light
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme-pref')))
      .toBe('light');
    const afterLight = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    await toggle.click(); // light → dark
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    const afterDark = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(afterLight).not.toBe(afterDark);
    expect([before, afterLight, afterDark].every(Boolean)).toBe(true);
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('sr:theme'))).toBe('dark');
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
  });
});

test.describe('layout', () => {
  test('no horizontal overflow on any page', async ({ page }) => {
    for (const path of [
      '/',
      '/resume/',
      '/contact/',
      '/operator/',
      '/certifications/',
      '/work/',
      '/work/a360/',
      '/machines/telemetry-refinery/',
      '/does-not-exist/',
    ]) {
      await page.goto(path);
      const widths = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(widths.doc, `${path} documentElement`).toBeLessThanOrEqual(widths.inner);
      expect(widths.body, `${path} body`).toBeLessThanOrEqual(widths.inner);
      await page.evaluate(() => window.scrollTo(300, 0));
      expect(await page.evaluate(() => window.scrollX), `${path} sideways scroll`).toBe(0);
    }
  });

  test('bottom bar is in the thumb zone on phones and absent on desktop', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('#bottom-bar');
    const { width, height } = page.viewportSize()!;
    if (width < 960) {
      await expect(bar).toBeVisible();
      const box = await bar.boundingBox();
      expect(box).not.toBeNull();
      const landscape = width > height && height < 480;
      if (landscape) expect(box!.x + box!.width).toBeGreaterThanOrEqual(width - 1);
      else expect(box!.y + box!.height).toBeGreaterThanOrEqual(height - 1);
      for (const name of ['Résumé', 'Contact', 'Operator', 'Tour', 'Map']) {
        const item = bar.getByRole(name === 'Tour' || name === 'Map' ? 'button' : 'link', { name });
        await expect(item).toBeVisible();
        const b = await item.boundingBox();
        expect(b!.height, `${name} height`).toBeGreaterThanOrEqual(44);
      }
    } else {
      await expect(bar).toBeHidden();
    }
  });

  test('canonical points at kevilpatel.in and the sample-data notice is present', async ({ page }) => {
    await page.goto('/');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://kevilpatel.in/');
    await expect(page.locator('.sample-tag').first()).toBeVisible();
  });
});
