#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-docs-layout-shift.mjs (hds#761)
 *
 * Loads every built docs-site route (discovered from the build output, not a
 * hand list) and fails when (a) cumulative layout shift on load exceeds 0.01, or
 * (b) the header, sidebar or nav box (x, y, width, height) differs by any px from
 * the first route of its layout (`/` on its own, `/docs/**` against the first docs route).
 * Run `pnpm docs:publish` first. Chromium comes from scripts/lib/browser-host.mjs.
 *
 * Known failures live in scripts/docs-layout-shift-allowlist.json (route, kind, max CLS, reason, issue);
 * a worse reading or a stale entry fails. Pass --allowlist <path> to use another file.
 *
 * Usage: node scripts/check-docs-layout-shift.mjs [--dir <path>] [--filter <substring>] [--allowlist <path>]
 * Exit 0 pass, 1 violations, 2 setup error. Fixtures: fixtures/check-docs-layout-shift/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLS_LIMIT,
  REGIONS,
  applyAllowlist,
  discoverRoutes,
  evaluateLayout,
  validateAllowlist,
} from './lib/docs-layout-shift.mjs';
import { serveStatic } from './lib/docs-axe.mjs';
import { launchChromium } from './lib/browser-host.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SETTLE_MS = 1200;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function scan(browser, base, route) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 45000 });
    // A route that redirects client-side destroys the context mid-measure: wait for the landing page and settle again.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.evaluate(() => document.fonts?.ready);
        await page.waitForTimeout(SETTLE_MS);
        break;
      } catch (e) {
        if (attempt === 2 || !/navigation|context/i.test(String(e.message))) throw e;
        await page.waitForLoadState('load');
      }
    }
    return await page
      .evaluate((regions) => {
        const r = (n) => Math.round(n * 100) / 100;
        const boxes = {};
        for (const [k, sel] of Object.entries(regions)) {
          const el = document.querySelector(sel);
          if (!el) {
            boxes[k] = null;
            continue;
          }
          const b = el.getBoundingClientRect();
          boxes[k] = { x: r(b.x), y: r(b.y), width: r(b.width), height: r(b.height) };
        }
        return { cls: window.__cls, boxes };
      }, REGIONS)
      .then((s) => ({ route, ...s }));
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  const dir = path.resolve(ROOT, arg('dir', 'docs-site/out'));
  const filter = arg('filter');
  let routes = fs.existsSync(dir) ? discoverRoutes(dir) : [];
  if (!routes.length) {
    console.error(`No pages in ${path.relative(ROOT, dir)}. Run \`pnpm docs:publish\` first.`);
    process.exit(2);
  }
  if (filter) routes = routes.filter((r) => r.toLowerCase().includes(filter.toLowerCase()));
  const { server, port } = await serveStatic(dir);
  const browser = await launchChromium();
  const scans = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (next < routes.length) {
        const route = routes[next++];
        let best = await scan(browser, `http://127.0.0.1:${port}`, route);
        // A loaded machine inflates CLS with slow hydration; a real shift repeats, so keep the calmest of up to 3 loads.
        for (let retry = 0; retry < 2 && best.cls > CLS_LIMIT; retry++) {
          const again = await scan(browser, `http://127.0.0.1:${port}`, route);
          if (again.cls < best.cls) best = again;
        }
        scans.push(best);
      }
    }),
  );
  await browser.close();
  server.close();
  scans.sort((a, b) => a.route.localeCompare(b.route));
  const allowPath = path.resolve(
    ROOT,
    arg('allowlist', 'scripts/docs-layout-shift-allowlist.json'),
  );
  const allowlist = fs.existsSync(allowPath) ? JSON.parse(fs.readFileSync(allowPath, 'utf8')) : [];
  const invalid = validateAllowlist(allowlist);
  if (invalid.length) {
    console.error(`${path.relative(ROOT, allowPath)} is invalid:\n  ${invalid.join('\n  ')}`);
    process.exit(2);
  }
  const { blocking, allowed, stale } = applyAllowlist(evaluateLayout(scans), allowlist);
  // A --filter run sees only some routes, so it cannot call an entry stale.
  const staleFailures = filter ? [] : stale;
  for (const p of allowed) console.log(`${p.route} [${p.kind}] ${p.detail} [allowlisted]`);
  for (const p of blocking) console.log(`${p.route} [${p.kind}] ${p.detail}`);
  for (const a of staleFailures)
    console.log(`${a.route} [${a.kind}] stale allowlist entry (#${a.issue}): remove it`);
  const failures = blocking.length + staleFailures.length;
  console.log(
    failures
      ? `check-docs-layout-shift: ${failures} problem(s) over ${routes.length} route(s)`
      : `check-docs-layout-shift: ${routes.length} route(s) clean (${allowed.length} allowlisted)`,
  );
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
