// @vitest-environment node
/**
 * The pre-push hook must run `pnpm test`, not a bare `vitest run`.
 *
 * `pnpm test` is the entry point CI uses and it carries the `pretest` gate
 * chain (manifest, registry, source-canon, ...). A hook that calls vitest
 * directly skips those, so a push can pass locally and fail in CI. README
 * documents the hook as running `pnpm test`; this pins the two together.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');
const commands = (script: string) =>
  script
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('echo'));

describe('.husky/pre-push', () => {
  it('runs `pnpm test` so the pretest gates fire', () => {
    expect(commands(read('.husky/pre-push'))).toContain('pnpm test');
  });

  it('does not call vitest directly', () => {
    expect(commands(read('.husky/pre-push')).filter((c) => /vitest/.test(c))).toEqual([]);
  });

  it('is described by README as running pnpm test', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/pnpm test\s+#[^\n]*pre-push hook/);
  });
});
