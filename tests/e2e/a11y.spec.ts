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
