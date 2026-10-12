/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
//
// scripts/lib/generated-check.mjs: the shared `--check` of the generators. It
// compares the bytes a generator would write with the file on disk and writes
// nothing, so "generated file is fresh" is a fact a gate can run, not a claim.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { staleOutputs } from '../lib/generated-check.mjs';
import { matchesArtifact } from '../lib/stable-artifact.mjs';

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});
const dir = (files = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'generated-check-'));
  temps.push(root);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
};

describe('staleOutputs', () => {
  it('reports nothing when every file already holds what the generator would write', async () => {
    const root = dir({ 'a.txt': 'one\n', 'sub/b.txt': 'two\n' });
    expect(await staleOutputs(root, { 'a.txt': 'one\n', 'sub/b.txt': 'two\n' })).toEqual([]);
  });

  it('names a file whose bytes differ', async () => {
    const root = dir({ 'a.txt': 'one\n', 'b.txt': 'two\n' });
    expect(await staleOutputs(root, { 'a.txt': 'one\n', 'b.txt': 'TWO\n' })).toEqual(['b.txt']);
  });

  it('names a file that does not exist yet', async () => {
    expect(await staleOutputs(dir(), { 'a.txt': 'one\n' })).toEqual(['a.txt']);
  });

  it('writes nothing', async () => {
    const root = dir({ 'a.txt': 'old\n' });
    await staleOutputs(root, { 'a.txt': 'new\n', 'c.txt': 'x\n' });
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('old\n');
  });

  it('ignores a date-only difference when the artifact is date-stable', async () => {
    const root = dir({ 'a.txt': 'built 2026-01-01\n' });
    expect(await staleOutputs(root, { 'a.txt': 'built 2026-10-12\n' }, { stable: true })).toEqual(
      [],
    );
    expect(await staleOutputs(root, { 'a.txt': 'built 2026-10-12\n' })).toEqual(['a.txt']);
  });

  it('formats the expected text the way the repo stores it when a formatter is given', async () => {
    const root = dir({ 'a.txt': 'ONE\n' });
    const upper = async (_path, text) => text.toUpperCase();
    expect(await staleOutputs(root, { 'a.txt': 'one\n' }, { format: upper })).toEqual([]);
  });
});

describe('matchesArtifact', () => {
  it('is the inverse of "writeStableArtifact would write"', () => {
    const root = dir({ 'a.txt': 'x 2026-01-01\n' });
    expect(matchesArtifact(join(root, 'a.txt'), 'x 2026-10-12\n')).toBe(true);
    expect(matchesArtifact(join(root, 'a.txt'), 'y 2026-10-12\n')).toBe(false);
    expect(matchesArtifact(join(root, 'missing.txt'), 'x\n')).toBe(false);
  });
});
