#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/smoke-consumer.mjs
 *
 * End-to-end CONSUMER smoke test for the published package. Reproduces exactly
 * what a downstream repo (e.g. the sibling `ops` dashboard) experiences:
 *
 *   1. Build the library (`build:lib`) and `npm pack` it into a tarball.
 *   2. Create a throwaway scratch app in a temp dir, install the tarball plus
 *      the declared peer dependencies (react, react-dom, react-router) from the
 *      registry — the package's own `dependencies` come along transitively.
 *   3. From inside that scratch app, RESOLVE every public subpath against the
 *      package `exports` map, and IMPORT every JS subpath, asserting the headline
 *      symbols are present.
 *
 * Subpaths covered (must stay in sync with package.json#exports):
 *   '.'            → main barrel (Button, Card, …)
 *   './tokens'     → design-token bridge (default export)
 *   './tokens.css' → base stylesheet (resolve-only; Node can't import CSS)
 *   './cn'         → cn() class-merge helper
 *   './manifest'   → hds-manifest.json as ESM (default export)
 *   './contexts'   → React context providers (ThemeProvider, …)
 *   './protocol'   → bridge envelope protocol (createEnvelope, verifyEnvelope)
 *
 * Any unresolved subpath, missing symbol, or unresolvable bare import inside the
 * bundle (e.g. a phantom dependency that isn't declared) FAILS the run. This is
 * the gate that catches packaging regressions before they reach consumers, so it
 * is wired into the release flow (see `scripts/release-dry-run.mjs` / the
 * `release` npm script). Run manually with `pnpm smoke:consumer`.
 *
 * Exit codes: 0 = every subpath resolved + imported, 1 = a failure (details
 * printed). The scratch dir is removed on success and kept (path printed) on
 * failure for debugging.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PKG = '@hirobius/design-system';

const KEEP = process.argv.includes('--keep');
const SKIP_BUILD = process.argv.includes('--skip-build');

function log(msg) {
  console.log(`[smoke-consumer] ${msg}`);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: 'inherit',
    cwd: ROOT,
    ...opts,
  });
}

// ── 1. Build + pack ──────────────────────────────────────────────────────────

if (!SKIP_BUILD) {
  log('building library (pnpm build:lib)…');
  run('pnpm', ['build:lib']);
}

const scratch = mkdtempSync(join(tmpdir(), 'hds-consumer-smoke-'));
const app = join(scratch, 'app');
mkdirSync(app, { recursive: true });

log(`packing tarball into ${scratch}…`);
run('npm', ['pack', '--pack-destination', scratch, '--silent'], { stdio: 'pipe' });
const tarball = readdirSync(scratch).find((f) => f.endsWith('.tgz'));
if (!tarball) {
  console.error('[smoke-consumer] FAIL — npm pack produced no .tgz');
  process.exit(1);
}
const tarballPath = join(scratch, tarball);
log(`tarball: ${tarball}`);

// ── 2. Scratch consumer app ──────────────────────────────────────────────────

writeFileSync(
  join(app, 'package.json'),
  `${JSON.stringify(
    { name: 'hds-consumer-smoke', private: true, version: '0.0.0', type: 'module' },
    null,
    2,
  )}\n`,
);

log('installing tarball + peers into scratch app (this may take a moment)…');
run(
  'npm',
  [
    'install',
    tarballPath,
    'react@^18.3',
    'react-dom@^18.3',
    'react-router@^7',
    '--no-audit',
    '--no-fund',
    '--loglevel',
    'error',
  ],
  { cwd: app, stdio: 'inherit' },
);

// ── 3. Resolve + import every subpath from inside the scratch app ────────────

const probe = `
import { strict as assert } from 'node:assert';

const PKG = ${JSON.stringify(PKG)};
const failures = [];

// Subpaths that must RESOLVE against the exports map (incl. the CSS asset,
// which Node cannot import but must still resolve to a real file).
const resolvable = ['.', './tokens', './tokens.css', './cn', './manifest', './contexts', './protocol']
  .map((s) => (s === '.' ? PKG : PKG + s.slice(1)));

for (const spec of resolvable) {
  try {
    const url = import.meta.resolve(spec);
    if (!url) throw new Error('resolved to empty');
    console.log('  resolve ok   ' + spec + '  ->  ' + url.replace(/^file:\\/\\//, ''));
  } catch (err) {
    failures.push('resolve ' + spec + ': ' + err.message);
    console.log('  resolve FAIL ' + spec + ': ' + err.message);
  }
}

// JS subpaths that must IMPORT and expose their headline symbols.
const importChecks = [
  [PKG, (m) => assert.equal(typeof m.Button, 'object', 'Button missing') ||
                assert.equal(typeof m.cn, 'function', 'cn missing') ||
                assert.equal(typeof m.Card, 'object', 'Card missing')],
  [PKG + '/cn', (m) => assert.equal(typeof m.cn, 'function', 'cn() missing')],
  [PKG + '/tokens', (m) => assert.ok(m.default && typeof m.default === 'object', 'tokens default missing')],
  [PKG + '/manifest', (m) => assert.ok(m.default && typeof m.default === 'object', 'manifest default missing')],
  [PKG + '/contexts', (m) => assert.equal(typeof m.ThemeProvider, 'function', 'ThemeProvider missing')],
  [PKG + '/protocol', (m) => {
    assert.equal(typeof m.createEnvelope, 'function', 'createEnvelope missing');
    assert.equal(typeof m.verifyEnvelope, 'function', 'verifyEnvelope missing');
  }],
];

for (const [spec, check] of importChecks) {
  try {
    const mod = await import(spec);
    check(mod);
    console.log('  import  ok   ' + spec);
  } catch (err) {
    failures.push('import ' + spec + ': ' + err.message);
    console.log('  import  FAIL ' + spec + ': ' + err.message);
  }
}

if (failures.length) {
  console.error('\\n[probe] ' + failures.length + ' failure(s).');
  process.exit(1);
}
console.log('\\n[probe] all subpaths resolved + imported.');
`;

writeFileSync(join(app, 'probe.mjs'), probe);

log('running consumer probe…');
let ok = true;
try {
  run('node', ['probe.mjs'], { cwd: app, stdio: 'inherit' });
} catch {
  ok = false;
}

// ── 4. Report + cleanup ──────────────────────────────────────────────────────

if (ok) {
  log('PASS — every public subpath resolves and imports cleanly.');
  if (!KEEP) rmSync(scratch, { recursive: true, force: true });
  process.exit(0);
} else {
  console.error(`[smoke-consumer] FAIL — scratch app kept for debugging: ${app}`);
  process.exit(1);
}
