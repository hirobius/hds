import { defineConfig } from '@playwright/test';
// @ts-expect-error -- plain ESM helper; no type declarations.
import { chromiumPath } from './scripts/lib/browser-host.mjs';

/**
 * Visual-regression lane for the docs site: tests/visual/docs-baselines.spec.ts
 * compares every component and pattern demo with committed PNGs (local), and
 * tests/visual/docs-demos.spec.ts feeds Chromatic's Playwright integration.
 * Needs `pnpm docs:publish` first; serves docs-site/out.
 * Chromium comes from scripts/lib/browser-host.mjs (the newest build under
 * PLAYWRIGHT_BROWSERS_PATH, remote sessions: /opt/pw-browsers) when present.
 */
const PORT = 4173;
const preinstalled: string | undefined = chromiumPath();

export default defineConfig({
  testDir: 'tests/visual',
  testMatch: '**/*.spec.ts',
  // One Linux Chromium baseline set (remote container and CI render alike); no per-OS suffix.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
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
