/** @internal — live stage helper for scripts/eval-consistency.mjs (hds#344). Launches a browser; not imported by `pnpm test`. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

// Same freeze as scripts/check-docs-axe.mjs: with reduced motion, this makes
// a capture or a scan independent of where an animation happens to be.
export const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

/** Serve `dir` on a free localhost port. */
export function serve(dir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir + path.sep) && file !== dir) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      });
      res.end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }),
    );
  });
}

/** Playwright's pinned revision may differ from the preinstalled Chromium, so fall back to that. */
export async function launch() {
  try {
    return await chromium.launch();
  } catch (err) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    const dirs = fs.existsSync(base)
      ? fs
          .readdirSync(base)
          .filter((d) => /^chromium-\d+$/.test(d))
          .sort()
          .reverse()
      : [];
    for (const d of dirs) {
      const exe = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return chromium.launch({ executablePath: exe });
    }
    throw new Error(
      `no Chromium found (${String(err.message).split('\n')[0]}). ` +
        'Set PLAYWRIGHT_BROWSERS_PATH to a directory holding chromium-<rev>/ (/opt/pw-browsers in remote sessions).',
    );
  }
}

/**
 * Apply a demo tenant to the template's scope element, the way a consumer sets
 * `<html data-brand="slug">`: tenants.css scopes its overrides to
 * `[data-brand="slug"]`, and its dark overrides to `[data-brand][data-theme="dark"]`
 * on the SAME element, so the attribute goes on the element that carries
 * `data-theme`, not on a wrapper inside it. Refuses a tenant the packed
 * stylesheet has no rules for: that page would silently render at the default.
 */
export async function applyTenant(page, tenant) {
  const applied = await page.evaluate((slug) => {
    const hasRule = (rules) => {
      for (const rule of rules) {
        if (rule.selectorText?.includes(`[data-brand="${slug}"]`)) return true;
        if (rule.cssRules && hasRule(rule.cssRules)) return true;
      }
      return false;
    };
    const found = [...document.styleSheets].some((sheet) => {
      try {
        return hasRule(sheet.cssRules);
      } catch {
        return false; // a cross-origin sheet cannot be read
      }
    });
    if (!found) return false;
    document.querySelector('#root > [data-theme]')?.setAttribute('data-brand', slug);
    return true;
  }, tenant);
  if (!applied) {
    throw new Error(
      `tenant ${tenant}: the packed stylesheet has no [data-brand="${tenant}"] rules, so the page would ` +
        'render at the HDS default. Run pnpm tokens and rebuild the package, or check the slug.',
    );
  }
}

/**
 * A page open on `<base>/?theme=<theme>` at `viewport`, motion frozen and fonts
 * loaded, with the app mounted under the template's `[data-theme]` scope and,
 * when `tenant` is given, that demo tenant applied to it.
 * The caller closes the returned context.
 */
export async function openApp(browser, base, viewport, theme, tenant = null) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: theme,
  });
  try {
    const page = await context.newPage();
    await page.goto(`${base}/index.html?theme=${theme}`, { waitUntil: 'load', timeout: 45000 });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.waitForSelector('#root > [data-theme]', { timeout: 15000 });
    const applied = await page.evaluate(
      () => document.querySelector('#root > [data-theme]')?.getAttribute('data-theme') ?? null,
    );
    if (applied !== theme)
      throw new Error(`theme not applied: wanted ${theme}, page has ${applied}`);
    if (tenant) await applyTenant(page, tenant);
    await page.evaluate(async () => {
      await document.fonts?.ready;
      const imgs = [...document.querySelectorAll('img')];
      await Promise.all(
        imgs.filter((i) => !i.complete).map((i) => new Promise((r) => (i.onload = i.onerror = r))),
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    return { context, page };
  } catch (err) {
    await context.close();
    throw err;
  }
}
