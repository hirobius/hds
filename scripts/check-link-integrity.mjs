#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-link-integrity.mjs — merged gate (13z-6)
 *
 * Merged from:
 *   check-doc-references.mjs — active docs do not point at missing local files
 *   check-external-links.mjs — external <a href> URLs return non-4xx
 *   check-route-links.mjs    — internal href/to route targets are known app routes
 *
 * Default (no flags): runs all three sub-checks in sequence.
 * Sub-mode flags (run one check in isolation):
 *   --doc-refs-only      Doc reference check only (replaces: check:doc-refs)
 *   --external-only      External link check only (replaces: check:external-links)
 *   --route-links-only   Route link check only (replaces: check:routes)
 *
 * Escape hatches:
 *   Doc refs:    <!-- doc-ref-ok: <reason> --> on the same line
 *   Route links: // route-ok: <reason> on the same line
 *
 * Exit codes: 0 = clean, 1 = violations, 2 = runtime error
 *
 * Run:
 *   node scripts/check-link-integrity.mjs                  (all checks)
 *   node scripts/check-link-integrity.mjs --doc-refs-only  (doc refs only)
 *   node scripts/check-link-integrity.mjs --external-only  (external links only)
 *   node scripts/check-link-integrity.mjs --route-links-only (route links only)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, normalize, isAbsolute, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { isSpecFile } from './lib/gate-scope.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/**
 * Which of `paths` .gitignore covers, asked of git in one call.
 *
 * Fails open: outside a git checkout, or if git is missing, every path comes
 * back un-ignored and the gate behaves exactly as it did before. A link check
 * must not start passing because git was unavailable.
 *
 * @param {string[]} paths - repo-relative paths
 * @returns {Set<string>} the subset git reports as ignored
 */
