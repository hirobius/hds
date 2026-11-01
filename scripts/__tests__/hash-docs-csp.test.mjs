/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { inlineScriptHashes, injectCspMeta, SCRIPT_CSP_META } from '../hash-docs-csp.mjs';

const sha = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

describe('hash-docs-csp', () => {
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><script src="/a.js" async></script>' +
    '<script>self.__next_f.push([1,"x"])</script></head><body>' +
    '<script type="application/ld+json">{"a":1}</script><SCRIPT nonce="n">b()</SCRIPT></body></html>';

  it('hashes only inline executable scripts, exact bytes', () => {
    expect(inlineScriptHashes(html)).toEqual([sha('self.__next_f.push([1,"x"])'), sha('b()')]);
  });

  it('injects a script CSP meta first in <head>, without unsafe-inline', () => {
    const out = injectCspMeta(html);
    const m = out.match(/<head>(<meta http-equiv="Content-Security-Policy" content="([^"]+)">)/);
    expect(m).toBeTruthy();
    const csp = m[2];
    expect(csp).not.toContain('default-src');
    expect(csp).toContain(`script-src 'self' ${sha('self.__next_f.push([1,"x"])')} ${sha('b()')}`);
    expect(csp).not.toContain('unsafe-inline');
    expect(SCRIPT_CSP_META).toBeTypeOf('string');
  });

  it('is idempotent', () => {
    const once = injectCspMeta(html);
    expect(injectCspMeta(once)).toBe(once);
  });
});
