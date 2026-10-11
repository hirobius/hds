/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * browser-host — find a Chromium for the scripts and tests that drive one.
 *
 * The path in particular is an image detail (/opt/pw-browsers/chromium-<build>)
 * that moves when the container image does, so it lives in one place.
 */
import { existsSync } from 'node:fs';

/**
 * Where a Chromium might be, most specific first. The env var wins so a
 * machine whose Playwright build disagrees with the installed browser can say
 * so; `undefined` at the end means "let Playwright use its own download".
 */
export function chromiumPath() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

/** Launch options for Playwright, empty when no pinned browser was found. */
export async function launchChromium() {
  const { chromium } = await import('playwright');
  const executablePath = chromiumPath();
  return chromium.launch(executablePath ? { executablePath } : {});
}
