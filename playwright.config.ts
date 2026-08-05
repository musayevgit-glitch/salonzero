import { defineConfig, devices } from '@playwright/test';

/**
 * Root-level E2E config (Playwright checks pages across apps/web + apps/dashboard).
 * Not wired into `pnpm test` yet — no product pages exist before Phase 5/10. Run manually with
 * `pnpm exec playwright install` once, then `pnpm exec playwright test`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'pnpm --filter @salonomia/web start',
    port: 3000,
    reuseExistingServer: true,
  },
});
