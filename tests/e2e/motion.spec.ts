import { expect, test } from './fixtures';

test.describe('motion and reduced motion', () => {
  test('reduced motion keeps every feature, only animation changes', async ({ page }) => {
    const reduced = await page
      .evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
      .catch(() => false);
    await page.goto('/');
    const dur = await page.evaluate(() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--dur-cinematic').trim();
      return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000;
    });
    expect(dur).toBe(reduced ? 80 : 900);
    // AI and interactions must exist regardless (ADR-012)
    await page.locator('dialog.palette[data-ready]').waitFor({ state: 'attached' });
    await page.keyboard.press('ControlOrMeta+KeyK');
    await expect(page.locator('dialog.palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.span-row[data-span="a360"] .attr').first().focus();
    await expect(page.locator('.trace')).toHaveClass(/has-highlight/);
  });

  test('signal field renders a static SVG first and upgrades only when capable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-signal-svg] path').first()).toBeAttached();
    const pathD = await page.locator('.signal-field__total').getAttribute('d');
    expect(pathD?.length).toBeGreaterThan(100);
  });

  test('view transitions: navigating keeps theme and persona attributes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('trace:persona', 'architect'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-persona', 'architect');
    const theme = await page.locator('html').getAttribute('data-theme');
    const wide = (page.viewportSize()?.width ?? 0) >= 1024;
    await (
      wide
        ? page.getByRole('link', { name: 'Work', exact: true }).first()
        : page.locator('.bottombar').getByRole('link', { name: 'Work' })
    ).click();
    await page.waitForURL(/\/work\/$/);
    await expect(page.locator('html')).toHaveAttribute('data-persona', 'architect');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
  });
});
