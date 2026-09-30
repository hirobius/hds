/** @internal — live stage for scripts/eval-consistency.mjs (hds#344). Launches a browser; not imported by `pnpm test`. */
import path from 'node:path';
import { VIEWPORTS } from './live-plan.mjs';
import { openApp, serve } from './browser.mjs';

/**
 * Full-page PNG of a built app at every viewport in the matrix.
 * @param {import('playwright').Browser} browser
 * @param {string} appDir a prepared app directory with dist/
 * @returns {Promise<Record<string, Buffer>>} viewport key -> PNG
 */
export async function renderApp(browser, appDir) {
  const site = await serve(path.join(appDir, 'dist'));
  try {
    const out = {};
    for (const v of VIEWPORTS) {
      const { context, page } = await openApp(browser, site.base, v, v.theme);
      try {
        out[v.key] = await page.screenshot({ fullPage: true, animations: 'disabled' });
      } finally {
        await context.close();
      }
    }
    return out;
  } finally {
    site.close();
  }
}
