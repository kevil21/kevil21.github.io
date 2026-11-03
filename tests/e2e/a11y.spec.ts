import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** WCAG 2.2 AA with axe-core on every public page, in the project's colour scheme (a11y-light / a11y-dark). */
export const PAGES = [
  '/',
  '/resume/',
  '/contact/',
  '/operator/',
  '/certifications/',
  '/work/',
  '/work/a360/',
  '/work/p2p/',
  '/work/smart-energy/',
  '/machines/telemetry-refinery/',
  '/machines/policy-sorter/',
  '/machines/calibration-bench/',
  '/machines/forecast-engine/',
  '/machines/data-workbench/',
  '/machines/foundations-generator/',
  '/does-not-exist/',
];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    // not networkidle: /operator/ may be downloading the embedder on fine-pointer projects
    await page.waitForLoadState('load');
    await page.waitForTimeout(1200);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}

test('focus is visible on the first interactive element', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { tag: el.tagName, outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth };
  });
  expect(outline).not.toBeNull();
  expect(outline!.outlineStyle).not.toBe('none');
});

test('axe: live instruments, every chart with its data table open', async ({ page }) => {
  for (const [path, slug, scenario] of [
    ['/machines/telemetry-refinery/', 'telemetry-refinery', 'late-arrivals'],
    ['/machines/forecast-engine/', 'forecast-engine', 'backtest'],
    ['/machines/calibration-bench/', 'calibration-bench', 'timeline'],
  ] as const) {
    await page.goto(path);
    const panel = page.locator(`[data-panel="${slug}"]`);
    await panel.scrollIntoViewIfNeeded();
    await panel.locator('select[id$="scenario"]').selectOption(scenario);
    await expect
      .poll(() => panel.locator('figure.viz').count(), { timeout: 20_000 })
      .toBeGreaterThanOrEqual(3);
    await page.evaluate(() =>
      document.querySelectorAll('details.viz__twin').forEach((d) => d.setAttribute('open', '')),
    );
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page })
      .include(`[data-panel="${slug}"]`)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
    }));
    expect(violations, `${path}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
  }
});
