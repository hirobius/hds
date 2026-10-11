import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

/**
 * Visual-regression lane for the docs site: tests/visual/docs-demos.spec.ts
 * snapshots every component and pattern demo for Chromatic's Playwright
 * integration. Needs `pnpm docs:publish` first; serves docs-site/out.
 * Chromium comes from PLAYWRIGHT_BROWSERS_PATH when its revision differs from
 * the one Playwright pins (remote sessions: /opt/pw-browsers).
 */
const PORT = 4173;
const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const preinstalled = fs.existsSync(browsers)
  ? fs
      .readdirSync(browsers)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort()
      .reverse()
      .map((d) => `${browsers}/${d}/chrome-linux/chrome`)
      .find((p) => fs.existsSync(p))
  : undefined;

export default defineConfig({
  testDir: 'tests/visual',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 900 },
    launchOptions: process.env.CI && !preinstalled ? {} : { executablePath: preinstalled },
  },
  webServer: {
    command: `node scripts/serve-docs-out.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/docs/components/button`,
    reuseExistingServer: !process.env.CI,
  },
});
