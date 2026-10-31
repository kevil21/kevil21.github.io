import { defineConfig } from '@playwright/test';

const port = Number(process.env.ATLAS_TEST_PORT ?? 4341);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/smoke',
  outputDir: 'test-results/smoke',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 60000,
  use: { baseURL, serviceWorkers: 'block', trace: 'retain-on-failure' },
  webServer: {
    command: `${process.env.ATLAS_TEST_SKIP_BUILD === '1' ? '' : 'npm run build && '}npm exec astro preview -- --ignore-lock --host 127.0.0.1 --port ${port}`,
    url: baseURL, reuseExistingServer: false, timeout: 120000,
  },
  // Desktop browser engines, not a claim of physical iOS/Android coverage.
  projects: ['chromium', 'firefox', 'webkit'].map((browserName) => ({
    name: browserName, use: { browserName: browserName as 'chromium' | 'firefox' | 'webkit' },
  })),
});