export function gitIgnoredPaths(paths) {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Set();

  const run = spawnSync('git', ['check-ignore', '--stdin'], {
    cwd: ROOT,
    input: `${unique.join('\n')}\n`,
    encoding: 'utf8',
  });

  // 0 = at least one ignored, 1 = none ignored. Anything else (128: not a
  // repository) means git could not answer, so claim nothing.
  if (run.error || (run.status !== 0 && run.status !== 1)) return new Set();

  return new Set(
    (run.stdout ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

const args = process.argv.slice(2);
const argSet = new Set(args);

const MODE_DOC_REFS = argSet.has('--doc-refs-only');
const MODE_EXTERNAL = argSet.has('--external-only');
const MODE_ROUTE_LINKS = argSet.has('--route-links-only');
const RUN_ALL = !MODE_DOC_REFS && !MODE_EXTERNAL && !MODE_ROUTE_LINKS;

// External-URL liveness is network-dependent (proxy/bot-block/transient-outage prone) and the
// gate is declared `severity: warn` in docs/guardrails/registry.json. So a broken external link
// warns but does NOT fail the run by default — keeping it out of the hard pre-push/CI gate.
// Opt into enforcement (e.g. a scheduled link-health job) with --strict-external or env.
const STRICT_EXTERNAL = argSet.has('--strict-external') || process.env.HDS_STRICT_EXTERNAL === '1';

const isFixtureMode = argSet.has('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

let hadFailure = false;

// ─── Sub-check 1: Doc references (check-doc-references logic) ─────────────────

function runDocRefsCheck() {
  const DOC_FILES_BASE = [
    'README.md',
    'OPERATING_MAP.md',
    'SYSTEMS_REGISTRY.md',
    'AGENT_CONTEXT_SYSTEM.md',
    'TOKEN_GOVERNANCE.md',
    'ATTRIBUTIONS.md',
    'CLAUDE.md',
    'claude-config/CLAUDE.md',
    'public/assets/README.md',
    'public/assets/mds/README.md',
  ];

  // In fixture mode, scan only the provided fixture file (using relative path from ROOT)
  const DOC_FILES =
    isFixtureMode && fixtureFile ? [relative(ROOT, resolve(fixtureFile))] : DOC_FILES_BASE;

  const FILEISH_EXT = /\.(md|tsx?|mjs|cjs|json|css|html|ya?ml|toml)$/i;
  const BACKTICK_RE = /`([^`\n]+)`/g;
  const QUOTED_PATH_RE = /['"]([^'"\n]+?\.(?:md|tsx?|mjs|cjs|json|css|html|ya?ml|toml))['"]/gi;

  const SKIP_EXACT = new Set(['main', 'MIT', 'CC BY 4.0', 'Light/Dark', 'W3C DTCG 2025.10']);

  function looksLikeLocalFileRef(token) {
    if (FILEISH_EXT.test(token) && token.includes('/')) return true;
    return (
      token.startsWith('src/') ||
      token.startsWith('scripts/') ||
      token.startsWith('docs/') ||
      token.startsWith('public/') ||
      token.startsWith('claude-config/') ||
      token.startsWith('.github/') ||
      token.startsWith('.githooks/') ||
      token === 'package.json' ||
      token === 'pnpm-lock.yaml' ||
      token === 'vite.config.ts' ||
      token === 'vercel.json' ||
      token === '.gitignore'
    );
  }

  function shouldSkipToken(token) {
    if (!token) return true;
    if (SKIP_EXACT.has(token)) return true;
    if (!looksLikeLocalFileRef(token)) return true;
    if (token.startsWith('~/')) return true;
    if (token.startsWith('http://') || token.startsWith('https://')) return true;
    if (token.startsWith('/')) return true;
    if (
      token.startsWith('pnpm ') ||
      token.startsWith('git ') ||
      token.startsWith('node ') ||
      token.startsWith('npx ')
    )
      return true;
    if (token.startsWith('@')) return true; // scoped npm package specifier (e.g. @hirobius/design-system/tokens.css), not a local file
    if (token.startsWith('<!--')) return true;
    if (token.includes('://')) return true;
    if (token.includes('*')) return true;
    if (token.includes(' -> ')) return true;
    if (token.includes(' → ')) return true;
    if (token.startsWith('/tmp/')) return true;
    if (/^[A-Z]:\\/.test(token)) return true;
    return false;
  }

  function resolveCandidate(raw, filePath) {
    const trimmed = raw.trim().replace(/^[./]+(?=[^/])/, (match) => match);
    if (isAbsolute(trimmed)) return normalize(trimmed);
    return normalize(join(dirname(filePath), trimmed));
  }

  const violations = [];

  for (const relPath of DOC_FILES) {
    const filePath = join(ROOT, relPath);
    if (!existsSync(filePath)) continue;

    const lines = readFileSync(filePath, 'utf8').split('\n');

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (line.includes('doc-ref-ok')) continue;

      const refs = [];
      for (const match of line.matchAll(BACKTICK_RE)) refs.push(match[1]);
      for (const match of line.matchAll(QUOTED_PATH_RE)) refs.push(match[1]);

      for (const ref of refs) {
        if (shouldSkipToken(ref)) continue;

        const candidate = resolveCandidate(ref, filePath);
        const fallback = normalize(join(ROOT, ref));

        const ok = existsSync(candidate) || existsSync(fallback);
        if (!ok) {
          violations.push({ file: relPath, line: idx + 1, ref });
        }
      }
    }
  }

  // A reference to a build output is not a broken link. `figma/model.json` is
  // gitignored — "generated from hirobius.tokens.json by build-figma-model.mjs"
  // — so it is absent from every clean checkout by design, and the four docs
  // naming it are correctly telling a reader what `pnpm figma:model` produces.
  // Four of this gate's nine reported misses were that one path, which it could
  // never stop reporting. Asking git rather than reimplementing .gitignore
  // keeps the two definitions of "generated" from drifting apart.
  //
  // This deliberately does not excuse figma/snapshot.json: that one IS meant to
  // be committed and is genuinely missing (hds#236), which is a real finding.
  const ignored = gitIgnoredPaths(violations.map((v) => v.ref));
  const realViolations = violations.filter((v) => !ignored.has(v.ref));
  violations.length = 0;
  violations.push(...realViolations);

  if (violations.length === 0) {
    console.log(
      '\n✓ check-link-integrity [doc-refs] — active docs point at existing local files.\n',
    );
    return true;
  }

  console.error(
    `\n✗ check-link-integrity [doc-refs] — ${violations.length} missing local reference(s).\n`,
  );
  console.error(
    '  Fix the path, trim the stale reference, or add <!-- doc-ref-ok: reason --> on the line.\n',
  );
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}`);
    console.error(`    missing: ${violation.ref}`);
  }
  console.error('');
  return false;
}

// ─── Sub-check 2: External links (check-external-links logic) ─────────────────

