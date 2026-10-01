/**
 * hds#395 (B5): the three codemods ops runs for the 0.20.0 B5 removals, end to
 * end, on fixtures shaped like the ops origin/main files they touch
 * (codemods/__fixtures__/ops-b5: ClientDashboardPage.tsx, NotFoundPage.tsx,
 * agentic-os/SurfacesRail.tsx).
 *
 * - StatusTile leaves the root for `/patterns` (hds#389 D5), so
 *   `hds-patterns-subpath` moves ops' `import { StatusTile, type StatusTileTone }`
 *   with no codemod of its own: its name list is what `/patterns` exports and
 *   the root does not (codemods/patterns-subpath.names.json).
 * - `hds-tile-grid` and `hds-not-found-pattern` rewrite the two removed
 *   components; until they have run, `hds-patterns-subpath --check` reports each
 *   one with its survivor (codemods/removed-0.20.json `replaced`).
 * - In either order the three reach the same files, and then every `--check`
 *   exits 0.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPatternNames, transformSource } from '../../codemods/patterns-subpath.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const FIXTURES = join(REPO, 'codemods/__fixtures__/ops-b5');
const ROOT = '@hirobius/design-system';
const SUB = '@hirobius/design-system/patterns';
const BIN = {
  subpath: join(REPO, 'codemods/patterns-subpath.mjs'),
  tileGrid: join(REPO, 'codemods/tile-grid.mjs'),
  notFound: join(REPO, 'codemods/not-found-pattern.mjs'),
};
const DASHBOARD = 'src/app/pages/ops/ClientDashboardPage.tsx';

describe('StatusTile moves with hds-patterns-subpath (hds#395)', () => {
  it("moves ops' StatusTile import, type modifier and all, to /patterns", () => {
    const src = `import { StatusTile, type StatusTileTone } from '${ROOT}';\n`;
    expect(transformSource(src, loadPatternNames()).source).toBe(
      `import { StatusTile, type StatusTileTone } from '${SUB}';\n`,
    );
  });

  it('lists StatusTile, StatusTileProps and StatusTileTone among the names it moves', () => {
    const names = loadPatternNames();
    for (const n of ['StatusTile', 'StatusTileProps', 'StatusTileTone'])
      expect(names.has(n), n).toBe(true);
  });
});

describe('the B5 codemods on ops-shaped files', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-ops-b5-'));
    cpSync(FIXTURES, dir, { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (bin, ...args) =>
    spawnSync('node', [BIN[bin], '--root', dir, ...args], { encoding: 'utf8' });
  const files = () =>
    Object.fromEntries(
      readdirSync(dir, { recursive: true, encoding: 'utf8' })
        .filter((f) => f.endsWith('.tsx'))
        .sort()
        .map((f) => [f, readFileSync(join(dir, f), 'utf8')]),
    );

  it('--check names each removed component with its survivor until its codemod runs', () => {
    const r = run('subpath', '--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(
      /TileGrid from '@hirobius\/design-system' \(removed in 0\.20\.0, use Grid layout="auto-fill"/,
    );
    expect(r.stderr).toMatch(
      /NotFoundPattern from '@hirobius\/design-system' \(removed in 0\.20\.0, use ErrorPattern displayText="404"/,
    );
    expect(run('tileGrid', '--check').status).toBe(1);
    expect(run('notFound', '--check').status).toBe(1);
  });

  it('rewrites every site; then each --check exits 0 and a second run changes nothing', () => {
    for (const bin of ['tileGrid', 'notFound', 'subpath']) expect(run(bin).status, bin).toBe(0);
    const once = files();
    expect(once[DASHBOARD]).toContain(
      [
        `import { Stack, Badge, Callout, Grid, EmptyState } from '${ROOT}';`,
        `import { Page } from '${SUB}';`,
        `import { StatusTile, type StatusTileTone } from '${SUB}';`,
        `import hds from '${ROOT}/tokens';`,
      ].join('\n'),
    );
    expect(once[DASHBOARD]).toContain(
      '<Grid layout="auto-fill" minItemWidth="260px" gap="medium">',
    );
    expect(once['src/app/pages/NotFoundPage.tsx']).toBe(
      `import { ErrorPattern } from '${SUB}';\n\nexport default function NotFoundPage() {\n  return <ErrorPattern displayText="404" message="Page not found" />;\n}\n`,
    );
    expect(once['src/app/pages/ops/agentic-os/SurfacesRail.tsx']).toContain(
      `import { Box, Stack, Text, Grid, type BoxProps } from '${ROOT}';`,
    );
    expect(JSON.stringify(once)).not.toMatch(/TileGrid|NotFoundPattern/);
    for (const bin of ['tileGrid', 'notFound', 'subpath']) {
      const check = run(bin, '--check');
      expect(check.stderr, bin).toBe('');
      expect(check.status, bin).toBe(0);
      expect(run(bin).status, bin).toBe(0);
    }
    expect(files()).toEqual(once);
  });

  it('reaches the same files when hds-patterns-subpath runs first', () => {
    for (const bin of ['tileGrid', 'notFound', 'subpath']) run(bin);
    const tileFirst = files();
    rmSync(dir, { recursive: true, force: true });
    cpSync(FIXTURES, dir, { recursive: true });
    for (const bin of ['subpath', 'notFound', 'tileGrid']) expect(run(bin).status, bin).toBe(0);
    expect(files()).toEqual(tileFirst);
  });
});
