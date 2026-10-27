/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function run(changed) {
  const dir = mkdtempSync(join(tmpdir(), 'tsot-'));
  // The checker ignores outputs that do not exist in the fixture root.
  for (const f of changed) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), 'x\n');
  }
  writeFileSync(join(dir, 'changed-files.txt'), changed.join('\n') + '\n');
  return spawnSync('node', ['scripts/check-template-source-of-truth.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, FIXTURE_DIR: dir },
  });
}

describe('check-template-source-of-truth directory keys', () => {
  it('flags a hand edit under public/llms/', () => {
    const r = run(['public/llms/components.txt']);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('public/llms/components.txt');
  });

  it('passes when the generator changed too', () => {
    const r = run(['public/llms/components.txt', 'scripts/generate-llms-txt.mjs']);
    expect(r.status).toBe(0);
  });
});

describe('check-template-source-of-truth token generators (hds#645)', () => {
  it('accepts a token output when only an emitter module under scripts/lib/token-emit/ changed', () => {
    const r = run(['src/app/design-system/generated-tokens.ts', 'scripts/lib/token-emit/ts.mjs']);
    expect(r.status).toBe(0);
  });

  it('accepts the manifest when only scripts/lib/token-manifest.mjs changed', () => {
    const r = run(['public/hds-manifest.json', 'scripts/lib/token-manifest.mjs']);
    expect(r.status).toBe(0);
  });

  it('still flags a token output edited with no generator change', () => {
    const r = run(['tailwind.config.tokens.cjs', 'scripts/lib/unrelated.mjs']);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('scripts/lib/token-emit/');
  });
});
