/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Repo sweep: no gate may declare a scan root that does not exist.
 *
 * scripts/lib/scan-roots.mjs enforces this at runtime, but only for gates that
 * call it. This sweeps every `check-` / `audit-` script and every validator
 * for a directory-shaped `join(ROOT, '...')` literal and asserts it is real,
 * so a gate written with a plain join cannot reintroduce the defect.
 *
 * Also asserts the typography gate carries no override exemption that points
 * at a path that does not exist (an exemption that can never match).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const JOIN_ROOT = /join\(\s*ROOT\s*,\s*['"]([^'"]+)['"]\s*\)/g;
const LOOKS_LIKE_A_FILE = /\.[a-z0-9]{2,6}$/i;

/**
 * A gitignored root is build output (e.g. `dist`); its absence is expected
 * before `build:lib`. `--no-index` on a path INSIDE the directory is a pure
 * pattern match that needs nothing on disk.
 */
function isBuildOutput(relPath) {
  const { status } = spawnSync('git', ['check-ignore', '-q', '--no-index', `${relPath}/probe`], {
    cwd: ROOT,
  });
  return status === 0;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function gateScripts() {
  const out = [];
  for (const dir of ['scripts', 'validators']) {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith('.mjs')) continue;
      if (dir === 'scripts' && !/^(check|audit)-/.test(f)) continue;
      out.push(path.join(dir, f));
    }
  }
  return out;
}

describe('every gate scans a directory that exists', () => {
  const scripts = gateScripts();

  it('finds gate scripts to sweep, so this cannot pass vacuously', () => {
    expect(scripts.length).toBeGreaterThan(20);
  });

  it('reads a tracked directory as source and an ignored one as build output', () => {
    expect(isBuildOutput('dist')).toBe(true);
    expect(isBuildOutput('src/app/components')).toBe(false);
    expect(isBuildOutput('src/app/pages')).toBe(false);
  });

  it.each(scripts)('%s declares no dead scan root', (rel) => {
    const code = stripComments(readFileSync(path.join(ROOT, rel), 'utf8'));
    const dead = [...code.matchAll(JOIN_ROOT)]
      .map((m) => m[1])
      .filter((p) => !LOOKS_LIKE_A_FILE.test(p))
      .filter((p) => !existsSync(path.join(ROOT, p)))
      .filter((p) => !isBuildOutput(p));
    expect(dead, `${rel} scans ${dead.join(', ')}, which does not exist`).toEqual([]);
  });

  it.each(['audit-tokens', 'check-focus-states', 'check-source-canon'])(
    '%s routes its scan roots through resolveScanRoots',
    (name) => {
      const code = readFileSync(path.join(ROOT, 'scripts', `${name}.mjs`), 'utf8');
      expect(code).toMatch(/resolveScanRoots\(/);
    },
  );
});

describe('check-typography-discipline override exemptions', () => {
  it('has no exemption path that does not exist', () => {
    const code = stripComments(
      readFileSync(path.join(ROOT, 'scripts/check-typography-discipline.mjs'), 'utf8'),
    );
    const block = code.match(/ALLOWLIST_PREFIXES_OVERRIDES[\s\S]*?\]\);/);
    expect(block, 'allowlist block not found').not.toBeNull();
    const paths = [...block[0].matchAll(/['"](src\/[^'"]+)['"]/g)].map((m) => m[1]);
    const dead = paths.filter((p) => !existsSync(path.join(ROOT, p)));
    expect(dead).toEqual([]);
  });
});
