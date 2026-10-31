import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { portfolio } from '../../src/lib/content';

const origin = `http://127.0.0.1:${process.env.ATLAS_TEST_PORT ?? 4321}`;
const majorRoutes = ['/', '/projects/a360/', '/experience/', '/evidence/', '/credentials/', '/resume/', '/architecture/', '/compare/', '/search/', '/404.html'];
async function noOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: innerWidth,
    // The live-region utility intentionally clips only screen-reader text, never visual content.
    clipped: [...document.querySelectorAll<HTMLElement>('p:not(.sr-only), h1, h2, h3, h4, input, select, button, .project-node, .inspector')].filter((element) => element.getClientRects().length && element.scrollWidth > element.clientWidth + 2 && getComputedStyle(element).overflowX !== 'visible').map((element) => element.outerHTML.slice(0, 120)),
  }));
  expect(result.html).toBeLessThanOrEqual(result.viewport + 1);
  expect(result.body).toBeLessThanOrEqual(result.viewport + 1);
  expect(result.clipped).toEqual([]);
}

for (const route of majorRoutes) {
  test(`metadata, landmarks and axe: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://kevilpatel.in${route}`);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    const structured = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}') as { '@graph': { name: string }[] };
    expect(structured['@graph'][0]!.name).toBe(portfolio.profile.name);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
  });
}

test('domain map/list parity, deterministic SVG and contextual evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await expect(page.locator('[data-project]')).toHaveCount(portfolio.projects.length);
  await expect(page.locator('[data-topology] path').first()).toHaveAttribute('d', /^M /);
  await page.getByRole('button', { name: 'Governance', exact: true }).click();
  await expect(page.locator('[data-project]:visible')).toHaveCount(1);
  await expect(page.locator('[data-inspector-title]')).toHaveText('Policy → Pipelines (P2P)');
  await page.getByRole('button', { name: 'All work', exact: true }).click();
  const before = await page.locator('[data-project]:visible').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-project')).sort());
  await page.getByRole('button', { name: 'List', exact: true }).click();
  expect(await page.locator('[data-project]:visible').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-project')).sort())).toEqual(before);
  await page.getByRole('button', { name: 'Inspect OptiCrop', exact: true }).click();
  await expect(page.locator('[data-inspector-title]')).toHaveText('OptiCrop');
  await expect(page.locator('[data-inspector-quote]')).toHaveText(portfolio.evidence.find((item) => item.id === 'e-opticrop')!.text);
  await expect(page.locator('[data-inspector-link]')).toHaveAttribute('href', '/projects/opticrop/');
  const axe = await new AxeBuilder({ page }).analyze(); expect(axe.violations).toEqual([]);
});

test('reading lens changes order, not facts; persists through navigation', async ({ page }) => {
  await page.goto('/');
  const original = await page.locator('[data-project-item]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-project-item')));
  await page.getByRole('button', { name: 'Engineer', exact: true }).click();
  const reordered = await page.locator('[data-project-item]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-project-item')));
  expect(reordered).not.toEqual(original); expect([...reordered].sort()).toEqual([...original].sort());
  await page.goto('/projects/a360/');
  await expect(page.getByRole('button', { name: 'Engineer', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-perspective="engineer"]')).toBeVisible();
  await expect(page.locator('[data-perspective="recruiter"]')).toBeHidden();
  await page.getByRole('button', { name: 'Show all perspectives', exact: true }).click();
  await expect(page.locator('[data-perspective]:visible')).toHaveCount(3);
  for (const text of Object.values(portfolio.projects[0]!.perspectives)) await expect(page.getByText(text, { exact: true })).toBeVisible();
});

