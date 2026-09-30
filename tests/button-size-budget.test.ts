// @vitest-environment node
/**
 * A root import of one Button must have a size budget.
 *
 * Without one, anything added to the barrel's shared graph rides along into
 * every consumer's Button-only bundle unnoticed. The budget is a size-limit
 * entry over a probe bundle (`import { Button }` from the built root entry,
 * tree-shaken, peers external), built by scripts/build-button-probe.mjs and
 * run through `pnpm check:size`. It needs `build:lib`, which is too slow for
 * `pretest`, so it fires from CI only (registered `pnpm-meta`: ci.yml reaches it through `pnpm check:size`; `ci-pr` once ci.yml names the script).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const json = (rel: string) => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));

interface SizeEntry {
  name: string;
  path: string;
  limit: string;
  gzip?: boolean;
}

describe('Button-only size budget', () => {
  const entries: SizeEntry[] = require(resolve(ROOT, '.size-limit.cjs'));

  it('has a gzip size-limit entry over the Button-only probe bundle', () => {
    const entry = entries.find((e) => e.path === 'dist/probe/button-only.js');
    expect(entry, 'no size-limit entry for dist/probe/button-only.js').toBeDefined();
    expect(entry!.gzip).toBe(true); // tier-ok: asserted defined on the previous line
    expect(entry!.limit).toMatch(/^\d+(\.\d+)? kB$/); // tier-ok: as above
  });

  it('builds the probe in check:size, after build:lib and before size-limit', () => {
    const script: string = json('package.json').scripts['check:size'];
    const order = ['build:lib', 'build-button-probe', 'size-limit'].map((s) => script.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('is registered as a guardrail that CI reaches', () => {
    const gate = json('docs/guardrails/registry.json').gates.find(
      (g: { gateScript: string }) => g.gateScript === 'scripts/build-button-probe.mjs',
    );
    expect(gate, 'probe script missing from the guardrail registry').toBeDefined();
    expect(['pnpm-meta', 'ci-pr']).toContain(gate.firingChannel); // tier-ok: asserted defined above
  });
});
