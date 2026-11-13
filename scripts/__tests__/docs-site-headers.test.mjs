/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
// The docs site is a static export on Vercel, so its security headers live in
// docs-site/vercel.json. This pins the ones that matter for a static site.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const config = JSON.parse(readFileSync(join(ROOT, 'docs-site/vercel.json'), 'utf8'));

/** Headers of the rule that covers every path. */
function catchAll() {
  const rule = (config.headers ?? []).find((h) => h.source === '/(.*)');
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
}

/** CSP string → { directive: [sources] } */
function parseCsp(value = '') {
  return Object.fromEntries(
    value
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((d) => d[0])
      .map(([name, ...sources]) => [name, sources]),
  );
}

describe('docs-site security headers', () => {
  it('sends the baseline headers on every path', () => {
    const h = catchAll();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-frame-options']).toBe('SAMEORIGIN');
    expect(h['permissions-policy']).toMatch(/camera=\(\)/);
  });

  it('sends a CSP that blocks plugins, base hijack, framing and off-site scripts', () => {
    const csp = parseCsp(catchAll()['content-security-policy']);
    expect(csp['default-src']).toBeUndefined();
    for (const d of [
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'worker-src',
      'media-src',
      'frame-src',
      'manifest-src',
    ]) {
      expect(csp[d], d).toBeDefined();
    }
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
    expect(csp['frame-ancestors']).toEqual(["'self'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
    // hds#972: script-src / default-src live in a per-page <meta> CSP with
    // sha256 hashes (scripts/hash-docs-csp.mjs at docs:publish). Header CSPs
    // intersect with it, so the header must not loosen scripts.
    for (const src of csp['script-src'] ?? []) {
      expect(src).not.toMatch(/^https?:|^\*|unsafe-eval|unsafe-inline/);
    }
  });

  it('hashes inline scripts at docs:publish', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['docs:publish']).toMatch(
      /pnpm docs:build && node scripts\/hash-docs-csp\.mjs docs-site\/out/,
    );
  });
});

describe('docs-site redirects', () => {
  // The site is a static export, so next.config redirects do not exist; vercel.json is the mechanism.
  it('sends /docs/tokens to the tokens guide, and the guide page exists', () => {
    const rule = (config.redirects ?? []).find((r) => r.source === '/docs/tokens');
    expect(rule?.destination).toBe('/docs/guides/tokens');
    const page = join(ROOT, 'content/docs', rule.destination.replace(/^\/docs\//, '') + '.mdx');
    expect(existsSync(page)).toBe(true);
  });

  it('every redirect lands on a real docs page', () => {
    for (const r of config.redirects ?? []) {
      if (!r.destination.startsWith('/docs/')) continue;
      const rel = r.destination.replace(/^\/docs\//, '');
      const found = [`${rel}.mdx`, `${rel}/index.mdx`].some((f) =>
        existsSync(join(ROOT, 'content/docs', f)),
      );
      expect(found, `${r.source} -> ${r.destination}`).toBe(true);
    }
  });
});

describe('docs-site old-host redirect', () => {
  const HAS = [{ type: 'host', value: 'hirobius-hds-components.vercel.app' }];

  // Vercel compiles "/:path*" to ^(?:/(seg(?:/seg)*))?$, which matches "" and
  // "/docs" but not "/". The root therefore needs its own rule (hds#1532).
  it('redirects the old host root with its own rule, 301, before the catch-all', () => {
    expect(config.redirects[0]).toEqual({
      source: '/',
      has: HAS,
      destination: 'https://hirobius-design-system.vercel.app/',
      statusCode: 301,
    });
  });

  it('redirects every other old-host path with a 301, second', () => {
    expect(config.redirects[1]).toEqual({
      source: '/:path*',
      has: HAS,
      destination: 'https://hirobius-design-system.vercel.app/:path*',
      statusCode: 301,
    });
  });

  it('uses statusCode, not permanent (permanent sends 308)', () => {
    for (const r of config.redirects.slice(0, 2)) expect(r).not.toHaveProperty('permanent');
  });
});
