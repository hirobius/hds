#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-rendered-geometry — the first gate in this repo that reads pixels.
 *
 * Renders every Storybook story in Chromium and reports layout defects no
 * textual gate can see: content overflowing its frame, boxes clipping their own
 * text, elements pushed past the viewport, controls with no rendered box or
 * below the WCAG 2.2 AA target size, links whose only affordance is colour, and
 * misaligned table-row baselines.
 *
 * Requires a built Storybook. Run `pnpm build-storybook` first, or pass
 * --storybook-url to point at a running one.
 *
 *   node scripts/check-rendered-geometry.mjs                 # gate
 *   node scripts/check-rendered-geometry.mjs --report        # full detail
 *   node scripts/check-rendered-geometry.mjs --update-baseline
 *   node scripts/check-rendered-geometry.mjs --only primitives-table
 *
 * Exit 1 on any finding the baseline does not already record. Existing debt is
 * accepted explicitly in docs/guardrails/rendered-geometry-baseline.json so the
 * gate can land without a repo-wide fix first — and so accepting a defect is a
 * reviewable diff rather than a loosened threshold.
 *
 * Chromium resolution order: PLAYWRIGHT_CHROMIUM_PATH, the image-provided build
 * under /opt/pw-browsers, then Playwright's own download.
 */
import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  PROBE_CONFIG,
  PROBE_SOURCE,
  diffAgainstBaseline,
  summarize,
} from './lib/rendered-geometry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATIC_DIR = path.join(ROOT, 'storybook-static');
const BASELINE_PATH = path.join(ROOT, 'docs/guardrails/rendered-geometry-baseline.json');

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

const REPORT = has('--report');
const UPDATE = has('--update-baseline');
const ONLY = valueOf('--only');
const EXTERNAL_URL = valueOf('--storybook-url');
const CONCURRENCY = Number(process.env.RENDER_GATE_CONCURRENCY || 6);
const VIEWPORT = { width: 1280, height: 900 };

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function fail(message, fix) {
  console.error(`\n✗ check-rendered-geometry — ${message}`);
  if (fix) console.error(`  fix: ${fix}`);
  process.exit(1);
}

function serveStatic() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(STATIC_DIR, urlPath);
      if (!file.startsWith(STATIC_DIR)) {
        res.writeHead(403).end();
        return;
      }
      if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      });
      createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function resolveChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

async function loadStoryIds(baseUrl) {
  const indexUrl = `${baseUrl}/index.json`;
  const res = await fetch(indexUrl).catch(() => null);
  if (!res?.ok) fail(`could not read ${indexUrl}`, 'pnpm build-storybook');
  const index = await res.json();
  let ids = Object.values(index.entries)
    .filter((e) => e.type === 'story')
    .map((e) => e.id);
  if (ONLY) ids = ids.filter((id) => id.includes(ONLY));
  if (!ids.length)
    fail(ONLY ? `no story matched --only ${ONLY}` : 'Storybook index lists no stories');
  return ids.sort();
}

