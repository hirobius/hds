#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-docs-axe.mjs
 *
 * Scans the live demo of every /docs/components/* and /docs/patterns/* page of
 * the built docs site (docs-site/out) in light and dark with axe-core
 * (wcag2a, wcag2aa, wcag21aa, wcag22aa), scoped to the demo frame
 * (.hds-demo-frame) so Fumadocs chrome does not count. Fails on
 * serious/critical violations not in scripts/docs-axe-allowlist.json (entries
 * are { storyId: "<route>", ruleId, reason, addedOn }); an allowlist entry that
 * matches nothing also fails. A page with no demo frame is reported as rule
 * "no-demo" and fails unless allowlisted under that rule id.
 *
 * Run `pnpm docs:publish` first. Chromium comes from PLAYWRIGHT_BROWSERS_PATH
 * (/opt/pw-browsers in remote sessions). Writes reports/axe/docs-latest.json.
 *
 * Usage: node scripts/check-docs-axe.mjs [--dir <path>] [--filter <regex>] [--allowlist <path>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { AXE_TAGS, evaluateScan, loadAxeSource, validateAllowlist } from './lib/axe-gate.mjs';
import { DEMO_SELECTOR, discoverPages, serveStatic } from './lib/docs-axe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AXE_SOURCE = loadAxeSource(ROOT);
const THEMES = ['light', 'dark'];
const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function launch() {
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
    throw err;
  }
}

async function scanOne(browser, base, route, theme) {
  const rec = { storyId: route, theme, violations: [], error: null };
  // One context per scan: next-themes syncs the theme across same-origin tabs
  // through localStorage, so pages sharing a context would flip each other.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    // next-themes reads this key on load, so the theme survives hydration.
    await page.addInitScript((t) => {
      try {
        localStorage.setItem('theme', t);
      } catch {
        /* storage blocked: the attribute set below still applies */
      }
    }, theme);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 45000 });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate((t) => {
      const el = document.documentElement;
      el.setAttribute('data-theme', t);
      el.classList.toggle('dark', t === 'dark');
      el.classList.toggle('light', t === 'light');
      el.style.colorScheme = t;
    }, theme);
    const hasDemo = await page
      .waitForSelector(DEMO_SELECTOR, { timeout: 8000, state: 'attached' })
      .then(() => true)
      .catch(() => false);
    if (!hasDemo) {
      rec.violations = [{ id: 'no-demo', impact: 'serious', nodes: 0 }];
      return rec;
    }
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    // Proof the theme took effect: the frame's resolved background, kept in the report.
    rec.frameBg = await page.evaluate(
      (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor,
      DEMO_SELECTOR,
    );
    await page.evaluate(AXE_SOURCE);
    const r = await page.evaluate(
      ([sel, tags]) =>
        window.axe.run(sel, {
          runOnly: { type: 'tag', values: tags },
          resultTypes: ['violations'],
        }),
      [DEMO_SELECTOR, AXE_TAGS],
    );
    rec.violations = r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      sample: v.nodes.slice(0, 2).map((n) => n.html.slice(0, 160)),
    }));
  } catch (e) {
    rec.error = String(e.message || e)
      .split('\n')[0]
      .slice(0, 200);
  } finally {
    await context.close().catch(() => {});
  }
  return rec;
}

async function main() {
  const dir = path.resolve(ROOT, arg('dir', 'docs-site/out'));
  const filter = arg('filter');
  const allowPath = path.resolve(ROOT, arg('allowlist', 'scripts/docs-axe-allowlist.json'));
  let routes = fs.existsSync(dir) ? discoverPages(dir) : [];
  if (!routes.length) {
    console.error(
      `No /docs/components or /docs/patterns pages in ${path.relative(ROOT, dir)}. Run \`pnpm docs:publish\` first.`,
    );
    process.exit(2);
  }
  if (filter) routes = routes.filter((r) => new RegExp(filter, 'i').test(r));

  const allowlist = JSON.parse(fs.readFileSync(allowPath, 'utf8'));
  const problems = validateAllowlist(allowlist);
  if (problems.length) {
    console.error(`${path.relative(ROOT, allowPath)} is invalid:\n  ${problems.join('\n  ')}`);
    process.exit(2);
  }

  const started = Date.now();
  const { server, port } = await serveStatic(dir);
  const base = `http://127.0.0.1:${port}`;
  const browser = await launch();

  const jobs = routes.flatMap((route) => THEMES.map((theme) => ({ route, theme })));
  const scans = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < jobs.length) {
        const { route, theme } = jobs[next++];
        let rec = await scanOne(browser, base, route, theme);
        if (rec.error) {
          rec = await scanOne(browser, base, route, theme);
          rec.retried = true;
        }
        scans.push(rec);
      }
    }),
  );
  await browser.close();
  server.close();

  const result = evaluateScan(scans, allowlist);
  if (filter) {
    result.stale = [];
    result.ok = result.blocking.length === 0 && result.errored.length === 0;
  }
  const seconds = Math.round((Date.now() - started) / 100) / 10;

  for (const item of [...result.blocking, ...result.allowed]) {
    const sample = scans
      .find((s) => s.storyId === item.storyId && s.theme === item.theme)
      ?.violations.find((v) => v.id === item.ruleId)?.sample;
    console.log(
      `${item.storyId} [${item.theme}] ${item.ruleId} (${item.impact}, ${item.nodes} nodes)${result.allowed.includes(item) ? ' [allowlisted]' : ''}${sample?.length ? `\n    ${sample.join('\n    ')}` : ''}`,
    );
  }

  fs.mkdirSync(path.join(ROOT, 'reports/axe'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'reports/axe/docs-latest.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seconds,
        tags: AXE_TAGS,
        pages: routes.length,
        ...result,
        scans,
      },
      null,
      1,
    ),
  );
  console.log(
    `\nscanned ${result.scanned} (${routes.length} pages x ${THEMES.length} themes) in ${seconds}s: ` +
      `${result.blocking.length} blocking, ${result.allowed.length} allowlisted, ${result.errored.length} errored, ${result.stale.length} stale allowlist entries`,
  );
  for (const e of result.errored) console.error(`ERROR ${e.storyId} [${e.theme}]: ${e.error}`);
  for (const e of result.stale)
    console.error(
      `STALE allowlist entry matches nothing: ${e.storyId} / ${e.ruleId} — remove it from ${path.relative(ROOT, allowPath)}`,
    );
  for (const b of result.blocking)
    console.error(`FAIL ${b.storyId} [${b.theme}] ${b.ruleId} (${b.impact}, ${b.nodes} nodes)`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
