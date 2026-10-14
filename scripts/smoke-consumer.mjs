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
 *      and assert tokens.css ships the token vars and [data-hds] scoping with no
 *      embedded fonts, and fonts.css + its woff2 files resolve from the package. Catches the font/CSS/router-context regressions
 *      the resolve+import probe cannot see.
 *
 * Subpaths covered (must stay in sync with package.json#exports):
 *   '.'            → main barrel (Button, Card, …)
 *   './tokens'     → design-token bridge (default export)
 *   './tokens.css' → base stylesheet (resolve-only; Node can't import CSS)
 *   './cn'         → cn() class-merge helper
 *   './manifest'   → hds-manifest.json as ESM (default export)
 *   './contexts'   → React context providers (ThemeProvider, …)
 *   './eslint-plugin' → the consumer ESLint plugin (configs.recommended)
 * plus AGENTS.md and the hds-mcp bin (section 3f), and the upgrade command's
 * design-system bin run with --dry-run on a small project (section 3g).
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

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTsxFences } from './lib/doc-fences.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PKG = '@hirobius/design-system';

const KEEP = process.argv.includes('--keep');
const SKIP_BUILD = process.argv.includes('--skip-build');

function log(msg) {
  console.log(`[smoke-consumer] ${msg}`);
}

// On Windows, npm / pnpm / npx are `.cmd` shims. CreateProcess cannot launch
// them by bare name (spawnSync ENOENT), and Node refuses to spawn a .cmd without
// a shell, so those three run through cmd.exe there. Arguments holding
// whitespace or cmd.exe metacharacters are double-quoted — unquoted, cmd would
// eat the caret in `react@^18.3` and install a narrower version range. Every
// other platform keeps the shell-free spawn.
const WINDOWS_CMD_SHIMS = new Set(['npm', 'pnpm', 'npx']);

function run(cmd, args, opts = {}) {
  if (process.platform === 'win32' && WINDOWS_CMD_SHIMS.has(cmd)) {
    const line = [cmd, ...args.map((a) => (/[\s^&|<>()]/.test(a) ? `"${a}"` : a))].join(' ');
    return execFileSync(line, { stdio: 'inherit', cwd: ROOT, shell: true, ...opts });
  }
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
const resolvable = ['.', './tokens', './tokens.css', './styles.css', './variables.css', './static.css', './cn', './manifest', './contexts', './mui', './icons', './eslint-plugin']
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
  [PKG + '/icons', (m) => assert.equal(typeof m.Ellipsis, 'object', 'Ellipsis icon missing')],
  [PKG + '/contexts', (m) => assert.equal(typeof m.ThemeProvider, 'function', 'ThemeProvider missing')],
  [PKG + '/eslint-plugin', (m) => {
    assert.ok(Array.isArray(m.default?.configs?.recommended), 'eslint-plugin recommended config missing');
    assert.equal(typeof m.default.rules['no-raw-controls'], 'object', 'no-raw-controls rule missing');
  }],
  [PKG + '/mui', (m) => {
    assert.equal(typeof m.hdsMuiThemeOptions, 'function', 'hdsMuiThemeOptions missing');
    const opts = m.hdsMuiThemeOptions();
    assert.ok(opts.palette && opts.palette.error && String(opts.palette.error.main).startsWith('var(--'), 'mui palette not token-wired');
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
import { readFileSync, existsSync } from 'node:fs';
import { join as pjoin, dirname as pdirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

check('tokens.css ships tokens + [data-hds] scope and NO fonts', () => {
  const cssPath = fileURLToPath(import.meta.resolve(PKG + '/tokens.css'));
  const css = readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('--semantic-color-surface-page'), 'token var missing from tokens.css');
  assert.ok(!css.includes('@font-face'), 'tokens.css carries @font-face (hds#479 regression)');
  assert.ok(!css.includes('data:font'), 'tokens.css embeds fonts (hds#479 regression)');
  assert.ok(css.includes('--hds-font-family'), 'font-family variables missing from tokens.css');
  assert.ok(css.includes('[data-hds]'), 'base styles not scoped to [data-hds] (P0.5 regression)');
});

// hds#479: fonts are an opt-in export. fonts.css must declare all four faces
// with URLs relative to itself, and every woff2 it names must ship beside it.
check('fonts.css ships 4 faces with relative URLs and the woff2 files', () => {
  const cssPath = fileURLToPath(import.meta.resolve(PKG + '/fonts.css'));
  const css = readFileSync(cssPath, 'utf8');
  assert.equal(css.match(/@font-face/g)?.length, 4, 'expected 4 @font-face blocks');
  assert.ok(css.includes('font-display: swap'), 'font-display: swap missing');
  assert.ok(!css.includes('data:font'), 'fonts.css must reference files, not embed them');
  const urls = [...css.matchAll(/url\\(['"]?([^'")]+)['"]?\\)/g)].map((m) => m[1]);
  assert.equal(urls.length, 4, 'expected 4 font URLs');
  for (const u of urls) {
    assert.ok(u.startsWith('./fonts/'), 'font URL must be relative to fonts.css: ' + u);
    assert.ok(existsSync(pjoin(pdirname(cssPath), u)), 'font file missing from package: ' + u);
  }
});

// Gap 1: styles.css = tokens + components + utilities + fonts, but NO global
// preflight. It must style HDS components (utilities + scoped base) while
// changing ZERO host-element styles (no unscoped reset). Structural assertion
// stands in for a browser: the global preflight signatures must be ABSENT and
// the scoped base + utilities + fonts must be PRESENT.
check('styles.css ships components/utilities with NO global reset', () => {
  const cssPath = fileURLToPath(import.meta.resolve(PKG + '/styles.css'));
  const css = readFileSync(cssPath, 'utf8');
  // present: components can render + fonts + scoped base
  assert.ok(css.includes('@layer utilities'), 'utilities layer missing — components would be unstyled');
  assert.ok(css.includes(':where([data-hds])'), 'scoped [data-hds] base missing from styles.css');
  assert.ok(!css.includes('@font-face'), 'styles.css carries @font-face (hds#479 regression)');
  assert.ok(css.includes('--semantic-color-surface-page'), 'token vars missing from styles.css');
  // absent: global preflight that would restyle host elements
  assert.ok(!css.includes('border:0 solid;margin:0;padding:0'), 'global universal reset leaked into styles.css');
  assert.ok(!css.includes('html,:host{'), 'global html/:host reset leaked into styles.css');
  assert.ok(!css.includes('h1,h2,h3,h4,h5,h6{font-size:inherit'), 'global heading reset leaked into styles.css');
});

// #64: static.css = plain .hds-* classes for Badge/Card/Alert/Divider/Tag,
// no React, no reset — the CSS-only static-primitive layer for Astro/HTML
// pages. Structural assertion: every one of the five primitive classes is
// present, it's token-bound (references design-token custom properties), and
// it carries no global reset that would leak into a host page.
check('static.css ships the five .hds-* static primitives, host-safe', () => {
  const cssPath = fileURLToPath(import.meta.resolve(PKG + '/static.css'));
  const css = readFileSync(cssPath, 'utf8');
  for (const cls of ['.hds-badge', '.hds-card', '.hds-alert', '.hds-divider', '.hds-tag']) {
    assert.ok(css.includes(cls), 'static.css missing ' + cls);
  }
  assert.ok(css.includes('var(--semantic-') || css.includes('var(--component-'), 'static.css is not token-bound');
  assert.ok(!css.includes('border:0 solid;margin:0;padding:0'), 'global universal reset leaked into static.css');
  assert.ok(!css.includes('html,:host{'), 'global html/:host reset leaked into static.css');
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
      "import { Icon } from '@hirobius/design-system';",
      "import { Ellipsis } from '@hirobius/design-system/icons';",
      "import { cn } from '@hirobius/design-system/cn';",
      "import manifest from '@hirobius/design-system/manifest';",
      '// Types must resolve from dist/*.d.ts (not source) under skipLibCheck.',
      'export const a = <Button className={cn(String(hds ? 1 : 0))}>Hi</Button>;',
      'export const b = Object.keys(manifest).length;',
      // Button iconOnly + Icon proves a LucideIcon from ./icons resolves from dist
      // (the icon-only recipe since 0.20.0, hds#394).
      'export const d = <Button iconOnly aria-label="Row actions" iconLeft={<Icon icon={Ellipsis} />} />;',
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

// ── 3c2. Starter kit + doc samples compile against the packed build (hds#457) ──
// The starter kit and every ```tsx fence the package teaches from are typechecked
// as a consumer would see them: against the installed tarball's dist/*.d.ts.
// Fences are fragments, so only diagnostics that mean "this sample uses an API
// the package does not have" fail (missing export/module, unknown prop or
// member, wrong prop type); undeclared locals like `rows` are ignored. A
// fixture fence importing a removed name must be flagged, or the check is blind.
const DOC_SAMPLE_FILES = [
  'CONSUMING.md',
  'docs/CONSUMING.md',
  'MIGRATIONS.md',
  'llms.txt',
  'public/llms.txt',
  'public/llms-full.txt',
  'skills/hds-consumer/SKILL.md',
];
// 2305/2724 no (such) exported member, 2307 module not found, 2614 no export to
// import, 2339/2551 unknown property, 2322/2769/2353 prop mismatches. Missing-required-prop (2741) is not
// here: a fragment that elides children or props is not stale.
const API_DRIFT_CODES = new Set([2305, 2307, 2339, 2353, 2322, 2551, 2614, 2724, 2769]);
let ranSamples = false;
// Real gaps in the package, tracked in an issue and listed so the check can ship
// green. Remove the entry when its issue closes; an entry that no longer matches
// anything fails (stale allowance).
const KNOWN_GAPS = [
  { issue: 'hirobius/hds#676', file: 'docs/CONSUMING.md', code: 2322, msg: 'Ref<unknown>' },
];
const FIXTURE_NAME = 'fixture-removed-name';

if (ok) {
  log('typechecking starter-kit and doc ```tsx fences against the packed build…');
  // The optional peers the form/scroll docs import, so those fences resolve.
  run(
    'npm',
    [
      'install',
      'react-hook-form@^7',
      'zod@^3.23',
      '@hookform/resolvers@^3.9',
      'lenis@^1.3',
      '--no-save',
      '--no-audit',
      '--no-fund',
      '--loglevel',
      'error',
    ],
    { cwd: app },
  );
  const samples = join(app, 'doc-samples');
  mkdirSync(samples, { recursive: true });
  const origin = new Map(); // generated file name → "doc:line"
  let n = 0;
  for (const rel of DOC_SAMPLE_FILES) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    for (const f of extractTsxFences(readFileSync(abs, 'utf8'), rel)) {
      const name = `sample-${String(n++).padStart(3, '0')}.tsx`;
      writeFileSync(join(samples, name), `${f.code}\nexport {};\n`);
      origin.set(name, `${rel}:${f.line}`);
    }
  }
  writeFileSync(
    join(samples, `${FIXTURE_NAME}.tsx`),
    `import { HdsButton } from '${PKG}';\nexport const x = <HdsButton>Hi</HdsButton>;\n`,
  );
  const kit = join(app, 'starter-kit');
  mkdirSync(join(kit, 'src'), { recursive: true });
  for (const f of readdirSync(join(ROOT, 'starter-kit', 'src'))) {
    writeFileSync(join(kit, 'src', f), readFileSync(join(ROOT, 'starter-kit', 'src', f)));
  }
  writeFileSync(join(kit, 'css.d.ts'), "declare module '*.css';\n");
  writeFileSync(
    join(app, 'tsconfig.samples.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          strict: false,
          skipLibCheck: true,
          noEmit: true,
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ES2022',
          jsx: 'react-jsx',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: [],
        },
        include: ['doc-samples', 'starter-kit'],
      },
      null,
      2,
    )}\n`,
  );
  // Fences are fragments: bare sibling JSX elements are a syntax error, and
  // `tsc -p` then skips semantic checks for the whole project. So ask the compiler
  // API for each file's semantic diagnostics, which it still produces.
  writeFileSync(
    join(app, 'check-samples.cjs'),
    [
      "const ts = require('typescript');",
      "const cfg = ts.getParsedCommandLineOfConfigFile('tsconfig.samples.json', {}, {",
      '  ...ts.sys,',
      '  onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(String(d.messageText)); },',
      '});',
      'const program = ts.createProgram(cfg.fileNames, cfg.options);',
      'const out = [];',
      'for (const sf of program.getSourceFiles()) {',
      "  if (sf.fileName.includes('node_modules')) continue;",
      '  for (const d of program.getSemanticDiagnostics(sf)) {',
      '    const { line } = sf.getLineAndCharacterOfPosition(d.start ?? 0);',
      "    out.push({ file: sf.fileName, line: line + 1, code: d.code, msg: ts.flattenDiagnosticMessageText(d.messageText, ' ') });",
      '  }',
      '}',
      'console.log(JSON.stringify(out));',
    ].join('\n'),
  );
  const tsc = spawnSync(process.execPath, ['check-samples.cjs'], { cwd: app, encoding: 'utf8' });
  let diags = [];
  try {
    diags = JSON.parse(tsc.stdout).filter(
      // A sample may import a third-party lib the scratch app does not install
      // (MUI): only a missing module of ours is drift.
      (d) => API_DRIFT_CODES.has(d.code) && (d.code !== 2307 || d.msg.includes(PKG)),
    );
  } catch {
    console.error(`  samples FAIL could not read the compiler output: ${tsc.stderr || tsc.stdout}`);
    ok = false;
  }
  const problems = [];
  if (!diags.some((d) => d.file.endsWith(`${FIXTURE_NAME}.tsx`))) {
    problems.push('negative control: a fixture fence importing a removed name was NOT flagged');
  }
  const usedGaps = new Set();
  for (const d of diags) {
    if (d.file.endsWith(`${FIXTURE_NAME}.tsx`)) continue;
    const gap = KNOWN_GAPS.find(
      (g) =>
        g.code === d.code &&
        d.msg.includes(g.msg) &&
        (origin.get(d.file.split('/').pop()) ?? '').startsWith(`${g.file}:`),
    );
    if (gap) {
      usedGaps.add(gap);
      continue;
    }
    const base = d.file.split('/').pop();
    const where = d.file.includes('starter-kit/')
      ? `${d.file.replace(/^.*?starter-kit\//, 'starter-kit/')}:${d.line}`
      : `${origin.get(base) ?? d.file} (fence line ${d.line})`;
    problems.push(`${where} TS${d.code}: ${d.msg}`);
  }
  for (const g of KNOWN_GAPS) {
    if (!usedGaps.has(g)) problems.push(`stale KNOWN_GAPS entry for ${g.issue}: remove it`);
  }
  if (n === 0) problems.push('no ```tsx fences were extracted from the doc files');
  if (problems.length) {
    for (const p of problems) console.error(`  samples FAIL ${p}`);
    ok = false;
  } else {
    ranSamples = true;
    console.log(
      `  samples ok   starter-kit + ${n} doc fences compile; stale-name fixture was flagged`,
    );
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

// ── 3e. Consumer vite build (no router/form/zod installed) ───────────────────
// Proves a leaf import builds in a real consumer WITHOUT the optional peers
// (react-router / react-hook-form / zod / @hookform/resolvers). Uses a separate
// clean app so those peers are genuinely absent.
if (ok) {
  log('running consumer vite build (Button only, no router/form/zod)…');
  const viteApp = join(scratch, 'vite-app');
  mkdirSync(join(viteApp, 'src'), { recursive: true });
  writeFileSync(
    join(viteApp, 'package.json'),
    `${JSON.stringify({ name: 'hds-vite-consumer', private: true, version: '0.0.0', type: 'module' }, null, 2)}\n`,
  );
  writeFileSync(
    join(viteApp, 'vite.config.js'),
    "import react from '@vitejs/plugin-react';\nexport default { plugins: [react()], logLevel: 'warn' };\n",
  );
  writeFileSync(
    join(viteApp, 'index.html'),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n',
  );
  writeFileSync(
    join(viteApp, 'src', 'main.jsx'),
    [
      "import { createRoot } from 'react-dom/client';",
      "import { Button } from '@hirobius/design-system';",
      "import '@hirobius/design-system/tokens.css';",
      "createRoot(document.getElementById('root')).render(<Button>Hi</Button>);",
      '',
    ].join('\n'),
  );
  try {
    run(
      'npm',
      [
        'install',
        tarballPath,
        'react@^18.3',
        'react-dom@^18.3',
        'vite@^6',
        '@vitejs/plugin-react@^4',
        '--no-audit',
        '--no-fund',
        '--loglevel',
        'error',
      ],
      { cwd: viteApp, stdio: 'inherit' },
    );
    run('npx', ['vite', 'build'], { cwd: viteApp, stdio: 'inherit' });
    console.log('  build ok   consumer vite build succeeded without router/form/zod');
  } catch {
    console.error('  build FAIL consumer vite build errored');
    ok = false;
  }
}

// ── 3f. Agent tooling — AGENTS.md and the hds-mcp bin, as installed ─────────
// The after arm of eval/consistency/CONDITIONS.md reads these from node_modules,
// so check them there: the file is present, the bin is linked, and the server
// answers initialize and one tools/call over stdio from the installed copy.
if (ok) {
  log('probing agent tooling (AGENTS.md, hds-mcp over stdio)…');
  const pkgDir = join(app, 'node_modules', '@hirobius', 'design-system');
  const binDir = join(app, 'node_modules', '.bin');
  const problems = [];
  if (!existsSync(join(pkgDir, 'AGENTS.md'))) problems.push('AGENTS.md missing from the package');
  if (!existsSync(join(binDir, 'hds-mcp')) && !existsSync(join(binDir, 'hds-mcp.cmd'))) {
    problems.push('hds-mcp bin not linked into node_modules/.bin');
  }
  const input =
    [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'smoke', version: '0' },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'get_component', arguments: { name: 'MetricTiles' } },
      },
    ]
      .map((m) => JSON.stringify(m))
      .join('\n') + '\n';
  const res = spawnSync(process.execPath, [join(pkgDir, 'mcp', 'hds-mcp.mjs')], {
    input,
    encoding: 'utf8',
    timeout: 15_000,
  });
  try {
    const [init, call] = res.stdout
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    if (init.result?.serverInfo?.name !== 'hds')
      problems.push('initialize did not return serverInfo.name "hds"');
    const data = JSON.parse(call.result.content[0].text);
    if (data.import !== `${PKG}/patterns`)
      problems.push(`get_component MetricTiles import was ${data.import}`);
  } catch (err) {
    problems.push(`hds-mcp did not answer (${err.message}); stderr: ${res.stderr}`);
  }
  if (problems.length) {
    for (const p of problems) console.error(`  agents FAIL ${p}`);
    ok = false;
  } else {
    console.log('  agents ok   AGENTS.md shipped, hds-mcp linked and answering over stdio');
  }
}

// ── 3g. The upgrade command — the packed bin, --dry-run on a small project ───
// `npx @hirobius/design-system@latest upgrade` runs the `design-system` bin of
// the published tarball (hds#452), so run that bin as installed: against a
// project on the floor release that still imports an Hds* alias, a dry run
// must list the codemod fix, print the four sections, exit 1 (work left) and
// write nothing.
let ranUpgrade = false;
if (ok) {
  log('running the packed upgrade bin (design-system upgrade --dry-run)…');
  const problems = [];
  const binDir = join(app, 'node_modules', '.bin');
  for (const bin of ['design-system', 'hds-upgrade']) {
    if (!existsSync(join(binDir, bin)) && !existsSync(join(binDir, `${bin}.cmd`))) {
      problems.push(`${bin} bin not linked into node_modules/.bin`);
    }
  }
  const project = join(scratch, 'upgrade-fixture');
  mkdirSync(join(project, 'src'), { recursive: true });
  const fixture = {
    'package.json': `${JSON.stringify({ name: 'upgrade-fixture', private: true, version: '0.0.0', dependencies: { [PKG]: '^0.16.0' } }, null, 2)}\n`,
    'package-lock.json': `${JSON.stringify({ name: 'upgrade-fixture', lockfileVersion: 3, requires: true, packages: { '': { name: 'upgrade-fixture', dependencies: { [PKG]: '^0.16.0' } }, [`node_modules/${PKG}`]: { version: '0.16.0' } } }, null, 2)}\n`,
    'src/app.tsx': `import { HdsCheckbox } from '${PKG}';\nexport const a = <HdsCheckbox />;\n`,
  };
  for (const [file, text] of Object.entries(fixture)) writeFileSync(join(project, file), text);
  // On Windows the bin is a .cmd shim that only cmd.exe starts, and the tmp
  // project path may hold a space: run the file it points at through node
  // instead, with the path as a plain argument (never a shell).
  const upgradeArgs = ['upgrade', '--root', project, '--dry-run', '--no-install', '--no-typecheck'];
  const res =
    process.platform === 'win32'
      ? spawnSync(
          process.execPath,
          [join(app, 'node_modules', ...PKG.split('/'), 'codemods', 'upgrade.mjs'), ...upgradeArgs],
          { encoding: 'utf8', timeout: 60_000 },
        )
      : spawnSync(join(binDir, 'design-system'), upgradeArgs, {
          encoding: 'utf8',
          timeout: 60_000,
        });
  if (res.status !== 1) {
    problems.push(`exit ${res.status} (want 1, work left); stderr: ${res.stderr}`);
  }
  for (const heading of ['Fixed for you', 'Looks different', 'Coming next', 'Do by hand']) {
    if (!res.stdout?.includes(heading)) problems.push(`no "${heading}" section in its output`);
  }
  if (!res.stdout?.includes('HdsCheckbox')) problems.push('the HdsCheckbox fix is not listed');
  for (const [file, text] of Object.entries(fixture)) {
    if (readFileSync(join(project, file), 'utf8') !== text)
      problems.push(`--dry-run changed ${file}`);
  }
  if (problems.length) {
    for (const p of problems) console.error(`  upgrade FAIL ${p}`);
    if (res.stdout) console.error(res.stdout);
    ok = false;
  } else {
    ranUpgrade = true;
    console.log(
      '  upgrade ok   packed design-system bin ran --dry-run: 4 sections, exit 1, no file changed',
    );
  }
}

// ── 4. Report + cleanup ──────────────────────────────────────────────────────

// Outcome check: a green run must have actually run the 3g upgrade bin smoke,
// so disabling that block cannot leave this script passing.
if (ok && !ranSamples) {
  console.error('  samples FAIL starter-kit/doc sample typecheck did not run');
  ok = false;
}
if (ok && !ranUpgrade) {
  console.error('  upgrade FAIL upgrade bin smoke did not run');
  ok = false;
}

if (ok) {
  log('PASS — every public subpath resolves and imports cleanly.');
  if (!KEEP) rmSync(scratch, { recursive: true, force: true });
  process.exit(0);
} else {
  console.error(`[smoke-consumer] FAIL — scratch app kept for debugging: ${app}`);
  process.exit(1);
}
