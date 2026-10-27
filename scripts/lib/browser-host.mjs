/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * browser-host — find a Chromium for the scripts and tests that drive one.
 *
 * The path in particular is an image detail (/opt/pw-browsers/chromium-<build>)
 * that moves when the container image does, so it lives in one place.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Where a Chromium might be, most specific first. The env var wins so a
 * machine whose Playwright build disagrees with the installed browser can say
 * so; then the newest chromium-<build> under PLAYWRIGHT_BROWSERS_PATH (builds
 * ship chrome-linux64/ or, older, chrome-linux/); `undefined` at the end means
 * "let Playwright use its own download".
 */
const build = (dir) => Number(dir.replace('chromium-', ''));

export function chromiumPath() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const builds = existsSync(root)
    ? readdirSync(root)
        .filter((d) => /^chromium-\d+$/.test(d))
        .sort((a, b) => build(b) - build(a))
        .flatMap((d) => [
          join(root, d, 'chrome-linux64', 'chrome'),
          join(root, d, 'chrome-linux', 'chrome'),
        ])
    : [];
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    ...builds,
    // Newer images ship <root>/chromium as a symlink to the build's binary.
    join(root, 'chromium'),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p) && !statSync(p).isDirectory());
}

/** Launch options for Playwright, empty when no pinned browser was found. */
export async function launchChromium() {
  const { chromium } = await import('playwright');
  const executablePath = chromiumPath();
  return chromium.launch(executablePath ? { executablePath } : {});
}
