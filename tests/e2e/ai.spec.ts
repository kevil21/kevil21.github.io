import { expect, test } from './fixtures';

test.describe('intelligence tiers', () => {
  test('command palette opens with the keyboard and answers from the Pocket Brain', async ({ page }) => {
    await page.goto('/');
    await page.locator('dialog.palette[data-ready]').waitFor({ state: 'attached' });
    await page.keyboard.press('ControlOrMeta+KeyK');
    const dialog = page.locator('dialog.palette');
    await expect(dialog).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search or ask' }).fill('Is Kevil certified on Azure?');
    const answer = dialog.locator('.palette__item--answer');
    await expect(answer).toBeVisible({ timeout: 20_000 });
    await expect(answer).toContainText('AZ-104');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('ask page: grounded pocket answer with clickable evidence and a visible tool call', async ({
    page,
  }) => {
    await page.goto('/ask/');
    await page
      .getByRole('textbox', { name: 'Your question' })
      .fill("Show me Kevil's strongest cloud and AI projects");
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    const turn = page.locator('.turn').last();
    await expect(turn.locator('.turn__text')).toContainText('A360', { timeout: 20_000 });
    await expect(turn.locator('.turn__evidence li').first()).toBeVisible();
    const tool = turn.getByRole('button', { name: /filterProjects/ });
    await expect(tool).toBeVisible();
    await tool.click();
    await page.waitForURL(/\/work\/\?kinds=flagship/);
    await expect(page.locator('[data-project="a360"]')).toBeVisible();
    await expect(page.locator('[data-project="opticrop"]')).toBeHidden();
  });

  test('ask page says when something is not demonstrated', async ({ page }) => {
    await page.goto('/ask/?q=' + encodeURIComponent('Does Kevil have experience with COBOL mainframes?'));
    const turn = page.locator('.turn').last();
    await expect(turn).not.toHaveClass(/is-streaming/, { timeout: 20_000 });
    const text = (await turn.locator('.turn__text').textContent()) ?? '';
    expect(/does not demonstrate|Closest evidence/.test(text)).toBeTruthy();
    expect(text).not.toMatch(/COBOL expert|years of COBOL/i);
  });

  test('JD matcher sorts requirements into three honest buckets on device', async ({ page }) => {
    await page.goto('/match/');
    await page.getByRole('button', { name: 'Use a sample JD' }).click();
    await page.getByRole('button', { name: 'Match against the portfolio' }).click();
    const result = page.getByRole('region', { name: 'Match result' });
    await expect(result).toBeVisible({ timeout: 30_000 });
    await expect(result).toContainText('Strong evidence');
    await expect(result).toContainText('Not demonstrated');
    await expect(result).not.toContainText(/\d+%\s*match/);
    const none = result.locator('.jd__col').nth(2);
    await expect(none).toContainText(/Rust/); // nothing in the portfolio evidences Rust
    await expect(result.locator('.jd__col').nth(0)).toContainText(/OpenTelemetry|Elasticsearch/);
    // Kubernetes: AKS appears in the A360 stack, so "related" is honest; "strong" would not be
    await expect(result.locator('.jd__col').nth(0)).not.toContainText(/Helm/);
  });

  test('fallback chain: when the worker fails, search still works in-thread', async ({ page }) => {
    await page.route('**/pocket.worker*', (route) => route.abort());
    await page.goto('/');
    await page.locator('dialog.palette[data-ready]').waitFor({ state: 'attached' });
    await page.keyboard.press('ControlOrMeta+KeyK');
    await page.getByRole('searchbox', { name: 'Search or ask' }).fill('Elasticsearch');
    await expect(page.locator('dialog.palette .palette__item--result').first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('.palette__mode')).toHaveText(/lexical/);
  });

  test('full brain is never offered on touch-only devices and never auto-downloads', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/ask/');
    const offer = page.getByRole('heading', { name: 'Run a language model on this device?' });
    if (isMobile) await expect(offer).toBeHidden();
    // No model bytes may be requested without an explicit click, on any device.
    const requests: string[] = [];
    page.on('request', (r) => {
      if (/huggingface\.co\/mlc-ai|mlc\.ai|\.wasm$|resolve\/main\/params/.test(r.url()))
        requests.push(r.url());
    });
    await page.waitForTimeout(1500);
    expect(requests.filter((u) => /mlc-ai|mlc\.ai/.test(u))).toEqual([]);
  });

  test('observatory shows live state without JS fingerprinting', async ({ page }) => {
    await page.goto('/observatory/');
    await expect(page.getByText('active tier')).toBeVisible();
    await expect(page.locator('.tile', { hasText: 'service worker' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear downloaded models' })).toBeVisible();
    await expect(page.locator('.tile', { hasText: 'index version' })).toContainText(/[0-9a-f]{12}/);
  });
});
