/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Repo sweep: no gate may declare a scan root that does not exist (#265).
 *
 * scripts/lib/scan-roots.mjs enforces this at RUNTIME, but only for the gates
 * that call it. A gate written tomorrow with a plain `join(ROOT, 'src/app/x')`
 * would reintroduce exactly the defect — which is how `src/app/pages` survived
 * in two gates, and how `src/app/styles` survived in audit-tokens without
 * anyone noticing it at all.
 *
 * So this sweeps every `check-` and `audit-` script and every validator for a
 * directory-shaped `join(ROOT, '…')` and asserts the directory is real. It
 * runs from `pnpm test`, which CI invokes.
 *
 * It is deliberately a test rather than a new registered gate: it needs no
 * fixture, no channel and no registry entry, and it is about the gates
 * themselves rather than about the design system.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `join(ROOT, 'some/path')` — the shape every gate uses for a scan root. */
const JOIN_ROOT = /join\(\s*ROOT\s*,\s*['"]([^'"]+)['"]\s*\)/g;

/** A path ending in a known file extension is a file reference, not a scan root. */
const LOOKS_LIKE_A_FILE = /\.[a-z0-9]{2,6}$/i;

/**
 * A gitignored scan root is a BUILD OUTPUT, and its absence is expected.
 *
 * `check-rsc-directives` scans `dist`, which does not exist until `build:lib`
 * runs. Requiring it to exist made this sweep pass locally — where dist was
 * left over from an earlier build — and fail in CI, where `pnpm test` runs
 * before anything is built. The test was environment-dependent and was passing
 * for the wrong reason.
 *
 * Tracked vs ignored is the real distinction, and git already knows it: a
 * source directory that vanished is a bug, a build directory that has not been
 * built yet is Tuesday. Gates that scan build output check for it themselves
 * and fail with their own message (`run \`pnpm build:lib\` first`).
 */
function isBuildOutput(relPath) {
  // Asked about `dist` itself, `git check-ignore` requires the path to EXIST and
  // answers 1 when it does not — the exact case this needs to decide, and the
  // reason the first version of this passed locally (dist left over from a
  // build) and failed in CI. Asking with --no-index about a path INSIDE the
  // directory is a pure pattern match that needs nothing on disk.
  const { status } = spawnSync('git', ['check-ignore', '-q', '--no-index', `${relPath}/probe`], {
    cwd: ROOT,
  });
  return status === 0;
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

  it('treats a tracked directory as a source root and an ignored one as build output', () => {
    // The guard on the exclusion above. If `git check-ignore` ever started
    // returning 0 for everything, every dead root would be silently excused
    // and this sweep would pass while checking nothing.
    expect(isBuildOutput('dist')).toBe(true);
    expect(isBuildOutput('src/app/components')).toBe(false);
    // The one that matters: a REMOVED source directory must still read as
    // source, or the exclusion would excuse exactly the defect being swept for.
    expect(isBuildOutput('src/app/pages')).toBe(false);
  });

  it.each(scripts)('%s declares no dead scan root', (rel) => {
    const source = readFileSync(path.join(ROOT, rel), 'utf8');
    // Comments may legitimately name a removed directory while explaining why
    // it was removed — check-source-canon's header does exactly that.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    const dead = [...code.matchAll(JOIN_ROOT)]
      .map((m) => m[1])
      .filter((p) => !LOOKS_LIKE_A_FILE.test(p))
      .filter((p) => !existsSync(path.join(ROOT, p)))
      .filter((p) => !isBuildOutput(p));

    expect(dead, `${rel} scans ${dead.join(', ')}, which does not exist`).toEqual([]);
  });
});
