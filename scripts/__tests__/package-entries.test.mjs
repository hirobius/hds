// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readJsExportEntries } from '../lib/package-entries.mjs';

function pkgRoot(exportsMap) {
  const root = mkdtempSync(join(tmpdir(), 'pkg-entries-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ exports: exportsMap }));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'index.ts'), 'export const a = 1;\n');
  return root;
}

describe('readJsExportEntries', () => {
  it('maps a library entry back to its source file', () => {
    const root = pkgRoot({ '.': { types: './dist/types/src/index.d.ts', default: './dist/a.js' } });
    expect(readJsExportEntries(root)).toEqual([{ key: '.', file: join(root, 'src', 'index.ts') }]);
  });

  it('skips the shipped tooling entry (./eslint-plugin), which has no TS source', () => {
    const root = pkgRoot({
      '.': { types: './dist/types/src/index.d.ts', default: './dist/a.js' },
      './eslint-plugin': {
        types: './scripts/eslint-plugin-hds/index.d.mts',
        default: './scripts/eslint-plugin-hds/index.mjs',
      },
    });
    expect(readJsExportEntries(root).map((e) => e.key)).toEqual(['.']);
  });

  it('still rejects any other entry whose types are outside dist/types', () => {
    const root = pkgRoot({ './x': { types: './x.d.ts', default: './x.js' } });
    expect(() => readJsExportEntries(root)).toThrow(/must be \.\/dist\/types/);
  });
});