async function sweep(baseUrl, storyIds) {
  const executablePath = resolveChromium();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const queue = storyIds.slice();
  const results = [];
  let done = 0;

  const worker = async () => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    while (queue.length) {
      const id = queue.shift();
      try {
        await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`, {
          waitUntil: 'networkidle',
          timeout: 20000,
        });
        await page.waitForSelector('#storybook-root > *', { timeout: 8000 }).catch(() => {});
        // Let webfonts swap and entry transitions settle; measuring mid-transition
        // reports the animation, not the layout.
        await page.waitForTimeout(150);
        const findings = await page.evaluate(
          ([source, cfg]) => new Function(`return (${source})`)()(cfg),
          [PROBE_SOURCE.toString(), PROBE_CONFIG],
        );
        results.push({ id, findings });
      } catch (err) {
        results.push({ id, error: String(err?.message || err).slice(0, 200), findings: [] });
      }
      done += 1;
      if (done % 50 === 0) process.stderr.write(`  swept ${done}/${storyIds.length}\n`);
    }
    await context.close();
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();
  results.sort((a, b) => a.id.localeCompare(b.id));
  return results;
}

async function main() {
  let server = null;
  let baseUrl = EXTERNAL_URL?.replace(/\/$/, '');

  if (!baseUrl) {
    if (!existsSync(path.join(STATIC_DIR, 'index.json'))) {
      fail(
        'storybook-static/index.json is missing, so there is nothing to render',
        'pnpm build-storybook  (or pass --storybook-url http://localhost:6006)',
      );
    }
    const served = await serveStatic();
    server = served.server;
    baseUrl = `http://127.0.0.1:${served.port}`;
  }

  const storyIds = await loadStoryIds(baseUrl);
  process.stderr.write(`check-rendered-geometry — ${storyIds.length} stories\n`);
  const results = await sweep(baseUrl, storyIds);
  server?.close();

  const errored = results.filter((r) => r.error);
  const { byKind, storiesWithFindings } = summarize(results);

  const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : { accepted: [] };
  const { added, fixed, seen } = diffAgainstBaseline(results, baseline);

  console.log(`\nstories swept: ${results.length}   with findings: ${storiesWithFindings}`);
  for (const [kind, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind.padEnd(20)} ${n}`);
  }

  if (REPORT) {
    for (const r of results) {
      if (!r.findings.length) continue;
      console.log(`\n### ${r.id}`);
      for (const f of r.findings) console.log('   ', JSON.stringify(f));
    }
  }

  if (UPDATE && ONLY) {
    fail(
      '--update-baseline with --only would drop every story outside the filter',
      'run --update-baseline over the full suite',
    );
  }

  if (UPDATE) {
    writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify(
        {
          $comment:
            'Rendered-geometry debt accepted at the time the gate landed. Entries are removed as defects are fixed; new findings fail the gate. Regenerate with: node scripts/check-rendered-geometry.mjs --update-baseline',
          storiesSwept: results.length,
          accepted: seen,
        },
        null,
        2,
      )}\n`,
    );
    console.log(
      `\n✓ baseline written: ${path.relative(ROOT, BASELINE_PATH)} (${seen.length} accepted)`,
    );
    return;
  }

  if (errored.length) {
    console.error(`\n✗ ${errored.length} story(s) failed to render:`);
    for (const r of errored.slice(0, 10)) console.error(`    ${r.id} — ${r.error}`);
    process.exit(1);
  }

  // With --only, every story outside the filter is simply unswept. Reporting
  // those as fixed would invite a --update-baseline that erases real debt.
  if (fixed.length && !ONLY) {
    console.log(`\n${fixed.length} baseline entry(s) no longer observed — tighten the baseline:`);
    for (const fp of fixed.slice(0, 20)) console.log(`    fixed: ${fp}`);
    console.log('    node scripts/check-rendered-geometry.mjs --update-baseline');
  }

  if (added.length) {
    console.error(`\n✗ ${added.length} new rendered-geometry finding(s):\n`);
    for (const f of added) {
      const detail =
        f.kind === 'overflow-x'
          ? `content is ${f.by}px wider than its ${f.clientWidth}px frame (overflow: ${f.overflow})`
          : f.kind === 'clipped-y'
            ? `content is ${f.by}px taller than its ${f.clientHeight}px clipped box`
            : f.kind === 'past-viewport'
              ? `right edge at ${f.right}px, viewport is ${f.vw}px`
              : f.kind === 'zero-size-control'
                ? `control renders at ${f.w}x${f.h} — present in the DOM, unclickable`
                : f.kind === 'small-target'
                  ? `${f.w}x${f.h}, below the ${PROBE_CONFIG.MIN_TARGET}px WCAG 2.2 AA target`
                  : f.kind === 'link-no-affordance'
                    ? `link in <${f.parent}> with no underline or border — colour is its only affordance`
                    : `row baselines span ${f.spread}px across ${f.cells} cells`;
      console.error(`  ${f.storyId}`);
      console.error(`    ${f.kind}: ${f.sel} — ${detail}`);
      if (f.text) console.error(`    text: ${JSON.stringify(f.text)}`);
    }
    console.error(
      '\n  Fix the layout, or accept it deliberately:\n' +
        '    node scripts/check-rendered-geometry.mjs --update-baseline',
    );
    process.exit(1);
  }

  console.log('\n✓ no new rendered-geometry findings');
}

main().catch((err) => fail(String(err?.message || err)));
