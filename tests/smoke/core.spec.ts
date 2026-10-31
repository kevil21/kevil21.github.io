import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function bounds(page: Page) {
  const measurements = await page.evaluate(() => {
    scrollTo(10000, scrollY);
    const sideways = scrollX;
    scrollTo(0, scrollY);
    return {
      route: location.pathname,
      viewport: innerWidth, html: document.documentElement.scrollWidth, body: document.body.scrollWidth, sideways,
      outside: [...document.querySelectorAll<HTMLElement>('main *, .command-surface *, .identity-rail *')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map((e) => ({ tag: e.tagName, class: e.className, text: e.textContent?.slice(0, 50), right: e.getBoundingClientRect().right })),
      clipped: [...document.querySelectorAll<HTMLElement>('p:not(.sr-only), h1, h2, h3, h4, button, summary, pre, .record, .project-node')]
        .filter((e) => e.getClientRects().length && e.scrollWidth > e.clientWidth + 2)
        .map((e) => e.outerHTML.slice(0, 180)),
    };
  });
  expect(measurements.html, JSON.stringify(measurements)).toBeLessThanOrEqual(measurements.viewport + 1);
  expect(measurements.body).toBeLessThanOrEqual(measurements.viewport + 1);
  expect(measurements.sideways).toBe(0);
  expect(measurements.clipped).toEqual([]);
}

test('engine version, cold lazy boundary, themes, persona and keyboard search', async ({ page, browser }, info) => {
  await info.attach('engine.json', { body: JSON.stringify({ browser: info.project.name, version: browser.version(), platform: process.platform }), contentType: 'application/json' });
  const requests: string[] = []; const errors: string[] = [];
  page.on('request', (r) => requests.push(r.url())); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-ai-controls]')).toHaveAttribute('data-ready', 'true');
  await page.waitForLoadState('networkidle');
  expect(requests.filter((url) => /\.wasm|\.onnx|transformers\.web|full\.worker|pocket\.worker|\/models\/|huggingface|webllm/i.test(url))).toEqual([]);
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');
  await page.getByRole('button', { name: 'Engineer', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Engineer', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'light');
  await page.keyboard.press('Control+k'); await expect(page.locator('[data-command-input]')).toBeFocused();
  await page.locator('[data-command-input]').fill('azure'); await page.keyboard.press('Enter');
  await expect(page.locator('[data-search-status]')).toContainText('matching records');
  await page.keyboard.press('Escape'); await expect(page.locator('[data-search-panel]')).toBeHidden();
  await expect(page.locator('[data-command-input]')).toBeFocused();
  await page.goto('/projects/a360/'); await expect(page.locator('[data-perspective="engineer"]')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) test(`Pocket/JD, consent/error/cache/search contrast and reflow: ${theme}`, async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/architecture/');
  await page.locator('[data-ai-controls] > summary').click();
  await page.locator('[data-full-enable]').click();
  await expect(page.locator('[data-ai-status]')).toContainText('consent first');
  await page.locator('[data-command-input]').fill('What does A360 do?');
  await page.locator('[data-command-form]').evaluate((f) => (f as HTMLFormElement).requestSubmit());
  await expect(page.locator('[data-search-status]')).toContainText('Pocket:');
  await page.locator('[data-jd-input]').fill('Python; Java; Rust');
  await page.locator('[data-jd-submit]').click();
  await expect(page.locator('[data-jd-status]')).toContainText('3 requirements');
  await page.locator('[data-observatory-refresh]').click();
  await expect(page.locator('[data-observatory]')).toContainText('Measured Cache API');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await bounds(page);
  await page.locator('[data-ai-clear-cache]').click();
  await expect(page.locator('[data-observatory]')).toContainText('Selected model entries cleared');
  // Real missing-asset failure before SDK/model loading; no model-download mock success.
  await page.route('**/generated/semantic-index.json', (route) => route.abort());
  await page.locator('[data-semantic-consent]').check(); await page.locator('[data-semantic-enable]').click();
  await expect(page.locator('[data-ai-status]')).toContainText('Semantic unavailable');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath(`states-${theme}.png`), fullPage: true });
});

test('280–2560 live reflow, 200% root text and 400%-equivalent viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/projects/a360/', '/architecture/', '/evidence/', '/resume/', '/compare/', '/search/']) {
    await page.goto(route);
    for (const width of [280, 320, 375, 568, 768, 1024, 1440, 1920, 2560, 320]) {
      await page.setViewportSize({ width, height: width === 568 ? 320 : 900 });
      await bounds(page);
    }
    // 320 CSS px = 1280px at 400% zoom, not actual OS/browser zoom.
    const style = await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await bounds(page); await style.evaluate((e) => (e as HTMLStyleElement).remove());
  }
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
});

test('JavaScript disabled preserves static routes, CSS themes, all perspectives and JD fallback', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: info.project.use.baseURL!, javaScriptEnabled: false, serviceWorkers: 'block', viewport: { width: 280, height: 812 }, colorScheme: 'dark' });
  try {
    const page = await context.newPage(); await page.goto('/');
    await expect(page.locator('[data-project]')).toHaveCount(9);
    const dark = await page.locator('body').evaluate((e) => getComputedStyle(e).backgroundColor);
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await page.locator('body').evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(dark);
    await bounds(page);
    await page.goto('/projects/a360/'); await expect(page.locator('[data-perspective]:visible')).toHaveCount(3); await bounds(page);
    await page.goto('/architecture/'); await expect(page.locator('[data-jd-input]')).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Browse source-linked skills →' })).toBeVisible(); await bounds(page);
    for (const route of ['/evidence/', '/resume/', '/search/']) { await page.goto(route); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); await bounds(page); }
  } finally { await context.close(); }
});