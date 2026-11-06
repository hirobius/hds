/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#1145: the library build keeps one output file per source module
 * (vite.config.lib.ts, `preserveModules`), so a bundler that honours
 * package.json#sideEffects drops every module a consumer does not import.
 * An entry such as dist/hirobius-ui.js is then only a list of re-exports, and
 * a size-limit budget over that one file would measure almost nothing.
 *
 * So the entry budgets measure an entry-graph probe: the entry bundled with
 * every package import kept external (scripts/lib/entry-graph-probe.mjs),
 * which is all the code HDS itself ships for that entry.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRY_GRAPHS, bundleEntryGraph, probeReexports } from '../lib/entry-graph-probe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

describe('bundleEntryGraph', () => {
  it('inlines local modules and keeps package imports external', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'entry-graph-'));
    mkdirSync(path.join(dir, 'm'));
    writeFileSync(
      path.join(dir, 'm', 'local.js'),
      "import { clsx } from 'clsx';\nexport const local = (a) => clsx('local-marker', a);\n",
    );
    writeFileSync(path.join(dir, 'entry.js'), "export { local } from './m/local.js';\n");
    const outfile = path.join(dir, 'out.js');
    const result = await bundleEntryGraph({ entry: path.join(dir, 'entry.js'), outfile });
    const code = readFileSync(outfile, 'utf8');
    expect(code).toContain('local-marker');
    expect(code).toMatch(/from\s*"clsx"/);
    expect(result.bytes).toBe(Buffer.byteLength(code));
    expect(result.gzipBytes).toBeGreaterThan(0);
    expect(result.inputs.some((i) => i.endsWith('m/local.js'))).toBe(true);
  });

  it('lists only modules with code in the output (hds#1205)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'entry-graph-'));
    writeFileSync(path.join(dir, 'big.js'), "export const big = { marker: 'big-json' };\n");
    writeFileSync(path.join(dir, 'small.js'), 'export const small = 1;\n');
    writeFileSync(
      path.join(dir, 'lib.js'),
      "export { big } from './big.js';\nexport { small } from './small.js';\n",
    );
    writeFileSync(path.join(dir, 'entry.js'), "export { small } from './lib.js';\n");
    const result = await bundleEntryGraph({
      entry: path.join(dir, 'entry.js'),
      outfile: path.join(dir, 'out.js'),
    });
    expect(result.inputs.some((i) => i.endsWith('small.js'))).toBe(true);
    expect(result.inputs.some((i) => i.endsWith('big.js'))).toBe(false);
  });
});

describe('probeReexports', () => {
  it('re-exports every name but the excluded ones, default included', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'entry-graph-'));
    mkdirSync(path.join(dir, 'dist'));
    writeFileSync(
      path.join(dir, 'dist', 'e.js'),
      'export const a = 1;\nexport const b = 2;\nexport default 3;\n',
    );
    const row = { entry: 'dist/e.js', exclude: ['b'] };
    expect(await probeReexports(row, dir)).toEqual(['export { a, default }']);
    expect(await probeReexports({ reexports: ['export *'] }, dir)).toEqual(['export *']);
  });
});

describe('entry budgets measure the entry graph', () => {
  const entries = require(path.join(ROOT, '.size-limit.cjs'));

  it.each(ENTRY_GRAPHS)('$entry has a gzip budget over $probe', ({ entry, probe }) => {
    expect(entries.find((e) => e.path === entry)).toBeUndefined();
    const budget = entries.find((e) => e.path === probe);
    expect(budget, `no size-limit entry for ${probe}`).toBeDefined();
    expect(budget.gzip).toBe(true); // tier-ok: asserted defined on the previous line
  });
});
