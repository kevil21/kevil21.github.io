import { expect, test, type Page } from '@playwright/test';

/** The Operator: plan, NLP strip, grounded answer with citations, tool buttons (click to act), refusal, decline, JD matcher. */

async function ready(page: Page) {
  await page.goto('/operator/');
  await expect(page.locator('.op')).toHaveAttribute('data-operator-ready', 'ready', { timeout: 20_000 });
}

test('answers a question about A360 with numbered citations and proposes actions', async ({ page }) => {
  await ready(page);
  await page.fill('#op-q', 'What is A360?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const answer = page.locator('.op__answer');
  await expect(answer).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.op__step[data-step="explain"]')).toHaveAttribute('data-state', 'done');
  await expect(answer.locator('.op__prose')).toContainText('A360');
  await expect(answer.locator('.op__prose')).toContainText('[1]');
  expect(await answer.locator('.op__cites li').count()).toBeGreaterThanOrEqual(2);
  await expect(
    answer.locator('.op__cites a[href^="https://github.com/kevil21/kevilpatel/blob/main/"]').first(),
  ).toBeAttached();
  await expect(answer.locator('.op__nlp')).toContainText('intent');
  const tool = answer.locator('.op__tool').first();
  await expect(tool).toBeVisible();
  await expect(answer.locator('.op__gauges')).toContainText('groundedness');
});

test('declines personal topics and refuses when there is no evidence', async ({ page }) => {
  await ready(page);
  await page.fill('#op-q', 'What is his salary?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.locator('.op__answer')).toHaveAttribute('data-path', 'declined', { timeout: 15_000 });
  await page.fill('#op-q', 'Does Kevil write COBOL for mainframe banking at night?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.locator('.op__answer')).toHaveAttribute('data-path', /refusal|extractive/, {
    timeout: 15_000,
  });
  const text = await page.locator('.op__prose').textContent();
  expect(text).not.toMatch(/COBOL.*(is|was) (used|built)/i);
  await expect(page.locator('.op__gauges')).toContainText('refusals');
});

test('a tool button acts only when clicked: walkTo navigates to the floor', async ({ page }) => {
  await ready(page);
  await page.fill('#op-q', 'Tell me about Policy → Pipelines');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const walk = page.locator('.op__tool', { hasText: 'Walk to' }).first();
  await expect(walk).toBeVisible({ timeout: 15_000 });
  expect(page.url()).toContain('/operator/');
  await walk.click();
  await page.waitForURL(/\/#bay-2$/, { timeout: 10_000 });
  await expect(page.locator('#bay-2')).toBeVisible();
});

test('JD matcher classifies requirements without percentages', async ({ page }) => {
  await page.goto('/match/');
  await expect(page.locator('.op')).toHaveAttribute('data-operator-ready', 'ready', { timeout: 20_000 });
  await page.fill(
    '#op-jd',
    '- 3+ years of Python and FastAPI\n- Experience with Elasticsearch and Kibana\n- Fluent in Rust and embedded firmware',
  );
  await page.getByRole('button', { name: 'Match', exact: true }).click();
  const rows = page.locator('.op__table tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute('data-verdict', 'strong');
  await expect(rows.nth(2)).toHaveAttribute('data-verdict', 'not-demonstrated');
  const html = await page.locator('.op__table').innerHTML();
  expect(html).not.toMatch(/\d+%/);
});

test('lens toggle persists and reveals source pointers on a case study', async ({ page }) => {
  await page.goto('/work/a360/');
  const toggle = page.locator('.lens-toggle');
  await expect(toggle).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-lens', 'recruiter');
  await expect(page.locator('.case .claim__source').first()).toBeHidden();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-lens', 'engineer');
  await expect(page.locator('.case .claim__source').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-lens', 'engineer');
  expect(await page.evaluate(() => localStorage.getItem('sr:lens'))).toBe('engineer');
});
