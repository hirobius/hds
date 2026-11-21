// @vitest-environment node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The Figma parity score in public/hds-stats.json (the field folio cites).
 *
 * The field is generated, never typed: scripts/build-stats-json.mjs computes it
 * from the parity gate (check-figma-parity) over the committed Figma read, and a
 * parity run writes it through that same generator. These tests hold: the
 * committed field equals the gate's own score; a parity run writes it into a
 * root whose copy is stale; and --check fails on a hand-typed value.
 */
import { PARITY_DEFINITION } from '../lib/figma-parity.mjs';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { STATS_PATH } from '../build-stats-json.mjs';
import { runParityCheck } from '../check-figma-parity.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

const INPUTS = [
  'src/index.ts',
  'src/patterns.ts',
  'hirobius.tokens.json',
  'TOKEN_MIGRATION.md',
  'public/hds-manifest.json',
  'docs/data/consumer-usage.json',
  'docs/sync-map.json',
  'package.json',
  'figma',
  'src/app/components',
  'directions',
  'accents',
  'upgrade/releases',
  STATS_PATH,
];
const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});
function copyRoot() {
  const root = mkdtempSync(join(tmpdir(), 'hds-parity-stats-'));
  temps.push(root);
  for (const f of INPUTS) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    cpSync(join(ROOT, f), join(root, f), {
      recursive: true,
      // The generated templates, plus toast.tsx: the parity run reads ToastOptions from it
      // (the Figma Toast is paired with toast() in figma/mapping-overrides.json).
      filter: (src) =>
        !/src\/app\/components\/.+/.test(src) ||
        src.endsWith('.figma.ts') ||
        src.endsWith('/toast.tsx'),
    });
  }
  return root;
}
const node = (script, root, ...args) =>
  spawnSync(process.execPath, [join(ROOT, 'scripts', script), '--root', root, ...args], {
    encoding: 'utf8',
    env: { ...process.env, FIXTURE_DIR: root },
  });
const edit = (root, change) => {
  const file = join(root, STATS_PATH);
  writeFileSync(file, JSON.stringify(change(readJson(root, STATS_PATH)), null, 2) + '\n');
};

describe('figmaParity in public/hds-stats.json', () => {
  it('is the score the parity gate computes on the committed read', async () => {
    const { result } = await runParityCheck({ root: ROOT });
    const { figmaParity } = readJson(ROOT, STATS_PATH);
    expect(figmaParity).toEqual({
      percent: result.score.percent,
      passed: result.score.passed,
      total: result.score.total,
      readOn: readJson(ROOT, 'figma/parity/read.json').readOn,
      source: 'figma/parity/read.json',
      checks: Object.fromEntries(
        Object.entries(result.score.areas).map(([area, a]) => [
          area,
          { passed: a.passed, total: a.total },
        ]),
      ),
      definition: PARITY_DEFINITION,
    });
  });

  it('depends on the committed inputs only: a copy with no git history scores the same', async () => {
    const root = copyRoot();
    expect(existsSync(join(root, '.git'))).toBe(false);
    const here = (await runParityCheck({ root: ROOT })).result.score;
    const copy = (await runParityCheck({ root })).result.score;
    expect(copy).toEqual(here);
  });

  it('is written by a parity run, over a stale value', async () => {
    const root = copyRoot();
    const before = readJson(root, STATS_PATH).figmaParity;
    edit(root, (s) => ({ ...s, figmaParity: { ...s.figmaParity, percent: 1, passed: 1 } }));
    const run = node('check-figma-parity.mjs', root);
    expect(run.status, run.stderr + run.stdout).toBe(0);
    expect(readJson(root, STATS_PATH).figmaParity).toEqual(before);
  });

  it('is written by a parity run when the field is missing', () => {
    const root = copyRoot();
    const before = readJson(root, STATS_PATH).figmaParity;
    edit(root, ({ figmaParity: _gone, ...rest }) => rest);
    expect(node('check-figma-parity.mjs', root).status).toBe(0);
    expect(readJson(root, STATS_PATH).figmaParity).toEqual(before);
  });

  it('fails stats --check when the score is typed by hand, and a rewrite repairs it', () => {
    const root = copyRoot();
    // Any value but the real score: 100 is a real score too.
    edit(root, (s) => ({
      ...s,
      figmaParity: { ...s.figmaParity, percent: s.figmaParity.percent === 1 ? 2 : 1 },
    }));
    const check = node('build-stats-json.mjs', root, '--check');
    expect(check.status).toBe(1);
    expect(check.stderr).toContain('pnpm stats:build');
    expect(node('build-stats-json.mjs', root).status).toBe(0);
    expect(node('build-stats-json.mjs', root, '--check').status).toBe(0);
  });
});
