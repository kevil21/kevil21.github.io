import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.ATLAS_TEST_PORT ?? 4321);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/chromium',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 4,
  // Route-mocking tests cannot be intercepted by a SW; offline.spec opts into real SWs.
  use: { baseURL, trace: 'retain-on-failure', serviceWorkers: 'block' },
  webServer: {
    command: `${process.env.ATLAS_TEST_SKIP_BUILD === '1' ? '' : 'npm run build && '}npm exec astro preview -- --ignore-lock --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});