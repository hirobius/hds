/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
//
// scripts/lib/generated-check.mjs: the shared `--check` of the generators. It
// compares the bytes a generator would write with the file on disk and writes
// nothing, so "generated file is fresh" is a fact a gate can run, not a claim.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { runGenerator, staleOutputs } from '../lib/generated-check.mjs';
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

// runGenerator is the whole CLI of a generator: it reads --check from argv,
// formats each output the way the repo commits it, then either compares (and
// writes nothing) or writes, and sets the exit code. A generator hands it
// `{ path: text }` and nothing else.
describe('runGenerator', () => {
  let out;
  let exitCodeBefore;
  beforeEach(() => {
    exitCodeBefore = process.exitCode;
    out = { log: [], error: [] };
    vi.spyOn(console, 'log').mockImplementation((...a) => out.log.push(a.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...a) => out.error.push(a.join(' ')));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = exitCodeBefore;
  });

  const WRITE = ['node', 'gen.mjs'];
  const CHECK = ['node', 'gen.mjs', '--check'];
  const gen = (root, outputs, extra = {}) =>
    runGenerator({ root, outputs, label: 'gen', fix: 'pnpm gen', argv: WRITE, ...extra });
  const read = (root, rel) => readFileSync(join(root, rel), 'utf8');

  it('writes each output in its committed (Prettier) form, creating directories', async () => {
    const root = dir();
    const res = await gen(root, { 'a/b.json': '{"x":[1,2]}' });
    expect(read(root, 'a/b.json')).toBe('{ "x": [1, 2] }\n');
    expect(res).toMatchObject({ check: false, exitCode: 0, changed: ['a/b.json'] });
    expect(out.log.join('\n')).toContain('a/b.json');
  });

  it('under --check passes a file that holds the committed form, writing nothing', async () => {
    const root = dir({ 'a.json': '{ "x": 1 }\n' });
    const res = await gen(root, { 'a.json': '{"x":1}' }, { argv: CHECK });
    expect(res).toMatchObject({ check: true, exitCode: 0, stale: [] });
    expect(process.exitCode ?? 0).toBe(0);
    expect(out.log.join('\n')).toContain('a.json');
  });

  it('under --check exits 1 naming each stale file and the fix, and writes nothing', async () => {
    const root = dir({ 'a.json': '{ "x": 1 }\n' });
    const res = await gen(root, { 'a.json': '{"x":2}', 'new.json': '{}' }, { argv: CHECK });
    expect(res).toMatchObject({ check: true, exitCode: 1, stale: ['a.json', 'new.json'] });
    expect(process.exitCode).toBe(1);
    expect(out.error.join('\n')).toMatch(/a\.json, new\.json are out of date\. Run: pnpm gen/);
    expect(read(root, 'a.json')).toBe('{ "x": 1 }\n');
    expect(existsSync(join(root, 'new.json'))).toBe(false);
  });

  it('is idempotent: a second run writes nothing and --check then passes', async () => {
    const root = dir();
    const outputs = { 'a.md': '# T\n\n\n*  one\n', 'b.json': '{"y":true}' };
    await gen(root, outputs);
    const old = new Date('2001-01-01');
    for (const f of ['a.md', 'b.json']) utimesSync(join(root, f), old, old);
    const again = await gen(root, outputs);
    expect(again.changed).toEqual([]);
    expect(statSync(join(root, 'a.md')).mtime).toEqual(old);
    expect((await gen(root, outputs, { argv: CHECK })).exitCode).toBe(0);
  });

  it('leaves a path .prettierignore hands to its generator unformatted', async () => {
    const root = dir();
    const raw = '# Skill\n\n\n\n*   x\n';
    await gen(root, { 'skills/hds-consumer/SKILL.md': raw });
    expect(read(root, 'skills/hds-consumer/SKILL.md')).toBe(raw);
  });

  it('writes the text as given with format: false', async () => {
    const root = dir();
    await gen(root, { 'a.json': '{"x":1}' }, { format: false });
    expect(read(root, 'a.json')).toBe('{"x":1}');
  });

  it('treats a null output as a file that must not exist: stale under --check, removed on write', async () => {
    const root = dir({ 'gone.ts': 'export {};\n' });
    const checked = await gen(root, { 'gone.ts': null }, { argv: CHECK });
    expect(checked.stale).toEqual(['gone.ts']);
    expect(existsSync(join(root, 'gone.ts'))).toBe(true);
    const written = await gen(root, { 'gone.ts': null, 'never.ts': null });
    expect(written.changed).toEqual(['gone.ts']);
    expect(existsSync(join(root, 'gone.ts'))).toBe(false);
  });

  it('with stable, neither writes nor fails a file whose only change is a date', async () => {
    const root = dir({ 'a.json': '{ "at": "2026-01-01", "n": 1 }\n' });
    const outputs = { 'a.json': '{"at":"2026-10-12","n":1}' };
    expect((await gen(root, outputs, { stable: true, argv: CHECK })).exitCode).toBe(0);
    expect((await gen(root, outputs, { stable: true })).changed).toEqual([]);
    expect(read(root, 'a.json')).toContain('2026-01-01');
    expect((await gen(root, outputs, { argv: CHECK })).exitCode).toBe(1);
  });

  it('never lowers an exit code an earlier step of the generator already set', async () => {
    const root = dir({ 'a.json': '{ "x": 1 }\n' });
    process.exitCode = 2;
    await gen(root, { 'a.json': '{"x":1}' }, { argv: CHECK });
    expect(process.exitCode).toBe(2);
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
