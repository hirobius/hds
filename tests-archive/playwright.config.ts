import { defineConfig, devices } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Resolve a launchable Chromium binary.
//
// Remote sandboxes / CI images sometimes ship the full Chromium build
// (chromium-<rev>) but omit the matching chrome-headless-shell that Playwright
// launches by default in headless mode — making every spec fail at browser
// launch ("Executable doesn't exist at .../chromium_headless_shell-<rev>/...").
// When PLAYWRIGHT_BROWSERS_PATH points at such an image, fall back to the full
// Chromium binary that IS present. Local dev (no PLAYWRIGHT_BROWSERS_PATH) is
// unaffected: returns undefined and Playwright uses its own managed browser.
function resolveChromiumExecutable(): string | undefined {
  const override = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (override && existsSync(override)) return override;

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;

  const builds = readdirSync(base)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.slice('chromium-'.length)) - Number(a.slice('chromium-'.length)));

  for (const dir of builds) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const candidate = join(base, dir, rel);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

const chromiumExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: './tests',
  // Playwright owns the e2e/visual/a11y specs (*.spec.ts). The vitest + RTL
  // contract tests under tests/primitive-contracts/ are *.contract.test.tsx and
  // must NOT be collected here — without this, Playwright's default testMatch
  // grabs them and fails on the `import ... from 'vitest'` / RTL render(). They
  // run under `pnpm test` (vitest) instead.
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  // 10o-11: retries: 0 → 2. Long-running visual.spec (~7 min, 77 tests) hits
  // intermittent vite dev-server crashes and HMR-triggered page reloads.
  // Two retries lets the test re-attempt against the recovered server. Stable
  // tests are unaffected (only failed tests retry).
  retries: 2,
  reporter: 'list',
  // Block default baseline rewriting; baselines only update via explicit --update-snapshots.
  // (Prevents the silent baseline drift flagged in backlog-2 and multiple agent reports.)
  updateSnapshots: 'none',
  use: {
    baseURL: 'http://localhost:5200',
    trace: 'on-first-retry',
  },
  // 10o-11: switched from `vite dev` to `vite build && vite preview`. The dev
  // server proved unstable across long test runs (~7-min visual.spec) — vite's
  // HMR pipeline crashed under file-watch pressure, producing intermittent
  // ERR_CONNECTION_REFUSED + blank actuals on late-Block-B tests. preview
  // serves the static bundle, no HMR, no file watching, no crash class.
  // reuseExistingServer: true — if already serving on 5200, reuse.
  webServer: {
    command: 'pnpm build && npx vite preview --host 127.0.0.1 --port 5200',
    url: 'http://localhost:5200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
      },
    },
  ],
});
