import { describe, expect, it } from 'vitest';
import {
  HEAVY_LIST_PATH,
  parseHeavyFiles,
  planTestCommands,
  readHeavyFiles,
  triggeredHeavyFiles,
} from '../lib/test-lanes.mjs';

const HEAVY = [
  'scripts/__tests__/generator-check-flags.test.mjs',
  'scripts/__tests__/upgrade-command.test.mjs',
  'scripts/__tests__/upgrade-snapshot.test.mjs',
  'scripts/__tests__/check-upgrade-ledger.test.mjs',
  'scripts/__tests__/figma-cli.test.mjs',
  'scripts/__tests__/figma-receipt.test.mjs',
  'scripts/__tests__/generate-llms-full.test.mjs',
  'scripts/__tests__/eslint-hds-self-lint.test.mjs',
  'scripts/__tests__/check-code-connect.test.mjs',
];

describe('parseHeavyFiles', () => {
  it('takes the first token per line, ignores blanks and # lines', () => {
    const text = [
      '# header comment',
      '',
      'scripts/__tests__/a.test.mjs # 112.3s',
      '  scripts/__tests__/b.test.mjs  ',
      '#scripts/__tests__/not-a-file.test.mjs',
    ].join('\n');
    expect(parseHeavyFiles(text)).toEqual([
      'scripts/__tests__/a.test.mjs',
      'scripts/__tests__/b.test.mjs',
    ]);
  });
});

describe('readHeavyFiles (the committed list)', () => {
  it('is seeded with the measured >10s scripts/__tests__ files', () => {
    const heavy = readHeavyFiles();
    expect(heavy).toContain('scripts/__tests__/generator-check-flags.test.mjs');
    expect(heavy).toContain('scripts/__tests__/upgrade-snapshot.test.mjs');
    expect(heavy.length).toBeGreaterThanOrEqual(14);
    // Scope rule: scripts/__tests__ only — src/ is never heavy-listed.
    expect(heavy.every((f) => f.startsWith('scripts/__tests__/'))).toBe(true);
  });
});

describe('triggeredHeavyFiles', () => {
  it('scripts/upgrade/** triggers the upgrade heavy files', () => {
    expect(triggeredHeavyFiles(['scripts/upgrade/compile.mjs'], HEAVY)).toEqual([
      'scripts/__tests__/upgrade-command.test.mjs',
      'scripts/__tests__/upgrade-snapshot.test.mjs',
      'scripts/__tests__/check-upgrade-ledger.test.mjs',
    ]);
  });

  it('figma changes trigger the figma heavy files', () => {
    expect(triggeredHeavyFiles(['scripts/figma-links.mjs'], HEAVY)).toContain(
      'scripts/__tests__/figma-cli.test.mjs',
    );
    expect(triggeredHeavyFiles(['figma/links.json'], HEAVY)).toContain(
      'scripts/__tests__/figma-receipt.test.mjs',
    );
  });

  it('generate*/build-* changes trigger the generator heavy files', () => {
    expect(triggeredHeavyFiles(['scripts/generate-llms-txt.mjs'], HEAVY)).toContain(
      'scripts/__tests__/generate-llms-full.test.mjs',
    );
    expect(triggeredHeavyFiles(['scripts/build-stats-json.mjs'], HEAVY)).toContain(
      'scripts/__tests__/generator-check-flags.test.mjs',
    );
  });

  it('eslint plugin changes trigger the self-lint heavy file only by area', () => {
    const hit = triggeredHeavyFiles(['scripts/eslint-plugin-hds/rules/x.mjs'], HEAVY);
    expect(hit).toContain('scripts/__tests__/eslint-hds-self-lint.test.mjs');
    expect(hit).not.toContain('scripts/__tests__/figma-cli.test.mjs');
  });

  it('a changed heavy test runs itself; a changed subject script runs its heavy test', () => {
    expect(triggeredHeavyFiles(['scripts/__tests__/check-code-connect.test.mjs'], HEAVY)).toEqual([
      'scripts/__tests__/check-code-connect.test.mjs',
    ]);
    expect(triggeredHeavyFiles(['scripts/check-code-connect.mjs'], HEAVY)).toEqual([
      'scripts/__tests__/check-code-connect.test.mjs',
    ]);
  });

  it('an unrelated diff triggers nothing', () => {
    expect(triggeredHeavyFiles(['src/components/Button.tsx'], HEAVY)).toEqual([]);
  });
});

describe('planTestCommands', () => {
  it('lanes mode: pretest + fast lane, no heavy subset for an unrelated diff', () => {
    const plan = planTestCommands(['src/components/Button.tsx'], HEAVY);
    expect(plan.mode).toBe('lanes');
    expect(plan.commands).toEqual(['pnpm run pretest', 'pnpm test:fast']);
  });

  it('lanes mode appends the triggered heavy subset as an explicit vitest run', () => {
    const plan = planTestCommands(['scripts/upgrade/compile.mjs'], HEAVY);
    expect(plan.mode).toBe('lanes');
    expect(plan.commands[2]).toContain('pnpm exec vitest run --passWithNoTests');
    expect(plan.commands[2]).toContain('scripts/__tests__/upgrade-command.test.mjs');
  });

  it.each([
    ['the heavy list', [HEAVY_LIST_PATH]],
    ['the base vitest config', ['vitest.config.ts']],
    ['the fast vitest config', ['vitest.fast.config.ts']],
    ['the selection helper', ['scripts/lib/test-lanes.mjs']],
    ['gate-tier', ['scripts/lib/gate-tier.mjs']],
    ['an unknown diff', null],
  ])('fails safe to the full suite on %s', (_label, files) => {
    const plan = planTestCommands(files, HEAVY);
    expect(plan.mode).toBe('full');
    expect(plan.commands).toEqual(['pnpm test']);
  });
});
