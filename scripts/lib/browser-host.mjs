/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * browser-host — find a Chromium for the scripts and tests that drive one.
 *
 * The path is an image detail (/opt/pw-browsers/chromium-<build>) that moves
 * when the container image does, so it is resolved here and nowhere else
 * (hds#455).
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const playwrightOwn = () => {
  try {
    return chromium.executablePath();
  } catch {
    return undefined;
  }
};

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

/** The newest chromium-<rev>/chrome-linux{,64}/chrome under the browsers dir. */
function newestInstalled(base) {
  let dirs;
  try {
    dirs = readdirSync(base);
  } catch {
    return undefined;
  }
  const revs = dirs
    .map((d) => /^chromium-(\d+)$/.exec(d))
    .filter(Boolean)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  for (const [dir] of revs) {
    for (const sub of ['chrome-linux64', 'chrome-linux']) {
      const exe = join(base, dir, sub, 'chrome');
      if (existsSync(exe)) return exe;
    }
  }
  // Newer images ship <root>/chromium as a symlink to the build's binary. File
  // only: older images leave an empty directory of that name.
  const link = join(base, 'chromium');
  return isFile(link) ? link : undefined;
}

/**
 * Where Chromium is, or undefined. In order: PLAYWRIGHT_CHROMIUM_PATH (a pin
 * that is not a file is not overridden: it returns undefined, so a typo is
 * not silently papered over); Playwright's own build; the newest
 * chromium-<rev> under PLAYWRIGHT_BROWSERS_PATH, default /opt/pw-browsers,
 * for an image whose browser build disagrees with Playwright's.
 */
export function chromiumPath({ env = process.env, playwrightPath = playwrightOwn } = {}) {
  const pinned = env.PLAYWRIGHT_CHROMIUM_PATH;
  if (pinned) return isFile(pinned) ? pinned : undefined;
  const own = playwrightPath();
  if (own && existsSync(own)) return own;
  return newestInstalled(env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers');
}

/**
 * chromiumPath for a test file: undefined means skip the browser half, unless
 * HDS_REQUIRE_BROWSER=1 (set only by ci.yml), where a missing browser throws
 * so a "pixel lock" can never pass by not running.
 */
export function chromiumForTests(opts = {}) {
  const env = opts.env ?? process.env;
  const path = chromiumPath(opts);
  if (path || env.HDS_REQUIRE_BROWSER !== '1') return path;
  throw new Error(
    'HDS_REQUIRE_BROWSER=1 but no Chromium was found ' +
      `(PLAYWRIGHT_CHROMIUM_PATH=${env.PLAYWRIGHT_CHROMIUM_PATH ?? 'unset'}, ` +
      `PLAYWRIGHT_BROWSERS_PATH=${env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'}). ` +
      'In .github/workflows/ci.yml the "Install Chromium" step must run before ' +
      'the "Gate chain + unit/contract tests" step (pnpm test).',
  );
}

/** Launch Chromium; Playwright's default when nothing was found. */
export async function launchChromium() {
  const executablePath = chromiumPath();
  return chromium.launch(executablePath ? { executablePath } : {});
}
