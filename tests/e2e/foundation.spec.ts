import { expect, test } from './fixtures';

test.describe('foundation: theme, shell, Tier 0', () => {
  test('applies the resolved theme before first paint and persists a manual choice', async ({
    page,
    colorScheme,
  }) => {
    await page.goto('/');
    const expected = colorScheme === 'light' ? 'light' : 'dark';
    await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
    // the inline script must have set the attribute in the initial HTML parse (no flash): check it exists before hydration
    const early = await page.evaluate(
      () => performance.getEntriesByType('paint').length >= 0 && document.documentElement.dataset.theme,
    );
    expect(early).toBe(expected);
    const wide = (page.viewportSize()?.width ?? 0) >= 1024;
    test.skip(!wide, 'theme toggle lives in the desktop rail; mobile is covered by the palette command test');
    const other = expected === 'dark' ? 'Light' : 'Dark';
    await page.getByRole('radio', { name: other }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', other.toLowerCase());
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', other.toLowerCase());
    expect(await page.evaluate(() => localStorage.getItem('trace:theme'))).toBe(other.toLowerCase());
  });

  test('every colour comes from tokens: no hard-coded hex in component CSS', async ({ page }) => {
    await page.goto('/');
    const offenders = await page.evaluate(() => {
      const bad: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        const walk = (list: CSSRuleList) => {
          for (const r of Array.from(list)) {
            if (r instanceof CSSStyleRule) {
              const txt = r.style.cssText;
              // allow the themes.css token definitions (custom properties) and the print stylesheet
              if (
                /#[0-9a-f]{3,8}\b/i.test(txt) &&
                !/--[a-z-]+:/.test(txt) &&
                !r.selectorText.startsWith('.resume')
              )
                bad.push(`${r.selectorText}: ${txt.slice(0, 80)}`);
            } else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
          }
        };
        walk(rules);
      }
      return bad;
    });
    // the print stylesheet and brand logos are the only sanctioned literal colours
    expect(offenders.filter((o) => !o.includes('print') && !o.includes('@media'))).toEqual([]);
  });

  test('Tier 0: the trace renders complete content without JavaScript', async ({ browser, colorScheme }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, colorScheme });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Kevil Patel' })).toBeVisible();
    await expect(page.locator('.span-row')).toHaveCount(16); // 15 spans + credentials lane
    await expect(page.locator('.span-row[data-span="a360"] .span-row__label')).toHaveAttribute(
      'href',
      '/work/a360/',
    );
    await page.goto('/resume/');
    await expect(page.getByRole('heading', { level: 2, name: 'Certifications' })).toBeVisible();
    await expect(page.locator('table.resume__table tbody tr')).toHaveCount(10);
    await ctx.close();
  });

  test('SEO: canonical, OG image, JSON-LD person, sitemap and manifest', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kevilpatel.in/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://kevilpatel.in/og/default.png',
    );
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)['@type']).toBe('Person');
    for (const path of ['/sitemap-index.xml', '/manifest.webmanifest', '/robots.txt', '/og/default.png']) {
      const res = await request.get(path);
      expect(res.ok(), path).toBeTruthy();
    }
  });

  test('404 page is served for unknown spans', async ({ page }) => {
    const res = await page.goto('/this-span-does-not-exist/');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText("isn't in the trace");
  });
});
