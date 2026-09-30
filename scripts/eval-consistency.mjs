#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * eval-consistency — the agent-consistency harness (hds#343, hds#344).
 *
 * Three agents build the same Client-detail screen from the public docs; this
 * measures how alike the results are. It never calls a model: the generated apps
 * are its input. `--offline` measures violations and Jaccard from source only
 * (hds#343). Otherwise it runs the live half (hds#344): pack the library, install
 * the tarball into a copy of eval/consistency/template/ per app, build, render
 * with Playwright Chromium, axe-scan, pixel-diff, judge all five thresholds and
 * append a harness entry to the ledger.
 *
 * Wiring only: the pure logic lives in scripts/lib/consistency/*.mjs, the live
 * stages (pack, build, render, axe-run) beside it, and the thresholds in
 * eval/consistency/ledger.json.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, formatCheck } from './lib/consistency/evaluate.mjs';
import { runDate } from './lib/consistency/live-plan.mjs';
import { runLive } from './lib/consistency/live.mjs';
import { pairwiseJaccard } from './lib/consistency/jaccard.mjs';
import { latestEntry, readLedger, summaryLine } from './lib/consistency/ledger.mjs';
import { scanApp } from './lib/consistency/violations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'eval/consistency/ledger.json');
const FIXTURES = path.join(ROOT, 'eval/consistency/fixtures');
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|html?|css|scss|sass|less)$/i;

const HELP = `Usage: node scripts/eval-consistency.mjs <mode>

Modes:
  --apps <dir>             Full run over every app under <dir> (<dir>/<app-id>/src/...):
                           pack the library, install the tarball into a copy of
                           eval/consistency/template/ per app, build (tsc + vite),
                           render 1280 light, 1280 dark and 390 wide, axe-scan light
                           and dark, pixel-diff, and judge all five thresholds.
                           Appends a harness entry to eval/consistency/ledger.json
                           (not for input under eval/consistency/fixtures/).
                           Needs network access and Chromium (PLAYWRIGHT_BROWSERS_PATH,
                           /opt/pw-browsers in remote sessions). PNGs go to
                           reports/consistency/<date>/.
  --apps <dir> --skip-build
                           Same, reusing the tarball a previous full run left in
                           reports/consistency/pack/ instead of build:lib + npm pack.
  --apps <dir> --offline   Measure violations and component-set Jaccard from source
                           only and check them against the ledger thresholds. No
                           network, no browser, no ledger entry.
  --summary                Print the latest ledger entry as one line.
  --help                   Show this help.

Exit codes:
  0  every threshold passes
  1  a threshold failed (named, with the measured value against the limit)
  2  usage, input or environment error (nothing was judged)

Thresholds: eval/consistency/ledger.json. Guide: eval/consistency/README.md.
`;

function fail(message) {
  console.error(`eval-consistency: ${message}\n\nRun with --help for usage.`);
  process.exit(2);
}

function parse(argv) {
  const args = argv.filter((a) => a !== '--');
  const opts = { apps: null, offline: false, skipBuild: false, summary: false, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--apps') {
      opts.apps = args[i + 1];
      i += 1;
      if (!opts.apps || opts.apps.startsWith('--')) fail('--apps needs a directory');
    } else if (a === '--offline') opts.offline = true;
    else if (a === '--skip-build') opts.skipBuild = true;
    else if (a === '--summary') opts.summary = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else fail(`unknown argument ${a}`);
  }
  return opts;
}

function walk(dir, base, out) {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else if (SOURCE_FILE.test(name)) {
      out[path.relative(base, full).split(path.sep).join('/')] = readFileSync(full, 'utf8');
    }
  }
}

/** { root, apps: { appId: { 'src/App.tsx': text, ... } } } for every <dir>/<app-id>/src. */
function loadApps(dir) {
  const root = path.resolve(ROOT, dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${dir} is not a directory`);
  const apps = {};
  for (const id of readdirSync(root).sort()) {
    const src = path.join(root, id, 'src');
    if (!existsSync(src) || !statSync(src).isDirectory()) continue;
    const files = {};
    walk(src, path.join(root, id), files);
    apps[id] = files;
  }
  if (Object.keys(apps).length === 0) fail(`no app directories (<app-id>/src) found under ${dir}`);
  if (Object.keys(apps).length < 2)
    fail(`need at least two apps to compare, found one under ${dir}`);
  return { root, apps };
}

function offline(dir) {
  const ledger = readLedger(LEDGER);
  const { apps } = loadApps(dir);
  const ids = Object.keys(apps);
  const hits = Object.fromEntries(ids.map((id) => [id, scanApp(apps[id])]));
  const sources = Object.fromEntries(ids.map((id) => [id, Object.values(apps[id]).join('\n')]));
  const jac = pairwiseJaccard(sources);
  const report = evaluate(
    {
      apps: ids,
      violations: Object.fromEntries(ids.map((id) => [id, hits[id].length])),
      jaccard: { pairs: jac.pairs },
    },
    ledger.thresholds,
  );

  console.log(`apps (${ids.length}): ${ids.join(', ')}`);
  for (const c of report.checks) if (c.status !== 'not-measured') console.log(formatCheck(c));
  for (const id of ids) {
    for (const h of hits[id]) console.log(`  ${id} ${h.file}:${h.line} ${h.kind} ${h.match}`);
  }
  for (const p of jac.pairs) console.log(`  jaccard ${p.a}~${p.b}: ${Number(p.value.toFixed(4))}`);
  console.log('not measured (offline): builds, axe, pixel diff');
  console.log(report.pass ? 'RESULT: PASS (measured thresholds only)' : 'RESULT: FAIL');
  process.exit(report.pass ? 0 : 1);
}

async function live(dir, opts) {
  const { root, apps } = loadApps(dir);
  const [{ launch }, pack, { buildApp }, { renderApp }, { scanApp }] = await Promise.all([
    import('./lib/consistency/browser.mjs'),
    import('./lib/consistency/pack.mjs'),
    import('./lib/consistency/build.mjs'),
    import('./lib/consistency/render.mjs'),
    import('./lib/consistency/axe-run.mjs'),
  ]);
  const isFixture = (root + path.sep).startsWith(FIXTURES + path.sep);
  const scratch = pack.makeScratch();
  const templateDir = path.join(ROOT, 'eval/consistency/template');
  const packDir = path.join(ROOT, 'reports/consistency/pack');
  let browser = null;
  const getBrowser = async () => (browser ??= await launch());
  const log = (line) => console.log(line);
  if (pack.gitDirty(ROOT)) {
    log(
      'warning: the working tree has uncommitted changes, so the recorded commit does not describe the tarball exactly.',
    );
  }
  log(`scratch directory ${scratch}`);
  const stages = {
    pack: async ({ skipBuild }) => pack.packLibrary({ root: ROOT, packDir, skipBuild }),
    prepare: async (app, packed) => {
      const r = pack.prepareApp({ templateDir, scratch, app, packed });
      for (const f of r.ignored) log(`[${app.id}] ${f} ignored: the template owns it`);
      return { dir: r.dir };
    },
    build: async (app) => buildApp(app.dir),
    render: async (app) => renderApp(await getBrowser(), app.dir),
    axe: async (app) => scanApp(await getBrowser(), ROOT, app),
    commit: () => pack.gitCommit(ROOT),
  };
  const rel = path.relative(ROOT, root).split(path.sep).join('/');
  const result = await runLive(
    {
      root: ROOT,
      ledgerFile: LEDGER,
      reportsDir: path.join(ROOT, 'reports/consistency'),
      date: runDate(),
      apps: Object.entries(apps).map(([id, files]) => ({ id, dir: path.join(root, id), files })),
      skipBuild: opts.skipBuild,
      writeLedger: !isFixture,
      notes: `Harness run over ${rel}.`,
      log,
    },
    stages,
  ).finally(async () => {
    await browser?.close();
  });
  rmSync(scratch, { recursive: true, force: true });
  process.exit(result.code);
}

const opts = parse(process.argv.slice(2));
if (opts.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (opts.summary) {
  const entry = latestEntry(readLedger(LEDGER));
  if (!entry) fail('ledger has no entries');
  console.log(summaryLine(entry));
  process.exit(0);
}
if (opts.offline && opts.skipBuild)
  fail('--skip-build does nothing with --offline, which never builds');
if (opts.apps) {
  if (opts.offline) offline(opts.apps);
  else {
    live(opts.apps, opts).catch((err) => {
      console.error(`\neval-consistency: ${err.message}`);
      console.error('The scratch directory above was kept for inspection.');
      process.exit(2);
    });
  }
} else {
  fail(
    'nothing to do: pass --apps <dir> (add --offline for the source-only half), --summary or --help',
  );
}