test('command search, keyboard focus, safe input and no query persistence', async ({ page }) => {
  const requests: string[] = []; page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await page.keyboard.press('Control+k'); await expect(page.locator('[data-command-input]')).toBeFocused();
  await page.keyboard.press('Meta+k'); await expect(page.locator('[data-command-input]')).toBeFocused();
  await page.locator('[data-command-input]').fill('azure'); await page.keyboard.press('Enter');
  await expect(page.locator('[data-search-status]')).toContainText('matching records');
  await expect(page.locator('[data-search-results]').getByRole('link', { name: 'A360 / project', exact: true })).toBeVisible();
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true);
  expect(requests.some((url) => url.includes('q='))).toBe(false);
  await page.locator('[data-command-input]').fill('<img src=x onerror=alert(1)>'); await page.getByRole('button', { name: 'Search', exact: false }).click();
  await expect(page.locator('[data-search-status]')).toContainText('No source records');
  await expect(page.locator('[data-search-panel] img')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.locator('[data-search-panel]')).toBeHidden();
  expect(await page.evaluate(() => `${JSON.stringify(localStorage)} ${JSON.stringify(sessionStorage)}`)).not.toContain('azure');
});

test('incompatible search index degrades to the static catalog', async ({ page }) => {
  await page.route('**/generated/search-index.json', (route) => route.fulfill({ json: { schemaVersion: 99, contentHash: 'stale', data: { documents: [] } } }));
  await page.goto('/'); await page.locator('[data-query="AI"]').click();
  await expect(page.locator('[data-search-status]')).toContainText('compatible index');
  await expect(page.getByRole('link', { name: 'Browse the complete source index →' })).toBeVisible();
});

test('comparison accepts two distinct canonical projects and supports browser history', async ({ page }) => {
  await page.goto('/compare/?left=opticrop&right=climate-mitigation');
  await expect(page.locator('[data-compare-project]:visible')).toHaveCount(2);
  await expect(page.locator('[data-compare-project]:visible').first()).toHaveAttribute('data-compare-project', 'opticrop');
  await page.getByLabel('First project').selectOption('a360');
  await page.getByLabel('Second project').selectOption('policy-to-pipelines');
  await page.getByRole('button', { name: 'Compare evidence', exact: true }).click();
  await expect(page).toHaveURL(/left=a360&right=policy-to-pipelines/);
  await expect(page.locator('[data-compare-project]:visible')).toHaveCount(2);
  await page.getByLabel('Second project').selectOption('a360'); await page.getByRole('button', { name: 'Compare evidence', exact: true }).click();
  await expect(page.locator('[data-compare-status]')).toContainText('two different projects');
  await page.goBack(); await expect(page.locator('[data-compare-project]:visible').first()).toHaveAttribute('data-compare-project', 'opticrop');
});

test('system preference, explicit overrides, rapid themes and OS changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('atlas:theme', 'light'));
  await page.goto('/'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' }); await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'light');
  for (let i = 0; i < 6; i++) { await page.getByRole('button', { name: 'Dark', exact: true }).click(); await page.getByRole('button', { name: 'Light', exact: true }).click(); }
  await page.getByRole('button', { name: 'Dark', exact: true }).click(); await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');
  const axe = await new AxeBuilder({ page }).analyze(); expect(axe.violations).toEqual([]);
});

test('storage denial and absent WAAPI do not break controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() { throw new Error('Denied storage'); } });
    Object.defineProperty(Element.prototype, 'animate', { value: undefined, configurable: true });
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.getByRole('button', { name: 'Architect', exact: true }).click();
  await page.getByRole('button', { name: 'Craft', exact: true }).click();
  await expect(page.locator('[data-project]:visible')).toHaveCount(1); expect(errors).toEqual([]);
});

test('rapid filters/lenses and reduced-motion changes leave no hidden or running content', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Intelligence', exact: true }).click();
    await page.getByRole('button', { name: 'Engineer', exact: true }).click();
    await page.getByRole('button', { name: 'All work', exact: true }).click();
    await page.getByRole('button', { name: 'Architect', exact: true }).click();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.getByRole('button', { name: 'Recruiter', exact: true }).click();
  await expect(page.locator('[data-project]:visible')).toHaveCount(9);
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
  await expect(page.getByRole('button', { name: 'Recruiter', exact: true })).toBeFocused();
});

test('state-only hooks reject unsafe actions and apply known IDs', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('atlas:request', { detail: { type: 'select-project', projectId: 'unknown' } })));
  await expect(page.locator('[data-inspector-title]')).toHaveText('A360');
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('atlas:request', { detail: { type: 'select-project', projectId: 'python-essentials' } })));
  await expect(page.locator('[data-inspector-title]')).toHaveText('Python Essentials');
});

