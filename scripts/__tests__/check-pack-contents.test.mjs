/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffPackContents, REQUIRED, FORBIDDEN, packedPaths } from '../check-pack-contents.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const good = [...REQUIRED, 'dist/types/src/index.d.ts', 'NOTICE.md'];

describe('diffPackContents', () => {
  it('passes a complete tarball', () => {
    expect(diffPackContents(good, { required: REQUIRED, forbidden: FORBIDDEN })).toEqual({
      missing: [],
      forbidden: [],
    });
  });

  it('reports DESIGN.md by name when it is absent', () => {
    const paths = good.filter((p) => p !== 'DESIGN.md');
    const r = diffPackContents(paths, { required: REQUIRED, forbidden: FORBIDDEN });
    expect(r.missing).toEqual(['DESIGN.md']);
  });

  it('flags src/index.ts and .env.local', () => {
    const r = diffPackContents([...good, 'src/index.ts', '.env.local', 'storybook-static/a.js'], {
      required: REQUIRED,
      forbidden: FORBIDDEN,
    });
    expect(r.forbidden).toEqual(['src/index.ts', '.env.local', 'storybook-static/a.js']);
  });

  it('does not flag dist/types/src/ or the shipped component-api.json', () => {
    const r = diffPackContents(
      [...good, 'dist/types/src/index.d.ts', 'src/app/data/component-api.json'],
      {
        required: REQUIRED,
        forbidden: FORBIDDEN,
      },
    );
    expect(r.forbidden).toEqual([]);
  });
});

describe('real npm pack --dry-run', () => {
  it.skipIf(!existsSync(join(ROOT, 'dist', 'hirobius-ui.js')))(
    'lists every required file and no forbidden one',
    () => {
      const paths = packedPaths(ROOT);
      const r = diffPackContents(paths, { required: REQUIRED, forbidden: FORBIDDEN });
      expect(r).toEqual({ missing: [], forbidden: [] });
    },
    120_000,
  );

  it('CLI exits 1 naming the path when a required file is missing', () => {
    const res = spawnSync(
      'node',
      ['scripts/check-pack-contents.mjs', '--require', 'no-such-file.md'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    if (!existsSync(join(ROOT, 'dist', 'hirobius-ui.js'))) return;
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toContain('no-such-file.md');
  }, 120_000);
});
