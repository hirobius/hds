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
 *   3b. RENDER probe (jsdom): mount real components (Button, Spinner) via
 *      renderToStaticMarkup, exercise the router seam (anchor fallback with no
 *      provider + custom LinkComponent injection + window.location currentPath),
 *      and assert tokens.css still ships the token vars, embedded woff2 fonts,
 *      and [data-hds] scoping. Catches the font/CSS/router-context regressions
 *      the resolve+import probe cannot see.
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
    // jsdom backs the render probe below (real browser globals so the router
    // fallback's window.location path executes as a consumer would hit it).
    'jsdom@^25',
    // Dev deps for the TypeScript consumer typecheck (section 3c).
    'typescript@^5.7',
    '@types/react@^18',
    '@types/react-dom@^18',
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

// ── 3b. Render probe — mount components in a jsdom DOM ────────────────────────
// The resolve+import probe above proves the package wires up; it does NOT prove
// a component actually renders, that the router seam works without a router, or
// that tokens.css still carries the tokens/fonts/scoping a consumer depends on.
// This probe closes those gaps (catches the font/CSS/router-context regressions
// the import-only smoke missed). It uses renderToStaticMarkup under a jsdom
// window so the browser code paths (router fallback's window.location) execute.
const renderProbe = `
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PKG = ${JSON.stringify(PKG)};
const failures = [];
function check(name, fn) {
  try { fn(); console.log('  render ok   ' + name); }
  catch (err) { failures.push(name + ': ' + err.message); console.log('  render FAIL ' + name + ': ' + err.message); }
}

// Real browser globals — the router fallback reads window.location, so a
// consumer with no <HdsRouterProvider> exercises this exact path.
const dom = new JSDOM('<!doctype html><html data-hds><body></body></html>', { url: 'https://example.test/job/42' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// react-dom's dev build reads navigator.userAgent at import time. Node < 21
// has no global navigator (CI pins Node 20), so provide jsdom's. Guarded so it
// is a no-op on Node >= 21, where navigator is a read-only global.
if (!globalThis.navigator) globalThis.navigator = dom.window.navigator;

const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const hds = await import(PKG);

check('Button mounts and renders its label', () => {
  const html = renderToStaticMarkup(React.createElement(hds.Button, null, 'Click me'));
  assert.ok(html.includes('Click me'), 'button label missing');
  assert.ok(html.includes('<button'), 'no <button> element rendered');
});

check('Spinner mounts with role=status', () => {
  const html = renderToStaticMarkup(React.createElement(hds.Spinner, null));
  assert.ok(html.includes('role="status"'), 'spinner role missing');
});

check('InlineLink falls back to a real anchor with no router', () => {
  const html = renderToStaticMarkup(React.createElement(hds.InlineLink, { href: '/docs' }, 'Docs'));
  assert.ok(/<a [^>]*href="\\/docs"/.test(html), 'anchor href fallback missing: ' + html);
});

check('HdsRouterProvider injects a custom LinkComponent', () => {
  const adapter = {
    navigate: () => {},
    currentPath: '/job/42',
    LinkComponent: ({ to, children }) =>
      React.createElement('a', { 'data-injected': 'yes', href: to }, children),
  };
  const tree = React.createElement(
    hds.HdsRouterProvider,
    { adapter },
    React.createElement(hds.InlineLink, { href: '/x' }, 'X'),
  );
  assert.ok(renderToStaticMarkup(tree).includes('data-injected="yes"'), 'custom LinkComponent not used');
});

check('useHdsRouter reads window.location for currentPath (no provider)', () => {
  const Probe = () => {
    const { currentPath } = hds.useHdsRouter();
    return React.createElement('span', null, currentPath);
  };
  assert.ok(renderToStaticMarkup(React.createElement(Probe)).includes('/job/42'), 'currentPath did not read window.location');
});

check('tokens.css ships tokens + embedded fonts + [data-hds] scope', () => {
  const cssPath = decodeURIComponent(import.meta.resolve(PKG + '/tokens.css').replace(/^file:\\/\\//, ''));
  const css = readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('--semantic-color-surface-page'), 'token var missing from tokens.css');
  assert.ok(css.includes('@font-face'), 'no @font-face in tokens.css');
  assert.ok(css.includes('data:font/woff2'), 'fonts not embedded (P0.3 regression)');
  assert.ok(css.includes('[data-hds]'), 'base styles not scoped to [data-hds] (P0.5 regression)');
});

if (failures.length) {
  console.error('\\n[render-probe] ' + failures.length + ' failure(s).');
  process.exit(1);
}
console.log('\\n[render-probe] component mount + router-seam + CSS/font checks passed.');
`;

writeFileSync(join(app, 'probe-render.mjs'), renderProbe);

log('running consumer probe…');
let ok = true;
try {
  run('node', ['probe.mjs'], { cwd: app, stdio: 'inherit' });
} catch {
  ok = false;
}

if (ok) {
  log('running render probe (jsdom mount + router seam + CSS)…');
  try {
    run('node', ['probe-render.mjs'], { cwd: app, stdio: 'inherit' });
  } catch {
    ok = false;
  }
}

// ── 3c. TypeScript consumer typecheck (the headline acceptance) ───────────────
// A real consumer compiles with strict + skipLibCheck + bundler resolution
// (the Vite/Next default). Types must resolve from the package's built dist/*.d.ts
// — NOT from source — and importing a primitive from the root AND a subpath must
// typecheck with only react/react-dom present (no router/form/zod peers).
if (ok) {
  log('running TypeScript consumer typecheck (tsc --noEmit, strict, bundler)…');
  writeFileSync(
    join(app, 'tsconfig.consumer.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ES2022',
          jsx: 'react-jsx',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: [],
        },
        files: ['consumer-typecheck.tsx'],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(app, 'consumer-typecheck.tsx'),
    [
      "import { Button, hds } from '@hirobius/design-system';",
      "import { cn } from '@hirobius/design-system/cn';",
      "import manifest from '@hirobius/design-system/manifest';",
      '// Types must resolve from dist/*.d.ts (not source) under skipLibCheck.',
      'export const a = <Button className={cn(String(hds ? 1 : 0))}>Hi</Button>;',
      'export const b = Object.keys(manifest).length;',
      '',
    ].join('\n'),
  );
  try {
    run('npx', ['tsc', '-p', 'tsconfig.consumer.json'], { cwd: app, stdio: 'inherit' });
    console.log('  typecheck ok   consumer tsc --noEmit passed (types resolved from dist)');
  } catch {
    console.error('  typecheck FAIL consumer tsc --noEmit reported errors');
    ok = false;
  }
}

// ── 3d. publint — package export/types correctness ───────────────────────────
if (ok) {
  log('running publint (export/types correctness)…');
  try {
    run('npx', ['--yes', 'publint@latest'], { cwd: ROOT, stdio: 'inherit' });
  } catch {
    console.error('  publint FAIL');
    ok = false;
  }
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
