import { expect, test } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  '/',
  '/work/',
  '/work/a360/',
  '/roles/kyndryl-associate-sde/',
  '/skills/',
  '/skills/observability/',
  '/credentials/',
  '/education/',
  '/resume/',
  '/match/',
  '/ask/',
  '/observatory/',
  '/journeys/',
  '/journeys/recruiter/',
  '/compare/',
  '/404.html',
  '/offline/',
];

for (const path of pages) {
  test(`axe: ${path} has no WCAG 2.2 A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .disableRules(['region'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical' || v.tags.some((t) => t.startsWith('wcag')),
    );
    expect(
      serious.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(' | ')}`,
      ),
    ).toEqual([]);
  });
}

test('interactive targets are at least 24px and focus is visible', async ({ page }) => {
  await page.goto('/');
  const small = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>('a, button, [role="button"], input, [role="radio"]'),
    )) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 24 || r.width < 24)
        out.push(
          `${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0]} ${Math.round(r.width)}×${Math.round(r.height)}`,
        );
    }
    return out;
  });
  expect(small).toEqual([]);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    outline: getComputedStyle(document.activeElement!).outlineStyle,
  }));
  // WebKit only tab-focuses links with a system setting; when focus stayed on <body> there is nothing to assert
  if (focused.tag !== 'BODY') expect(focused.outline).not.toBe('none');
});
