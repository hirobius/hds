/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
// The docs site is a static export on Vercel, so its security headers live in
// docs-site/vercel.json. This pins the ones that matter for a static site.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
    expect(csp['frame-ancestors']).toEqual(["'self'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
    // Static export: Next inlines its RSC payload, so 'unsafe-inline' stays
    // until scripts are hashed (tracked separately). No remote script origin.
    for (const src of csp['script-src'] ?? []) {
      expect(src).not.toMatch(/^https?:|^\*|unsafe-eval/);
    }
  });
});
