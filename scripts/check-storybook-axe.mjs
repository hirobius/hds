#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-storybook-axe.mjs — hds#310
 *
 * Scans every built story (storybook-static/) in light and dark with axe-core
 * (wcag2a, wcag2aa, wcag21aa, wcag22aa) and fails on serious/critical
 * violations that are not in scripts/axe-allowlist.json. An allowlist entry
 * that matches nothing also fails, so the list cannot rot.
 *
 * Run `pnpm build-storybook` first. Serves storybook-static/ from a local
 * static server (no network). Motion is frozen (reduced-motion + CSS).
 * Chromium comes from PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers in remote
 * sessions). Writes reports/axe/latest.json (gitignored).
 *
 * Usage:
 *   node scripts/check-storybook-axe.mjs [--filter <regex>] [--concurrency <n>] [--dir <path>]
 *
 * --filter narrows the scan for local iteration; the stale-allowlist check is
 * skipped when a filter is set (entries outside the filter cannot match).
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { AXE_TAGS, evaluateScan, loadAxeSource, validateAllowlist } from './lib/axe-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Injected once per page and run directly (see loadAxeSource).
const AXE_SOURCE = loadAxeSource(ROOT);
const THEMES = ['light', 'dark'];
const FREEZE_CSS =
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

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

