import { defineConfig, devices } from '@playwright/test';

const PORT = 4441;
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * Matrix (prompt §7/§9): desktop, Pixel 7, iPhone 14 (WebKit), 360 px small phone, landscape × light/dark × reduced motion,
 * plus axe projects per theme. Previews `dist/` with `astro preview` on 127.0.0.1 (a secure context).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Astro 7's `astro preview` daemonises; use the Pages-like foreground server so Playwright owns its lifetime.
    command: `node scripts/serve-dist.mjs --port ${PORT} --host 127.0.0.1`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'desktop-light',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
      testIgnore: /a11y/,
    },
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }, testIgnore: /a11y/ },
    { name: 'pixel7-light', use: { ...devices['Pixel 7'], colorScheme: 'light' }, testIgnore: /a11y/ },
    { name: 'pixel7-dark', use: { ...devices['Pixel 7'], colorScheme: 'dark' }, testIgnore: /a11y/ },
    { name: 'iphone14-webkit', use: { ...devices['iPhone 14'], colorScheme: 'dark' }, testIgnore: /a11y/ },
    {
      name: 'small-360',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 }, colorScheme: 'dark' },
      testIgnore: /a11y/,
    },
    { name: 'landscape', use: { ...devices['Pixel 7 landscape'], colorScheme: 'dark' }, testIgnore: /a11y/ },
    {
      name: 'reduced-motion',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark', reducedMotion: 'reduce' },
      testIgnore: /a11y/,
    },
    { name: 'a11y-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' }, testMatch: /a11y/ },
    { name: 'a11y-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' }, testMatch: /a11y/ },
  ],
});
