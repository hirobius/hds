/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#390 step 3 (hds#389 D6): check-deprecations covers the whole public
 * surface, not only src/app/components. A `@deprecated` without a future
 * `@removeIn` anywhere a consumer can import it fails the gate, and the gate
 * runs in `pretest`, so CI catches it.
 *
 * Every test that breaks something breaks a temp copy of the package
 * (package.json + src/), never the real tree.
 */
import { describe, it, expect } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/check-deprecations.mjs');

function run(cwd) {
  const env = { ...process.env };
  delete env.HDS_FIXTURE_MODE;
  delete env.FIXTURE_FILE;
  const r = spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8', env });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

/** A throwaway copy of the package (package.json + src/) to break. */
function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'hds-deprecations-'));
  try {
    cpSync(join(ROOT, 'package.json'), join(dir, 'package.json'));
    cpSync(join(ROOT, 'src'), join(dir, 'src'), { recursive: true });
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function edit(dir, rel, change) {
  const file = join(dir, rel);
  writeFileSync(file, change(readFileSync(file, 'utf8')));
}

describe('check-deprecations', () => {
  it('passes on the real tree', () => {
    const { status, output } = run(ROOT);
    expect(output).toMatch(/check-deprecations/);
    expect(status).toBe(0);
  });

  it('fails when one src/index.ts deprecation loses its @removeIn tag', () => {
    withCopy((dir) => {
      edit(dir, 'src/index.ts', (src) => {
        const tag = /^ \* @removeIn 1\.0\.0\n/m;
        expect(src).toMatch(tag);
        return src.replace(tag, '');
      });
      const { status, output } = run(dir);
      expect(output).toMatch(/src\/index\.ts/);
      expect(status).toBe(1);
    });
  });

  const UNPLANNED = '\n/**\n * @deprecated Probe.\n */\nexport const __deprecationProbe = 1;\n';

  it.each([
    ['the /patterns barrel', 'src/patterns.ts'],
    ['a layout', 'src/app/layouts/DocLayout.tsx'],
    ['the ./tokens entry', 'src/app/design-system/tokens.ts'],
  ])('fails on an unplanned deprecation in %s', (_label, rel) => {
    withCopy((dir) => {
      edit(dir, rel, (src) => src + UNPLANNED);
      const { status, output } = run(dir);
      expect(output).toContain(rel);
      expect(status).toBe(1);
    });
  });

  it('reads the entries from package.json#exports and follows their re-exports', () => {
    withCopy((dir) => {
      edit(dir, 'package.json', (src) => {
        const pkg = JSON.parse(src);
        pkg.exports['./probe'] = {
          types: './dist/types/src/probe/index.d.ts',
          import: './dist/probe.js',
          default: './dist/probe.js',
        };
        return JSON.stringify(pkg, null, 2);
      });
      mkdirSync(join(dir, 'src/probe'));
      writeFileSync(join(dir, 'src/probe/index.ts'), "export * from './inner';\n");
      writeFileSync(join(dir, 'src/probe/inner.ts'), UNPLANNED);
      const { status, output } = run(dir);
      expect(output).toContain('src/probe/inner.ts');
      expect(status).toBe(1);
    });
  });

  it('does not read a prose mention of the tag as a deprecation', () => {
    withCopy((dir) => {
      edit(
        dir,
        'src/patterns.ts',
        (src) =>
          src + '\n/**\n * Mentions the `@deprecated` tag in prose.\n */\nexport const __p = 1;\n',
      );
      expect(run(dir).status).toBe(0);
    });
  });

  it('reads @removeIn only at the start of a line, as the manifest does', () => {
    withCopy((dir) => {
      edit(
        dir,
        'src/patterns.ts',
        (src) => src + '\n/** @deprecated Probe. @removeIn 1.0.0 */\nexport const __p = 1;\n',
      );
      expect(run(dir).status).toBe(1);
    });
  });

  it('runs in pretest, as the registry declares (hds#389 D6)', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.pretest).toContain('node scripts/check-deprecations.mjs');
    const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
    expect(registry.gates.find((g) => g.id === 'check-deprecations').firingChannel).toBe(
      'pnpm-meta',
    );
  });
});
