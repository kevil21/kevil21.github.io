import { expect, test } from '@playwright/test';

/**
 * Tier 0: the content is complete and interview-quality with JavaScript DISABLED. Case studies carry problem,
 * approach, architecture diagram, outcomes with sources and a decision log; machine pages carry plaque, schematic,
 * controls as a real form; the résumé carries every section and labels its numbers.
 */
test.use({ javaScriptEnabled: false });

test('case study reads completely without JavaScript', async ({ page }) => {
  await page.goto('/work/a360/');
  await expect(page.locator('h1')).toContainText('A360');
  for (const heading of ['Problem', 'Approach', 'Architecture', 'Outcomes', 'Stack', 'Decision log']) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.locator('figure.diagram svg[role="img"]')).toBeVisible();
  // every claim links to a source
  const claims = page.locator('.claim');
  expect(await claims.count()).toBeGreaterThan(8);
  const sources = page.locator('.claim__source a[href^="https://github.com/kevil21/kevilpatel/blob/main/"]');
  expect(await sources.count()).toBeGreaterThan(8);
  await expect(page.locator('.claim__label', { hasText: 'as stated in résumé' }).first()).toBeVisible();
  await expect(page.locator('.decision').first()).toBeVisible();
});

test('machine page is a complete HTML twin without JavaScript', async ({ page }) => {
  await page.goto('/machines/policy-sorter/');
  await expect(page.locator('h1')).toHaveText('Policy Sorter');
  await expect(page.locator('.plaque .claim').first()).toBeVisible();
  await expect(page.locator('figure.diagram svg')).toBeVisible();
  const form = page.locator('form.controls');
  await expect(form).toBeVisible();
  await expect(form.locator('select[name="policy"]')).toBeVisible();
  await expect(form.locator('button[name="approve"]')).toBeAttached();
  await expect(page.locator('.sample-tag').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Decisions as switches' })).toBeVisible();
});

test('résumé carries every section and labels its numbers', async ({ page }) => {
  await page.goto('/resume/');
  for (const h of [
    'Summary',
    'Experience',
    'Projects',
    'Skills',
    'Certifications',
    'Education',
    'Languages',
  ]) {
    await expect(page.getByRole('heading', { name: h, exact: true })).toBeVisible();
  }
  await expect(page.locator('.cert')).toHaveCount(10);
  await expect(page.locator('.claim__label', { hasText: 'as stated in résumé' }).first()).toBeVisible();
  await expect(page.getByText('[source: info.md]').first()).toBeVisible();
  // no phone number anywhere
  const html = await page.content();
  expect(html).not.toMatch(/9998967939|999 896 7939/);
});

test('certifications page lists ten with verify links and no active badges', async ({ page }) => {
  await page.goto('/certifications/');
  await expect(page.locator('.instrument')).toHaveCount(10);
  expect(await page.locator('.instrument a[rel~="external"]').count()).toBeGreaterThanOrEqual(10);
  const html = await page.content();
  expect(html.toLowerCase()).not.toContain('10 active');
});

test('every machine and project page resolves', async ({ page }) => {
  const machines = [
    'telemetry-refinery',
    'policy-sorter',
    'forecast-engine',
    'data-workbench',
    'calibration-bench',
    'foundations-generator',
  ];
  const projects = [
    'a360',
    'p2p',
    'climate-mitigation',
    'smart-energy',
    'opticrop',
    'overlay-insights',
    'incident-tickets',
    'it-assets',
    'python-essentials',
  ];
  for (const m of machines) expect((await page.goto(`/machines/${m}/`))?.status(), m).toBe(200);
  for (const p of projects) expect((await page.goto(`/work/${p}/`))?.status(), p).toBe(200);
  expect((await page.goto('/work/'))?.status()).toBe(200);
});