test('mobile touch, landscape, resized/zoom-like reflow and screenshots', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await page.goto(`${origin}/`);
  await page.getByRole('button', { name: 'Governance', exact: true }).tap(); await noOverflow(page);
  await page.getByRole('button', { name: 'All work', exact: true }).tap();
  await page.screenshot({ path: testInfo.outputPath('atlas-mobile.png'), fullPage: true, animations: 'disabled' });
  for (const width of [375, 768, 1024, 1440, 1920, 568, 320]) { await page.setViewportSize({ width, height: width === 568 ? 320 : 900 }); await noOverflow(page); }
  await page.addStyleTag({ content: 'html { font-size: 200%; }' }); await noOverflow(page);
  await context.close();
});

test('major surfaces have no overflow at 320px and meaningful touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of majorRoutes) {
    await page.goto(route); await noOverflow(page);
    const tooSmall = await page.locator('button:visible, input:visible, select:visible, summary:visible').evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().height < 44).map((element) => element.textContent));
    expect(tooSmall, route).toEqual([]);
  }
});

test('complete canonical content and perspectives are reachable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark', viewport: { width: 320, height: 700 } });
  const page = await context.newPage(); await page.goto(`${origin}/`);
  await expect(page.locator('[data-project]')).toHaveCount(9); await expect(page.locator('[data-persona]:visible')).toHaveCount(0);
  for (const journey of portfolio.journeys) await expect(page.locator(`#${journey.id}`)).toBeVisible();
  for (const project of portfolio.projects) {
    await page.goto(`${origin}/projects/${project.id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.title);
    await expect(page.locator('[data-perspective]:visible')).toHaveCount(3); await noOverflow(page);
  }
  await page.goto(`${origin}/evidence/`);
  for (const record of [...portfolio.evidence, ...portfolio.skills]) await expect(page.locator(`#${record.id}`)).toBeVisible();
  await page.goto(`${origin}/experience/`);
  for (const record of [...portfolio.experience, ...portfolio.education, ...portfolio.achievements]) await expect(page.locator(`#${record.id}`)).toBeVisible();
  await page.goto(`${origin}/credentials/`);
  for (const record of portfolio.certifications) await expect(page.locator(`#${record.id}`)).toContainText(record.verificationNote);
  await page.goto(`${origin}/resume/`);
  for (const record of portfolio.skills) await expect(page.locator('main').getByRole('link', { name: record.name, exact: true })).toBeVisible();
  await page.goto(`${origin}/compare/`); await expect(page.locator('[data-compare-project]:visible')).toHaveCount(9);
  await context.close();
});

test('static sitemap routes and all local content anchors resolve', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const project of portfolio.projects) expect(sitemap).toContain(`/projects/${project.id}/`);
  const routes = [...majorRoutes, ...portfolio.projects.map((project) => `/projects/${project.id}/`)];
  const cache = new Map<string, string>();
  for (const route of routes) cache.set(route, await (await request.get(route)).text());
  for (const [route, html] of cache) {
    for (const match of html.matchAll(/href="(\/[^"?]*#[^"]+)"/g)) {
      const url = new URL(match[1]!, origin);
      const target = cache.get(url.pathname) ?? await (await request.get(url.pathname)).text();
      expect(target, `${route} -> ${match[1]}`).toContain(`id="${decodeURIComponent(url.hash.slice(1))}"`);
    }
  }
});

test('print style preserves all canonical résumé sections', async ({ page }) => {
  await page.goto('/resume/'); await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.identity-rail')).toBeHidden();
  await expect(page.locator('.command-surface')).toBeHidden();
  for (const name of ['Experience', 'Projects', 'Skills', 'Certifications', 'Education', 'Achievements', 'Languages']) await expect(page.getByRole('heading', { name, level: 2, exact: true })).toBeVisible();
});

test('desktop visual captures in both palettes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1100 }); await page.goto('/');
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`atlas-${theme.toLowerCase()}.png`), fullPage: true, animations: 'disabled' });
  }
});