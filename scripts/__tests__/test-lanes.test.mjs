import { describe, expect, it } from 'vitest';
import {
  HEAVY_LIST_PATH,
  isTestFile,
  needsFullSuite,
  parseHeavyFiles,
  planTestCommands,
  readHeavyFiles,
  readTestIndex,
  referencingTests,
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

describe('isTestFile', () => {
  it.each([
    ['scripts/__tests__/a.test.mjs', true],
    ['scripts/eslint-plugin-hds/__tests__/rule.test.mjs', true],
    ['src/app/components/button.test.tsx', true],
    ['tests/primitive-contracts/x.contract.test.tsx', true],
    ['scripts/check-a.mjs', false],
    ['tests/e2e/visual.spec.ts', false], // Playwright, not vitest
    ['scripts/__tests__/fixtures/canon/X.tsx', false],
  ])('%s → %s', (file, expected) => {
    expect(isTestFile(file)).toBe(expected);
  });
});

describe('referencingTests (tests that spawn or read a file by name)', () => {
  const INDEX = [
    [
      'scripts/__tests__/check-css-integrity.test.mjs',
      "spawnSync('node', [join(ROOT, 'scripts/check-css-integrity.mjs')])",
    ],
    ['scripts/__tests__/other.test.mjs', "readFileSync('docs/state-surfaces.json')"],
    ['src/app/components/button.test.tsx', "import { Button } from './button';"],
  ];

  it('finds a test that names a changed script', () => {
    expect(referencingTests(['scripts/check-css-integrity.mjs'], INDEX)).toEqual([
      'scripts/__tests__/check-css-integrity.test.mjs',
    ]);
  });

  it('finds a test that names a changed data file', () => {
    expect(referencingTests(['docs/state-surfaces.json'], INDEX)).toEqual([
      'scripts/__tests__/other.test.mjs',
    ]);
  });

  it('a changed test file is always selected', () => {
    expect(referencingTests(['src/app/components/button.test.tsx'], INDEX)).toEqual([
      'src/app/components/button.test.tsx',
    ]);
  });

  it('ignores generic basenames that would match half the suite', () => {
    const index = [['scripts/__tests__/x.test.mjs', "import x from './index.mjs'; 'package.json'"]];
    expect(referencingTests(['scripts/foo/index.mjs', 'README.md'], index)).toEqual([]);
  });

  it('an unrelated change selects nothing', () => {
    expect(referencingTests(['scripts/check-nothing.mjs'], INDEX)).toEqual([]);
  });
});

describe('readTestIndex (the real repo)', () => {
  it('lists vitest test files with their text', () => {
    const index = readTestIndex();
    const paths = index.map(([p]) => p);
    expect(paths).toContain('scripts/__tests__/test-lanes.test.mjs');
    expect(paths.length).toBeGreaterThan(300);
    expect(paths.every(isTestFile)).toBe(true);
  });
});

describe('needsFullSuite (safety fallback)', () => {
  it.each([
    // gate mechanism
    HEAVY_LIST_PATH,
    'vitest.config.ts',
    'vitest.fast.config.ts',
    'scripts/lib/test-lanes.mjs',
    'scripts/lib/gate-tier.mjs',
    'scripts/pre-push-gate.mjs',
    'scripts/hook-run.mjs',
    '.husky/pre-push',
    'scripts/hooks/secret-pii-scan.mjs',
    'tests/setup/jsdom-polyfills.ts',
    // shared config
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig.json',
    'vite.config.ts',
    'eslint.config.js',
    // tokens
    'hirobius.tokens.json',
    'tokens.lock.json',
    'tailwind.config.tokens.cjs',
    'src/styles/theme.css',
    'src/tokens/index.ts',
    // generators
    'scripts/generate-llms-txt.mjs',
    'scripts/build-tokens.mjs',
  ])('%s → full suite', (file) => {
    expect(needsFullSuite([file])).toBe(file);
  });

  it.each([
    'scripts/check-css-integrity.mjs',
    'scripts/lib/semver.mjs',
    'src/app/components/button.tsx',
    'scripts/__tests__/check-css-integrity.test.mjs',
    'docs/state-surfaces.json',
  ])('%s → affected selection', (file) => {
    expect(needsFullSuite([file])).toBe(null);
  });
});

describe('planTestCommands', () => {
  const INDEX = [
    ['scripts/__tests__/check-css-integrity.test.mjs', "'scripts/check-css-integrity.mjs'"],
    ['scripts/__tests__/upgrade-command.test.mjs', "'scripts/upgrade/compile.mjs'"],
  ];

  it('affected mode: pretest + vitest related over the changed code', () => {
    const plan = planTestCommands(['src/components/Button.tsx'], HEAVY, INDEX);
    expect(plan.mode).toBe('affected');
    expect(plan.commands).toEqual([
      'pnpm run pretest',
      'pnpm exec vitest related --run --passWithNoTests src/components/Button.tsx',
    ]);
  });

  it('affected mode adds tests that name the changed file (spawned scripts)', () => {
    const plan = planTestCommands(['scripts/check-css-integrity.mjs'], HEAVY, INDEX);
    expect(plan.mode).toBe('affected');
    expect(plan.tests).toEqual(['scripts/__tests__/check-css-integrity.test.mjs']);
    expect(plan.commands[1]).toBe(
      'pnpm exec vitest related --run --passWithNoTests scripts/check-css-integrity.mjs scripts/__tests__/check-css-integrity.test.mjs',
    );
  });

  it('affected mode keeps the path-triggered heavy subset', () => {
    const plan = planTestCommands(['scripts/upgrade/compile.mjs'], HEAVY, INDEX);
    expect(plan.tests).toContain('scripts/__tests__/upgrade-command.test.mjs');
    expect(plan.tests).toContain('scripts/__tests__/check-upgrade-ledger.test.mjs');
    expect(plan.commands[1]).toContain('scripts/__tests__/upgrade-snapshot.test.mjs');
  });

  it('affected mode with nothing to select runs pretest only', () => {
    const plan = planTestCommands(['docs/state-surfaces.json'], HEAVY, []);
    expect(plan.commands).toEqual(['pnpm run pretest']);
  });

  it('never runs the whole fast lane on a push', () => {
    const plan = planTestCommands(['scripts/check-css-integrity.mjs'], HEAVY, INDEX);
    expect(plan.commands.join(' ')).not.toMatch(/test:fast|pnpm test\b/);
  });

  it.each([
    ['the heavy list', [HEAVY_LIST_PATH]],
    ['the base vitest config', ['vitest.config.ts']],
    ['the selection helper', ['scripts/lib/test-lanes.mjs']],
    ['a hook', ['.husky/pre-push']],
    ['tokens', ['hirobius.tokens.json']],
    ['a generator', ['scripts/generate-llms-txt.mjs']],
    ['shared config', ['package.json']],
    ['an unknown diff', null],
  ])('fails safe to the full suite on %s', (_label, files) => {
    const plan = planTestCommands(files, HEAVY, INDEX);
    expect(plan.mode).toBe('full');
    expect(plan.commands).toEqual(['pnpm test']);
  });
});
