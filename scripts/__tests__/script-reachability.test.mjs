/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for script reachability (scripts/lib/script-reachability.mjs).
 *
 * WHY THIS EXISTS (#265 part 2)
 * ─────────────────────────────
 * `isChannelWired('pnpm-meta', …)` reduced to
 *
 *     Object.values(scripts).some((cmd) => cmd.includes(gateScript))
 *
 * with no check that the referencing script is ever run. A reviewer proved the
 * dodge during #262 by adding a package.json script named
 * `totally:unused:nobody:calls:this` pointing at a fake gate — the validator
 * printed `declared pnpm-meta, detected pnpm-meta, ✓ wired as declared`.
 *
 * So `pnpm-meta` meant "named in a script", not "runs". That matters because
 * of the split #262 measured: of 24 gates labelled pnpm-meta, only 6 are in
 * `pretest` and run on every PR. The other 18 are reachable only from
 * `check:fast` / `check:full` / their own alias, none of which CI invokes —
 * and the registry counted all 24 as wired.
 *
 * Reachability is a graph, not a lookup. A script runs if a husky hook or a CI
 * step invokes it, if it is the npm lifecycle hook of a script that runs
 * (`pretest` fires from `pnpm test`), or if a script that runs calls it.
 */

import { describe, it, expect } from 'vitest';

import { reachableScripts } from '../lib/script-reachability.mjs';

const call = (entries) => ({ hooks: '', workflows: '', scripts: {}, ...entries });

describe('reachableScripts — direct invocation', () => {
  it('marks a script a husky hook invokes', () => {
    const r = reachableScripts(call({ hooks: 'pnpm typecheck\n', scripts: { typecheck: 'tsc' } }));
    expect(r.has('typecheck')).toBe(true);
  });

  it('marks a script a CI step invokes', () => {
    const r = reachableScripts(
      call({ workflows: 'run: pnpm test\n', scripts: { test: 'vitest' } }),
    );
    expect(r.has('test')).toBe(true);
  });

  it('accepts npm run as well as pnpm', () => {
    const r = reachableScripts(call({ hooks: 'npm run lint\n', scripts: { lint: 'eslint' } }));
    expect(r.has('lint')).toBe(true);
  });

  it('does NOT mark a script nothing invokes — the dodge', () => {
    const r = reachableScripts(
      call({
        hooks: 'pnpm typecheck\n',
        scripts: { typecheck: 'tsc', 'totally:unused:nobody:calls:this': 'node fake-gate.mjs' },
      }),
    );
    expect(r.has('totally:unused:nobody:calls:this')).toBe(false);
  });
});

describe('reachableScripts — npm lifecycle hooks', () => {
  it('marks pretest when test is reachable, because pnpm test fires it', () => {
    const r = reachableScripts(
      call({ workflows: 'run: pnpm test\n', scripts: { test: 'vitest', pretest: 'node g.mjs' } }),
    );
    expect(r.has('pretest')).toBe(true);
  });

  it('marks posttest the same way', () => {
    const r = reachableScripts(
      call({ workflows: 'run: pnpm test\n', scripts: { test: 'vitest', posttest: 'node g.mjs' } }),
    );
    expect(r.has('posttest')).toBe(true);
  });

  it('does NOT mark pretest when test itself is unreachable', () => {
    // The lifecycle hook only fires if the script it wraps actually runs.
    const r = reachableScripts(call({ scripts: { test: 'vitest', pretest: 'node g.mjs' } }));
    expect(r.has('pretest')).toBe(false);
  });
});

describe('reachableScripts — transitive calls', () => {
  it('follows a script that calls another script', () => {
    const r = reachableScripts(
      call({
        hooks: 'pnpm verify\n',
        scripts: {
          verify: 'pnpm check:a && pnpm check:b',
          'check:a': 'node a.mjs',
          'check:b': 'node b.mjs',
        },
      }),
    );
    expect([...r].sort()).toEqual(['check:a', 'check:b', 'verify']);
  });

  it('follows a chain several levels deep', () => {
    const r = reachableScripts(
      call({ hooks: 'pnpm a\n', scripts: { a: 'pnpm b', b: 'pnpm c', c: 'node c.mjs' } }),
    );
    expect(r.has('c')).toBe(true);
  });

  it('does NOT follow into a script only an unreachable script calls', () => {
    // check:full calls check:slow, but nothing calls check:full.
    const r = reachableScripts(
      call({
        hooks: 'pnpm typecheck\n',
        scripts: { typecheck: 'tsc', 'check:full': 'pnpm check:slow', 'check:slow': 'node s.mjs' },
      }),
    );
    expect(r.has('check:slow')).toBe(false);
    expect(r.has('check:full')).toBe(false);
  });

  it('terminates on a cycle rather than looping forever', () => {
    const r = reachableScripts(call({ hooks: 'pnpm a\n', scripts: { a: 'pnpm b', b: 'pnpm a' } }));
    expect(r.has('a')).toBe(true);
    expect(r.has('b')).toBe(true);
  });

  it('does not treat `pnpm exec <binary>` as a script call', () => {
    // `pnpm exec eslint` runs a binary, not a package.json script named eslint.
    const r = reachableScripts(
      call({ hooks: 'pnpm exec eslint .\n', scripts: { eslint: 'node never-called.mjs' } }),
    );
    expect(r.has('eslint')).toBe(false);
  });

  it('does not treat `pnpm install` or `pnpm add` as a script call', () => {
    const r = reachableScripts(
      call({
        workflows: 'run: pnpm install --frozen-lockfile\n',
        scripts: { install: 'node x.mjs' },
      }),
    );
    expect(r.has('install')).toBe(false);
  });
});
