// @vitest-environment node
/**
 * The pre-push hook must run `pnpm test`, not a bare `vitest run`.
 *
 * `pnpm test` is the entry point CI uses and it carries the `pretest` gate
 * chain (manifest, registry, source-canon, ...). A hook that calls vitest
 * directly skips those, so a push can pass locally and fail in CI. README
 * documents the hook as running `pnpm test`; this pins the two together.
 *
 * The hook hands off to the tiered gate (scripts/pre-push-gate.mjs, ops#1057);
 * its full tier must still run `pnpm test`, so the hook is read with that tier
 * expanded, and the tier itself is pinned below.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expandPrePushHook, planGate } from '../scripts/lib/gate-tier.mjs';
import { expandHookLanes } from '../scripts/lib/gate-lanes.mjs';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');
// The hook's stages live in the registry's pre-push lane (hds#1095).
const hook = () =>
  expandHookLanes(read('.husky/pre-push'), JSON.parse(read('docs/guardrails/registry.json')));
const commands = (script: string) =>
  script
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('echo'));

describe('.husky/pre-push', () => {
  it('runs `pnpm test` so the pretest gates fire', () => {
    expect(commands(expandPrePushHook(hook()))).toContain('pnpm test');
  });

  it('does not call vitest directly', () => {
    expect(commands(expandPrePushHook(hook())).filter((c) => /vitest/.test(c))).toEqual([]);
  });

  it('hands off to the tiered gate, whose full tier runs `pnpm test`', () => {
    expect(commands(hook())).toContain('node scripts/pre-push-gate.mjs');
    expect(planGate('full', [])).toContain('pnpm test');
  });

  it('is not credited with `pnpm test` when the tiered gate is absent', () => {
    expect(commands(expandPrePushHook('set -e\nnode scripts/other.mjs\n'))).not.toContain(
      'pnpm test',
    );
  });

  it('is described by README as running pnpm test', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/pnpm test\s+#[^\n]*pre-push hook/);
  });
});
