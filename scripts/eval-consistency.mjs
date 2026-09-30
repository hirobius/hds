#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * eval-consistency — offline half of the agent-consistency harness (hds#343).
 *
 * Three agents build the same Client-detail screen from the public docs; this
 * measures how alike the results are. This script never calls a model and never
 * opens a browser. Builds, axe and pixel diff need the live harness (a
 * follow-up ticket); today it measures violations and Jaccard from source.
 *
 * Wiring only: the logic lives in scripts/lib/consistency/*.mjs and the
 * thresholds in eval/consistency/ledger.json.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, formatCheck } from './lib/consistency/evaluate.mjs';
import { pairwiseJaccard } from './lib/consistency/jaccard.mjs';
import { latestEntry, readLedger, summaryLine } from './lib/consistency/ledger.mjs';
import { scanApp } from './lib/consistency/violations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'eval/consistency/ledger.json');
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|html?|css|scss|sass|less)$/i;

const HELP = `Usage: node scripts/eval-consistency.mjs <mode>

Modes:
  --apps <dir> --offline   Measure violations and component-set Jaccard from the
                           source of every app under <dir> (<dir>/<app-id>/src/...)
                           and check them against the ledger thresholds. Builds,
                           axe and pixel diff are NOT measured; no ledger entry
                           is written.
  --summary                Print the latest ledger entry as one line.
  --help                   Show this help.

Exit codes:
  0  every measured threshold passes
  1  a threshold failed (named, with the measured value against the limit)
  2  usage or input error

Thresholds: eval/consistency/ledger.json. Guide: eval/consistency/README.md.
`;

function fail(message) {
  console.error(`eval-consistency: ${message}\n\nRun with --help for usage.`);
  process.exit(2);
}

function parse(argv) {
  const args = argv.filter((a) => a !== '--');
  const opts = { apps: null, offline: false, summary: false, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--apps') {
      opts.apps = args[i + 1];
      i += 1;
      if (!opts.apps || opts.apps.startsWith('--')) fail('--apps needs a directory');
    } else if (a === '--offline') opts.offline = true;
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

/** { appId: { 'src/App.tsx': text, ... } } for every <dir>/<app-id>/src. */
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
  return apps;
}

function offline(dir) {
  const ledger = readLedger(LEDGER);
  const apps = loadApps(dir);
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
if (opts.apps) {
  if (!opts.offline) {
    fail('a full run (builds, axe, pixel diff) is not available yet; pass --offline');
  }
  offline(opts.apps);
}
fail('nothing to do: pass --apps <dir> --offline, --summary or --help');
