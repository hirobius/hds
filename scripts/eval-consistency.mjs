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
 *
 * Three more modes serve the design-explorations spec set (hds#628,
 * eval/explorations/README.md), reusing the same stages: `--explorations`
 * gates each direction of a run (lint, axe, PII, gap and bend logs, no ledger),
 * `--gaps` ranks the gap logs, `--pii` checks fixture data. Their logic is in
 * scripts/lib/explorations/*.mjs.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, formatCheck } from './lib/consistency/evaluate.mjs';
import { runDate, screenshotDir } from './lib/consistency/live-plan.mjs';
import { runLive } from './lib/consistency/live.mjs';
import { pairwiseJaccard } from './lib/consistency/jaccard.mjs';
import { latestEntry, readLedger, summaryLine } from './lib/consistency/ledger.mjs';
import { scanApp } from './lib/consistency/violations.mjs';
import { clientDenylist, loadDenylistFile, scanPaths } from './lib/explorations/pii.mjs';
import { listDirections, readDirection, readTenants } from './lib/explorations/direction.mjs';
import { aggregateGaps, collectGapLogs } from './lib/explorations/gaps.mjs';
import { runExplorations } from './lib/explorations/live.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'eval/consistency/ledger.json');
const FIXTURES = path.join(ROOT, 'eval/consistency/fixtures');
const EXPLORATIONS = path.join(ROOT, 'eval/explorations');
const TENANTS = path.join(ROOT, 'tenants');
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
                           reports/consistency/<date>/ (fixture input: to
                           reports/consistency/fixtures/<path>/, so it cannot
                           overwrite a recorded run's images). A run that records
                           a ledger entry needs a clean git tree.
  --apps <dir> --skip-build
                           Same, reusing the tarball a previous full run left in
                           reports/consistency/pack/ instead of build:lib + npm pack.
                           The commit recorded is the one that tarball was packed from
                           (pack.json); it refuses if that record is missing or stale.
  --apps <dir> --offline   Measure violations and component-set Jaccard from source
                           only and check them against the ledger thresholds. No
                           network, no browser, no ledger entry.
  --summary                Print the latest ledger entry as one line.

Design explorations (hds#628; eval/explorations/README.md). A run directory holds
one folder per direction, <run>/<screen>-<A|B|C>/ (src/App.tsx, rationale.md,
refs.json, bend-log.json for C only, gaps.json). No ledger entry is ever written.
  --explorations <run>     Gate every direction under <run>, one by one: layout of its
                           files, lint (A and B: 0 violations; C: each violation listed
                           in bend-log.json, each listed one real), gaps.json, PII;
                           then pack the library, build, render at 1280 and 390 in light
                           and dark under the demo tenant its refs.json declares, and
                           axe-scan every viewport in both themes (0 serious or critical,
                           for all three directions). PNGs and gates.json go to
                           reports/explorations/<date>/. Needs network and Chromium.
  --explorations <run> --offline
                           Layout, lint, gap logs and PII from source only. No network,
                           no browser, nothing written.
  --explorations <run> --skip-build
                           Reuse the tarball a previous full run left in
                           reports/consistency/pack/.
  --gaps <runs>            Validate every gaps.json under <runs> (<date>/<screen>-<A|B|C>/,
                           the newest date per direction) and rank the gaps by how many
                           screens hit them. Add --json for the ranking as JSON.
  --pii <path>...          Check files or directories for real-looking phone numbers and
                           emails (anything outside 555-01xx and example.com) and for
                           denylisted terms. Fixture data must pass this before publish.
  --denylist <file>        Extra denylist terms for --explorations and --pii, one per line
                           (or set EXPLORATIONS_PII_DENYLIST). Keep the file outside the
                           repository. Every non-demo tenant's name is always checked.

  --help                   Show this help.

Exit codes:
  0  every threshold passes
  1  a threshold failed (named, with the measured value against the limit)
  2  usage, input or environment error (nothing was judged)

Thresholds: eval/consistency/ledger.json. Guide: eval/consistency/README.md.
Explorations gates: eval/explorations/README.md.
`;

function fail(message) {
  console.error(`eval-consistency: ${message}\n\nRun with --help for usage.`);
  process.exit(2);
}

function parse(argv) {
  const args = argv.filter((a) => a !== '--');
  const opts = {
    apps: null,
    offline: false,
    skipBuild: false,
    summary: false,
    help: false,
    explorations: null,
    gaps: null,
    json: false,
    pii: null,
    denylist: null,
  };
  const value = (i, flag, what) => {
    const v = args[i + 1];
    if (!v || v.startsWith('--')) fail(`${flag} needs ${what}`);
    return v;
  };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--apps') {
      opts.apps = args[i + 1];
      i += 1;
      if (!opts.apps || opts.apps.startsWith('--')) fail('--apps needs a directory');
    } else if (a === '--explorations') {
      opts.explorations = value(i, a, 'a run directory');
      i += 1;
    } else if (a === '--gaps') {
      opts.gaps = value(i, a, 'a runs directory');
      i += 1;
    } else if (a === '--denylist') {
      opts.denylist = value(i, a, 'a file');
      i += 1;
    } else if (a === '--pii') {
      opts.pii = [];
      while (args[i + 1] && !args[i + 1].startsWith('--')) opts.pii.push(args[++i]);
      if (opts.pii.length === 0) fail('--pii needs at least one file or directory');
    } else if (a === '--offline') opts.offline = true;
    else if (a === '--skip-build') opts.skipBuild = true;
    else if (a === '--json') opts.json = true;
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

/**
 * The real stages (pack, prepare, build, render, axe), shared by every mode that
 * builds: the consistency run and the explorations option. `close()` always;
 * `cleanup()` only after a run that finished, so a failed one keeps its scratch directory.
 */
