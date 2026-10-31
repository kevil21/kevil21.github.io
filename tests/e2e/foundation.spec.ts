import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const origin = `http://127.0.0.1:${process.env.ATLAS_TEST_PORT ?? 4321}`;

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} foundation is accessible and local-only`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/');
    await page.locator('html').evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Systems, connected.Evidence, attached.');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    expect(requests.every((url) => new URL(url).origin === origin)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const duration = await page.locator('html').evaluate((element) => getComputedStyle(element).getPropertyValue('--motion-base').trim());
    expect(['0s', '0ms']).toContain(duration);
  });
}

test('download and metadata work without JavaScript at narrow width', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 640 } });
  const page = await context.newPage();
  await page.goto(`${origin}/`);
  await expect(page.getByRole('link', { name: 'Download résumé (Markdown)' })).toHaveAttribute('download', '');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kevilpatel.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://kevilpatel.in/assets/og.png');
  const response = await context.request.get(`${origin}/assets/kevil-patel-resume.md`);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('Associate Software Development Engineer');
  expect(await response.text()).not.toMatch(/tel:|phone|Memory\/|\d\s*%/i);
  expect(await response.text()).not.toContain('/Users/');
  await context.close();
});

test('all generated entry points and icons are served', async ({ request }) => {
  // CNAME is hosting configuration, checked on disk by audit:public rather than Astro preview.
  for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/assets/favicon.png', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/apple-touch-icon.png', '/assets/og.png', '/assets/card.png', '/assets/headshot-160.webp', '/assets/headshot-480.webp', '/assets/headshot-960.webp', ...['knowledge-index', 'answer-index', 'skill-graph', 'evidence-map', 'content-manifest', 'ai-manifest', 'journeys', 'search-index'].map((name) => `/generated/${name}.json`)]) {
    expect((await request.get(path)).ok(), path).toBe(true);
  }
});