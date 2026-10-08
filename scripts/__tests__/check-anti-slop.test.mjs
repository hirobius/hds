// Ratchet gate for the vendored anti-slop oxlint rules. Fixtures live in tmp
// dirs and use oxlint's native `oxc/no-accumulating-spread` so no plugin is needed.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../check-anti-slop.mjs');
const HIT = 'export const f = (xs) => xs.reduce((acc, x) => [...acc, x], []);\n';
const CLEAN = 'export const g = (xs) => xs.length;\n';

let dir;
const write = (rel, text) => {
  mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  writeFileSync(path.join(dir, rel), text);
};
const run = (...args) =>
  spawnSync(
    process.execPath,
    [
      SCRIPT,
      '--cwd',
      dir,
      '--config',
      '.oxlintrc.json',
      '--baseline',
      'baseline.json',
      ...args,
      '--',
      'src',
    ],
    { encoding: 'utf8' },
  );
const baseline = () => JSON.parse(readFileSync(path.join(dir, 'baseline.json'), 'utf8'));

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'anti-slop-'));
  write(
    '.oxlintrc.json',
    JSON.stringify({
      categories: { correctness: 'off' },
      rules: { 'oxc/no-accumulating-spread': 'warn' },
    }),
  );
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('check-anti-slop ratchet', () => {
  it('fails when a file gains a hit over the baseline', () => {
    write('src/a.js', HIT);
    write('baseline.json', JSON.stringify({ version: 1, files: {} }));
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('src/a.js');
    expect(r.stderr).toContain('oxc/no-accumulating-spread');
    expect(r.stderr).toContain('--update');
  });

  it('passes when counts equal the baseline', () => {
    write('src/a.js', HIT);
    write(
      'baseline.json',
      JSON.stringify({ version: 1, files: { 'src/a.js': { 'oxc/no-accumulating-spread': 1 } } }),
    );
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain('fewer than baseline');
  });

  it('passes with a hint when counts drop', () => {
    write('src/a.js', CLEAN);
    write(
      'baseline.json',
      JSON.stringify({ version: 1, files: { 'src/a.js': { 'oxc/no-accumulating-spread': 2 } } }),
    );
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('2 fewer than baseline');
    expect(r.stdout).toContain('--update');
  });

  it('--update writes sorted, deterministic JSON', () => {
    write('src/b.js', HIT + HIT.replace('f =', 'h ='));
    write('src/a.js', HIT);
    const r = run('--update');
    expect(r.status).toBe(0);
    const b = baseline();
    expect(Object.keys(b.files)).toEqual(['src/a.js', 'src/b.js']);
    expect(b.files['src/b.js']).toEqual({ 'oxc/no-accumulating-spread': 2 });
    const first = readFileSync(path.join(dir, 'baseline.json'), 'utf8');
    run('--update');
    expect(readFileSync(path.join(dir, 'baseline.json'), 'utf8')).toBe(first);
    expect(first.endsWith('\n')).toBe(true);
    expect(run().status).toBe(0);
  });
});