async function runExternalLinksCheck() {
  const TIMEOUT_MS = 5000;
  const MAX_REDIRECTS = 3;

  function extractExternalLinksFromSource() {
    const links = new Set();
    const srcDir = join(ROOT, 'src/app');

    function walkDir(dir) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          try {
            const content = readFileSync(fullPath, 'utf8');
            const hrefPattern = /href=['"]((https?):\/\/[^\s'"]+)['"]/g;
            let match;
            while ((match = hrefPattern.exec(content)) !== null) {
              links.add(match[1].replace(/['"]/g, ''));
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    walkDir(srcDir);
    return Array.from(links).sort();
  }

  function fetchUrl(urlString, redirectCount = 0) {
    return new Promise((resolve) => {
      if (redirectCount > MAX_REDIRECTS) {
        resolve({ status: 0, error: 'Too many redirects' });
        return;
      }

      const url = new URL(urlString);
      const client = url.protocol === 'https:' ? https : http;
      const timeout = setTimeout(() => {
        resolve({ status: 0, error: `Timeout after ${TIMEOUT_MS}ms` });
      }, TIMEOUT_MS);

      const options = {
        method: 'HEAD',
        timeout: TIMEOUT_MS,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; HDS link checker)' },
      };

      const req = client.request(url, options, (res) => {
        clearTimeout(timeout);
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, urlString).toString();
          fetchUrl(redirectUrl, redirectCount + 1).then(resolve);
        } else if (res.statusCode === 405) {
          const getReq = client.request(url, { ...options, method: 'GET' }, (getRes) => {
            clearTimeout(timeout);
            resolve({ status: getRes.statusCode, error: null });
          });
          getReq.on('error', () => resolve({ status: 405, error: null }));
          getReq.end();
        } else {
          resolve({ status: res.statusCode, error: null });
        }
      });

      req.on('error', (e) => {
        clearTimeout(timeout);
        resolve({ status: 0, error: e.message });
      });
      req.on('timeout', () => {
        req.destroy();
        clearTimeout(timeout);
        resolve({ status: 0, error: `Timeout after ${TIMEOUT_MS}ms` });
      });
      req.end();
    });
  }

  const links = extractExternalLinksFromSource();

  if (links.length === 0) {
    console.log('✓ check-link-integrity [external] — no external links found in source.');
    return true;
  }

  console.log(`Checking ${links.length} external link(s)...`);
  const failures = [];
  const results = [];

  for (const url of links) {
    try {
      const { status, error } = await fetchUrl(url);
      const isDeadLink = status === 404 || status === 410 || (status >= 400 && status <= 403);
      const isNetworkError = status === 0 || status >= 999;
      const passed = !isDeadLink && !isNetworkError;
      results.push({ url, status, error, passed });
      if (isNetworkError) {
        console.log(`⚠ ${url} → ${status || 'TIMEOUT'} (skipped)`);
      } else if (!passed) {
        failures.push({ url, status, error });
        console.log(`✗ ${url} → ${status || 'ERROR'} ${error ? `(${error})` : ''}`);
      } else {
        console.log(`✓ ${url} → ${status}`);
      }
    } catch (e) {
      results.push({ url, status: 0, error: e.message, passed: true });
      console.log(`⚠ ${url} → ERROR (${e.message}, skipped)`);
    }
  }

  console.log('');
  console.log(`Results: ${results.length - failures.length}/${results.length} passed`);

  if (failures.length === 0) {
    console.log('\n✓ check-link-integrity [external] — all external links healthy.\n');
    return true;
  }
  console.error(
    `\n✗ check-link-integrity [external] — ${failures.length} broken external link(s).\n`,
  );
  return false;
}

// ─── Sub-check 3: Route links (check-route-links logic) ────────────────────────

function runRouteLinksCheck() {
  const SCAN_DIRS = [join(ROOT, 'src/app')];

  const SKIP_DIRS = new Set(['figma', 'node_modules', 'dist', 'demos']);
  const SKIP_FILES = new Set(['generated-tokens.ts']);

  const EXACT_ROUTES = new Set([
    '/',
    '/info',
    '/lab',
    '/lab/particle-tunnel',
    '/404',
    '/portfolio',
    '/hds',
    '/hds/system',
    '/hds/process',
    '/hds/color',
    '/hds/typography',
    '/hds/spacing',
    '/hds/shape',
    '/hds/borders',
    '/hds/elevation',
    '/hds/motion',
    '/hds/breakpoints',
    '/hds/components',
    '/hds/components/actions',
    '/hds/components/inputs',
    '/hds/components/display',
    '/hds/components/media',
    '/hds/components/navigation',
    '/hds/components/layout',
    '/hds/components/doc-utilities',
    '/hds/components/system-primitives',
    '/hds/icons',
    '/hds/guidance',
    '/hds/tech-stack',
    '/hds/license',
    '/hds/tokens',
    '/hds/case-studies/xbox-design-system',
    '/hds/case-studies/microsoft-game-dev',
    '/hds/case-studies/xbox-design-lab-xdd',
    '/hds/case-studies/hirobius',
    '/case-studies/hirobius',
    '/vibe-sketchbook',
    '/vibe-sketchbook/cloth-simulation',
    '/hds/system-contract',
    '/hds/burn-down',
    '/hds/sandbox',
    '/hds/contribution-guide',
    '/hds/brand-theming',
    '/microsoft-design-systems',
    '/ops',
    '/ops/briefing',
    '/ops/atlas',
    '/ops/build',
    '/ops/sessions',
    '/admin/approvals',
  ]);

  // HDS doc routes moved from /hds/* to /ops/hds/* (commit 3bf17b5b, 2026-05-10).
  // Defined under routes.tsx children of 'ops' (lines 297-366) with a wildcard
  // fallback redirecting unknown /ops/hds/* paths to /ops/hds/color.
  const PREFIX_ROUTES = ['/portfolio/', '/ops/clients/', '/ops/hds/', '/admin/approvals/'];

  // Augment the static allow-list with routes actually declared in the app
  // route tree (the source of truth), so this check doesn't drift when routes
  // are added or moved. (2026-06: routes moved from /hds/* and /ops/* to
  // top-level paths; the static list lagged behind and flagged valid links.)
  try {
    const routeTreeSrc = readFileSync(join(ROOT, 'src/app/route-tree.tsx'), 'utf8');
    for (const m of routeTreeSrc.matchAll(/path:\s*['"]([^'"]+)['"]/g)) {
      const p = m[1];
      if (p === '*') continue;
      if (p.endsWith('/*')) {
        PREFIX_ROUTES.push('/' + p.slice(0, -1));
        continue;
      }
      EXACT_ROUTES.add(p.startsWith('/') ? p : '/' + p);
    }
  } catch {
    /* route tree unreadable — fall back to the static allow-list above */
  }

  const ROUTE_RE = /(?:href|to)\s*=\s*["'](\/[^"'#?]*)["']/g;

  function isAllowedRoute(route) {
    if (EXACT_ROUTES.has(route)) return true;
    return PREFIX_ROUTES.some((prefix) => route.startsWith(prefix));
  }

  const violations = [];

  function scanFile(filePath) {
    const rel = relative(ROOT, filePath).replace(/\\/g, '/');
    const lines = readFileSync(filePath, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('route-ok')) continue;
      for (const match of line.matchAll(ROUTE_RE)) {
        const route = match[1];
        if (!isAllowedRoute(route)) {
          violations.push({ file: rel, line: i + 1, route });
        }
      }
    }
  }

  function scanDir(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(entry)) scanDir(full);
        continue;
      }
      if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) continue;
      if (SKIP_FILES.has(entry)) continue;
      // doc-link-card.test.tsx and top-nav.test.tsx supplied all 8 reported
      // "invalid routes" — /a, /b, /x, /start and friends, which are fixture
      // hrefs chosen precisely because they are not real routes.
      if (isSpecFile(entry)) continue;
      scanFile(full);
    }
  }

  for (const dir of SCAN_DIRS) {
    scanDir(dir);
  }

  if (violations.length === 0) {
    console.log(
      '\n✓ check-link-integrity [route-links] — internal route targets resolve to known app routes.\n',
    );
    return true;
  }

  console.error(
    `\n✗ check-link-integrity [route-links] — ${violations.length} invalid internal route reference(s).\n`,
  );
  console.error(
    '  Fix the route, add the missing route definition, or add // route-ok: reason on the line.\n',
  );
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}`);
    console.error(`    invalid route: ${violation.route}`);
  }
  console.error('');
  return false;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    if (RUN_ALL || MODE_DOC_REFS) {
      const ok = runDocRefsCheck();
      if (!ok) hadFailure = true;
    }

    if ((RUN_ALL || MODE_EXTERNAL) && !isFixtureMode) {
      const ok = await runExternalLinksCheck();
      if (!ok) {
        if (STRICT_EXTERNAL) {
          hadFailure = true;
        } else {
          console.warn(
            '⚠ check-link-integrity [external] — external link failures are non-blocking by default ' +
              '(registry severity: warn; liveness is network-dependent and proxy/bot-block prone). ' +
              'Enforce with --strict-external or HDS_STRICT_EXTERNAL=1.\n',
          );
        }
      }
    }

    if ((RUN_ALL || MODE_ROUTE_LINKS) && !isFixtureMode) {
      const ok = runRouteLinksCheck();
      if (!ok) hadFailure = true;
    }

    process.exit(hadFailure ? 1 : 0);
  } catch (err) {
    console.error('check-link-integrity: fatal error:', err?.stack || err?.message || err);
    process.exit(2);
  }
}

main();
