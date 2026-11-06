import { defineConfig, devices } from '@playwright/test';

/**
 * Сквозные проверки главной страницы. Нужны запущенные API (с seed-данными) и web:
 *   WEB_URL=http://localhost:3001 pnpm --filter @oku_24/web test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
