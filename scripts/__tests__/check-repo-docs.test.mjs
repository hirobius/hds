/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-repo-docs.mjs: the fleet repo-docs standard (a copy of the
 * check in hirobius/ops docs/standards). It reads the working directory, so
 * the tests run it in this repo and in small temp repos.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'check-repo-docs.mjs');
const run = (cwd) => spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' });

const README = [
  '# Name',
  '',
  'One line that says what it is.',
  '',
  '![Screenshot](docs/shot.png)',
  '',
  '**Live:** https://example.com',
  '',
  ...['Install', 'Usage', 'Structure', 'Contributing', 'License'].flatMap((s) => [`## ${s}`, '']),
].join('\n');

/** A temp repo with the given files; removed after `fn`. */
function mini(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'repo-docs-'));
  try {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const base = {
  'README.md': README,
  'CONTRIBUTING.md': '# Contributing\n',
  '.repo-docs.json': '{"library": true}',
};

describe('check-repo-docs', () => {
  it('passes on this repo', () => {
    const res = run(ROOT);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });

  it('passes on a library repo with every section', () => {
    mini(base, (dir) => expect(run(dir).status).toBe(0));
  });

  it('fails when an agent file passes its 150-line cap', () => {
    mini({ ...base, 'CLAUDE.md': 'rule\n'.repeat(151) }, (dir) => {
      const res = run(dir);
      expect(res.status).toBe(1);
      expect(res.stderr).toMatch(/CLAUDE\.md: \d+ lines, the cap is 150/);
    });
  });

  it('fails when the README has no Structure section', () => {
    mini({ ...base, 'README.md': README.replace('## Structure\n', '') }, (dir) => {
      const res = run(dir);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain('no "## Structure" section');
    });
  });
});
