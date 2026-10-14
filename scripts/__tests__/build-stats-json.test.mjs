// @vitest-environment node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/build-stats-json.mjs writes public/hds-stats.json, the one generated
 * source of the HDS numbers other repos read (ops#681: a number shown to a
 * person is derived from a real source with a drift check, or cut).
 *
 * Seams: collectStats(root) (the values) and the CLI (`--check`, write,
 * `--root`). Expected values come from places the generator does not read
 * through its own helpers: the README claims, the manifest's own styleCount,
 * the printed rows of check-contrast, the consumer snapshot file.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { collectStats, STATS_PATH } from '../build-stats-json.mjs';
import { readClaims } from '../build-readme-counts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/build-stats-json.mjs');
const readText = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

describe('collectStats', () => {
  const stats = collectStats(ROOT);
  const readme = readText('README.md');

  it('states the component, token and core counts the README states', () => {
    const claims = readClaims(readme);
    expect(stats.components.publicModules).toBe(claims.components);
    expect(stats.tokens.total).toBe(claims.tokens);
    expect(stats.components.core).toBe(
      Number(readme.match(/\*\*(\d+)\*\* components are the core set/)[1]),
    );
    expect(stats.components.patterns).toBe(
      Number(readme.match(/\*\*(\d+)\*\* pattern modules ship/)[1]),
    );
  });

  it('takes the typography style count from the manifest', () => {
    expect(stats.typography.styleCount).toBe(
      readJson('public/hds-manifest.json').typographyRamp.styleCount,
    );
  });

  it('counts the contrast pairs check-contrast checks, text and non-text apart', () => {
    const out = spawnSync(process.execPath, [join(ROOT, 'scripts/check-contrast.mjs')], {
      encoding: 'utf8',
    }).stdout;
    const rows = out.split('\n').filter((line) => /\d+\.\d:1\s+\d+\.\d:1/.test(line));
    const nonText = out
      .split('Pair (UI boundary)')[1]
      .split('\n')
      .filter((l) => /:1\s+\d/.test(l));
    expect(stats.contrast.nonTextPairs).toBe(nonText.length);
    expect(stats.contrast.textPairs).toBe(rows.length - nonText.length);
    expect(stats.contrast.textPairs).toBeGreaterThan(stats.contrast.nonTextPairs);
  });

  it('carries the consumer split as docs/data/consumer-usage.json declares it, with its source and date', () => {
    const snap = readJson('docs/data/consumer-usage.json');
    expect(snap.consumersConfirmed).toBe(true);
    expect(stats.consumers).toEqual({
      productApps: snap.consumers.productApps,
      tokenLevelSites: snap.consumers.tokenLevelSites,
      source: 'docs/data/consumer-usage.json',
      confirmedAt: snap.consumersConfirmedAt,
    });
    expect(stats.consumers.confirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('omits the split while the snapshot says it is unconfirmed', () => {
    const temp = copyRoot();
    const snapPath = join(temp, 'docs/data/consumer-usage.json');
    const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
    writeFileSync(snapPath, JSON.stringify({ ...snap, consumersConfirmed: false }));
    expect(collectStats(temp).consumers).toBeNull();
  });

  it('names the package version', () => {
    expect(stats.version).toBe(readJson('package.json').version);
  });
});

// ── CLI ───────────────────────────────────────────────────────────────────────
const INPUTS = [
  'src/index.ts',
  'src/patterns.ts',
  'hirobius.tokens.json',
  'public/hds-manifest.json',
  'docs/data/consumer-usage.json',
  'package.json',
  STATS_PATH,
];
const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});
function copyRoot() {
  const root = mkdtempSync(join(tmpdir(), 'hds-stats-'));
  temps.push(root);
  for (const f of INPUTS) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    cpSync(join(ROOT, f), join(root, f));
  }
  return root;
}
const run = (root, ...args) =>
  spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });

describe('committed public/hds-stats.json', () => {
  it('is what collectStats returns today (its generatedFrom is provenance, not a value)', () => {
    const { generatedFrom, ...committed } = readJson(STATS_PATH);
    expect(generatedFrom).toMatch(/^[0-9a-f]{40}$/);
    expect(committed).toEqual(JSON.parse(JSON.stringify(collectStats(ROOT))));
  });
});

describe('build-stats-json --check', () => {
  it('passes on an untouched copy', () => {
    const res = run(copyRoot(), '--check');
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });

  it('fails when a number is stale, names the file and the fix, and writes nothing', () => {
    const root = copyRoot();
    const file = join(root, STATS_PATH);
    const stale =
      JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), tokens: { total: 1 } }, null, 2) +
      '\n';
    writeFileSync(file, stale);
    const res = run(root, '--check');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain(STATS_PATH);
    expect(res.stderr).toContain('pnpm stats:build');
    expect(readFileSync(file, 'utf8')).toBe(stale);
  });

  it('fails when a source moves (a token added) without a regenerate', () => {
    const root = copyRoot();
    const tokens = join(root, 'hirobius.tokens.json');
    const tree = JSON.parse(readFileSync(tokens, 'utf8'));
    tree.primitive.color.statsProbe = { $value: '#123456', $type: 'color' };
    writeFileSync(tokens, JSON.stringify(tree));
    expect(run(root, '--check').status).toBe(1);
  });

  it('without --check, rewrites a stale file and then passes', () => {
    const root = copyRoot();
    writeFileSync(join(root, STATS_PATH), '{}\n');
    expect(run(root).status).toBe(0);
    expect(run(root, '--check').status).toBe(0);
  });

  it('keeps the recorded generatedFrom while the numbers do not move', () => {
    const root = copyRoot();
    const file = join(root, STATS_PATH);
    const before = readFileSync(file, 'utf8');
    expect(run(root).status).toBe(0);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });
});

describe('wiring', () => {
  const pkg = readJson('package.json');

  it('is generated with the README counts and checked in pretest', () => {
    expect(pkg.scripts['stats:build']).toBe('node scripts/build-stats-json.mjs');
    expect(pkg.scripts.tokens).toContain('node scripts/build-stats-json.mjs');
    expect(pkg.scripts.pretest).toContain('node scripts/build-stats-json.mjs --check');
  });

  it('ships in the package and resolves as @hirobius/design-system/stats.json', () => {
    expect(pkg.files).toContain(STATS_PATH);
    expect(pkg.exports['./stats.json']).toBe(`./${STATS_PATH}`);
  });

  it('is registered as a pretest-fired error gate', () => {
    const gates = readJson('docs/guardrails/registry.json').gates.filter(
      (gate) => gate.id === 'build-stats-json',
    );
    expect(gates).toEqual([
      expect.objectContaining({
        gateScript: 'scripts/build-stats-json.mjs',
        firingChannel: 'pnpm-meta',
        severity: 'error',
      }),
    ]);
  });

  it('is a registered state surface that names its check', () => {
    const surfaces = readJson('docs/state-surfaces.json').surfaces.filter(
      (surface) => surface.path === STATS_PATH,
    );
    expect(surfaces).toEqual([
      expect.objectContaining({
        kind: 'generated',
        by: 'scripts/build-stats-json.mjs',
        check: 'node scripts/build-stats-json.mjs --check',
      }),
    ]);
  });
});
