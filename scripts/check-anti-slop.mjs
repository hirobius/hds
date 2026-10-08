/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-anti-slop.mjs
 *
 * Warn-first ratchet for the vendored anti-slop Oxlint rules
 * (tools/oxlint/anti-slop, config: oxlint.config.ts). Rules run at "warn";
 * this gate counts warnings per file per rule and compares them with the
 * committed baseline (tools/oxlint/anti-slop-baseline.json).
 *
 *   - any (file, rule) count above baseline -> exit 1
 *   - counts below baseline                  -> exit 0 plus a "lock it in" hint
 *   - --update                               -> rewrite the baseline (sorted keys)
 *
 * Usage: node scripts/check-anti-slop.mjs [--update] [--cwd d] [--config f] [--baseline f] [-- paths...]
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PATHS = ['src', 'scripts', 'validators', 'tests', 'mcp'];
const COUNTED = /^(anti-slop|oxc)\((.+)\)$/;

function parseArgs(argv) {
  const opts = {
    update: false,
    cwd: REPO_ROOT,
    config: 'oxlint.config.ts',
    baseline: 'tools/oxlint/anti-slop-baseline.json',
    paths: [],
  };
  const rest = [...argv];
  while (rest.length) {
    const a = rest.shift();
    if (a === '--update') opts.update = true;
    else if (a === '--cwd') opts.cwd = path.resolve(rest.shift());
    else if (a === '--config') opts.config = rest.shift();
    else if (a === '--baseline') opts.baseline = rest.shift();
    else if (a === '--') {
      opts.paths = rest.splice(0);
    } else {
      console.error(`check-anti-slop: unknown argument ${a}`);
      process.exit(2);
    }
  }
  if (!opts.paths.length)
    opts.paths = DEFAULT_PATHS.filter((p) => existsSync(path.join(opts.cwd, p)));
  return opts;
}

/** Run oxlint and return { file: { rule: count } } for the counted rules. */
function collect({ cwd, config, paths }) {
  const bin = path.join(REPO_ROOT, 'node_modules', '.bin', 'oxlint');
  const res = spawnSync(bin, ['-c', config, '--format', 'json', ...paths], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (res.error || !res.stdout) {
    console.error(
      `check-anti-slop: oxlint did not run (${res.error?.message ?? res.stderr}). Run \`pnpm install\`.`,
    );
    process.exit(2);
  }
  let report;
  try {
    report = JSON.parse(res.stdout);
  } catch {
    console.error(`check-anti-slop: could not parse oxlint output.\n${res.stderr}`);
    process.exit(2);
  }
  const files = {};
  for (const d of report.diagnostics ?? []) {
    const m = COUNTED.exec(d.code ?? '');
    if (!m) continue;
    const rule = `${m[1]}/${m[2]}`;
    const file = d.filename.split(path.sep).join('/');
    files[file] ??= {};
    files[file][rule] = (files[file][rule] ?? 0) + 1;
  }
  return files;
}

function sorted(files) {
  const out = {};
  for (const f of Object.keys(files).sort()) {
    out[f] = {};
    for (const r of Object.keys(files[f]).sort()) out[f][r] = files[f][r];
  }
  return out;
}

function compare(base, current) {
  const regressions = [];
  let fewer = 0;
  for (const f of new Set([...Object.keys(base), ...Object.keys(current)])) {
    for (const r of new Set([...Object.keys(base[f] ?? {}), ...Object.keys(current[f] ?? {})])) {
      const was = base[f]?.[r] ?? 0;
      const now = current[f]?.[r] ?? 0;
      if (now > was) regressions.push({ file: f, rule: r, was, now });
      else fewer += was - now;
    }
  }
  return { regressions, fewer };
}

const opts = parseArgs(process.argv.slice(2));
const baselinePath = path.resolve(opts.cwd, opts.baseline);
const current = sorted(collect(opts));

if (opts.update) {
  mkdirSync(path.dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify({ version: 1, files: current }, null, 2)}\n`);
  const total = Object.values(current).reduce(
    (n, rules) => n + Object.values(rules).reduce((a, b) => a + b, 0),
    0,
  );
  console.log(
    `check-anti-slop: baseline written (${total} hits in ${Object.keys(current).length} files).`,
  );
  process.exit(0);
}

const base = existsSync(baselinePath)
  ? (JSON.parse(readFileSync(baselinePath, 'utf8')).files ?? {})
  : {};
const { regressions, fewer } = compare(base, current);

if (regressions.length) {
  console.error('\n✗ anti-slop ratchet failed — new hits above the baseline:\n');
  for (const r of regressions) console.error(`  ${r.file}  ${r.rule}  ${r.was} -> ${r.now}`);
  console.error(
    '\nFix the code (see tools/oxlint/anti-slop and `pnpm lint:slop`). Only with a stated reason, accept the new count with:\n  node scripts/check-anti-slop.mjs --update\n',
  );
  process.exit(1);
}

console.log('✓ anti-slop ratchet: no new hits.');
if (fewer > 0)
  console.log(
    `  ${fewer} fewer than baseline, run \`node scripts/check-anti-slop.mjs --update\` to lock in.`,
  );
