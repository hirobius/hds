/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

describe('the upgrade command in the tarball (hds#452)', () => {
  const UPGRADE_FILES = [
    'codemods/upgrade.mjs',
    'codemods/registry.mjs',
    'codemods/lib/atomic-write.mjs',
    'codemods/lib/installed-version.mjs',
    'codemods/lib/project.mjs',
    'codemods/lib/record.mjs',
    'codemods/lib/scan.mjs',
    'codemods/lib/semver.mjs',
  ];

  it('requires every file the upgrade command loads', () => {
    expect(REQUIRED).toEqual(expect.arrayContaining(UPGRADE_FILES));
  });

  it('requires every .mjs under codemods/lib/, so a new helper cannot ship missing', () => {
    const lib = readdirSync(join(ROOT, 'codemods/lib'))
      .filter((f) => f.endsWith('.mjs'))
      .map((f) => `codemods/lib/${f}`);
    expect(REQUIRED).toEqual(expect.arrayContaining(lib));
    const files = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).files;
    expect(files).toEqual(expect.arrayContaining([...lib, ...UPGRADE_FILES]));
  });
});

describe('agent tooling in the tarball', () => {
  it('requires AGENTS.md, the hds-mcp server with its data, and the ESLint plugin entry', () => {
    expect(REQUIRED).toEqual(
      expect.arrayContaining([
        'AGENTS.md',
        'mcp/hds-mcp.mjs',
        'mcp/catalog.mjs',
        'mcp/server.mjs',
        'mcp/guide.mjs',
        'codemods/patterns-subpath.names.json',
        'scripts/eslint-plugin-hds/index.mjs',
        'scripts/eslint-plugin-hds/index.d.mts',
        'scripts/eslint-plugin-hds/package.json',
      ]),
    );
  });

  it('requires every rule file the plugin ships, including no-raw-controls', () => {
    const rules = readdirSync(join(ROOT, 'scripts/eslint-plugin-hds/rules')).map(
      (f) => `scripts/eslint-plugin-hds/rules/${f}`,
    );
    expect(rules).toContain('scripts/eslint-plugin-hds/rules/no-raw-controls.mjs');
    expect(REQUIRED).toEqual(expect.arrayContaining(rules));
  });

  it("flags the plugin's own tests, but no other plugin file", () => {
    const r = diffPackContents(
      [
        ...good,
        'scripts/eslint-plugin-hds/rules/no-raw-hex.mjs',
        'scripts/eslint-plugin-hds/__tests__/no-raw-hex.test.mjs',
        'scripts/eslint-plugin-hds/package.json',
        'scripts/generate-agents-md.mjs',
      ],
      { required: REQUIRED, forbidden: FORBIDDEN },
    );
    expect(r.forbidden).toEqual([
      'scripts/eslint-plugin-hds/__tests__/no-raw-hex.test.mjs',
      'scripts/generate-agents-md.mjs',
    ]);
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

  it.skipIf(!existsSync(join(ROOT, 'dist', 'hirobius-ui.js')))(
    'CLI exits 1 naming the path when a required file is missing',
    () => {
      const res = spawnSync(
        'node',
        ['scripts/check-pack-contents.mjs', '--require', 'no-such-file.md'],
        {
          cwd: ROOT,
          encoding: 'utf8',
        },
      );
      expect(res.status).toBe(1);
      expect(res.stderr + res.stdout).toContain('no-such-file.md');
    },
    120_000,
  );
});

// hds#451: the upgrade record ships, so a consumer's node_modules holds what
// the upgrade command and a person upgrading by hand read. Its inputs do not.
describe('the upgrade record in the tarball', () => {
  const ledgers = readdirSync(join(ROOT, 'upgrade/releases'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => `upgrade/releases/${f}`);
  const record = [
    'UPGRADING.md',
    'MIGRATIONS.md',
    'CHANGELOG.md',
    'upgrade/schema.json',
    'upgrade/index.json',
    ...ledgers,
  ];

  it('requires UPGRADING.md, MIGRATIONS.md, CHANGELOG.md, the schema, the index and every ledger', () => {
    expect(ledgers).toContain('upgrade/releases/0.21.0.json');
    expect(REQUIRED).toEqual(expect.arrayContaining(record));
  });

  it('names each one that is missing', () => {
    for (const file of record) {
      const r = diffPackContents(
        good.filter((p) => p !== file),
        { required: REQUIRED, forbidden: FORBIDDEN },
      );
      expect(r.missing, file).toEqual([file]);
    }
  });

  it('flags a pending note, a frozen source and anything else under upgrade/, but not the record', () => {
    const r = diffPackContents(
      [
        ...good,
        'upgrade/pending/fix-copy.json',
        'upgrade/sources/0.21.0/release.json',
        'upgrade/published.json',
        'upgrade/README.md',
      ],
      { required: REQUIRED, forbidden: FORBIDDEN },
    );
    expect(r.forbidden).toEqual([
      'upgrade/pending/fix-copy.json',
      'upgrade/sources/0.21.0/release.json',
      'upgrade/published.json',
      'upgrade/README.md',
    ]);
  });

  it('is listed path by path in package.json files, never upgrade/ whole', () => {
    const { files } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(files).toEqual(
      expect.arrayContaining([
        'UPGRADING.md',
        'MIGRATIONS.md',
        'CHANGELOG.md',
        'upgrade/schema.json',
        'upgrade/index.json',
        'upgrade/releases/',
      ]),
    );
    const upgradeEntries = files.filter((f) => f === 'upgrade' || f.startsWith('upgrade/'));
    expect(upgradeEntries.sort()).toEqual([
      'upgrade/index.json',
      'upgrade/releases/',
      'upgrade/schema.json',
    ]);
  });
});