async function liveStages(log) {
  const [{ launch }, pack, { buildApp }, { renderApp }, { scanApp }] = await Promise.all([
    import('./lib/consistency/browser.mjs'),
    import('./lib/consistency/pack.mjs'),
    import('./lib/consistency/build.mjs'),
    import('./lib/consistency/render.mjs'),
    import('./lib/consistency/axe-run.mjs'),
  ]);
  const scratch = pack.makeScratch();
  const templateDir = path.join(ROOT, 'eval/consistency/template');
  const packDir = path.join(ROOT, 'reports/consistency/pack');
  let browser = null;
  const getBrowser = async () => (browser ??= await launch());
  log(`scratch directory ${scratch}`);
  const stages = {
    pack: async ({ skipBuild }) => pack.packLibrary({ root: ROOT, packDir, skipBuild }),
    prepare: async (app, packed) => {
      const r = pack.prepareApp({ templateDir, scratch, app, packed });
      for (const f of r.ignored) log(`[${app.id}] ${f} ignored: the template owns it`);
      return { dir: r.dir };
    },
    build: async (app) => buildApp(app.dir),
    render: async (app, o) => renderApp(await getBrowser(), app.dir, o),
    axe: async (app, o) => scanApp(await getBrowser(), ROOT, app, o),
  };
  return {
    stages,
    close: async () => {
      await browser?.close();
    },
    cleanup: () => rmSync(scratch, { recursive: true, force: true }),
  };
}

async function live(dir, opts) {
  const { root, apps } = loadApps(dir);
  const isFixture = (root + path.sep).startsWith(FIXTURES + path.sep);
  const log = (line) => console.log(line);
  const { stages, close, cleanup } = await liveStages(log);
  const rel = path.relative(ROOT, root).split(path.sep).join('/');
  const reportsDir = path.join(ROOT, 'reports/consistency');
  const date = runDate();
  const result = await runLive(
    {
      root: ROOT,
      ledgerFile: LEDGER,
      reportsDir,
      outDir: screenshotDir(reportsDir, date, rel),
      date,
      apps: Object.entries(apps).map(([id, files]) => ({ id, dir: path.join(root, id), files })),
      skipBuild: opts.skipBuild,
      writeLedger: !isFixture,
      notes: `Harness run over ${rel}.`,
      log,
    },
    stages,
  ).finally(close);
  cleanup();
  process.exit(result.code);
}

/** Denylist terms: every non-demo tenant, plus the private file from --denylist or the environment. */
function denylistFor(opts) {
  const file = opts.denylist ?? process.env.EXPLORATIONS_PII_DENYLIST ?? null;
  try {
    return [...clientDenylist(TENANTS), ...(file ? loadDenylistFile(file) : [])];
  } catch (err) {
    return fail(err.message);
  }
}

const DATE_DIR = /^\d{4}-\d{2}-\d{2}$/;

