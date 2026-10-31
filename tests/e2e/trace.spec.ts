import { expect, test } from './fixtures';

test.describe('trace interactions', () => {
  test('hovering or focusing a skill chip highlights every span that carries it', async ({ page }) => {
    await page.goto('/');
    const chip = page.locator('.span-row[data-span="a360"] .attr[data-attr="observability"]');
    await chip.focus();
    await expect(page.locator('.trace')).toHaveClass(/has-highlight/);
    await expect(page.locator('.span-row[data-span="kyndryl-associate-sde"]')).toHaveClass(/is-related/);
    await expect(page.locator('.span-row[data-span="opticrop"]')).not.toHaveClass(/is-related/);
  });

  test('selecting a span shows its evidence (panel on wide screens, sheet on narrow)', async ({ page }) => {
    await page.goto('/');
    await page.locator('.span-row[data-span="a360"] .span-row__label').click();
    await expect(page.locator('.span-row[data-span="a360"]')).toHaveClass(/is-selected/);
    const wide = (page.viewportSize()?.width ?? 0) >= 1376;
    if (wide) {
      await expect(page.locator('[data-span-details] [data-detail="a360"]')).toBeVisible();
      await expect(page.locator('[data-span-details] [data-detail="a360"]')).toContainText('Outcomes');
    } else {
      const sheet = page.locator('dialog[data-span-sheet]');
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText('A360');
      await sheet.getByRole('button', { name: 'Close details' }).click();
      await expect(sheet).toBeHidden();
    }
  });

  test('persona switch re-orders rows and persists; facts do not change', async ({ page }) => {
    await page.goto('/');
    const titlesBefore = await page.locator('.span-row .span-row__title').allTextContents();
    const wide = (page.viewportSize()?.width ?? 0) >= 1024;
    if (wide) await page.getByRole('radio', { name: /Recruiter/ }).click();
    else await page.evaluate(() => localStorage.setItem('trace:persona', 'recruiter'));
    if (!wide) await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-persona', 'recruiter');
    const titlesAfter = await page.locator('.span-row .span-row__title').allTextContents();
    expect([...titlesAfter].sort()).toEqual([...titlesBefore].sort());
    expect(titlesAfter).not.toEqual(titlesBefore); // order changed
    expect(await page.evaluate(() => localStorage.getItem('trace:persona'))).toBe('recruiter');
  });

  test('project pages are shareable and carry evidence, decisions and sources', async ({ page }) => {
    await page.goto('/work/a360/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A360');
    await expect(page.locator('#decision-a360-sync-overlap')).toBeVisible();
    await expect(page.locator('.evidence a').first()).toHaveAttribute('rel', /noopener/);
    await page.goto('/work/policy-to-pipelines/#decision-p2p-risk-guardrails');
    await expect(page.locator('#decision-p2p-risk-guardrails')).toBeInViewport();
  });

  test('project filters are URL-addressable so the AI can drive them', async ({ page }) => {
    await page.goto('/work/?skills=observability');
    await expect(page.locator('[data-project="a360"]')).toBeVisible();
    await expect(page.locator('[data-project="opticrop"]')).toBeHidden();
    await page.getByRole('button', { name: 'clear ×' }).click();
    await expect(page.locator('[data-project="opticrop"]')).toBeVisible();
  });
});
