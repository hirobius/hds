/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#390: deprecation metadata in public/hds-manifest.json. A spec whose
 * component JSDoc carries `@deprecated` gets `deprecated` (the notice),
 * `removeIn` and `useInstead`, so consumer surfaces can stop advertising it
 * and later batches can be measured against it. validate-manifest rejects a
 * malformed one.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/hds-manifest.json'), 'utf8'));

describe('committed manifest', () => {
  it('has no spec for the five hds#232 docs/lab internals 0.20.0 removed, and only StatusDot deprecated', () => {
    for (const gone of [
      'CinematicLink',
      'ComponentInstanceMatrix',
      'FoundationSwatch',
      'Sketch',
      'Token',
    ])
      expect(manifest.componentSpecs[gone], gone).toBeUndefined();
    const deprecated = Object.entries(manifest.componentSpecs)
      .filter(([, spec]) => spec.deprecated)
      .map(([name]) => name);
    // StatusDot: deprecated for Badge dot, removed in 0.21.0 (hds#395).
    expect(deprecated).toEqual(['StatusDot']);
    expect(manifest.componentSpecs.StatusDot.removeIn).toBe('0.21.0');
  });

  it('never carries removeIn or useInstead on a spec that is not deprecated', () => {
    const stray = Object.entries({ ...manifest.componentSpecs, ...manifest.utilities })
      .filter(([, spec]) => !spec.deprecated && ('removeIn' in spec || 'useInstead' in spec))
      .map(([name]) => name);
    expect(stray).toEqual([]);
  });
});

describe('validate-manifest deprecation fields', () => {
  const base = {
    category: 'Display',
    filePath: 'src/app/components/x.tsx',
    description: 'X.',
    props: {},
    allowedChildren: [],
    propConstraints: {},
    requiredProps: [],
    a11yRules: [],
    tier: 'primitive',
  };

  function validate(spec) {
    const dir = mkdtempSync(join(tmpdir(), 'hds-manifest-'));
    try {
      mkdirSync(join(dir, 'public'));
      mkdirSync(join(dir, 'manifest'));
      writeFileSync(
        join(dir, 'public/hds-manifest.json'),
        JSON.stringify({ componentSpecs: { X: { ...base, ...spec } } }),
      );
      writeFileSync(
        join(dir, 'manifest/schema.json'),
        readFileSync(join(ROOT, 'manifest/schema.json'), 'utf8'),
      );
      return spawnSync(process.execPath, [join(ROOT, 'scripts/validate-manifest.mjs')], {
        cwd: dir,
        encoding: 'utf8',
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it('accepts a full deprecation', () => {
    const r = validate({ deprecated: 'Use Y.', removeIn: '1.0.0', useInstead: 'Y' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('rejects an empty notice, a non-semver removeIn, and removeIn or useInstead without a notice', () => {
    expect(validate({ deprecated: '' }).stderr).toMatch(/"field":"deprecated"/);
    expect(validate({ deprecated: 'Old.', removeIn: 'soon' }).stderr).toMatch(/"field":"removeIn"/);
    expect(validate({ removeIn: '1.0.0' }).stderr).toMatch(/"field":"removeIn"/);
    expect(validate({ useInstead: 'Y' }).stderr).toMatch(/"field":"useInstead"/);
    expect(validate({ removeIn: '1.0.0' }).status).toBe(1);
  });
});
