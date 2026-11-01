/** @internal — not part of @hirobius/design-system public API surface. */
/** Unit tests for scripts/check-dupes.mjs (hds#766). */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = join(ROOT, 'scripts', 'check-dupes.mjs');

const run = (cwd) => spawnSync('node', [GATE], { cwd, encoding: 'utf8', timeout: 55_000 });

// A block comfortably over jscpd's floor (minLines 5, minTokens 50).
const BLOCK = [
  'export function placeholder() {',
  ...Array.from({ length: 16 }, (_, i) => `  const v${i} = ${i};`),
  '  return v0 + v1 + v2 + v3;',
  '}',
].join('\n');

let fixture;
const writeFixture = (threshold) => {
  writeFileSync(
    join(fixture, '.jscpd.json'),
    JSON.stringify({ threshold, minLines: 5, minTokens: 50, mode: 'mild', reporters: ['console'] }),
  );
};

beforeAll(() => {
  fixture = mkdtempSync(join(tmpdir(), 'check-dupes-'));
  for (const dir of ['src', 'scripts', 'tests', 'validators']) {
    mkdirSync(join(fixture, dir), { recursive: true });
  }
  writeFileSync(join(fixture, 'src', 'a.ts'), BLOCK.replace('placeholder', 'a') + '\n');
  writeFileSync(join(fixture, 'src', 'b.ts'), BLOCK.replace('placeholder', 'b') + '\n');
});

afterAll(() => {
  rmSync(fixture, { recursive: true, force: true });
});

describe('check-dupes', () => {
  it('fails when duplication is over the threshold', () => {
    writeFixture(0);
    const res = run(fixture);
    expect(res.status).toBe(1);
    expect(`${res.stdout}${res.stderr}`).toContain('over threshold');
  }, 60_000);

  it('passes the same tree when the threshold is above the count', () => {
    writeFixture(100);
    expect(run(fixture).status).toBe(0);
  }, 60_000);

  it('passes on this repository at the committed threshold', () => {
    expect(run(ROOT).status).toBe(0);
  }, 60_000);
});