function serve(dir) {
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
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function launch() {
  try {
    return await chromium.launch();
  } catch (err) {
    // Playwright's pinned revision may differ from the preinstalled Chromium.
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

/**
 * One page per worker, pinned to a theme. The preview iframe loads once; each
 * story is then switched through Storybook's channel (setCurrentStory), so the
 * preview bundle is not re-downloaded and re-evaluated per story, which is what
 * dominates the runtime.
 */
async function openWorker(context, base, theme) {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/iframe.html?viewMode=story&globals=theme:${theme}`, {
    waitUntil: 'load',
    timeout: 45000,
  });
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.evaluate(AXE_SOURCE);
  // Keep a private handle: the a11y addon lazily loads its own axe-core build and
  // may overwrite window.axe, so the gate always calls the engine injected above.
  await page.evaluate(() => {
    window.__gateAxe = window.axe;
  });
  await page.waitForFunction(
    () => window.__STORYBOOK_ADDONS_CHANNEL__ && window.__STORYBOOK_PREVIEW__,
    null,
    { timeout: 30000 },
  );
  // The URL globals only seed the first story; pin the theme explicitly so it
  // survives setCurrentStory (verified per scan below).
  await page.evaluate(
    // a11y.manual stops the a11y addon running its own axe after each story, which
    // otherwise collides with ours ("Axe is already running").
    (t) =>
      window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateGlobals', {
        globals: { theme: t, a11y: { manual: true } },
      }),
    theme,
  );
  return { page };
}

/** Resolves to null once the story finished (after play and afterEach), or to a short error string. */
function renderStory(page, storyId) {
  return page.evaluate(
    (id) =>
      new Promise((resolve) => {
        const ch = window.__STORYBOOK_ADDONS_CHANNEL__;
        const failures = {
          storyErrored: 'story errored',
          storyThrewException: 'story threw',
          storyMissing: 'story missing',
          playFunctionThrewException: 'play function threw',
        };
        const handlers = [];
        const finish = (err) => {
          for (const [ev, fn] of handlers) ch.off(ev, fn);
          clearTimeout(timer);
          resolve(err);
        };
        const on = (ev, fn) => {
          ch.on(ev, fn);
          handlers.push([ev, fn]);
        };
        // STORY_FINISHED fires after afterEach, so no addon work is still in flight.
        on('storyFinished', (arg) => (arg?.storyId ?? arg) === id && finish(null));
        for (const [ev, msg] of Object.entries(failures)) {
          on(ev, (arg) =>
            finish(`${msg}: ${String(arg?.message ?? arg?.title ?? arg ?? '').slice(0, 160)}`),
          );
        }
        const timer = setTimeout(() => finish('timed out waiting for story render'), 20000);
        ch.emit('setCurrentStory', { storyId: id, viewMode: 'story' });
      }),
    storyId,
  );
}

const timing = { renderMs: 0, axeMs: 0 };

async function scanOne(page, story, theme) {
  const rec = { storyId: story.id, theme, violations: [], error: null };
  try {
    const t0 = Date.now();
    const err = await renderStory(page, story.id);
    if (err) throw new Error(err);
    const applied = await page.evaluate(
      () =>
        document.querySelector('#storybook-root [data-theme]')?.getAttribute('data-theme') ?? null,
    );
    if (applied !== theme)
      throw new Error(`theme not applied: wanted ${theme}, story rendered with ${applied}`);
    // Settle async content: fonts, and images (a broken src swaps in a fallback
    // element on error, which otherwise races the scan and makes results flaky).
    await page.evaluate(async () => {
      await document.fonts?.ready;
      const imgs = [...document.querySelectorAll('#storybook-root img')];
      await Promise.all(
        imgs.filter((i) => !i.complete).map((i) => new Promise((r) => (i.onload = i.onerror = r))),
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    const t1 = Date.now();
    // Scope is #storybook-root only: Radix portals in document.body (dialog, popover,
    // menu, tooltip) are closed by default in every story, so nothing is skipped today.
    const r = await page.evaluate(
      (tags) =>
        window.__gateAxe.run('#storybook-root', {
          runOnly: { type: 'tag', values: tags },
          resultTypes: ['violations'],
        }),
      AXE_TAGS,
    );
    timing.renderMs += t1 - t0;
    timing.axeMs += Date.now() - t1;
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
  }
  return rec;
}

async function main() {
  const dir = path.resolve(ROOT, arg('dir', 'storybook-static'));
  const filter = arg('filter');
  const concurrency = Number(arg('concurrency', 4));
  const indexPath = ['index.json', 'stories.json']
    .map((f) => path.join(dir, f))
    .find((p) => fs.existsSync(p));
  if (!indexPath) {
    console.error(
      `No index.json in ${path.relative(ROOT, dir)}. Run \`pnpm build-storybook\` first.`,
    );
    process.exit(2);
  }
  let stories = Object.values(JSON.parse(fs.readFileSync(indexPath, 'utf8')).entries).filter(
    (e) => e.type === 'story',
  );
  if (filter) stories = stories.filter((s) => new RegExp(filter, 'i').test(s.id));

  const allowlist = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/axe-allowlist.json'), 'utf8'),
  );
  const problems = validateAllowlist(allowlist);
  if (problems.length) {
    console.error(`scripts/axe-allowlist.json is invalid:\n  ${problems.join('\n  ')}`);
    process.exit(2);
  }

  const started = Date.now();
  const { server, port } = await serve(dir);
  const base = `http://127.0.0.1:${port}`;
  const browser = await launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  // Two queues (one per theme); each worker owns one page pinned to its theme.
  const queues = THEMES.map((theme) => ({
    theme,
    items: stories.map((story) => ({ story })),
    next: 0,
  }));
  const scans = [];
  let done = 0;
  const perTheme = Math.max(1, Math.floor(concurrency / THEMES.length));
  const workers = queues.flatMap((q) =>
    Array.from({ length: perTheme }, async () => {
      let w = await openWorker(context, base, q.theme);
      while (q.next < q.items.length) {
        const { story } = q.items[q.next++];
        let rec = await scanOne(w.page, story, q.theme);
        if (rec.error) {
          // Recycle the page (a crashed preview poisons later stories) and retry once.
          await w.page.close().catch(() => {});
          w = await openWorker(context, base, q.theme);
          rec = await scanOne(w.page, story, q.theme);
          rec.retried = true;
        }
        scans.push(rec);
        if (++done % 100 === 0) console.log(`  ${done}/${stories.length * THEMES.length} scans`);
      }
      await w.page.close().catch(() => {});
    }),
  );
  await Promise.all(workers);
  await browser.close();
  server.close();

  const result = evaluateScan(scans, allowlist);
  if (filter) {
    result.stale = [];
    result.ok = result.blocking.length === 0 && result.errored.length === 0;
  }
  const seconds = Math.round((Date.now() - started) / 100) / 10;

  const perStory = new Map();
  for (const item of [...result.blocking, ...result.allowed]) {
    const row = perStory.get(item.storyId) ?? [];
    row.push(
      `${item.ruleId}(${item.impact},${item.theme})${result.allowed.includes(item) ? ' [allowlisted]' : ''}`,
    );
    perStory.set(item.storyId, row);
  }
  console.log(`\nstory                                              serious/critical`);
  for (const [id, rows] of perStory) console.log(`${id.padEnd(50)} ${rows.join('; ')}`);

  fs.mkdirSync(path.join(ROOT, 'reports/axe'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'reports/axe/latest.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seconds,
        timing,
        tags: AXE_TAGS,
        stories: stories.length,
        ...result,
        scans,
      },
      null,
      1,
    ),
  );

  console.log(
    `\nscanned ${result.scanned} (${stories.length} stories x ${THEMES.length} themes) in ${seconds}s: ` +
      `${result.blocking.length} blocking, ${result.allowed.length} allowlisted, ${result.errored.length} errored, ${result.retried.length} retried, ${result.stale.length} stale allowlist entries`,
  );
  for (const e of result.errored) console.error(`ERROR ${e.storyId} [${e.theme}]: ${e.error}`);
  for (const e of result.stale)
    console.error(
      `STALE allowlist entry matches nothing: ${e.storyId} / ${e.ruleId} — remove it from scripts/axe-allowlist.json`,
    );
  for (const b of result.blocking)
    console.error(`FAIL ${b.storyId} [${b.theme}] ${b.ruleId} (${b.impact}, ${b.nodes} nodes)`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
