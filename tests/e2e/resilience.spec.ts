import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const origin = `http://127.0.0.1:${process.env.ATLAS_TEST_PORT ?? 4321}`;
const routes = ['/', '/projects/policy-to-pipelines/', '/evidence/', '/experience/', '/credentials/', '/resume/', '/architecture/', '/compare/', '/search/', '/404.html'];

for (const route of routes) test(`dark full-rule accessibility: ${route}`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(route);
  const result = await new AxeBuilder({ page }).analyze(); expect(result.violations).toEqual([]);
});

test('CSS alone follows system theme without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
  const page = await context.newPage(); await page.goto(`${origin}/`);
  const dark = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(dark);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme'); await context.close();
});

test('saved appearance and lens survive reload and Back navigation', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: /Résumé/ }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.goBack(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Architect', exact: true }).click();
  await page.goto('/projects/a360/'); await expect(page.getByRole('button', { name: 'Architect', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.getByRole('button', { name: 'Architect', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).not.toHaveAttribute('aria-pressed');
});

test('keyboard disclosure and mobile inspection have intentional focus paths', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await page.goto('/');
  const summary = page.locator('[data-project="a360"] summary'); await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-project="a360"] details')).toHaveAttribute('open', '');
  await expect(page.locator('[data-project="a360"] .disclosure-body')).toBeVisible();
  await page.getByRole('button', { name: 'Inspect A360', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-inspector]')).toBeFocused();
  await page.getByRole('link', { name: '← Back to projects', exact: true }).click();
  await expect(page).toHaveURL(/#projects-heading$/);
});

test('all visible navigation and controls offer 44px targets on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of routes) {
    await page.goto(route);
    const failures = await page.locator('a:visible, button:visible, input:visible, select:visible, summary:visible').evaluateAll((elements) => elements.filter((element) => {
      const box = element.getBoundingClientRect(); return box.height < 44 || box.width < 44;
    }).map((element) => element.outerHTML.slice(0, 150)));
    expect(failures, route).toEqual([]);
  }
});

test('a later router can cancel a command before any search fetch', async ({ page }) => {
  let fetched = false; page.on('request', (request) => { if (request.url().includes('search-index')) fetched = true; });
  await page.goto('/');
  await page.evaluate(() => document.addEventListener('atlas:command', (event) => event.preventDefault(), { once: true }));
  await page.locator('[data-command-input]').fill('azure'); await page.locator('[data-command-form]').evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(page.locator('[data-search-panel]')).toBeHidden(); expect(fetched).toBe(false);
});

test('reading surfaces and inspector screenshot review', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [route, name] of [['/projects/a360/', 'project'], ['/compare/', 'comparison'], ['/resume/', 'resume'], ['/evidence/', 'evidence']] as const) {
    await page.goto(route); await page.screenshot({ path: testInfo.outputPath(`${name}.png`), animations: 'disabled' });
  }
});