async function explorations(dir, opts) {
  const root = path.resolve(ROOT, dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${dir} is not a directory`);
  const { ids, ignored } = listDirections(root);
  if (ids.length === 0) fail(`no <screen>-<A|B|C> directions found under ${dir}`);
  const log = (line) => console.log(line);
  if (ignored.length) log(`ignored (not a <screen>-<A|B|C> direction): ${ignored.join(', ')}`);

  const denylist = denylistFor(opts);
  // the fixture data of every screen that has a direction here, checked once per run
  const fixtureFiles = [...new Set(ids.map((id) => id.replace(/-[ABC]$/, '')))]
    .map((screen) => path.join(EXPLORATIONS, 'screens', screen, 'fixture.json'))
    .filter((f) => existsSync(f));
  const fixtureFindings = scanPaths(fixtureFiles, { denylist, root: ROOT });

  const rel = path.relative(ROOT, root).split(path.sep).join('/');
  const date = DATE_DIR.test(path.basename(root)) ? path.basename(root) : runDate();
  const reportsDir = path.join(ROOT, 'reports/explorations');
  // input under eval/explorations/fixtures/ is keyed by its own path, so it cannot overwrite a recorded run's images
  const fixturePrefix = 'eval/explorations/fixtures/';
  const outDir = `${rel}/`.startsWith(fixturePrefix)
    ? path.join(reportsDir, 'fixtures', ...rel.slice(fixturePrefix.length).split('/'))
    : path.join(reportsDir, date);

  const input = {
    root: ROOT,
    date,
    run: rel,
    outDir,
    directions: ids.map((id) => readDirection(root, id)),
    tenants: readTenants(TENANTS),
    denylist,
    fixtureFindings,
    skipBuild: opts.skipBuild,
    log,
  };
  if (opts.offline) {
    const { code } = await runExplorations(input, null);
    process.exit(code);
  }
  const { stages, close, cleanup } = await liveStages(log);
  const { code } = await runExplorations(input, stages).finally(close);
  cleanup();
  process.exit(code);
}

function gaps(dir, opts) {
  const root = path.resolve(ROOT, dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${dir} is not a directory`);
  const { logs, gaps: all, problems } = collectGapLogs(root);
  if (logs.length === 0 && problems.length === 0) {
    fail(`no gaps.json found under ${dir} (expected <date>/<screen>-<A|B|C>/gaps.json)`);
  }
  const ranked = aggregateGaps(all);
  const say = opts.json ? (line) => console.error(line) : (line) => console.log(line);
  for (const p of problems) {
    say(`INVALID gaps.json: ${p.id} (${p.date})`);
    for (const line of p.problems) say(`    ${line}`);
  }
  if (opts.json) console.log(JSON.stringify(ranked, null, 2));
  else {
    console.log(
      `gaps: ${ranked.length} ranked from ${logs.length} log${logs.length === 1 ? '' : 's'}` +
        ` (${logs.map((l) => l.id).join(', ') || 'none'})`,
    );
    ranked.forEach((g, i) => {
      const dirs = Object.entries(g.directions)
        .map(([d, n]) => `${d}:${n}`)
        .join(' ');
      console.log(
        `${String(i + 1).padStart(2)}. ${g.key}  ${g.kind}  ${g.screenCount} screen${g.screenCount === 1 ? '' : 's'}` +
          ` (${g.screens.join(', ')}), ${g.hits} hit${g.hits === 1 ? '' : 's'}  [${dirs}]`,
      );
      console.log(`    needed: ${g.needed}`);
      for (const p of g.proposals) console.log(`    proposal: ${p}`);
    });
  }
  process.exit(problems.length ? 1 : 0);
}

function pii(paths, opts) {
  const denylist = denylistFor(opts);
  let findings;
  try {
    findings = scanPaths(
      paths.map((p) => path.resolve(ROOT, p)),
      { denylist, root: ROOT },
    );
  } catch (err) {
    return fail(err.message);
  }
  for (const f of findings) console.log(`${f.file}:${f.line} ${f.kind} ${f.match}`);
  console.log(
    findings.length
      ? `FAIL pii: ${findings.length} finding${findings.length === 1 ? '' : 's'}`
      : `PASS pii: nothing that looks like real personal data in ${paths.join(', ')}`,
  );
  process.exit(findings.length ? 1 : 0);
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
const modes = ['apps', 'explorations', 'gaps', 'pii'].filter((m) => opts[m]);
if (modes.length > 1)
  fail(`pick one of --apps, --explorations, --gaps, --pii (got ${modes.join(', ')})`);
if (opts.offline && opts.skipBuild)
  fail('--skip-build does nothing with --offline, which never builds');
if (opts.json && !opts.gaps) fail('--json is for --gaps');
if (opts.denylist && !opts.explorations && !opts.pii)
  fail('--denylist is for --explorations or --pii');
if ((opts.offline || opts.skipBuild) && (opts.gaps || opts.pii)) {
  fail('--offline and --skip-build are for --apps and --explorations');
}
if (opts.apps) {
  if (opts.offline) offline(opts.apps);
  else {
    live(opts.apps, opts).catch((err) => {
      console.error(`\neval-consistency: ${err.message}`);
      console.error('The scratch directory above was kept for inspection.');
      process.exit(2);
    });
  }
} else if (opts.explorations) {
  explorations(opts.explorations, opts).catch((err) => {
    console.error(`\neval-consistency: ${err.message}`);
    if (!opts.offline) console.error('The scratch directory above was kept for inspection.');
    process.exit(2);
  });
} else if (opts.gaps) {
  gaps(opts.gaps, opts);
} else if (opts.pii) {
  pii(opts.pii, opts);
} else {
  fail(
    'nothing to do: pass --apps <dir> (add --offline for the source-only half), --explorations <run>, --gaps <runs>, --pii <path>, --summary or --help',
  );
}
