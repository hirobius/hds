/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/__tests__/helpers/codemod-fixture.mjs (hds#1008): the
 * shared fixture-copy, CLI and packaging helpers of the codemod tests.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { codemodPaths, useCodemodFixture, expectShipped } from './helpers/codemod-fixture.mjs';

describe('codemodPaths', () => {
  it('points at the codemod and its fixtures', () => {
    const { CODEMOD, FIXTURES } = codemodPaths('spacing-steps');
    expect(existsSync(CODEMOD)).toBe(true);
    expect(existsSync(join(FIXTURES, 'needs-rewrite'))).toBe(true);
  });
});

describe('useCodemodFixture', () => {
  const fx = useCodemodFixture('spacing-steps', {
    only: ['clean'],
    nodeModules: 'hds.space.px6;\n',
  });

  it('copies only the chosen fixture dirs into a temp dir', () => {
    expect(existsSync(join(fx.dir, 'clean'))).toBe(true);
    expect(existsSync(join(fx.dir, 'needs-rewrite'))).toBe(false);
  });

  it('writes the node_modules fixture under clean/', () => {
    expect(readFileSync(join(fx.dir, 'clean/node_modules/x/index.js'), 'utf8')).toBe(
      'hds.space.px6;\n',
    );
  });

  it('run spawns the codemod with --root at the copy', () => {
    const r = fx.run('--check');
    expect(r.status).toBe(0);
    expect(fx.run('--nope').status).toBe(2);
  });
});

describe('expectShipped', () => {
  it('passes for a codemod in package.json#bin and #files', () => {
    expect(() => expectShipped('spacing-steps')).not.toThrow();
  });
  it('fails for one that is not', () => {
    expect(() => expectShipped('no-such-codemod')).toThrow();
  });
});
