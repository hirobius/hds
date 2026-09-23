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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `join(ROOT, 'some/path')` — the shape every gate uses for a scan root. */
const JOIN_ROOT = /join\(\s*ROOT\s*,\s*['"]([^'"]+)['"]\s*\)/g;

/** A path ending in a known file extension is a file reference, not a scan root. */
const LOOKS_LIKE_A_FILE = /\.[a-z0-9]{2,6}$/i;

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

  it.each(scripts)('%s declares no dead scan root', (rel) => {
    const source = readFileSync(path.join(ROOT, rel), 'utf8');
    // Comments may legitimately name a removed directory while explaining why
    // it was removed — check-source-canon's header does exactly that.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    const dead = [...code.matchAll(JOIN_ROOT)]
      .map((m) => m[1])
      .filter((p) => !LOOKS_LIKE_A_FILE.test(p))
      .filter((p) => !existsSync(path.join(ROOT, p)));

    expect(dead, `${rel} scans ${dead.join(', ')}, which does not exist`).toEqual([]);
  });
});
