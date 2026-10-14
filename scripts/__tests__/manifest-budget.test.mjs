/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#413: the `manifest` size-limit entry (dist/manifest.js, which is
 * `export default <public/hds-manifest.json>`) is only measured by CI's
 * size-limit step, after `pnpm build:lib`. `pnpm test` (and ralph/gate.sh)
 * never built it, so a manifest that outgrew its budget passed every local
 * gate. This estimates the same gzip size straight from the committed JSON
 * against the limit in .size-limit.cjs, so there is one budget number.
 *
 * The estimate (gzip of the minified JSON) ran about 0.3% under size-limit's
 * own figure when measured (45,657 B vs 45,797 B), so a 1% margin is applied.
 * A failure here is a performance-optimization task: cut bytes, never raise
 * the budget.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

/** size-limit reads `65 kB` as 65,000 bytes. */
function parseLimit(text) {
  const match = /^([\d.]+)\s*kB$/.exec(String(text).trim());
  if (!match) throw new Error(`unexpected size-limit format: ${text}`);
  return Number(match[1]) * 1000;
}

describe('manifest bundle budget (hds#413)', () => {
  const entries = require(join(ROOT, '.size-limit.cjs'));
  const entry = entries.find((e) => e.path === 'dist/manifest.js');

  it('has a gzip budget for dist/manifest.js', () => {
    expect(entry?.gzip).toBe(true);
    expect(parseLimit(entry.limit)).toBeGreaterThan(0);
  });

  it('fits public/hds-manifest.json under that budget', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'public/hds-manifest.json'), 'utf8'));
    const estimate = gzipSync(JSON.stringify(manifest)).length * 1.01;
    const limit = parseLimit(entry.limit);
    expect(
      estimate,
      `manifest ~${Math.round(estimate)} B gzip vs ${limit} B budget — use the performance-optimization skill; do not raise the budget`,
    ).toBeLessThanOrEqual(limit);
  });
});
