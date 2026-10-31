import { test as base, expect } from '@playwright/test';

/**
 * Shared fixture: tests must not pull the 23 MB embedder from Hugging Face on every context, so the
 * Pocket Brain stays lexical unless a test opts in. (The semantic path is checked by scripts/check-semantic.mjs.)
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('trace:pocket-semantic', 'no');
      } catch {
        /* ignore */
      }
    });
    await use(page);
  },
});
export { expect };
